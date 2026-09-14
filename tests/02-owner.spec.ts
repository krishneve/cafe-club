import { test, expect } from "@playwright/test";
import { OWNER, ownerRoutes, platformRoutes, login, expectHealthyPage } from "./helpers";

test.describe("OWNER - 55 tests", () => {
  test.beforeEach(async ({page}) => { await login(page, OWNER); });

  test("026 authenticated owner reaches admin", async ({page}) => { expect(new URL(page.url()).pathname).toMatch(/^\/admin/); });
  test("027 owner session cookie exists", async ({context}) => { const c=await context.cookies(); expect(c.some(x=>x.name==="cc_session")).toBeTruthy(); });

  const routeTests = ownerRoutes.map((route, i) => test(`owner route ${String(i+1).padStart(2,"0")} ${route}`, async ({page}) => {
    await expectHealthyPage(page, route);
    expect(page.url()).not.toMatch(/\/login(?:[/?#]|$)/);
  }));
  void routeTests;

  test("049 owner dashboard contains navigation", async ({page}) => { await page.goto("/admin"); expect(await page.locator("a[href^='/admin']").count()).toBeGreaterThan(3); });
  test("050 POS is reachable", async ({page}) => { await expectHealthyPage(page,"/admin/pos"); });
  test("051 menu is reachable", async ({page}) => { await expectHealthyPage(page,"/admin/menu"); });
  test("052 customers is reachable", async ({page}) => { await expectHealthyPage(page,"/admin/customers"); });
  test("053 transactions is reachable", async ({page}) => { await expectHealthyPage(page,"/admin/transactions"); });
  test("054 analytics is reachable", async ({page}) => { await expectHealthyPage(page,"/admin/analytics"); });
  test("055 settings is reachable", async ({page}) => { await expectHealthyPage(page,"/admin/settings"); });
  test("056 owner cannot be sent to customer wallet by dashboard navigation", async ({page}) => { await page.goto("/admin"); expect(page.url()).toMatch(/\/admin/); });
  test("057 owner can revisit dashboard", async ({page}) => { await page.goto("/admin"); await page.reload(); expect(page.url()).toMatch(/\/admin/); });
  test("058 owner session survives navigation", async ({page}) => { await page.goto("/admin/menu"); await page.goto("/admin/customers"); expect(page.url()).toMatch(/customers/); });
  test("059 owner system page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/system"); });
  test("060 owner audit page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/audit"); });
  test("061 owner billing page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/billing"); });
  test("062 owner team page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/team"); });
  test("063 owner QR page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/qr"); });
  test("064 owner membership page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/membership"); });
  test("065 owner offers page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/offers"); });
  test("066 owner referrals page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/referrals"); });
  test("067 owner feedback page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/feedback"); });
  test("068 owner loyalty page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/loyalty"); });
  test("069 owner rewards page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/rewards"); });
  test("070 owner campaigns page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/campaigns"); });
  test("071 owner automations page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/automations"); });
  test("072 owner CRM page does not crash", async ({page}) => { await expectHealthyPage(page,"/admin/crm"); });
  test("073 owner route set is non-empty", async () => { expect(ownerRoutes.length).toBeGreaterThan(15); });
  test("074 platform route set is defined", async () => { expect(platformRoutes.length).toBe(4); });
  test("075 owner login does not land on platform page", async ({page}) => { expect(page.url()).not.toContain("platform-analytics"); });
  test("076 owner can use browser back", async ({page}) => { await page.goto("/admin/menu"); await page.goto("/admin/customers"); await page.goBack(); expect(page.url()).toContain("/admin/menu"); });
  test("077 owner can use browser forward", async ({page}) => { await page.goto("/admin/menu"); await page.goto("/admin/customers"); await page.goBack(); await page.goForward(); expect(page.url()).toContain("/admin/customers"); });
  test("078 owner dashboard has visible body", async ({page}) => { await page.goto("/admin"); await expect(page.locator("body")).toBeVisible(); });
  test("079 owner dashboard has text", async ({page}) => { await page.goto("/admin"); expect((await page.locator("body").innerText()).length).toBeGreaterThan(20); });
  test("080 owner POS has visible body", async ({page}) => { await page.goto("/admin/pos"); await expect(page.locator("body")).toBeVisible(); });
});
