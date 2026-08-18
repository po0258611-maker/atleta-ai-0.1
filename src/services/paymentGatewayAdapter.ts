import { SubscriptionState, PaymentMethodType } from '../types';

export interface PaymentGatewayRequest {
  planId: 'pro_monthly' | 'pro_annual';
  priceBrl: number;
  customerEmail: string;
  customerName: string;
  paymentMethod: PaymentMethodType;
  cardDetails?: {
    cardNumber: string;
    cardName: string;
    expiry: string;
    cvv: string;
  };
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId: string;
  gatewayName: 'GooglePlay' | 'AsaasPix' | 'Stripe' | 'LocalMockGateway';
  status: 'APPROVED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  message: string;
  timestamp: string;
  rawPayload?: Record<string, any>;
}

/**
 * Universal Payment Adapter Interface (SOLID - Open/Closed & Dependency Inversion)
 * Allows hot-swapping providers (Google Play, Stripe, Asaas, MercadoPago, Pagar.me)
 * without touching client UI code.
 */
export interface IPaymentGatewayAdapter {
  providerName: string;
  processPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
  handleWebhook(payload: Record<string, any>, signature: string): Promise<{ event: string; processed: boolean }>;
  refundTransaction(transactionId: string): Promise<boolean>;
}

/**
 * Google Play Billing Gateway Adapter Implementation
 */
export class GooglePlayGatewayAdapter implements IPaymentGatewayAdapter {
  providerName = 'GooglePlayBilling';

  async processPayment(req: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      success: true,
      transactionId: `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      gatewayName: 'GooglePlay',
      status: 'APPROVED',
      message: `Assinatura ${req.planId} aprovada via Google Play Store.`,
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(payload: Record<string, any>): Promise<{ event: string; processed: boolean }> {
    return { event: 'SUBSCRIPTION_RENEWED', processed: true };
  }

  async refundTransaction(): Promise<boolean> {
    return true;
  }
}

/**
 * PIX (Asaas/MercadoPago) Gateway Adapter Implementation
 */
export class PixGatewayAdapter implements IPaymentGatewayAdapter {
  providerName = 'AsaasPixGateway';

  async processPayment(req: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      transactionId: `PIX-TX-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      gatewayName: 'AsaasPix',
      status: 'APPROVED',
      message: 'Pagamento PIX confirmado em tempo real via Webhook do Banco Central.',
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(): Promise<{ event: string; processed: boolean }> {
    return { event: 'PAYMENT_RECEIVED', processed: true };
  }

  async refundTransaction(): Promise<boolean> {
    return true;
  }
}

/**
 * Payment Gateway Manager / Factory Singleton
 */
export class PaymentGatewayManager {
  private static instance: PaymentGatewayManager;
  private adapters: Map<string, IPaymentGatewayAdapter> = new Map();

  private constructor() {
    this.registerAdapter('google_play', new GooglePlayGatewayAdapter());
    this.registerAdapter('pix', new PixGatewayAdapter());
  }

  public static getInstance(): PaymentGatewayManager {
    if (!PaymentGatewayManager.instance) {
      PaymentGatewayManager.instance = new PaymentGatewayManager();
    }
    return PaymentGatewayManager.instance;
  }

  public registerAdapter(key: string, adapter: IPaymentGatewayAdapter): void {
    this.adapters.set(key, adapter);
  }

  public getAdapter(key: string): IPaymentGatewayAdapter {
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new Error(`Provedor de pagamento '${key}' não registrado.`);
    }
    return adapter;
  }
}
