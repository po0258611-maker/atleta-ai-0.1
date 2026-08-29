# ARQUITETURA DE PROVEDORES DE PAGAMENTO E PIX (PAYMENTS)

## ATLETA AI / TREINO MAX

---

## 1. VISÃO GERAL DE INTEGRABILIDADE DE PAGAMENTOS

A camada de pagamentos utiliza o padrão **Strategy / Provider Interface** (`PaymentProvider`), permitindo integrar múltiplos gateways mantendo a mesma interface de negócios.

### Provedores Suportados:
1. **PIX Direct Provider** (`PixPaymentProvider`):
   - Suporte a pagamentos instantâneos com Payload padrão EMV BR Code.
   - Geração dinâmica de QR Code e chave "PIX Copia e Cola".
   - Expiração configurável (15 minutos).
2. **Stripe Gateway Provider** (`StripeGatewayProvider`):
   - Cartão de Crédito com Checkout hosted (PCI-DSS Compliant).
   - Suporte a cobrança recorrente e renovação automática.

---

## 2. INTERFACE `PaymentProvider`

```typescript
export interface PaymentProvider {
  providerName: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentTransactionResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentGatewayStatus>;
  cancelPayment?(transactionId: string): Promise<boolean>;
  refundPayment?(transactionId: string): Promise<boolean>;
}
```

---

## 3. FLUXO TÉCNICO DO PIX

1. **Iniciação**:
   - Atleta clica em "Pagar com PIX".
   - Backend gera `transactionId` único (`pix_<timestamp>_<hash>`).
   - Constrói o EMV BR Code autorizativo contendo a chave Pix recebedora e o valor exato.
   - Retorna o payload `copiaECola` e `qrCodeUrl`.

2. **Aguardando Liquidação**:
   - Status inicial permanece estritamente `pending`.
   - O cliente exibe o QR Code e o temporizador de expiração.
   - O frontend faz polling no endpoint `/api/billing/status/:transactionId` ou aguarda a notificação via Server-Sent Events / Webhook.

3. **Liquidação Bancária**:
   - O PSP/Banco envia um webhook para `/api/billing/webhooks/pix_direct` com o evento `pix.paid`.
   - O backend valida a assinatura HMAC, marca a transação como `approved` e eleva a assinatura do usuário para `ACTIVE`.

---

## 4. PREVENÇÃO DE PREÇO ADULTERADO (PRICE TAMPERING)

O cliente envia apenas o identificador do plano:
```json
{
  "planSlug": "PRO",
  "paymentMethod": "pix",
  "idempotencyKey": "idemp_abc1234567890123"
}
```
O servidor valida se `planSlug` é válido e extrai o preço oficial (`1500` centavos). Se o cliente tentar enviar o campo `amountCents` alterado no body, a validação do `paymentManagerService` rejeita a transação lançando `INVALID_SERVER_PRICING`.
