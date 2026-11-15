import { test, expect } from "@playwright/test";

test("farmer registers, draws a field, submits a claim and sees the analysis", async ({ page }) => {
  const email = `farmer${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Ravi Kumar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Passw0rd!x");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: /Welcome, Ravi/ })).toBeVisible();

  await page.goto("/app/fields");
  await page.getByRole("button", { name: "Farm", exact: true }).click();
  await page.getByLabel("Farm name").fill("Ravi Farm");
  await page.getByLabel("State").selectOption("Karnataka");
  await page.getByLabel("District", { exact: true }).fill("Bengaluru Rural");
  await page.getByRole("button", { name: "Save farm" }).click();
  await page.getByRole("button", { name: "Field", exact: true }).click();
  await page.getByLabel("Field name").fill("North plot");
  for (let i = 0; i < 11; i++) await page.locator(".leaflet-control-zoom-in").click();
  const box = (await page.locator(".leaflet-container").first().boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  for (const [dx, dy] of [[-40, -40], [40, -40], [40, 40], [-40, 40]]) await page.mouse.click(cx + dx, cy + dy);
  await page.getByRole("button", { name: "Save field" }).click();
  await expect(page.getByText("North plot")).toBeVisible();
  await expect(page.getByText(/DIGIPIN/)).toBeVisible();

  await page.goto("/app/claims/new");
  await page.getByLabel("Which field was damaged?").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Crop name").fill("Paddy");
  await page.getByRole("button", { name: "Next" }).click();
  const d = new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10);
  await page.getByLabel("Date it happened").fill(d);
  await page.getByLabel("Describe the damage").fill("Field flooded for 4 days");
  await page.getByRole("button", { name: "Next" }).click();
  await page.setInputFiles('input[type="file"]', "e2e/sample.jpg");
  await expect(page.getByText(/Saved on server/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByRole("heading", { name: /KC-/ })).toBeVisible();
  await expect(page.getByText("Analysis completed").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Preliminary assessment/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Download PDF report/ })).toBeVisible();
});
