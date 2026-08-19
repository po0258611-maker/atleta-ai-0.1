import { FeatureKey } from './planDefinitions';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'pending';

export type PaymentProvider = 'stripe' | 'mercadopago' | 'asaas' | 'google_play' | 'pix_direct';

export interface ServerSubscription {
  id: string;
  userId: string;
  planId: 'FREE' | 'PRO' | 'APEX_ELITE';
  status: SubscriptionStatus;
  provider: PaymentProvider;
  customerId: string;
  subscriptionId: string;
  currentPeriodStart: string; // ISO 8601
  currentPeriodEnd: string;   // ISO 8601
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  lastPaymentDate?: string;
  priceBrl: number;
}

export interface SubscriptionHistoryRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  eventType: 'CREATED' | 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED' | 'RENEWED' | 'CANCELED' | 'PLAN_CHANGED';
  statusBefore: SubscriptionStatus;
  statusAfter: SubscriptionStatus;
  provider: PaymentProvider;
  amountCents?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processed: boolean;
  errorReason?: string;
  receivedAt: string;
}
