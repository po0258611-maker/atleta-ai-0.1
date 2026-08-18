import { SubscriptionState, PaymentMethodType } from '../types';

const STORAGE_SUBSCRIPTION_KEY = 'athleta_ai_subscription_state';

// Default initial subscription state (PRO Trial or Active)
const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: true,
  planId: 'pro_monthly',
  planName: 'Plano Athleta AI PRO',
  priceBrl: 15.00,
  status: 'active',
  billingCycle: 'monthly',
  renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  paymentMethod: 'pix',
  lastPaymentDate: new Date().toISOString(),
};

export const getSubscriptionState = (): SubscriptionState => {
  try {
    const data = localStorage.getItem(STORAGE_SUBSCRIPTION_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(DEFAULT_SUBSCRIPTION));
      return DEFAULT_SUBSCRIPTION;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_SUBSCRIPTION;
  }
};

export const saveSubscriptionState = (state: SubscriptionState): void => {
  try {
    localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Erro ao salvar estado da assinatura:', err);
  }
};

export const generatePixDetails = (userEmail: string, userName: string) => {
  const amount = '15.00';
  const randomTxId = Math.random().toString(36).substring(2, 12).toUpperCase();
  
  // Standard EMV PIX Copia e Cola payload simulation
  const copiaECola = `00020126580014br.gov.bcb.pix0136athleta.ai.pagamentos@gmail.com520400005303986540515.005802BR5910ATHLETA AI6009SAO PAULO62070503***6304${randomTxId}`;
  
  // Real QR code generator API URL using quickchart.io for direct scanning
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(copiaECola)}&size=250&margin=1`;

  return {
    amount: 15.00,
    txId: randomTxId,
    pixKey: 'athleta.ai.pagamentos@gmail.com',
    copiaECola,
    qrCodeUrl,
    expiresInMinutes: 15,
  };
};

export const processCreditCardPayment = async (cardDetails: {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}): Promise<SubscriptionState> => {
  // Simulate 1.2s network latency for payment gateway approval
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const newState: SubscriptionState = {
    isSubscribed: true,
    planId: 'pro_monthly',
    planName: 'Plano Athleta AI PRO',
    priceBrl: 15.00,
    status: 'active',
    billingCycle: 'monthly',
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'credit_card',
    lastPaymentDate: new Date().toISOString(),
  };

  saveSubscriptionState(newState);
  return newState;
};

export const confirmPixPayment = async (): Promise<SubscriptionState> => {
  // Simulate payment confirmation delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const newState: SubscriptionState = {
    isSubscribed: true,
    planId: 'pro_monthly',
    planName: 'Plano Athleta AI PRO',
    priceBrl: 15.00,
    status: 'active',
    billingCycle: 'monthly',
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'pix',
    lastPaymentDate: new Date().toISOString(),
  };

  saveSubscriptionState(newState);
  return newState;
};

export const cancelSubscription = (): SubscriptionState => {
  const current = getSubscriptionState();
  const newState: SubscriptionState = {
    ...current,
    status: 'canceled',
    isSubscribed: false,
  };
  saveSubscriptionState(newState);
  return newState;
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
  planId: 'pro_monthly' | 'pro_annual'
): Promise<GooglePlayPurchaseResult> => {
  // Simulate Google Play Billing SDK IPC call latency
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const plan = PLAN_CONFIGS[planId];
  const days = planId === 'pro_annual' ? 365 : 30;
  const orderId = `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const purchaseToken = `pnum_token_${Math.random().toString(36).substring(2, 18)}`;

  const newState: SubscriptionState = {
    isSubscribed: true,
    planId: plan.id,
    planName: plan.name,
    priceBrl: plan.priceBrl,
    status: 'active',
    billingCycle: plan.billingCycle,
    renewsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'credit_card',
    lastPaymentDate: new Date().toISOString(),
  };

  saveSubscriptionState(newState);

  return {
    success: true,
    code: 'BILLING_SUCCESS',
    message: `Compra aprovada pelo Google Play! ${plan.name} ativado.`,
    orderId,
    purchaseToken,
    subscriptionState: newState,
  };
};

export const restorePurchases = async (): Promise<{
  restored: boolean;
  message: string;
  subscriptionState: SubscriptionState;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const current = getSubscriptionState();

  if (current.isSubscribed && current.status === 'active') {
    return {
      restored: true,
      message: `Assinatura "${current.planName}" restaurada com sucesso com vínculo ao Google Play.`,
      subscriptionState: current,
    };
  }

  // Auto-restore default active PRO subscription if missing
  const restoredState: SubscriptionState = {
    isSubscribed: true,
    planId: 'pro_annual',
    planName: 'Plano Athleta PRO Anual',
    priceBrl: 120.00,
    status: 'active',
    billingCycle: 'yearly',
    renewsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'credit_card',
    lastPaymentDate: new Date().toISOString(),
  };

  saveSubscriptionState(restoredState);

  return {
    restored: true,
    message: 'Assinatura PRO identificada e restaurada da sua conta Google Play!',
    subscriptionState: restoredState,
  };
};

export const reactivateSubscription = (): SubscriptionState => {
  const newState: SubscriptionState = {
    isSubscribed: true,
    planId: 'pro_monthly',
    planName: 'Plano Athleta PRO Mensal',
    priceBrl: 15.00,
    status: 'active',
    billingCycle: 'monthly',
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'pix',
    lastPaymentDate: new Date().toISOString(),
  };
  saveSubscriptionState(newState);
  return newState;
};
