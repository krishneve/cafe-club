import fs from "node:fs";
const required = ["DATABASE_URL","SESSION_SECRET","NEXT_PUBLIC_APP_URL","EMAIL_FROM","CRON_SECRET"];
const optionalLive = [
  "UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","RESEND_API_KEY","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_PRICE_STARTER","STRIPE_PRICE_GROWTH","STRIPE_PRICE_PRO"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error(`Missing required environment variables: ${missing.join(", ")}`); process.exit(1); }
if ((process.env.NODE_ENV || "development") === "production" && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) { console.error("Distributed production rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."); process.exit(1); }
if ((process.env.NODE_ENV || "development") === "production" && process.env.SESSION_SECRET.length < 32) { console.error("SESSION_SECRET must be at least 32 characters in production."); process.exit(1); }
console.log("Environment shape OK.");
const absentLive = optionalLive.filter(k => !process.env[k]);
if (absentLive.length) console.log(`Not configured for live integrations: ${absentLive.join(", ")}`);
if (fs.existsSync(".env.example")) console.log(".env.example present.");
