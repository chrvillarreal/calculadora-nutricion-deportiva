import { test, expect } from "@playwright/test";
for (const width of [320, 375, 430, 768, 1024, 1440]) {
  test(`flujo local completo a ${width}px`, async ({ page }) => {
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
      .getByRole("button", { name: "Agregar alumno", exact: true })
      .click();
    await page.getByLabel("Nombre o alias").fill("Prueba Ficticia");
    await page.getByLabel("Deporte", { exact: true }).fill("Fútbol");
    await page.getByLabel("Objetivo", { exact: true }).fill("Mantenimiento");
    await page.getByRole("button", { name: "Guardar ficha" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Ficha · Prueba Ficticia",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Nombre o alias").fill("Ficticia Editada");
    await page.getByRole("button", { name: "Guardar ficha" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Ficha · Ficticia Editada",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Nueva evaluación", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Guardar evaluación", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Evaluación guardada en este dispositivo.",
    );
    await page
      .getByRole("button", { name: "Seguimiento", exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name: "2.759", exact: true }).first(),
    ).toBeVisible();
    for (const name of [
      "Inicio",
      "Alumnos",
      "Calculadoras",
      "Evaluaciones",
      "Seguimiento",
      "Configuración",
    ]) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name, exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar copia JSON" }).click();
    const file = await download;
    const path = await file.path();
    expect(path).toBeTruthy();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Alumnos", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Eliminar alumno", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tu primer alumno empieza acá" }),
    ).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await page.getByLabel("Elegir copia JSON").setInputFiles(path!);
    await expect(
      page.getByText("Copia validada:", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reemplazar datos con esta copia" })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Copia restaurada correctamente.",
    );
    await page.reload();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Alumnos", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ficticia Editada", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Abrir ficha", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Historial individual" }),
    ).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await page.getByLabel("Elegir copia JSON").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
    await expect(page.getByRole("alert")).toContainText("Copia no válida");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Calculadoras", exact: true })
      .click();
    await page.getByLabel("Peso (kg)", { exact: true }).fill("0");
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Peso (kg)", { exact: true }).fill("80");
    await expect(
      page
        .locator(".metrics article")
        .filter({ hasText: "Gasto total" })
        .getByText("2.759", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Inicio", exact: true })
      .click();
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: `test-results/dashboard-${width}.png`,
        fullPage: true,
      });
  });
}
test("IndexedDB denegado mantiene calculadora operativa", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("Storage denied");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Calculadoras", exact: true })
    .click();
  await expect(
    page
      .locator(".metrics article")
      .filter({ hasText: "Gasto total" })
      .getByText("2.759", { exact: true }),
  ).toBeVisible();
});
