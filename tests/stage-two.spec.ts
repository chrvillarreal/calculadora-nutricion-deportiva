import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
for (const width of [320, 1440]) {
  test(`métodos, plan, PDF y offline a ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [],
      external: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:4173")) external.push(r.url());
    });
    page.on("dialog", (d) => d.accept());
    await page.goto("/");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await page.getByRole("button", { name: "Cargar ejemplo ficticio" }).click();
    await expect(
      page.getByText("Recursos disponibles para uso sin conexión.", {
        exact: false,
      }),
    ).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Evaluaciones", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Alumno", exact: true })
      .selectOption("demo-alex");
    await page.getByLabel("Fecha", { exact: true }).fill("2026-01-01");
    await page
      .getByLabel("Método energético")
      .selectOption("cunningham-1980-v1");
    await expect(page.getByRole("alert")).toContainText("masa magra");
    await expect(
      page.getByRole("button", { name: "Guardar evaluación", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Masa magra (kg, opcional)").fill("64");
    await page.getByLabel("Modo de planificación").selectOption("percent");
    await page.getByLabel("Ajuste energético (%)", { exact: true }).fill("-10");
    await page.getByLabel("Proteína (% energético)").fill("25");
    await page.getByLabel("Grasas (% energético)").fill("30");
    await page
      .getByLabel("Notas de evaluación")
      .fill(
        "Evaluación ficticia. Masa magra estimada por antropometría. " +
          "Texto de prueba para comprobar paginación y acentos: nutrición, evaluación, proteína. ".repeat(
            20,
          ),
      );
    await page
      .getByText("Comparar métodos con los mismos datos", { exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name: "2.957,4", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Guardar evaluación", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Evaluación guardada en este dispositivo.",
    );
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Seguimiento", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: /Evolución|Peso|Alex/ }),
    ).toBeVisible();
    await expect(
      page.getByText("En este período hay métodos energéticos distintos.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByLabel("Desde", { exact: true }).fill("2099-01-01");
    await page.getByLabel("Hasta", { exact: true }).fill("2026-01-01");
    await expect(page.getByRole("alert")).toContainText("Desde");
    await page.getByLabel("Desde", { exact: true }).fill("");
    await page.getByLabel("Hasta", { exact: true }).fill("");
    await page.screenshot({
      path: `test-results/seguimiento-${width}.png`,
      fullPage: true,
    });
    await context.setOffline(true);
    await page.reload();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Evaluaciones", exact: true })
      .click();
    const article = page
      .locator(".history > article")
      .filter({ hasText: "cunningham-1980-v1" });
    await expect(article).toHaveCount(1);
    const pdfPromise = page.waitForEvent("download");
    await article
      .getByRole("button", { name: "Descargar informe PDF" })
      .click();
    const pdf = await pdfPromise;
    await pdf.saveAs(`test-results/informe-${width}.pdf`);
    expect(
      readFileSync((await pdf.path())!)
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar copia JSON" }).click();
    const backup = await downloadPromise;
    const raw = JSON.parse(readFileSync((await backup.path())!, "utf8"));
    expect(raw.version).toBe(2);
    expect(
      raw.assessments.some((a: any) => a.formula === "cunningham-1980-v1"),
    ).toBe(true);
    expect(raw.assessments.some((a: any) => !a.schemaVersion)).toBe(true);
    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const r of await cache.keys()) urls.push(r.url);
      }
      return urls;
    });
    expect(cached.some((u) => u.endsWith("/fonts/NutriSans.ttf"))).toBe(true);
    expect(cached.some((u) => u.includes("report-"))).toBe(true);
    expect(cached.some((u) => u.includes(".pdf"))).toBe(false);
    const manifest = await page.evaluate(async () =>
      JSON.parse(await (await caches.match("/manifest.webmanifest"))!.text()),
    );
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((i: any) => i.sizes === "512x512")).toBe(true);
    // Escribir y restaurar los dos esquemas también sin red.
    await page
      .getByLabel("Elegir copia JSON")
      .setInputFiles((await backup.path())!);
    await page
      .getByRole("button", { name: "Reemplazar datos con esta copia" })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Copia restaurada correctamente.",
    );
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Alumnos", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Nuevo alumno", exact: true })
      .click();
    await page.getByLabel("Nombre o alias").fill("Offline Ficticio");
    await page
      .getByRole("button", { name: "Guardar ficha", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Ficha · Offline Ficticio",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Nombre o alias").fill("Offline Editado");
    await page
      .getByRole("button", { name: "Guardar ficha", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Eliminar alumno", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Alex Ejemplo (ficticio)",
        exact: true,
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
}
test("actualización explícita de PWA conserva IndexedDB", async ({ page }) => {
  const swPath = "dist/sw.js";
  const original = readFileSync(swPath, "utf8");
  try {
    await page.goto("/");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await page.getByRole("button", { name: "Cargar ejemplo ficticio" }).click();
    await expect(
      page.getByText("Recursos disponibles para uso sin conexión.", {
        exact: false,
      }),
    ).toBeVisible();
    const foreign = "cache-otra-app";
    await page.evaluate(async (name) => {
      await caches.open(name);
    }, foreign);
    writeFileSync(
      swPath,
      original.replace(
        /nutrisport-static-[a-f0-9]+/g,
        "nutrisport-static-test-update",
      ),
    );
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update();
    });
    const update = page.getByRole("button", {
      name: "Aplicar actualización y recargar",
    });
    await expect(update).toBeVisible();
    await Promise.all([page.waitForEvent("load"), update.click()]);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Alumnos", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Alex Ejemplo (ficticio)",
        exact: true,
      }),
    ).toBeVisible();

    await expect
      .poll(async () =>
        (await page.evaluate(() => caches.keys())).filter((k) =>
          k.startsWith("nutrisport-static-"),
        ),
      )
      .toEqual(["nutrisport-static-test-update"]);
    expect(await page.evaluate(() => caches.keys())).toContain(foreign);
  } finally {
    writeFileSync(swPath, original);
  }
});
