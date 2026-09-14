import { test, expect } from "@playwright/test";

const platformRoutes = [
  "/admin/platform-analytics",
  "/admin/cafes",
  "/admin/plans",
  "/admin/subscriptions",
];

async function login(page: any, email: string, slug: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/café slug|cafe slug|slug/i).fill(slug);
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
}

test.describe("Platform authorization", () => {
  test("super admin can access platform administration", async ({ page }) => {
    await login(page, "admin@cafeclub.demo", "bean-and-bloom");
    for (const route of platformRoutes) {
      const r = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(r?.status() ?? 0, route).toBeLessThan(500);
      expect(page.url()).not.toMatch(/\/login(?:[/?#]|$)/);
    }
  });

  test("cafe owner is denied platform administration", async ({ page }) => {
    await login(page, "owner@beanandbloom.demo", "bean-and-bloom");

    for (const route of platformRoutes) {
      const r = await page.goto(route, { waitUntil: "domcontentloaded" });
      const status = r?.status() ?? 0;
      const url = page.url();

      // Expected: 401/403 or redirect away from platform route.
      const denied = status === 401 || status === 403 ||
        !new URL(url).pathname.startsWith(route);
      expect(denied, `SECURITY FAILURE: owner reached ${route} with ${status} at ${url}`).toBeTruthy();
    }
  });
});
