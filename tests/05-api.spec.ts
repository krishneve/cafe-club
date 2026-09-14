import { test, expect } from "@playwright/test";

const protectedRoutes = [
  "/api/cafe/transactions", "/api/cafe/customers", "/api/cafe/menu",
  "/api/cafe/loyalty", "/api/cafe/rewards",
];

test.describe("API - 35 tests", () => {
  test("161 health GET", async ({ request }) => { expect((await request.get("/api/health")).status()).toBeLessThan(500); });
  test("162 readiness GET", async ({ request }) => { expect([200, 503]).toContain((await request.get("/api/readiness")).status()); });
  for (let i = 0; i < 5; i++) test(`16${3 + i} protected API ${protectedRoutes[i]} rejects anonymous`, async ({ request }) => { const s = (await request.get(protectedRoutes[i])).status(); expect(s).toBeGreaterThanOrEqual(401); expect(s).toBeLessThan(500); });
  test("168 request OTP valid demo owner", async ({ request }) => { const s = (await request.post("/api/auth/request-otp", { data: { email: "owner@beanandbloom.demo", cafeSlug: "bean-and-bloom" } })).status(); expect(s).toBeLessThan(500); });
  test("169 request OTP valid customer", async ({ request }) => { const s = (await request.post("/api/auth/request-otp", { data: { email: "demo@customer.com", cafeSlug: "bean-and-bloom" } })).status(); expect(s).toBeLessThan(500); });
  test("170 request OTP invalid email", async ({ request }) => { const s = (await request.post("/api/auth/request-otp", { data: { email: "not-an-email", cafeSlug: "bean-and-bloom" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("171 request OTP empty email", async ({ request }) => { const s = (await request.post("/api/auth/request-otp", { data: { email: "", cafeSlug: "bean-and-bloom" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("172 request OTP missing slug", async ({ request }) => { const s = (await request.post("/api/auth/request-otp", { data: { email: "owner@beanandbloom.demo" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("173 request OTP missing email", async ({ request }) => { const s = (await request.post("/api/auth/request-otp", { data: { cafeSlug: "bean-and-bloom" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("174 verify missing OTP", async ({ request }) => { const s = (await request.post("/api/auth/verify-otp", { data: { email: "owner@beanandbloom.demo", cafeSlug: "bean-and-bloom" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("175 verify invalid OTP", async ({ request }) => { const s = (await request.post("/api/auth/verify-otp", { data: { email: "owner@beanandbloom.demo", cafeSlug: "bean-and-bloom", otp: "000000" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("176 verify malformed email", async ({ request }) => { const s = (await request.post("/api/auth/verify-otp", { data: { email: "x", cafeSlug: "bean-and-bloom", otp: "123456" } })).status(); expect(s).toBeGreaterThanOrEqual(400); });
  test("177 transaction POST anonymous denied", async ({ request }) => { const s = (await request.post("/api/cafe/transactions", { data: {} })).status(); expect(s).toBeGreaterThanOrEqual(401); });
  test("178 customers POST anonymous denied", async ({ request }) => { const s = (await request.post("/api/cafe/customers", { data: {} })).status(); expect(s).toBeGreaterThanOrEqual(401); });
  test("179 menu POST anonymous denied", async ({ request }) => { const s = (await request.post("/api/cafe/menu", { data: {} })).status(); expect(s).toBeGreaterThanOrEqual(401); });
  test("180 rewards POST anonymous denied", async ({ request }) => { const s = (await request.post("/api/cafe/rewards", { data: {} })).status(); expect(s).toBeGreaterThanOrEqual(401); });
  test("181 transaction malformed JSON safe", async ({ request }) => { const s = (await request.post("/api/cafe/transactions", { headers: { "content-type": "application/json" }, data: "[" })).status(); expect(s).toBeLessThan(500); });
  test("182 customer malformed JSON safe", async ({ request }) => { const s = (await request.post("/api/cafe/customers", { headers: { "content-type": "application/json" }, data: "[" })).status(); expect(s).toBeLessThan(500); });
  test("183 menu malformed JSON safe", async ({ request }) => { const s = (await request.post("/api/cafe/menu", { headers: { "content-type": "application/json" }, data: "[" })).status(); expect(s).toBeLessThan(500); });
  test("184 rewards malformed JSON safe", async ({ request }) => { const s = (await request.post("/api/cafe/rewards", { headers: { "content-type": "application/json" }, data: "[" })).status(); expect(s).toBeLessThan(500); });
  test("185 health has response body", async ({ request }) => { expect((await request.get("/api/health")).text()).resolves.not.toBe(""); });
  test("186 readiness has response body", async ({ request }) => { expect((await request.get("/api/readiness")).text()).resolves.not.toBe(""); });
  test("187 anonymous protected API status bounded", async ({ request }) => { for (const x of protectedRoutes) { const s = (await request.get(x)).status(); expect(s).toBeGreaterThanOrEqual(401); expect(s).toBeLessThan(500); } });
  test("188 API auth endpoint exists", async ({ request }) => { expect((await request.post("/api/auth/request-otp", { data: {} })).status()).not.toBe(404); });
  test("189 API verify endpoint exists", async ({ request }) => { expect((await request.post("/api/auth/verify-otp", { data: {} })).status()).not.toBe(404); });
  test("190 API logout endpoint exists", async ({ request }) => { expect((await request.post("/api/auth/logout")).status()).not.toBe(404); });
  test("191 health isn't HTML-only failure", async ({ request }) => { const r = await request.get("/api/health"); expect((await r.text()).length).toBeGreaterThan(0); });
  test("192 readiness isn't HTML-only failure", async ({ request }) => { const r = await request.get("/api/readiness"); expect((await r.text()).length).toBeGreaterThan(0); });
  test("193 protected customer API isn't public", async ({ request }) => { expect((await request.get("/api/cafe/customers")).status()).toBeGreaterThanOrEqual(401); });
  test("194 protected transaction API isn't public", async ({ request }) => { expect((await request.get("/api/cafe/transactions")).status()).toBeGreaterThanOrEqual(401); });
  test("195 protected menu API isn't public", async ({ request }) => { expect((await request.get("/api/cafe/menu")).status()).toBeGreaterThanOrEqual(401); });
  test("196 protected loyalty API isn't public", async ({ request }) => { expect((await request.get("/api/cafe/loyalty")).status()).toBeGreaterThanOrEqual(401); });
  test("197 protected rewards API isn't public", async ({ request }) => { expect((await request.get("/api/cafe/rewards")).status()).toBeGreaterThanOrEqual(401); });
  test("198 API malformed input never 500", async ({ request }) => { for (const x of protectedRoutes) { const s = (await request.post(x, { headers: { "content-type": "application/json" }, data: "bad" })).status(); expect(s, x).toBeLessThan(500); } });
  test("199 API request OTP malformed input safe", async ({ request }) => { expect((await request.post("/api/auth/request-otp", { headers: { "content-type": "application/json" }, data: "bad" })).status()).toBeLessThan(500); });
  test("200 API verify OTP malformed input safe", async ({ request }) => { expect((await request.post("/api/auth/verify-otp", { headers: { "content-type": "application/json" }, data: "bad" })).status()).toBeLessThan(500); });
});
