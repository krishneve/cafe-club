import { test, expect } from "@playwright/test";

test("Cafe owner can log in with development OTP", async ({ page }) => {
  await page.goto("/login?cafe=bean-and-bloom");

  await page.getByLabel("Email").fill("owner@beanandbloom.demo");
  await page.getByLabel("Café code").fill("bean-and-bloom");

  await page.getByRole("button", { name: /Send secure code/i }).click();

  await expect(
    page.getByText(/Development mode: OTP is/i)
  ).toBeVisible();

  await page.getByLabel("One-time code").fill("123456");

  await page.getByRole("button", { name: /Verify & continue/i }).click();

  await page.waitForURL("**/admin**");

  await expect(page).toHaveURL(/\/admin/);
});