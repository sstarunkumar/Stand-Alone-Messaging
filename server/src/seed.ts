/**
 * Deterministic test-data seed. Fixed ObjectIds so the test harness
 * (test-harness/src/App.tsx) can hardcode matching default user/case ids.
 * Safe to re-run: upserts by _id.
 */
import 'dotenv/config';
import { Types } from 'mongoose';
import { connectDb, disconnectDb } from './db';
import { Role, Service, User, AdminUser, Case, CaseChat } from './models';

export const SEED_ROLE_ID = new Types.ObjectId('000000000000000000000001');
export const SEED_SERVICE_ID = new Types.ObjectId('000000000000000000000002');
export const SEED_CUSTOMER_ID = new Types.ObjectId('000000000000000000000003');
export const SEED_CASE_MANAGER_ID = new Types.ObjectId('000000000000000000000004');
export const SEED_CASE_ID = new Types.ObjectId('000000000000000000000005');

async function seed(): Promise<void> {
  await connectDb();

  await Role.findByIdAndUpdate(
    SEED_ROLE_ID,
    { name: 'Case Manager', description: 'Handles assigned cases' },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await Service.findByIdAndUpdate(
    SEED_SERVICE_ID,
    { code: 'LAND-NOC', name: 'Land NOC Verification', domain: 'LAND', status: 'ACTIVE', isActive: true },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await User.findByIdAndUpdate(
    SEED_CUSTOMER_ID,
    { email: 'customer001@example.com', phone: '+910000000001', isActive: true },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await AdminUser.findByIdAndUpdate(
    SEED_CASE_MANAGER_ID,
    { email: 'manager001@example.com', roleId: SEED_ROLE_ID, regions: ['TELANGANA'], isActive: true },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await Case.findByIdAndUpdate(
    SEED_CASE_ID,
    {
      caseNumber: 'CASE-0001',
      userId: SEED_CUSTOMER_ID,
      serviceId: SEED_SERVICE_ID,
      kind: 'LAND_NOC',
      status: 'IN_PROGRESS',
      assignedManagerId: SEED_CASE_MANAGER_ID,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await CaseChat.findOneAndUpdate(
    { caseId: SEED_CASE_ID },
    { caseId: SEED_CASE_ID, customerId: SEED_CUSTOMER_ID, caseManagerId: SEED_CASE_MANAGER_ID },
    { upsert: true, setDefaultsOnInsert: true },
  );

  console.log('Seeded test data:');
  console.log('  customer userId     :', SEED_CUSTOMER_ID.toString());
  console.log('  case manager userId :', SEED_CASE_MANAGER_ID.toString());
  console.log('  caseId              :', SEED_CASE_ID.toString());

  await disconnectDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
