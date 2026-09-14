import { test, expect } from "@playwright/test";
import { CUSTOMER, customerRoutes, login, expectHealthyPage } from "./helpers";

test.describe("CUSTOMER - 35 tests", () => {
  test.beforeEach(async ({page}) => { await login(page, CUSTOMER); });

  test("081 customer reaches wallet", async ({page}) => { expect(page.url()).toContain("/c/bean-and-bloom"); });
  test("082 customer session exists", async ({context}) => { expect((await context.cookies()).some(x=>x.name==="cc_session")).toBeTruthy(); });

  const routes = customerRoutes.map((route, i) => test(`customer route ${String(i+1).padStart(2,"0")} ${route}`, async ({page}) => {
    await expectHealthyPage(page, route);
    expect(page.url()).not.toMatch(/\/login(?:[/?#]|$)/);
  }));
  void routes;

  test("091 wallet home visible", async ({page}) => { await page.goto("/c/bean-and-bloom"); await expect(page.locator("body")).toBeVisible(); });
  test("092 rewards visible", async ({page}) => { await page.goto("/c/bean-and-bloom/rewards"); await expect(page.locator("body")).toBeVisible(); });
  test("093 history visible", async ({page}) => { await page.goto("/c/bean-and-bloom/history"); await expect(page.locator("body")).toBeVisible(); });
  test("094 offers visible", async ({page}) => { await page.goto("/c/bean-and-bloom/offers"); await expect(page.locator("body")).toBeVisible(); });
  test("095 referral page visible", async ({page}) => { await page.goto("/c/bean-and-bloom/refer"); await expect(page.locator("body")).toBeVisible(); });
  test("096 feedback page visible", async ({page}) => { await page.goto("/c/bean-and-bloom/feedback"); await expect(page.locator("body")).toBeVisible(); });
  test("097 membership page visible", async ({page}) => { await page.goto("/c/bean-and-bloom/membership"); await expect(page.locator("body")).toBeVisible(); });
  test("098 settings page visible", async ({page}) => { await page.goto("/c/bean-and-bloom/settings"); await expect(page.locator("body")).toBeVisible(); });
  test("099 customer remains on customer routes", async ({page}) => { await page.goto("/c/bean-and-bloom"); expect(page.url()).toContain("/c/bean-and-bloom"); });
  test("100 customer can reload wallet", async ({page}) => { await page.goto("/c/bean-and-bloom"); await page.reload(); expect(page.url()).toContain("/c/bean-and-bloom"); });
  test("101 customer can navigate wallet history", async ({page}) => { await page.goto("/c/bean-and-bloom"); await page.goto("/c/bean-and-bloom/history"); expect(page.url()).toContain("/history"); });
  test("102 customer can navigate rewards", async ({page}) => { await page.goto("/c/bean-and-bloom"); await page.goto("/c/bean-and-bloom/rewards"); expect(page.url()).toContain("/rewards"); });
  test("103 customer can navigate offers", async ({page}) => { await page.goto("/c/bean-and-bloom"); await page.goto("/c/bean-and-bloom/offers"); expect(page.url()).toContain("/offers"); });
  test("104 customer wallet is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(20); });
  test("105 customer rewards is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/rewards"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("106 customer history is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/history"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("107 customer offers is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/offers"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("108 customer refer is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/refer"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("109 customer feedback is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/feedback"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("110 customer membership is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/membership"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("111 customer settings is not blank", async ({page}) => { await page.goto("/c/bean-and-bloom/settings"); expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10); });
  test("112 nonexistent cafe does not expose wallet", async ({page}) => { const r=await page.goto("/c/no-such-cafe"); expect(r?.status()??0).toBeLessThan(500); expect(page.url()).not.toContain("bean-and-bloom"); });
  test("113 customer cannot reach admin through direct URL", async ({page}) => { const r=await page.goto("/admin"); expect(r?.status()??0).toBeLessThan(500); expect(page.url()).not.toMatch(/^http:\/\/localhost:3000\/admin(?:\/|$)/); });
  test("114 customer cannot reach platform admin", async ({page}) => { const r=await page.goto("/admin/plans"); expect(r?.status()??0).toBeLessThan(500); expect(page.url()).not.toMatch(/\/admin\/plans(?:[/?#]|$)/); });
  test("115 customer route set has all known wallet routes", async () => { expect(customerRoutes.length).toBe(8); });
});
