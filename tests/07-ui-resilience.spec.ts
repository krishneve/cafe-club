import { test, expect } from "@playwright/test";

const importantRoutes = [
  "/",
  "/signup",
  "/login",
  "/pricing",
  "/admin",
  "/admin/pos",
  "/admin/menu",
  "/admin/customers",
  "/admin/transactions",
  "/admin/rewards",
  "/admin/campaigns",
  "/admin/offers",
  "/admin/membership",
  "/admin/qr",
  "/admin/billing",
  "/admin/settings",
  "/admin/team",
  "/admin/audit",
  "/admin/analytics",
  "/c/bean-and-bloom",
  "/c/bean-and-bloom/rewards",
  "/c/bean-and-bloom/history",
  "/c/bean-and-bloom/offers",
];

test.describe("UI resilience", () => {
  test("important screens contain visible application content", async ({ page }) => {
    // Anonymous screens are checked directly. Protected screens are expected to
    // redirect rather than render a blank/crashed page.
    for (const route of importantRoutes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, route).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      const text = (await page.locator("body").innerText()).trim();
      expect(text.length, `Blank page at ${route}`).toBeGreaterThan(10);
    }
  });
});
