import { test, expect } from "@playwright/test";

const routes = [
  "/c/bean-and-bloom",
  "/c/bean-and-bloom/rewards",
  "/c/bean-and-bloom/refer",
  "/c/bean-and-bloom/history",
  "/c/bean-and-bloom/feedback",
  "/c/bean-and-bloom/membership",
  "/c/bean-and-bloom/settings",
  "/c/bean-and-bloom/offers",
];

async function customerLogin(page: any) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
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
  await page.waitForURL(/\/c\/bean-and-bloom/, { timeout: 20_000 });
}

test.describe("Customer wallet", () => {
  test.beforeEach(async ({ page }) => {
    await customerLogin(page);
  });

  test("all customer routes render without 5xx or uncaught page errors", async ({ page }) => {
    for (const route of routes) {
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, route).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      expect(page.url()).not.toMatch(/\/login(?:[/?#]|$)/);
      expect(errors, `JS errors on ${route}`).toEqual([]);

      page.removeAllListeners("pageerror");
    }
  });
});
