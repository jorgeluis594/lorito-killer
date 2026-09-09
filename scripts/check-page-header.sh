#!/usr/bin/env bash
# Requires Storybook running on localhost:6006 and playwright-cli.
set -euo pipefail
playwright-cli -s=page-header-check open http://localhost:6006
trap 'playwright-cli -s=page-header-check close' EXIT
check_output=$(playwright-cli -s=page-header-check run-code 'async page => {
  for (const overlay of ["modal", "drawer"]) {
    await page.goto(`http://localhost:6006/iframe.html?id=layout-pageheader--filters-with-${overlay}&viewMode=story`);
    const active = page.getByRole("radio", { name: "Activos", exact: true });
    await active.click();
    if (await active.getAttribute("aria-checked") !== "true") throw new Error("Quick filter did not select");
    await page.getByRole("textbox", { name: "Buscar documentos" }).fill("Contrato");
    const trigger = page.getByRole("button", { name: "Filtros", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Autor", { exact: true }).fill("Ana");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    if (!await trigger.evaluate(el => el === document.activeElement)) throw new Error("Focus did not return to trigger");
    const result = await page.getByRole("status").innerText();
    if (!result.includes("Activos") || !result.includes("Contrato") || !result.includes("Ana")) throw new Error("Filter state lost");
    await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
    const table = page.getByRole("table", { name: "Documentos de ejemplo" });
    await table.locator("tbody tr").nth(2).waitFor();
    if (await table.locator("tbody tr").count() !== 3) throw new Error("Reset did not restore all rows");
    await page.getByRole("radio", { name: "Archivados", exact: true }).click();
    await table.locator("tbody tr").nth(1).waitFor({ state: "detached" });
    if (await table.locator("tbody tr").count() !== 1 || !(await table.locator("tbody").innerText()).includes("Inventario anterior")) throw new Error("Table did not filter");
  }
  for (const story of ["minimal", "with-actions", "filters-with-modal", "long-content", "narrow-container"]) {
    await page.goto(`http://localhost:6006/iframe.html?id=layout-pageheader--${story}&viewMode=story`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    for (const width of [1280, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Overflow: ${story} at ${width}`);
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    }
  }
  return "PASS: filters, modal/drawer, keyboard, focus return, responsive layout and 200% text";
}')
printf '%s\n' "$check_output"
[[ "$check_output" == *'"PASS: filters,'* ]]
