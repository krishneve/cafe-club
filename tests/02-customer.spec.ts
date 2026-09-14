import { test, expect, Page } from "@playwright/test";

const customerRoutes = [
  "/c/bean-and-bloom",
  "/c/bean-and-bloom/rewards",
  "/c/bean-and-bloom/refer",
  "/c/bean-and-bloom/history",
  "/c/bean-and-bloom/feedback",
  "/c/bean-and-bloom/membership",
  "/c/bean-and-bloom/settings",
  "/c/bean-and-bloom/offers",
];

async function loginAsCustomer(page: Page) {
  await page.goto("/login?cafe=bean-and-bloom");
  await page.getByLabel("Email").fill("demo@customer.com");
  await page.getByLabel(/Café code/i).fill("bean-and-bloom");
  await page.getByRole("button", { name: /Send secure code/i }).click();
  await page.getByLabel(/One-time code/i).fill("123456");
  await page.getByRole("button", { name: /Verify & continue/i }).click();
  await page.waitForURL("**/c/bean-and-bloom**");
}

test.describe("Customer wallet", () => {
  test("demo customer can authenticate", async ({ page }) => {
    await loginAsCustomer(page);
    await expect(page).toHaveURL(/\/c\/bean-and-bloom/);
  });

  test("every customer route renders without runtime/server errors", async ({ page }) => {
    await loginAsCustomer(page);

    const failures: string[] = [];

    for (const route of customerRoutes) {
      const jsErrors: string[] = [];
      const onPageError = (e: Error) => jsErrors.push(e.message);
      page.on("pageerror", onPageError);

      try {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        if (status >= 500) failures.push(`${route}: HTTP ${status}`);
        if (page.url().includes("/login")) failures.push(`${route}: redirected to login`);
        if (jsErrors.length) failures.push(`${route}: ${jsErrors.join(" | ")}`);
      } catch (e) {
        failures.push(`${route}: ${(e as Error).message}`);
      } finally {
        page.off("pageerror", onPageError);
      }
    }

    expect(failures, "customer route failures").toEqual([]);
  });
});
