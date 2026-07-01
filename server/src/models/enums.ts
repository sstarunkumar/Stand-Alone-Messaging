/**
 * Shared enum value sets for the NOS Mongoose models.
 * Confirmed with product 2026-07-01; ServiceArchetype is intentionally left
 * as a free-form string until the actual archetype list is finalized.
 */

export const ACTOR_TYPES = ['ADMIN', 'CUSTOMER', 'CASE_MANAGER'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const PROPERTY_STATES = ['TELANGANA', 'ANDHRA_PRADESH'] as const;
export type PropertyState = (typeof PROPERTY_STATES)[number];

export const CASE_CATEGORIES = ['CLEAN', 'FEASIBLE', 'HIGH', 'NOT_FEASIBLE'] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export const CASE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSESSMENT_PENDING',
  'QUOTE_PENDING',
  'AWAITING_PAYMENT',
  'IN_PROGRESS',
  'DOCUMENT_VERIFICATION',
  'CONSULTATION_SCHEDULED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'ON_HOLD',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const DOC_STATUSES = ['PENDING', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const QUOTE_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const PAYMENT_TYPES = ['SERVICE_FEE', 'CONSULTATION_FEE', 'PENALTY', 'REFUND'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const MESSAGE_VISIBILITIES = ['PUBLIC', 'INTERNAL'] as const;
export type MessageVisibility = (typeof MESSAGE_VISIBILITIES)[number];

export const EXECUTION_SOURCES = ['CUSTOMER', 'CASE_MANAGER', 'ADMIN', 'SYSTEM'] as const;
export type ExecutionSource = (typeof EXECUTION_SOURCES)[number];

export const EXECUTION_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED'] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];
