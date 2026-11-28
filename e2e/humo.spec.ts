import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  (page as unknown as { errores: string[] }).errores = errores;
});

test.afterEach(async ({ page }) => {
  expect((page as unknown as { errores: string[] }).errores, "errores en la consola").toEqual([]);
});

test("busca negocios y los muestra en el radar con su ficha", async ({ page, request }) => {
  await request.post("/api/demo/reiniciar");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Radar Pyme" })).toBeVisible();
  await page.getByRole("button", { name: "Buscar negocios" }).click();

  const puntos = page.getByRole("group", { name: /Plano de .* con 8 negocios/ }).getByRole("button");
  await expect(puntos).toHaveCount(8);
  await expect(page.locator("#ficha-nombre")).not.toBeEmpty();
  await expect(page.getByRole("link", { name: /Ver la demo de/ })).toBeVisible();

  // Elegir otro punto del radar cambia la ficha.
  const nombre = (await page.locator("ol button").nth(1).locator("span.font-medium").innerText()).trim();
  await page.locator("ol button").nth(1).click();
  await expect(page.locator("#ficha-nombre")).toHaveText(nombre);
});

test("la demo por negocio abre y avisa de que es una propuesta", async ({ page, request }) => {
  await request.post("/api/demo/reiniciar");
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar negocios" }).click();
  const enlace = page.getByRole("link", { name: /Ver la demo de/ });
  const href = await enlace.getAttribute("href");
  await page.goto(new URL(href!).pathname);
  await expect(page.getByRole("note")).toContainText("No es el sitio oficial");
});

test("el modo presentación arranca y se puede reiniciar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Modo presentación" }).click();
  await expect(page.getByText("Elijo un sector y una ciudad")).toBeVisible();
  await expect(page.getByRole("group", { name: /Plano de Buenos Aires con 8 negocios/ })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Reiniciar" }).click();
  await expect(page.getByText("Mensajes de hoy")).toContainText("0/");
  await page.getByRole("button", { name: "Cerrar" }).last().click();
  await expect(page.getByRole("button", { name: "Modo presentación" })).toBeVisible();
});
