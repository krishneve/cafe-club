import { test, expect } from "@playwright/test";

const publicRoutes = [
  "/",
  "/signup",
  "/login",
  "/pricing",
  "/not-found",
];

test.describe("CafeClub public application", () => {
  for (const path of publicRoutes) {
    test(`${path} renders without server/client errors`, async ({ page }) => {
      const jsErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("pageerror", e => jsErrors.push(e.message));
      page.on("requestfailed", r => {
        if (!r.url().includes("favicon")) {
          failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText ?? "failed"}`);
        }
      });

      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${path} HTTP status`).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();

      expect(jsErrors, `${path} JavaScript errors`).toEqual([]);
      expect(failedRequests, `${path} failed network requests`).toEqual([]);
    });
  }

  test("public navigation does not contain obvious broken internal links", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href]").evaluateAll(els =>
      els.map(e => (e as HTMLAnchorElement).getAttribute("href"))
        .filter((x): x is string => !!x && x.startsWith("/") && !x.startsWith("//"))
    );

    const unique = [...new Set(hrefs)].filter(h => !h.startsWith("/api/"));
    const failures: string[] = [];

    for (const href of unique) {
      const r = await page.request.get(`http://localhost:3000${href}`, { maxRedirects: 0 });
      if (r.status() >= 400 && r.status() !== 401 && r.status() !== 403) {
        failures.push(`${href} -> ${r.status()}`);
      }
    }

    expect(failures, "broken public/internal links").toEqual([]);
  });
});
