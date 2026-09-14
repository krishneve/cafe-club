import { test, expect, Page } from "@playwright/test";

async function loginAs(page: Page, email: string, slug = "bean-and-bloom") {
  await page.goto(`/login?cafe=${slug}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Café code/i).fill(slug);
  await page.getByRole("button", { name: /Send secure code/i }).click();
  await page.getByLabel(/One-time code/i).fill("123456");
  await page.getByRole("button", { name: /Verify & continue/i }).click();
}

test.describe("Platform and authorization boundaries", () => {
  test("super admin can reach platform routes", async ({ page }) => {
    await loginAs(page, "admin@cafeclub.demo");

    const routes = ["/admin/platform-analytics", "/admin/cafes", "/admin/plans", "/admin/subscriptions"];
    const failures: string[] = [];

    for (const route of routes) {
      const errors: string[] = [];
      const onError = (e: Error) => errors.push(e.message);
      page.on("pageerror", onError);

      try {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        if (status >= 500) failures.push(`${route}: HTTP ${status}`);
        if (page.url().includes("/login")) failures.push(`${route}: redirected to login`);
        if (errors.length) failures.push(`${route}: ${errors.join(" | ")}`);
      } catch (e) {
        failures.push(`${route}: ${(e as Error).message}`);
      } finally {
        page.off("pageerror", onError);
      }
    }

    expect(failures).toEqual([]);
  });

  test("owner cannot access platform administration", async ({ page }) => {
    await loginAs(page, "owner@beanandbloom.demo");

    const routes = ["/admin/platform-analytics", "/admin/cafes", "/admin/plans", "/admin/subscriptions"];
    const results: string[] = [];

    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      const status = response?.status() ?? 0;
      const url = page.url();

      // Accept an explicit denial or redirect. Never accept a successful platform page.
      if (status < 400 && !url.includes("/login") && !url.includes("/403") && !url.includes("/unauthorized")) {
        results.push(`${route}: accessible (${status})`);
      }
    }

    expect(results, "owner must not access platform admin").toEqual([]);
  });
});
