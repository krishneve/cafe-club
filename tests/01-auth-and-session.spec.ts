import { test, expect } from "@playwright/test";

async function login(page: any, email: string, slug: string, destination: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/café slug|cafe slug|slug/i).fill(slug);
  await page.getByRole("button", { name: /send|request|get.*otp|continue/i }).click();

  const otp = page.locator('input').filter({ has: undefined }).last();
  const otpInput = page.locator('input').filter({ hasText: "" });
  // Dev seed uses 123456; select the first visible OTP-like input if available.
  const candidates = page.locator('input');
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    const type = await el.getAttribute("type");
    const name = ((await el.getAttribute("name")) || "").toLowerCase();
    const ph = ((await el.getAttribute("placeholder")) || "").toLowerCase();
    if (type === "text" && (name.includes("otp") || ph.includes("otp"))) {
      await el.fill("123456");
      break;
    }
  }
  await page.getByRole("button", { name: /verify|login|continue/i }).click();
  await page.waitForURL(new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { timeout: 20_000 });
}

test.describe("Authentication and session boundaries", () => {
  test("owner login page can request and verify development OTP", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).fill("owner@beanandbloom.demo");
    await page.getByLabel(/café slug|cafe slug|slug/i).fill("bean-and-bloom");
    await page.getByRole("button", { name: /send|request|get.*otp|continue/i }).click();

    await expect(page.getByText(/otp|verification|code/i).first()).toBeVisible();

    const inputs = page.locator("input");
    const n = await inputs.count();
    let filled = false;
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute("type");
      const name = ((await el.getAttribute("name")) || "").toLowerCase();
      const placeholder = ((await el.getAttribute("placeholder")) || "").toLowerCase();
      if (type !== "email" && (name.includes("otp") || placeholder.includes("otp") || type === "text")) {
        if (await el.isVisible()) {
          await el.fill("123456");
          filled = true;
          break;
        }
      }
    }
    expect(filled).toBeTruthy();
    await page.getByRole("button", { name: /verify|login|continue/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 20_000 });
  });

  test("customer can request and verify development OTP", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).fill("demo@customer.com");
    await page.getByLabel(/café slug|cafe slug|slug/i).fill("bean-and-bloom");
    await page.getByRole("button", { name: /send|request|get.*otp|continue/i }).click();

    const inputs = page.locator("input");
    const n = await inputs.count();
    let filled = false;
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute("type");
      const name = ((await el.getAttribute("name")) || "").toLowerCase();
      const placeholder = ((await el.getAttribute("placeholder")) || "").toLowerCase();
      if (type !== "email" && (name.includes("otp") || placeholder.includes("otp") || type === "text")) {
        if (await el.isVisible()) {
          await el.fill("123456");
          filled = true;
          break;
        }
      }
    }
    expect(filled).toBeTruthy();
    await page.getByRole("button", { name: /verify|login|continue/i }).click();
    await page.waitForURL(/\/c\/bean-and-bloom/, { timeout: 20_000 });
  });

  test("protected API rejects anonymous access", async ({ request }) => {
    const endpoints = [
      "/api/cafe/transactions",
      "/api/cafe/customers",
      "/api/cafe/menu",
      "/api/cafe/loyalty",
      "/api/cafe/rewards",
    ];

    for (const endpoint of endpoints) {
      const r = await request.get(endpoint);
      expect(r.status(), endpoint).toBeGreaterThanOrEqual(401);
      expect(r.status(), endpoint).toBeLessThan(500);
    }
  });

  test("health endpoint is not a server crash", async ({ request }) => {
    const r = await request.get("/api/health");
    expect(r.status()).toBeLessThan(500);
  });

  test("readiness endpoint reports readiness state without an unexpected crash", async ({ request }) => {
    const r = await request.get("/api/readiness");
    // Local development can legitimately be not-ready (503). A crash (500) is not acceptable.
    expect([200, 503]).toContain(r.status());
    const text = await r.text();
    expect(text.length).toBeGreaterThan(0);
  });
});
