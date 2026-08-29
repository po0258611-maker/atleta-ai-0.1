import { FeatureKey, PlanSlug } from './planDefinitions';

export type CanonicalSubscriptionStatus =
  | 'FREE'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'TRIAL';

export type SubscriptionStatus =
  | CanonicalSubscriptionStatus
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'pending';

export function normalizeSubscriptionStatus(status?: string): CanonicalSubscriptionStatus {
  if (!status) return 'FREE';
  const upper = status.trim().toUpperCase();
  switch (upper) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'TRIAL':
    case 'TRIALING':
      return 'TRIAL';
    case 'PAST_DUE':
      return 'PAST_DUE';
    case 'CANCELED':
    case 'CANCELLED':
      return 'CANCELED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'FREE':
    case 'PENDING':
    default:
      return 'FREE';
  }
}

export type PaymentProvider = 'stripe' | 'mercadopago' | 'asaas' | 'google_play' | 'pix_direct' | 'pix';

export interface ServerSubscription {
  id: string;
  userId: string;
  planId: PlanSlug;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  customerId: string;
  subscriptionId: string;
  currentPeriodStart: string; // ISO 8601 - Início
  currentPeriodEnd: string;   // ISO 8601 - Término
  cancelAtPeriodEnd: boolean; // Flag de cancelamento ao fim do ciclo
  canceledAt?: string | null; // Data do pedido de cancelamento
  renewAt?: string | null;    // Data prevista de renovação automática
  autoRenew?: boolean;        // Indicador de renovação ativa
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

