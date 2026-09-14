import { test, expect, Page } from "@playwright/test";

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

async function loginAsOwner(page: Page) {
  await page.goto("/login?cafe=bean-and-bloom");
  await page.getByLabel("Email").fill("owner@beanandbloom.demo");
  await page.getByLabel(/Café code/i).fill("bean-and-bloom");
  await page.getByRole("button", { name: /Send secure code/i }).click();
  await page.getByLabel(/One-time code/i).fill("123456");
  await page.getByRole("button", { name: /Verify & continue/i }).click();
  await page.waitForURL("**/admin**");
}

test.describe("Cafe owner authenticated application", () => {
  test("owner can authenticate", async ({ page }) => {
    await loginAsOwner(page);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("every owner route renders without runtime/server errors", async ({ page }) => {
    await loginAsOwner(page);

    const failures: string[] = [];

    for (const route of ownerRoutes) {
      const jsErrors: string[] = [];
      const serverErrors: string[] = [];

      const onPageError = (e: Error) => jsErrors.push(e.message);
      const onResponse = (r: import("@playwright/test").Response) => {
        if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
      };

      page.on("pageerror", onPageError);
      page.on("response", onResponse);

      try {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;

        if (status >= 500) failures.push(`${route}: HTTP ${status}`);
        if (page.url().includes("/login")) failures.push(`${route}: redirected to login`);
        if (jsErrors.length) failures.push(`${route}: ${jsErrors.join(" | ")}`);
        if (serverErrors.length) failures.push(`${route}: ${serverErrors.join(" | ")}`);
        if (!(await page.locator("body").count())) failures.push(`${route}: no body`);
      } catch (e) {
        failures.push(`${route}: navigation exception ${(e as Error).message}`);
      } finally {
        page.off("pageerror", onPageError);
        page.off("response", onResponse);
      }
    }

    expect(failures, "owner route failures").toEqual([]);
  });
});
