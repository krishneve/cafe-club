import { test, expect } from "@playwright/test";

const ownerRoutes = [
  "/admin",
  "/admin/pos",
  "/admin/menu",
  "/admin/customers",
  "/admin/crm",
  "/admin/transactions",
  "/admin/loyalty",
  "/admin/rewards",
  "/admin/campaigns",
  "/admin/automations",
  "/admin/offers",
  "/admin/referrals",
  "/admin/feedback",
  "/admin/membership",
  "/admin/qr",
  "/admin/billing",
  "/admin/settings",
  "/admin/team",
  "/admin/audit",
  "/admin/analytics",
  "/admin/system",
];

async function ownerLogin(page: any) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
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
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 20_000 });
}

test.describe("Cafe owner application", () => {
  test.beforeEach(async ({ page }) => {
    await ownerLogin(page);
  });

  test("all owner routes render without 5xx or uncaught page errors", async ({ page }) => {
    for (const route of ownerRoutes) {
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, route).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();

      const finalUrl = page.url();
      expect(finalUrl, `${route} unexpectedly redirected to login`).not.toMatch(/\/login(?:[/?#]|$)/);
      expect(errors, `JS errors on ${route}`).toEqual([]);

      page.removeAllListeners("pageerror");
    }
  });

  test("owner session can navigate through sidebar links", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const links = await page.locator('a[href^="/admin"]').evaluateAll(as =>
      [...new Set(as.map(a => (a as HTMLAnchorElement).getAttribute("href")).filter(Boolean))]
    );
    expect(links.length).toBeGreaterThan(3);

    for (const href of links.slice(0, 30)) {
      const response = await page.goto(href!, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0).toBeLessThan(500);
      expect(page.url()).not.toMatch(/\/login(?:[/?#]|$)/);
    }
  });
});
