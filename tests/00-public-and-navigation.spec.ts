import { test, expect } from "@playwright/test";

const publicRoutes = ["/", "/signup", "/login", "/pricing"];

test.describe("Public website + navigation", () => {
  for (const route of publicRoutes) {
    test(`loads ${route} without a server crash`, async ({ page, request }) => {
      const response = await request.get(route);
      expect(response.status(), `${route} returned ${response.status()}`).toBeLessThan(500);

      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();

      expect(errors, `JS errors on ${route}`).toEqual([]);
    });
  }

  test("homepage internal links do not point to broken pages", async ({ page, request }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator('a[href]').evaluateAll(as =>
      as.map(a => (a as HTMLAnchorElement).href)
        .filter(h => h.startsWith(location.origin))
    );

    const unique = [...new Set(hrefs)];
    expect(unique.length).toBeGreaterThan(0);

    for (const url of unique) {
      const u = new URL(url);
      const response = await request.get(u.pathname + u.search);
      expect(response.status(), `Broken internal link: ${url}`).toBeLessThan(500);
    }
  });

  test("unknown route resolves through the application's error handling", async ({ page }) => {
    const response = await page.goto("/this-route-should-not-exist-cc", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
