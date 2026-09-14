import { test, expect } from "@playwright/test";

const pages = [
  { name: "Landing page", path: "/" },
  { name: "Login page", path: "/login" },
  { name: "Signup page", path: "/signup" },
  { name: "Pricing page", path: "/pricing" },
];

for (const item of pages) {
  test(`${item.name} loads successfully`, async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto(item.path, {
      waitUntil: "domcontentloaded",
    });

    expect(
      response?.status(),
      `${item.name} returned an invalid HTTP status`,
    ).toBeLessThan(400);

    await expect(page.locator("body")).toBeVisible();

    expect(
      errors,
      `${item.name} has JavaScript runtime errors`,
    ).toEqual([]);
  });
}