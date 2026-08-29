import { SubscriptionState } from '../types';
import { apiRequest } from '../api/apiClient';

const STORAGE_SUBSCRIPTION_KEY = 'athleta_ai_subscription_state';

const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: false,
  planId: 'pro_monthly',
  planName: 'Plano Gratuito Atleta AI',
  priceBrl: 0,
  status: 'expired',
  billingCycle: 'monthly',
  renewsAt: '',
};

export interface PaymentIntentResponse {
  transactionId: string;
  provider: string;
  status: 'pending' | 'approved' | 'failed' | 'expired' | 'refunded' | 'canceled';
  amountCents: number;
  currency: string;
  paymentMethod: string;
  copiaECola?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
  checkoutUrl?: string;
  idempotencyKey: string;
  createdAt: string;
}

function mapServerSubscription(entitlements: {
  isSubscribed: boolean;
  planSlug: string;
  planName: string;
  priceBrl?: number;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string | null;
}): SubscriptionState {
  const isApex = entitlements.planSlug === 'APEX_ELITE';
  const status = entitlements.subscriptionStatus.toLowerCase();
  const normalizedStatus: SubscriptionState['status'] =
    status === 'active' ? 'active' :
    status === 'trial' || status === 'trialing' ? 'trialing' :
    status === 'canceled' || status === 'cancelled' ? 'canceled' :
    'expired';

  return {
    isSubscribed: entitlements.isSubscribed,
    planId: isApex ? 'pro_annual' : 'pro_monthly',
    planName: entitlements.planName,
    priceBrl: typeof entitlements.priceBrl === 'number' ? entitlements.priceBrl : (isApex ? 120 : 15),
    status: normalizedStatus,
    billingCycle: isApex ? 'yearly' : 'monthly',
    renewsAt: entitlements.currentPeriodEnd || '',
    paymentMethod: mapProviderToPaymentMethod(entitlements.provider),
  };
}

function mapProviderToPaymentMethod(provider: string | null): SubscriptionState['paymentMethod'] {
  if (provider === 'stripe') return 'credit_card';
  if (provider === 'pix' || provider === 'pix_direct') return 'pix';
  return undefined;
}

/**
 * Loads subscription state strictly from the server entitlement authority.
 * A server/database failure fails closed to FREE instead of trusting stale premium cache.
 */
export const getSubscriptionState = async (_uid?: string): Promise<SubscriptionState> => {
  try {
    const entitlements = await apiRequest<{
      isSubscribed: boolean;
      planSlug: string;
      planName: string;
      priceBrl?: number;
      subscriptionStatus: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      provider: string | null;
    }>('/api/entitlements/me');

    if (entitlements) {
      const serverState = mapServerSubscription(entitlements);
      localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(serverState));
      return serverState;
    }
  } catch (err) {
    console.warn('Falha ao consultar servidor de assinaturas; estado do cliente será FREE por segurança.', err);
  }

  return { ...DEFAULT_SUBSCRIPTION };
};

/**
 * Cached state is presentation-only. It must never be used to grant premium API access.
 * Legacy active/canceled values are normalized to avoid treating malformed cache data as authority.
 */
export const getCachedSubscriptionState = (): SubscriptionState => {
  try {
    const data = localStorage.getItem(STORAGE_SUBSCRIPTION_KEY);
    if (!data) return { ...DEFAULT_SUBSCRIPTION };

    const parsed = JSON.parse(data) as Partial<SubscriptionState>;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SUBSCRIPTION };

    return {
      ...DEFAULT_SUBSCRIPTION,
      ...parsed,
      isSubscribed: parsed.isSubscribed === true,
      priceBrl: typeof parsed.priceBrl === 'number' ? parsed.priceBrl : 0,
      renewsAt: typeof parsed.renewsAt === 'string' ? parsed.renewsAt : '',
    };
  } catch {
    return { ...DEFAULT_SUBSCRIPTION };
  }
};

export const saveSubscriptionState = async (state: SubscriptionState): Promise<void> => {
  try {
    localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Erro ao atualizar cache de assinatura:', err);
  }
};

/** Payment functions remain present for the future payment integration phase. */
export const createPixOrder = async (
  planSlug: 'PRO' | 'APEX_ELITE' = 'PRO'
): Promise<PaymentIntentResponse> => {
  const idempotencyKey = `pix_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return await apiRequest<PaymentIntentResponse>('/api/subscriptions/create-intent', {
    method: 'POST',
    body: JSON.stringify({ paymentMethod: 'pix', planSlug, idempotencyKey }),
  });
};

export const checkPaymentStatus = async (
  transactionId: string,
  provider: string = 'pix_direct'
): Promise<{ status: string }> => {
  return await apiRequest<{ transactionId: string; status: string }>(
    `/api/subscriptions/status/${encodeURIComponent(transactionId)}?provider=${encodeURIComponent(provider)}`
  );
};

export const createCardCheckoutSession = async (
  planSlug: 'PRO' | 'APEX_ELITE' = 'PRO'
): Promise<PaymentIntentResponse> => {
  const idempotencyKey = `card_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return await apiRequest<PaymentIntentResponse>('/api/subscriptions/create-intent', {
    method: 'POST',
    body: JSON.stringify({ paymentMethod: 'credit_card', planSlug, idempotencyKey }),
  });
};

export const cancelSubscription = async (_uid?: string): Promise<SubscriptionState> => {
  try {
    const res = await apiRequest<{ success: boolean; summary: any }>('/api/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify({ immediate: false }),
    });

    if (res?.summary) {
      const serverState = mapServerSubscription({
        isSubscribed: res.summary.isSubscribed,
        planSlug: res.summary.planSlug,
        planName: res.summary.planName,
        priceBrl: res.summary.priceBrl,
        subscriptionStatus: res.summary.canonicalStatus || res.summary.status,
        currentPeriodEnd: res.summary.currentPeriodEnd,
        cancelAtPeriodEnd: res.summary.cancelAtPeriodEnd,
        provider: res.summary.provider,
      });
      localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(serverState));
      return serverState;
    }
  } catch (err) {
    console.warn('Erro ao cancelar assinatura no servidor:', err);
  }

  return { ...DEFAULT_SUBSCRIPTION };
};

export const PLAN_CONFIGS = {
  pro_monthly: {
    id: 'pro_monthly' as const,
    name: 'Plano Athleta PRO Mensal',
    priceBrl: 15.00,
    period: 'mês',
    billingCycle: 'monthly' as const,
    savingsText: 'R$ 15,00 por mês. Sem fidelidade.',
    storeProductId: 'athleta_pro_monthly_15',
  },
  pro_annual: {
    id: 'pro_annual' as const,
    name: 'Plano Athleta PRO Anual',
    priceBrl: 120.00,
    monthlyEquivalent: 10.00,
    period: 'ano',
    billingCycle: 'yearly' as const,
    savingsText: 'Economia de 33% (apenas R$ 10,00/mês)',
    storeProductId: 'athleta_pro_annual_120',
  },
};

export interface GooglePlayPurchaseResult {
  success: boolean;
  code: 'BILLING_SUCCESS' | 'BILLING_USER_CANCELED' | 'BILLING_ITEM_ALREADY_OWNED' | 'BILLING_NETWORK_ERROR';
  message: string;
  orderId?: string;
  purchaseToken?: string;
  subscriptionState?: SubscriptionState;
}

export const processGooglePlayPurchase = async (
  planId: 'pro_monthly' | 'pro_annual',
  uid?: string
): Promise<GooglePlayPurchaseResult> => {
  const plan = PLAN_CONFIGS[planId];
  const idempotencyKey = `gplay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  await apiRequest('/api/subscriptions/create-intent', {
    method: 'POST',
    body: JSON.stringify({
      planSlug: planId === 'pro_annual' ? 'APEX_ELITE' : 'PRO',
      paymentMethod: 'google_play',
      idempotencyKey,
    }),
  });

  const updatedState = await getSubscriptionState(uid);

  return {
    success: true,
    code: 'BILLING_SUCCESS',
    message: 'Ordem Google Play registrada com sucesso!',
    orderId: `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    subscriptionState: updatedState,
  };
};

export const restorePurchases = async (uid?: string): Promise<{
  restored: boolean;
  message: string;
  subscriptionState: SubscriptionState;
}> => {
  const remoteState = await getSubscriptionState(uid);
  return {
    restored: remoteState.isSubscribed,
    message: remoteState.isSubscribed
      ? `Assinatura "${remoteState.planName}" confirmada com o servidor!`
      : 'Nenhuma assinatura ativa encontrada no backend.',
    subscriptionState: remoteState,
  };
};
