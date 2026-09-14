import { test, expect } from "@playwright/test";

test.describe("API contracts and safe error handling", () => {
  test("protected APIs never expose a successful anonymous response", async ({ request }) => {
    const endpoints = [
      "/api/cafe/transactions",
      "/api/cafe/customers",
      "/api/cafe/menu",
      "/api/cafe/loyalty",
      "/api/cafe/rewards",
    ];

    for (const endpoint of endpoints) {
      const r = await request.get(endpoint);
      expect(r.status()).toBeGreaterThanOrEqual(401);
      expect(r.status()).toBeLessThan(500);
    }
  });

  test("malformed JSON to a sensitive endpoint is handled as a client error", async ({ request }) => {
    const r = await request.post("/api/cafe/transactions", {
      headers: { "content-type": "application/json" },
      data: "{not-json",
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test("auth endpoint rejects empty payload safely", async ({ request }) => {
    const r = await request.post("/api/auth/request-otp", {
      headers: { "content-type": "application/json" },
      data: {},
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test("OTP verification rejects invalid code", async ({ request }) => {
    const requestOtp = await request.post("/api/auth/request-otp", {
      data: {
        email: "owner@beanandbloom.demo",
        cafeSlug: "bean-and-bloom",
      },
    });
    expect(requestOtp.status()).toBeLessThan(500);

    const verify = await request.post("/api/auth/verify-otp", {
      data: {
        email: "owner@beanandbloom.demo",
        cafeSlug: "bean-and-bloom",
        otp: "000000",
      },
    });
    expect(verify.status()).toBeGreaterThanOrEqual(400);
    expect(verify.status()).toBeLessThan(500);
  });
});
