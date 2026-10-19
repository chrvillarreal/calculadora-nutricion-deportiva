import { jsPDF } from "jspdf";
import { type Student, type Assessment, isPlanned } from "./storage";
import { assessmentResults, chronological } from "./assessmentResults";
const fmt = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export async function createReport(
  student: Student,
  a: Assessment,
  history: Assessment[] = [],
) {
  const response = await fetch("/fonts/NutriSans.ttf");
  if (!response.ok) throw new Error("No se pudo cargar la tipografía local.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
    compress: true,
  });
  doc.addFileToVFS("NutriSans.ttf", btoa(binary));
  doc.addFont("NutriSans.ttf", "Local", "normal");
  doc.setFont("Local");
  doc.setProperties({
    title: "Evaluación nutricional - NutriSport Pro",
    subject: "Informe local de evaluación",
    author: "NutriSport Pro",
    creator: "NutriSport Pro",
  });
  let y = 42;
  const ink: [number, number, number] = [24, 45, 48],
    green: [number, number, number] = [23, 62, 52];
  function header() {
    doc.setFillColor(...green);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text("NUTRISPORT PRO", 18, 14);
    doc.setFontSize(8);
    doc.text("EVALUACIÓN NUTRICIONAL DEPORTIVA · INFORME LOCAL", 18, 23);
    doc.setTextColor(...ink);
    y = 42;
  }
  header();
  function room(height: number) {
    if (y + height > 276) {
      doc.addPage();
      header();
    }
  }
  function text(
    value: string,
    size = 10,
    color: [number, number, number] = ink,
  ) {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(value, 174) as string[];
    const lineHeight = size * 0.45;
    for (const line of lines) {
      room(lineHeight + 2);
      doc.text(line, 18, y);
      y += lineHeight;
    }
    y += 3;
  }
  function section(title: string) {
    room(20);
    y += 4;
    doc.setDrawColor(206, 222, 213);
    doc.line(18, y - 4, 192, y - 4);
    text(title, 12, green);
  }
  function row(label: string, value: string) {
    text(`${label}: ${value}`, 9);
  }
  const r = assessmentResults(a),
    m = r.macro,
    plan = r.plan;
  text("Evaluación individual", 20, green);
  text(student.name, 16);
  row("Fecha de evaluación", a.date.split("-").reverse().join("/"));
  row("Deporte", student.sport || "Sin indicar");
  row("Objetivo de ficha", student.goal || "Sin indicar");
  doc.setFillColor(235, 244, 238);
  room(27);
  doc.roundedRect(18, y, 174, 24, 3, 3, "F");
  doc.setFontSize(9);
  doc.text("GET ESTIMADO", 24, y + 8);
  doc.text("OBJETIVO ENERGÉTICO", 107, y + 8);
  doc.setFontSize(14);
  doc.text(`${fmt(r.energy.total)} kcal/día`, 24, y + 18);
  doc.text(`${fmt(m.target)} kcal/día`, 107, y + 18);
  y += 34;
  section("1. Datos y método");
  row(
    "Peso / altura / edad",
    `${fmt(a.inputs.weightKg)} kg / ${fmt(a.inputs.heightCm)} cm / ${a.inputs.ageYears} años`,
  );
  row("Constante por sexo", a.inputs.sex === "male" ? "Masculino" : "Femenino");
  row("Factor de actividad", String(a.inputs.activityFactor).replace(".", ","));
  row(
    "Masa magra",
    r.leanMassKg === null ? "No ingresada" : `${fmt(r.leanMassKg)} kg`,
  );
  row("Método", r.method.name);
  row("Versión de ecuación", a.formula);
  row("IMC", `${fmt(r.energy.bmi)} kg/m² (no mide composición corporal)`);
  text(
    `Resolución: ${r.expression} = ${fmt(r.energy.basal)} kcal/día en reposo. GET = ${fmt(r.energy.basal)} × ${a.inputs.activityFactor} = ${fmt(r.energy.total)} kcal/día.`,
    9,
  );
  text(
    `Objetivo = GET × (1 + ${plan.adjustmentPercent}/100) = ${fmt(m.target)} kcal/día. El factor incluye actividad diaria y entrenamiento; no se suman calorías de ejercicio.`,
    9,
  );
  section("2. Plan de macronutrientes");
  row(
    "Modo y parámetros",
    `${plan.mode === "gkg" ? "g/kg" : "porcentaje energético"}; proteína ${plan.protein}, grasa ${plan.fat}; ajuste ${plan.adjustmentPercent} %`,
  );
  for (const [label, key, kcal] of [
    ["Proteínas", "proteinG", 4],
    ["Grasas", "fatG", 9],
    ["Carbohidratos", "carbsG", 4],
  ] as const) {
    const grams = m[key];
    row(
      label,
      `${fmt(grams)} g/día · ${fmt(grams / a.inputs.weightKg)} g/kg · ${fmt((grams * kcal * 100) / m.target)} % energético`,
    );
  }
  text(
    `Control energético: 4 × ${fmt(m.proteinG)} + 9 × ${fmt(m.fatG)} + 4 × ${fmt(m.carbsG)} ≈ ${fmt(m.target)} kcal/día. Valores mostrados redondeados; el control usa precisión completa.`,
    9,
  );
  if (isPlanned(a)) {
    text(
      `Reparto equivalente en ${plan.meals} comidas: ${fmt(m.target / plan.meals)} kcal, ${fmt(m.proteinG / plan.meals)} g de proteína, ${fmt(m.fatG / plan.meals)} g de grasa y ${fmt(m.carbsG / plan.meals)} g de carbohidratos por comida. División aritmética, no menú ni recomendación de timing.`,
      9,
    );
  } else {
    text(
      "Registro histórico v1: sin planificación de comidas ni ajuste energético.",
      9,
    );
  }
  section("3. Notas de evaluación");
  text(a.notes || "Sin notas registradas.", 10);
  const timeline = chronological(
    history.filter(
      (h) =>
        h.studentId === a.studentId &&
        h.date <= a.date &&
        (h.date < a.date || h.createdAt <= a.createdAt),
    ),
  ).slice(-12);
  if (timeline.length) {
    section("4. Seguimiento disponible");
    text(
      "Hasta 12 registros anteriores o del día, incluyendo esta evaluación si está en la selección. Los métodos distintos pueden explicar diferencias del GET.",
      9,
    );
    for (const h of timeline) {
      const hr = assessmentResults(h);
      row(
        h.date,
        `${fmt(h.inputs.weightKg)} kg · GET ${fmt(hr.energy.total)} kcal/día · ${hr.method.name}`,
      );
    }
  }
  section("Fuente y alcance");
  text(r.method.description, 9);
  text(r.method.source, 9);
  text(
    "Estimaciones para adultos, con revisión profesional. No constituyen diagnóstico ni prescripción automática. Los límites de entrada son controles operativos; no garantizan validez clínica. El gasto estimado y el objetivo planificado son conceptos diferentes.",
    9,
  );
  text(
    "Documento generado en el dispositivo. Contiene información personal: compartir solo con autorización y guardar en un lugar protegido.",
    9,
  );
  row("Identificador de evaluación", a.id);
  row("Registro original", a.createdAt);
  row("Generación del informe", new Date().toISOString());
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setDrawColor(206, 222, 213);
    doc.line(18, 283, 192, 283);
    doc.setFontSize(8);
    doc.setTextColor(82, 105, 96);
    doc.text("NutriSport Pro · Confidencial · Revisión profesional", 18, 290);
    doc.text(`${page} / ${count}`, 192, 290, { align: "right" });
  }
  return doc;
}
export async function downloadReport(
  student: Student,
  a: Assessment,
  history: Assessment[],
) {
  const doc = await createReport(student, a, history);
  doc.save(`nutrisport-evaluacion-${a.date}.pdf`);
}
