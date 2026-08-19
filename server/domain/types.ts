// Server-side Domain Types and Enums (Normalized for SaaS Production)

export type Role = 'ATHLETE' | 'COACH' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  provider: 'GOOGLE' | 'EMAIL';
  providerAccountId: string;
  passwordHash?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: string;
  createdAt: string;
}

export type PlanSlug = 'FREE' | 'PRO' | 'APEX_ELITE';
export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: string;
  slug: PlanSlug;
  name: string;
  priceCents: number;
  currency: string;
  billingInterval: BillingInterval;
  active: boolean;
  features: string[];
}

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'INCOMPLETE';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entitlement {
  id: string;
  userId: string;
  featureKey: string;
  valueJson: Record<string, unknown>;
  grantedAt: string;
  expiresAt?: string;
}

export interface Usage {
  id: string;
  userId: string;
  metric: 'AI_TOKENS_USED' | 'VIDEOS_ANALYZED' | 'WORKOUT_EXPORTS';
  quantity: number;
  periodDate: string; // YYYY-MM-DD
  updatedAt: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  providerTxId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: 'STRIPE' | 'ASAAS' | 'MERCADOPAGO';
  eventId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  processed: boolean;
  errorReason?: string;
  receivedAt: string;
}

export type VideoStatus = 'UPLOADED' | 'PROCESSING' | 'ANALYZED' | 'FAILED';

export interface Video {
  id: string;
  userId: string;
  exerciseId: string;
  title: string;
  durationSec?: number;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VideoAsset {
  id: string;
  videoId: string;
  storageUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  resolution?: string;
  createdAt: string;
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AnalysisJob {
  id: string;
  videoId: string;
  userId: string;
  status: JobStatus;
  retryCount: number;
  errorLog?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AnalysisResult {
  id: string;
  jobId: string;
  videoId: string;
  jointAnglesJson: Record<string, unknown>;
  barPathJson: Record<string, unknown>;
  romScore: number;
  fatigueIndex: number;
  recommendationsMarkdown: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  ipAddress: string;
  resourceType: string;
  resourceId?: string;
  metadataJson?: Record<string, unknown>;
  timestamp: string;
}
