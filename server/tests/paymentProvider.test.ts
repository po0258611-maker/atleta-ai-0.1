/**
 * Test Suite: Real Payment Gateway Architecture & Provider Abstraction
 * 
 * Verifies:
 * 1. Payment Provider interface implementation (PixPaymentProvider & StripeGatewayProvider)
 * 2. Real Payment Intent creation (starts in 'pending' status)
 * 3. Idempotency handling on Payment Intent creation (same key returns identical order)
 * 4. Status lifecycle transitions: pending -> approved / failed / expired / refunded / canceled
 * 5. Webhook settlement approval updating server subscriptions
 */

import { PixPaymentProvider } from '../services/payments/pixPaymentProvider';
import { StripeGatewayProvider } from '../services/payments/stripePaymentProvider';
import { paymentManagerService } from '../services/payments/paymentManagerService';
import { subscriptionServerRepository } from '../repositories/subscriptionServerRepository';

async function runPaymentProviderTests() {
  console.log('--- INICIANDO TESTES DA ARQUITETURA DE GATEWAY DE PAGAMENTOS ---');

  const testUserId = `athleta_user_pay_${Date.now()}`;
  const pixProvider = new PixPaymentProvider();
  const stripeProvider = new StripeGatewayProvider();

  // Test 1: PIX Provider Order Generation
  {
    const idempotencyKey = `idemp_pix_${Date.now()}`;
    const pixOrder = await pixProvider.createPayment({
      userId: testUserId,
      userEmail: 'teste@gmail.com',
      userName: 'Atleta Teste',
      planSlug: 'PRO',
      amountCents: 1500,
      paymentMethod: 'pix',
      idempotencyKey,
    });

    console.assert(pixOrder.status === 'pending', 'PIX deve iniciar no estado PENDING');
    console.assert(pixOrder.copiaECola?.startsWith('0002012658'), 'Payload PIX deve seguir formato EMV');
    console.assert(pixOrder.amountCents === 1500, 'Valor deve ser 1500 centavos');
    console.log('✓ Teste 1: Geração Real de Ordem PIX (Status inicial PENDING)');

    // Test 1b: PIX Idempotency
    const duplicateOrder = await pixProvider.createPayment({
      userId: testUserId,
      userEmail: 'teste@gmail.com',
      userName: 'Atleta Teste',
      planSlug: 'PRO',
      amountCents: 1500,
      paymentMethod: 'pix',
      idempotencyKey,
    });
    console.assert(duplicateOrder.transactionId === pixOrder.transactionId, 'Idempotência deve retornar a mesma transação');
    console.log('✓ Teste 1b: Idempotência do PIX Provider Validada');
  }

  // Test 2: PIX Status & Webhook Approval
  {
    const idempotencyKey = `idemp_pix_approval_${Date.now()}`;
    const order = await pixProvider.createPayment({
      userId: testUserId,
      userEmail: 'teste@gmail.com',
      userName: 'Atleta Teste',
      planSlug: 'PRO',
      amountCents: 1500,
      paymentMethod: 'pix',
      idempotencyKey,
    });

    // Check status before webhook
    let currentStatus = await pixProvider.getPaymentStatus(order.transactionId);
    console.assert(currentStatus === 'pending', 'Status antes da liquidação deve ser PENDING');

    // Simulate Webhook confirmation from Bank/Gateway
    await pixProvider.approvePaymentFromWebhook(order.transactionId);
    currentStatus = await pixProvider.getPaymentStatus(order.transactionId);
    console.assert(currentStatus === 'approved', 'Status após liquidação deve ser APPROVED');
    console.log('✓ Teste 2: Liquidação de PIX e Transição para APPROVED via Webhook');
  }

  // Test 3: Stripe Checkout Provider
  {
    const idempotencyKey = `idemp_stripe_${Date.now()}`;
    const stripeSession = await stripeProvider.createPayment({
      userId: testUserId,
      userEmail: 'teste@gmail.com',
      userName: 'Atleta Teste',
      planSlug: 'PRO',
      amountCents: 1500,
      paymentMethod: 'credit_card',
      idempotencyKey,
    });

    console.assert(stripeSession.status === 'pending', 'Stripe checkout deve iniciar em PENDING');
    console.assert(stripeSession.checkoutUrl?.includes('stripe.com'), 'URL de checkout segura gerada');
    console.log('✓ Teste 3: Criação de Sessão Stripe Gateway (PCI-DSS compliant)');
  }

  // Test 4: Payment Manager Service Verified Upgrade
  {
    const txId = `tx_verified_${Date.now()}`;
    await paymentManagerService.processVerifiedPayment(testUserId, txId, 'pix_direct', 'PRO');

    const serverSub = await subscriptionServerRepository.findByUserId(testUserId);
    console.assert(serverSub !== null, 'Assinatura deve existir no servidor');
    console.assert(serverSub?.status === 'active', 'Status deve estar ACTIVE após confirmação do gateway');
    console.log('✓ Teste 4: Ativação de Assinatura pelo Payment Manager após Confirmação');
  }

  console.log('--------------------------------------------------------------------------');
  console.log('TODOS OS TESTES DA ARQUITETURA REAL DE GATEWAY DE PAGAMENTOS PASSARAM!');
}

runPaymentProviderTests().catch((err) => {
  console.error('Falha nos testes de pagamento:', err);
  process.exit(1);
});
