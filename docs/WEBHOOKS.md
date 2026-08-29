# PROCESSAMENTO AUTENTICADO E IDEMPOTENTE DE WEBHOOKS (WEBHOOKS)

## ATLETA AI / TREINO MAX

---

## 1. SEGURANÇA CRIPTOGRÁFICA DE WEBHOOKS

O endpoint `/api/billing/webhooks/:provider` é o único ponto de alteração passiva do estado financeiro do atleta. Por isso, aplica **4 camadas consecutivas de proteção**:

```
[ REQUISIÇÃO WEBHOOK ]
          │
          ▼
1. VERIFICAÇÃO DE ASSINATURA HMAC-SHA256
   - Rejeita com HTTP 401 (MISSING_SIGNATURE / INVALID_SIGNATURE_MISMATCH)
          │
          ▼
2. PROTEÇÃO CONTRA REPLAY ATTACK (TOLERÂNCIA TEMPORAL)
   - Rejeita com HTTP 401 se timestamp > 300s de diferença do relógio do servidor
          │
          ▼
3. REIVINDICAÇÃO ATÔMICA DE IDEMPOTÊNCIA (FIRESTORE TRANSACTION)
   - Tenta registrar a chave `${provider}_${eventId}` na coleção `webhook_events`
   - Se já processado: Retorna HTTP 200 (ALREADY_PROCESSED) sem mutar dados
          │
          ▼
4. ORDENAÇÃO TEMPORAL DE EVENTOS
   - Garante que eventos antigos (ex: `payment_failed` em atraso) não sobrescrevam atualizações mais recentes (`payment_succeeded`)
```

---

## 2. VERIFICAÇÃO DE ASSINATURA POR PROVEDOR

### Stripe (`stripe`)
- **Header**: `stripe-signature`
- **Formato**: `t=<timestamp>,v1=<hmac_hex>`
- **Assinatura calculada**: `HMAC-SHA256(STRIPE_WEBHOOK_SECRET, "${timestamp}.${rawBody}")`
- **Comparação**: `crypto.timingSafeEqual` (Tempo constante para prevenção de ataques de temporização).

### PIX / PSPs Bancários (`pix_direct` / `pix`)
- **Header**: `x-signature` ou `stripe-signature`
- **Assinatura calculada**: `HMAC-SHA256(PIX_WEBHOOK_SECRET, payload)`
- **Comparação**: `crypto.timingSafeEqual`.

---

## 3. EVENTOS PROCESSADOS E MAPEAMENTO DE STATUS

| Evento Recebido | Provedor | Status Resultante na Assinatura |
| :--- | :--- | :--- |
| `payment_succeeded` / `pix.paid` / `pix.settled` / `invoice.payment_succeeded` | Stripe / PIX | `active` (Elevação para PRO/APEX) |
| `payment_failed` / `pix.failed` / `pix.expired` / `invoice.payment_failed` | Stripe / PIX | `past_due` (Acesso Premium Bloqueado) |
| `customer.subscription.deleted` / `pix.refunded` | Stripe / PIX | `canceled` |
| `customer.subscription.trialing` | Stripe | `trialing` |

---

## 4. TESTES DE SEGURANÇA EXECUTADOS & VALIDADOS

- `WEBHOOK-01`: Webhook com Assinatura Inválida / HMAC adulterado ──> **Rejeitado (HTTP 401)**.
- `WEBHOOK-02`: Evento Duplicado (Replay da mesma notificação 10x) ──> **Retorna HTTP 200 `ALREADY_PROCESSED` (1 única mutação efetiva)**.
- `WEBHOOK-03`: Payload com `user_id` adulterado / forjado ──> **Não concede plano PRO**.
- `WEBHOOK-04`: Replay Attack com timestamp expirado (>5 minutos) ──> **Rejeitado (HTTP 401 `REPLAY_ATTACK_TIMESTAMP_EXPIRED`)**.
