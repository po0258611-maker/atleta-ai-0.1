import crypto from 'crypto';
import { SERVER_CONFIG } from '../../config/env';
import { PaymentProvider } from '../../domain/subscriptionModel';
import { logger } from '../../middlewares/logger';

export interface SignatureVerificationResult {
  valid: boolean;
  reason:
    | 'VALID'
    | 'MISSING_SIGNATURE'
    | 'MISSING_SECRET'
    | 'INVALID_HEADER_FORMAT'
    | 'INVALID_SIGNATURE_MISMATCH'
    | 'REPLAY_ATTACK_TIMESTAMP_EXPIRED'
    | 'TIMESTAMP_IN_FUTURE'
    | 'UNSUPPORTED_PROVIDER';
  timestamp?: number;
}

export class WebhookSignatureVerifier {
  /**
   * Verificação oficial de assinatura do Stripe Webhook (HMAC-SHA256)
   * Header: stripe-signature: t=timestamp,v1=signature[,v0=signature]
   * Payload assinado: ${timestamp}.${rawPayload}
   */
  static verifyStripe(
    rawPayload: string,
    signatureHeader?: string,
    secret: string = SERVER_CONFIG.STRIPE_WEBHOOK_SECRET,
    toleranceSeconds: number = 300
  ): SignatureVerificationResult {
    if (!signatureHeader || typeof signatureHeader !== 'string' || signatureHeader.trim() === '') {
      logger.warn('Stripe Webhook: Assinatura ausente ou vazia');
      return { valid: false, reason: 'MISSING_SIGNATURE' };
    }

    if (!secret || secret.trim() === '') {
      logger.error('Stripe Webhook: Segredo do webhook não configurado no servidor');
      return { valid: false, reason: 'MISSING_SECRET' };
    }

    const parts = signatureHeader.split(',').map((p) => p.trim());
    let timestamp: number | null = null;
    const v1Signatures: string[] = [];

    for (const part of parts) {
      const equalIdx = part.indexOf('=');
      if (equalIdx === -1) continue;
      const key = part.substring(0, equalIdx).trim();
      const val = part.substring(equalIdx + 1).trim();

      if (key === 't') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
          timestamp = parsed;
        }
      } else if (key === 'v1') {
        if (val.length > 0) {
          v1Signatures.push(val);
        }
      }
    }

    if (timestamp === null || v1Signatures.length === 0) {
      logger.warn('Stripe Webhook: Formato do header de assinatura inválido', { signatureHeader });
      return { valid: false, reason: 'INVALID_HEADER_FORMAT' };
    }

    // Proteção contra Replay Attack: validação de tolerância temporal
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const timeDifference = nowInSeconds - timestamp;

    if (timeDifference > toleranceSeconds) {
      logger.warn('Stripe Webhook: Replay attack detectado (timestamp expirado)', {
        timestamp,
        nowInSeconds,
        ageSeconds: timeDifference,
        toleranceSeconds,
      });
      return { valid: false, reason: 'REPLAY_ATTACK_TIMESTAMP_EXPIRED', timestamp };
    }

    if (timestamp - nowInSeconds > toleranceSeconds) {
      logger.warn('Stripe Webhook: Timestamp muito distante no futuro', {
        timestamp,
        nowInSeconds,
      });
      return { valid: false, reason: 'TIMESTAMP_IN_FUTURE', timestamp };
    }

    // Cálculo autoritativo do HMAC-SHA256
    const payloadToSign = `${timestamp}.${rawPayload}`;
    const expectedSignatureHex = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign, 'utf8')
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');

    let isValid = false;
    for (const sig of v1Signatures) {
      try {
        const sigBuffer = Buffer.from(sig, 'hex');
        if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
          isValid = true;
          break;
        }
      } catch {
        // Ignora hex malformado
      }
    }

    if (!isValid) {
      logger.warn('Stripe Webhook: Assinatura HMAC inválida ou payload adulterado');
      return { valid: false, reason: 'INVALID_SIGNATURE_MISMATCH', timestamp };
    }

    return { valid: true, reason: 'VALID', timestamp };
  }

  /**
   * Verificação oficial de assinatura para PIX / PSPs Bancários (HMAC-SHA256)
   * Suporta formatos padronizados de PSP:
   * 1. t=timestamp,v1=signature
   * 2. sha256=signature com header de timestamp x-signature-timestamp
   * 3. signature hex com timestamp
   */
  static verifyPix(
    rawPayload: string,
    signatureHeader?: string,
    secret: string = SERVER_CONFIG.PIX_WEBHOOK_SECRET,
    timestampHeader?: string | number,
    toleranceSeconds: number = 300
  ): SignatureVerificationResult {
    if (!signatureHeader || typeof signatureHeader !== 'string' || signatureHeader.trim() === '') {
      logger.warn('Pix Webhook: Assinatura ausente ou vazia');
      return { valid: false, reason: 'MISSING_SIGNATURE' };
    }

    if (!secret || secret.trim() === '') {
      logger.error('Pix Webhook: Segredo do webhook não configurado no servidor');
      return { valid: false, reason: 'MISSING_SECRET' };
    }

    // Formato Stripe-like (t=...,v1=...)
    if (signatureHeader.includes('t=') && signatureHeader.includes('v1=')) {
      return this.verifyStripe(rawPayload, signatureHeader, secret, toleranceSeconds);
    }

    let signatureHex = signatureHeader.trim();
    if (signatureHex.startsWith('sha256=')) {
      signatureHex = signatureHex.replace('sha256=', '').trim();
    }

    let timestamp: number = Math.floor(Date.now() / 1000);
    let hasExplicitTimestamp = false;

    if (timestampHeader !== undefined) {
      const parsed = typeof timestampHeader === 'number' ? timestampHeader : parseInt(String(timestampHeader), 10);
      if (!isNaN(parsed) && parsed > 0) {
        timestamp = parsed > 10000000000 ? Math.floor(parsed / 1000) : parsed;
        hasExplicitTimestamp = true;
      }
    }

    // Proteção contra Replay se timestamp explícito foi enviado
    if (hasExplicitTimestamp) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const timeDifference = nowInSeconds - timestamp;

      if (timeDifference > toleranceSeconds) {
        logger.warn('Pix Webhook: Replay attack detectado (timestamp expirado)', {
          timestamp,
          nowInSeconds,
          ageSeconds: timeDifference,
          toleranceSeconds,
        });
        return { valid: false, reason: 'REPLAY_ATTACK_TIMESTAMP_EXPIRED', timestamp };
      }

      if (timestamp - nowInSeconds > toleranceSeconds) {
        return { valid: false, reason: 'TIMESTAMP_IN_FUTURE', timestamp };
      }
    }

    const payloadWithTs = `${timestamp}.${rawPayload}`;
    const expectedWithTsHex = crypto.createHmac('sha256', secret).update(payloadWithTs, 'utf8').digest('hex');
    const expectedRawHex = crypto.createHmac('sha256', secret).update(rawPayload, 'utf8').digest('hex');

    let isValid = false;
    try {
      const sigBuf = Buffer.from(signatureHex, 'hex');
      const bufWithTs = Buffer.from(expectedWithTsHex, 'hex');
      const bufRaw = Buffer.from(expectedRawHex, 'hex');

      if (sigBuf.length === bufWithTs.length && crypto.timingSafeEqual(sigBuf, bufWithTs)) {
        isValid = true;
      } else if (sigBuf.length === bufRaw.length && crypto.timingSafeEqual(sigBuf, bufRaw)) {
        isValid = true;
      }
    } catch {
      // Ignora erro de buffer hex
    }

    if (!isValid) {
      logger.warn('Pix Webhook: Assinatura HMAC inválida ou payload adulterado');
      return { valid: false, reason: 'INVALID_SIGNATURE_MISMATCH', timestamp };
    }

    return { valid: true, reason: 'VALID', timestamp };
  }

  /**
   * Ponto de entrada unificado para verificação de assinaturas de qualquer provedor suportado
   */
  static verify(
    provider: PaymentProvider,
    rawPayload: string,
    signatureHeader?: string,
    timestampHeader?: string | number,
    toleranceSeconds: number = 300
  ): SignatureVerificationResult {
    switch (provider) {
      case 'stripe':
        return this.verifyStripe(rawPayload, signatureHeader, SERVER_CONFIG.STRIPE_WEBHOOK_SECRET, toleranceSeconds);
      case 'pix':
      case 'pix_direct':
      case 'mercadopago':
      case 'asaas':
        return this.verifyPix(rawPayload, signatureHeader, SERVER_CONFIG.PIX_WEBHOOK_SECRET, timestampHeader, toleranceSeconds);
      default:
        logger.warn(`Webhook: Provedor não suportado para verificação criptográfica: ${provider}`);
        return { valid: false, reason: 'UNSUPPORTED_PROVIDER' };
    }
  }

  /**
   * Gera assinatura válida do Stripe para testes e emissores autorizados
   */
  static generateStripeSignature(
    rawPayload: string,
    secret: string = SERVER_CONFIG.STRIPE_WEBHOOK_SECRET,
    timestamp: number = Math.floor(Date.now() / 1000)
  ): string {
    const payloadToSign = `${timestamp}.${rawPayload}`;
    const hmac = crypto.createHmac('sha256', secret).update(payloadToSign, 'utf8').digest('hex');
    return `t=${timestamp},v1=${hmac}`;
  }

  /**
   * Gera assinatura válida do PIX / PSP para testes e emissores autorizados
   */
  static generatePixSignature(
    rawPayload: string,
    secret: string = SERVER_CONFIG.PIX_WEBHOOK_SECRET,
    timestamp: number = Math.floor(Date.now() / 1000)
  ): string {
    const payloadToSign = `${timestamp}.${rawPayload}`;
    const hmac = crypto.createHmac('sha256', secret).update(payloadToSign, 'utf8').digest('hex');
    return `t=${timestamp},v1=${hmac}`;
  }
}
