/**
 * Deterministic test-data seed: 4 customers, 4 case managers, and 2-3 cases
 * per customer (10 total), each with its own CaseChat. Login with the alias
 * names printed below (cust1..cust4, cm1..cm4) — routes/auth.ts resolves
 * them to the real ObjectIds created here. Safe to re-run: upserts by _id.
 */
import 'dotenv/config';
import { connectDb, disconnectDb } from './db';
import { Role, Service, User, AdminUser, Case, CaseChat } from './models';
import { CASE_STATUSES } from './models/enums';
import { ADMIN_ALIASES, CASE_ALIASES, CUSTOMER_ALIASES, MANAGER_ALIASES, USER_ALIASES, hexId } from './testAliases';

const ROLE_ID = hexId(1);
const SERVICE_ID = hexId(2);

async function seed(): Promise<void> {
  await connectDb();

  await Role.findByIdAndUpdate(
    ROLE_ID,
    { name: 'Case Manager', description: 'Handles assigned cases' },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await Service.findByIdAndUpdate(
    SERVICE_ID,
    { code: 'LAND-NOC', name: 'Land NOC Verification', domain: 'LAND', status: 'ACTIVE', isActive: true },
    { upsert: true, setDefaultsOnInsert: true },
  );

  for (const alias of CUSTOMER_ALIASES) {
    await User.findByIdAndUpdate(
      USER_ALIASES[alias].id,
      { email: `${alias}@example.com`, phone: '+910000000000', isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  for (const alias of MANAGER_ALIASES) {
    await AdminUser.findByIdAndUpdate(
      USER_ALIASES[alias].id,
      { email: `${alias}@example.com`, roleId: ROLE_ID, regions: ['TELANGANA'], isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  for (const [i, testCase] of CASE_ALIASES.entries()) {
    const customerId = USER_ALIASES[testCase.customerAlias].id;
    const managerId = USER_ALIASES[testCase.managerAlias].id;
    const status = CASE_STATUSES[i % CASE_STATUSES.length];
    const caseNumber = `CASE-${testCase.alias.toUpperCase()}`;

    await Case.findByIdAndUpdate(
      testCase.id,
      {
        caseNumber,
        userId: customerId,
        serviceId: SERVICE_ID,
        kind: 'LAND_NOC',
        status,
        assignedManagerId: managerId,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    // caseNumber is denormalized directly onto CaseChat (see registerCase) — this
    // service has its own database in the real integration, so it can't join against
    // NOS's real Case collection for a display label the way this seed script's local
    // Case doc above might suggest.
    await CaseChat.findOneAndUpdate(
      { caseId: testCase.id },
      { caseId: testCase.id, customerId, caseManagerId: managerId, caseNumber },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  console.log('Seeded test data — log in to the test harness with these aliases:\n');
  console.log('Customers:');
  for (const alias of CUSTOMER_ALIASES) console.log(`  ${alias.padEnd(6)} (CUSTOMER)      -> ${USER_ALIASES[alias].id.toString()}`);
  console.log('\nCase managers:');
  for (const alias of MANAGER_ALIASES) console.log(`  ${alias.padEnd(6)} (CASE_MANAGER)  -> ${USER_ALIASES[alias].id.toString()}`);
  console.log('\nCases:');
  for (const c of CASE_ALIASES) console.log(`  ${c.alias.padEnd(6)} -> ${c.id.toString()}  customer=${c.customerAlias}  manager=${c.managerAlias}`);
  console.log('\nAdmins (oversight — no seeded profile document needed, id is used as-is):');
  for (const alias of ADMIN_ALIASES) console.log(`  ${alias.padEnd(6)} (ADMIN)         -> ${USER_ALIASES[alias].id.toString()}`);

  await disconnectDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
