import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
function check(name, ok) { checks.push({ name, ok }); }

const permissionRoutes = {
  'app/api/cafe/customers/route.ts': 'CUSTOMERS',
  'app/api/cafe/segments/route.ts': 'CRM',
  'app/api/cafe/rewards/route.ts': 'REWARDS',
  'app/api/cafe/settings/route.ts': 'LOYALTY',
  'app/api/cafe/campaigns/route.ts': 'CAMPAIGNS',
  'app/api/cafe/campaigns/[id]/send/route.ts': 'CAMPAIGNS',
  'app/api/cafe/automations/route.ts': 'AUTOMATIONS',
  'app/api/cafe/automations/run/route.ts': 'AUTOMATIONS',
  'app/api/cafe/automations/settings/route.ts': 'AUTOMATIONS',
  'app/api/cafe/notifications/route.ts': 'CAMPAIGNS',
  'app/api/cafe/team/route.ts': 'TEAM',
  'app/api/cafe/team/invite/route.ts': 'TEAM',
  'app/api/cafe/team/[id]/route.ts': 'TEAM',
  'app/api/cafe/menu/[id]/route.ts': 'MENU',
};
for (const [file, permission] of Object.entries(permissionRoutes)) {
  const s = read(file);
  check(`${file} requires ${permission}`, s.includes(`requirePermission("${permission}")`));
}
check('transaction POST requires POS', read('app/api/cafe/transactions/route.ts').includes('requirePermission("POS")'));
check('transaction GET requires ORDERS', read('app/api/cafe/transactions/route.ts').includes('requirePermission("ORDERS")'));
check('billing uses requireOwner', ['checkout','portal','status','plans'].every(x => read(`app/api/billing/${x}/route.ts`).includes('requireOwner')));
check('cron checks secret', read('app/api/cron/automations/route.ts').includes('CRON_SECRET'));
check('same-origin helper exists', read('lib/security.ts').includes('assertSameOrigin'));
check('body-size guard exists', read('lib/security.ts').includes('MAX_BODY_BYTES'));
check('rate-limit response sets Retry-After', read('lib/security.ts').includes('"Retry-After"'));
check('audit log page exists', fs.existsSync(path.join(root, 'app/admin/audit/page.tsx')));
check('automation key is consistent', !read('app/api/cafe/automations/run/route.ts').includes('REWARD_EARNED') && read('app/api/cafe/automations/run/route.ts').includes('REWARD_READY'));
check('schema has audit indexes', read('prisma/schema.prisma').includes('@@index([cafeId, action, createdAt])'));

const failed = checks.filter(x => !x.ok);
for (const x of checks) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}`);
if (failed.length) process.exit(1);
console.log(`\nSecurity smoke test passed: ${checks.length} checks.`);
