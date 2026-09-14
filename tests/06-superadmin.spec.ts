import { test, expect } from "@playwright/test";
import { SUPERADMIN, platformRoutes, login, expectHealthyPage } from "./helpers";

test.describe("SUPER ADMIN - 25 tests", () => {
  test.beforeEach(async ({page}) => { await login(page,SUPERADMIN); });
  for(const [i,route] of platformRoutes.entries()) test(`201 superadmin platform route ${i+1} ${route}`, async ({page}) => { await expectHealthyPage(page,route); expect(page.url()).toContain(route); });
  test("205 superadmin dashboard isn't blank", async ({page}) => { await page.goto("/admin"); expect((await page.locator("body").innerText()).length).toBeGreaterThan(20); });
  test("206 superadmin can reload platform analytics", async ({page}) => { await page.goto("/admin/platform-analytics"); await page.reload(); expect(page.url()).toContain("platform-analytics"); });
  test("207 superadmin can reload cafes", async ({page}) => { await page.goto("/admin/cafes"); await page.reload(); expect(page.url()).toContain("/admin/cafes"); });
  test("208 superadmin can reload plans", async ({page}) => { await page.goto("/admin/plans"); await page.reload(); expect(page.url()).toContain("/admin/plans"); });
  test("209 superadmin can reload subscriptions", async ({page}) => { await page.goto("/admin/subscriptions"); await page.reload(); expect(page.url()).toContain("/admin/subscriptions"); });
  test("210 platform analytics body visible", async ({page}) => { await page.goto("/admin/platform-analytics"); await expect(page.locator("body")).toBeVisible(); });
  test("211 cafes body visible", async ({page}) => { await page.goto("/admin/cafes"); await expect(page.locator("body")).toBeVisible(); });
  test("212 plans body visible", async ({page}) => { await page.goto("/admin/plans"); await expect(page.locator("body")).toBeVisible(); });
  test("213 subscriptions body visible", async ({page}) => { await page.goto("/admin/subscriptions"); await expect(page.locator("body")).toBeVisible(); });
  test("214 superadmin doesn't redirect to customer", async ({page}) => { expect(page.url()).not.toContain("/c/"); });
  test("215 superadmin session cookie exists", async ({context}) => { expect((await context.cookies()).some(x=>x.name==="cc_session")).toBeTruthy(); });
  test("216 superadmin can navigate platform routes", async ({page}) => { for(const r of platformRoutes){await page.goto(r); expect(page.url()).toContain(r);} });
  test("217 platform route count is four", async () => { expect(platformRoutes).toHaveLength(4); });
  test("218 platform analytics not 500", async ({page}) => { const r=await page.goto("/admin/platform-analytics"); expect(r?.status()??0).toBeLessThan(500); });
  test("219 cafes not 500", async ({page}) => { const r=await page.goto("/admin/cafes"); expect(r?.status()??0).toBeLessThan(500); });
  test("220 plans not 500", async ({page}) => { const r=await page.goto("/admin/plans"); expect(r?.status()??0).toBeLessThan(500); });
  test("221 subscriptions not 500", async ({page}) => { const r=await page.goto("/admin/subscriptions"); expect(r?.status()??0).toBeLessThan(500); });
  test("222 platform analytics has text", async ({page}) => { await page.goto("/admin/platform-analytics"); expect((await page.locator("body").innerText()).length).toBeGreaterThan(10); });
  test("223 cafes has text", async ({page}) => { await page.goto("/admin/cafes"); expect((await page.locator("body").innerText()).length).toBeGreaterThan(10); });
  test("224 plans has text", async ({page}) => { await page.goto("/admin/plans"); expect((await page.locator("body").innerText()).length).toBeGreaterThan(10); });
  test("225 subscriptions has text", async ({page}) => { await page.goto("/admin/subscriptions"); expect((await page.locator("body").innerText()).length).toBeGreaterThan(10); });
});
