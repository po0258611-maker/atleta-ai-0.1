import crypto from 'crypto';
import { verifyMercadoPagoWebhookSignature } from '../services/payments/mercadoPagoWebhookService';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const secret = 'test-mercadopago-webhook-secret';
const dataId = '123456789';
const requestId = 'req_athleta_test_001';
const ts = String(Date.now());
const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
const v1 = crypto.createHmac('sha256', secret).update(manifest, 'utf8').digest('hex');

assert(
  verifyMercadoPagoWebhookSignature(dataId, requestId, `ts=${ts},v1=${v1}`, secret),
  'Assinatura Mercado Pago válida deve ser aceita',
);

assert(
  !verifyMercadoPagoWebhookSignature(dataId, requestId, `ts=${ts},v1=${'0'.repeat(64)}`, secret),
  'Assinatura Mercado Pago inválida deve ser rejeitada',
);

const staleTs = String(Date.now() - 10 * 60 * 1000);
const staleManifest = `id:${dataId};request-id:${requestId};ts:${staleTs};`;
const staleV1 = crypto.createHmac('sha256', secret).update(staleManifest, 'utf8').digest('hex');
assert(
  !verifyMercadoPagoWebhookSignature(dataId, requestId, `ts=${staleTs},v1=${staleV1}`, secret),
  'Assinatura fora da janela temporal deve ser rejeitada',
);

console.log('✓ Mercado Pago webhook: HMAC, assinatura inválida e replay temporal validados');
