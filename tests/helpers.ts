import { expect, Page, APIRequestContext } from "@playwright/test";

export const OWNER = {
  email: "owner@beanandbloom.demo",
  slug: "bean-and-bloom",
  otp: "123456",
};

export const CUSTOMER = {
  email: "demo@customer.com",
  slug: "bean-and-bloom",
  otp: "123456",
};

export const SUPERADMIN = {
  email: "admin@cafeclub.demo",
  slug: "bean-and-bloom",
  otp: "123456",
};

export const ownerRoutes = [
  "/admin", "/admin/pos", "/admin/menu", "/admin/customers", "/admin/crm",
  "/admin/transactions", "/admin/loyalty", "/admin/rewards", "/admin/campaigns",
  "/admin/automations", "/admin/offers", "/admin/referrals", "/admin/feedback",
  "/admin/membership", "/admin/qr", "/admin/billing", "/admin/settings",
  "/admin/team", "/admin/audit", "/admin/analytics", "/admin/system",
];

export const customerRoutes = [
  "/c/bean-and-bloom", "/c/bean-and-bloom/rewards",
  "/c/bean-and-bloom/refer", "/c/bean-and-bloom/history",
  "/c/bean-and-bloom/feedback", "/c/bean-and-bloom/membership",
  "/c/bean-and-bloom/settings", "/c/bean-and-bloom/offers",
];

export const platformRoutes = [
  "/admin/platform-analytics", "/admin/cafes",
  "/admin/plans", "/admin/subscriptions",
];

async function fillOtp(page: Page) {
  const inputs = page.locator("input");
  for (let i = 0; i < await inputs.count(); i++) {
    const el = inputs.nth(i);
    if (!(await el.isVisible())) continue;
    const type = await el.getAttribute("type");
    const name = ((await el.getAttribute("name")) || "").toLowerCase();
    const ph = ((await el.getAttribute("placeholder")) || "").toLowerCase();
    if (type !== "email" &&
        (name.includes("otp") || ph.includes("otp") || type === "text")) {
      await el.fill("123456");
      return;
    }
  }
  throw new Error("Visible OTP input was not found");
}

export async function login(page: Page, user: typeof OWNER | typeof CUSTOMER | typeof SUPERADMIN) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/café slug|cafe slug|slug/i).fill(user.slug);
  await page.getByRole("button", { name: /send|request|get.*otp|continue/i }).click();
  await fillOtp(page);
  await page.getByRole("button", { name: /verify|login|continue/i }).click();
  await page.waitForURL(/\/(admin|c\/bean-and-bloom)/, { timeout: 20000 });
}

export async function expectHealthyPage(page: Page, route: string) {
  const errors: string[] = [];
  const handler = (e: Error) => errors.push(e.message);
  page.on("pageerror", handler);
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 0, `${route} status`).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible();
  const body = (await page.locator("body").innerText()).trim();
  expect(body.length, `${route} blank`).toBeGreaterThan(10);
  expect(errors, `${route} JS errors`).toEqual([]);
  page.removeListener("pageerror", handler);
}

export async function getJson(r: APIRequestContext, path: string) {
  const response = await r.get(path);
  let body: any = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}
