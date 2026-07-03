/**
 * TEST-ONLY alias table so the test harness can be driven with names like
 * "cust1" / "cm1" / "case1" instead of raw Mongo ObjectIds. Consumed by
 * seed.ts and routes/auth.ts. Remove alongside routes/auth.ts (already
 * marked TEST-ONLY) when integrating into NOS.
 */
import { Types } from 'mongoose';

export type TestRole = 'CUSTOMER' | 'CASE_MANAGER' | 'ADMIN';

export function hexId(n: number): Types.ObjectId {
  return new Types.ObjectId(n.toString(16).padStart(24, '0'));
}

export const CUSTOMER_ALIASES = ['cust1', 'cust2', 'cust3', 'cust4'] as const;
export const MANAGER_ALIASES = ['cm1', 'cm2', 'cm3', 'cm4'] as const;
export const ADMIN_ALIASES = ['adm1', 'adm2'] as const;

export const USER_ALIASES: Record<string, { id: Types.ObjectId; role: TestRole }> = {
  cust1: { id: hexId(11), role: 'CUSTOMER' },
  cust2: { id: hexId(12), role: 'CUSTOMER' },
  cust3: { id: hexId(13), role: 'CUSTOMER' },
  cust4: { id: hexId(14), role: 'CUSTOMER' },
  cm1: { id: hexId(21), role: 'CASE_MANAGER' },
  cm2: { id: hexId(22), role: 'CASE_MANAGER' },
  cm3: { id: hexId(23), role: 'CASE_MANAGER' },
  cm4: { id: hexId(24), role: 'CASE_MANAGER' },
  adm1: { id: hexId(31), role: 'ADMIN' },
  adm2: { id: hexId(32), role: 'ADMIN' },
};

// Number of cases seeded per customer (2 or 3 each, per product request).
export const CASES_PER_CUSTOMER: Record<string, number> = {
  cust1: 3,
  cust2: 2,
  cust3: 3,
  cust4: 2,
};

export interface TestCaseInfo {
  alias: string;
  id: Types.ObjectId;
  customerAlias: string;
  managerAlias: string;
}

// Case aliases (case1..caseN) are assigned sequentially across customers,
// round-robining the case manager so load is spread across all 4 managers.
export const CASE_ALIASES: TestCaseInfo[] = (() => {
  const cases: TestCaseInfo[] = [];
  let seq = 1;
  let managerCursor = 0;
  for (const customerAlias of CUSTOMER_ALIASES) {
    const count = CASES_PER_CUSTOMER[customerAlias];
    for (let i = 0; i < count; i++) {
      const managerAlias = MANAGER_ALIASES[managerCursor % MANAGER_ALIASES.length];
      managerCursor++;
      cases.push({ alias: `case${seq}`, id: hexId(100 + seq), customerAlias, managerAlias });
      seq++;
    }
  }
  return cases;
})();

export function resolveCaseAlias(value: string): Types.ObjectId | undefined {
  return CASE_ALIASES.find((c) => c.alias === value.toLowerCase())?.id;
}

/** Resolves a user or case alias to its real id string; passes through unrecognized values unchanged. */
export function resolveTestId(value: string): string {
  const userAlias = USER_ALIASES[value.toLowerCase()];
  if (userAlias) return userAlias.id.toString();

  const caseAliasId = resolveCaseAlias(value);
  if (caseAliasId) return caseAliasId.toString();

  return value;
}
