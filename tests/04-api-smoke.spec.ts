import { test, expect } from "@playwright/test";

const publicApiChecks = [
  { method: "GET", path: "/api/health" },
  { method: "GET", path: "/api/readiness" },
];

test.describe("CafeClub API health and public boundary", () => {
  for (const item of publicApiChecks) {
    test(`${item.method} ${item.path} responds`, async ({ request }) => {
      const response = await request.fetch(`http://localhost:3000${item.path}`, { method: item.method });
      expect(response.status()).toBeLessThan(500);
    });
  }

  test("protected API rejects unauthenticated access", async ({ request }) => {
    const protectedRoutes = [
      "/api/cafe/transactions",
      "/api/cafe/customers",
      "/api/cafe/menu",
      "/api/cafe/loyalty",
      "/api/cafe/rewards",
    ];

    const unexpected: string[] = [];

    for (const path of protectedRoutes) {
      const response = await request.get(`http://localhost:3000${path}`);
      if (response.status() >= 200 && response.status() < 300) {
        unexpected.push(`${path}: ${response.status()}`);
      }
    }

    expect(unexpected, "protected APIs exposed without authentication").toEqual([]);
  });
});
