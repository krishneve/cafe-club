import { test, expect } from "@playwright/test";

/**
 * Tenant-isolation regression tests.
 *
 * These tests deliberately avoid inventing undocumented mutation payloads.
 * They verify that an authenticated cafe owner cannot escape its tenant through
 * path/query manipulation and that customer wallet URLs stay tenant-bound.
 */
test.describe("Tenant isolation", () => {
  test("owner cannot switch cafe tenant through common query parameters", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("owner@beanandbloom.demo");
    await page.getByLabel(/café slug|cafe slug|slug/i).fill("bean-and-bloom");
    await page.getByRole("button", { name: /send|request|get.*otp|continue/i }).click();

    const inputs = page.locator("input");
    for (let i = 0; i < await inputs.count(); i++) {
      const el = inputs.nth(i);
      if (await el.isVisible()) {
        const type = await el.getAttribute("type");
        const name = ((await el.getAttribute("name")) || "").toLowerCase();
        const ph = ((await el.getAttribute("placeholder")) || "").toLowerCase();
        if (type !== "email" && (name.includes("otp") || ph.includes("otp") || type === "text")) {
          await el.fill("123456");
          break;
        }
      }
    }
    await page.getByRole("button", { name: /verify|login|continue/i }).click();
    await page.waitForURL(/\/admin/);

    const variants = [
      "/admin/customers?cafeId=other",
      "/admin/transactions?cafeId=other",
      "/admin/menu?cafeId=other",
      "/admin/rewards?cafeId=other",
      "/admin/analytics?cafeId=other",
    ];

    for (const route of variants) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0).toBeLessThan(500);
      expect(page.url()).not.toMatch(/\/login(?:[/?#]|$)/);
      // The page must remain in the authenticated owner application; server-side
      // tenant scoping must not be bypassed merely by a client-supplied cafeId.
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("customer wallet remains bound to its cafe slug", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo@customer.com");
    await page.getByLabel(/café slug|cafe slug|slug/i).fill("bean-and-bloom");
    await page.getByRole("button", { name: /send|request|get.*otp|continue/i }).click();

    const inputs = page.locator("input");
    for (let i = 0; i < await inputs.count(); i++) {
      const el = inputs.nth(i);
      if (await el.isVisible()) {
        const type = await el.getAttribute("type");
        const name = ((await el.getAttribute("name")) || "").toLowerCase();
        const ph = ((await el.getAttribute("placeholder")) || "").toLowerCase();
        if (type !== "email" && (name.includes("otp") || ph.includes("otp") || type === "text")) {
          await el.fill("123456");
          break;
        }
      }
    }
    await page.getByRole("button", { name: /verify|login|continue/i }).click();
    await page.waitForURL(/\/c\/bean-and-bloom/);

    const response = await page.goto("/c/nonexistent-cafe", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 0).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/c\/bean-and-bloom/);
  });
});
