# DOCUMENTAÇÃO DE COBRANÇA E ASSINATURAS (BILLING)

## ATLETA AI / TREINO MAX

---

## 1. ARQUITETURA GERAL DE ASSINATURAS E COBRANÇA

O sistema de cobrança do **Atleta AI** adota um modelo **Server-Authoritative** rigoroso:

```
[ FRONTEND ] ──( 1. POST /api/billing/checkout )──> [ EXPRESS BACKEND ]
     │                                                      │
     │                                           ( 2. Criar Intent/PIX )
     │                                                      ▼
     │                                           [ PAYMENT PROVIDER ]
     │                                           (Stripe / PIX Direct)
     │                                                      │
     │ <───( 3. Retorna URL / QR Code )─────────────────────┘
     │
 (Usuário paga)
     │
     ▼
[ GATEWAY PSP ] ───( 4. POST /api/billing/webhooks/:provider )──> [ EXPRESS BACKEND ]
                                                                       │
                                                       ( 5. Validação HMAC & Idempotência )
                                                                       ▼
                                                       [ FIRESTORE DB ]
                                                       (Salva Sub & Audit Log)
                                                                       │
                                                                       ▼
                                                       [ ENTITLEMENT SERVICE ]
                                                       (Atualiza Plafform Entitlements)
```

---

## 2. REGRAS DE OURO DE SEGURANÇA FINANCEIRA

1. **O Cliente NUNCA é Autoridade Financeira**: O frontend jamais envia planos, preços ou status de assinatura para concessão de acesso. Toda alteração de plano ou direito premium provém de webhooks criptograficamente autenticados.
2. **Preço Mapeado Server-Side**: O endpoint de checkout recebe apenas o `planSlug` (ex: `PRO`, `APEX_ELITE`). O valor em centavos e moeda é consultado diretamente do `PLAN_CATALOG` no servidor (`server/config/plans.ts`).
3. **Idempotência Obrigatória**: Toda criação de intenção exige `idempotencyKey`. O reenvio da mesma chave retorna a transação existente sem gerar novas ordens no provedor.
4. **Isolamento de Tenant**: O `userId` é estritamente extraído do token Firebase JWT autenticado (`req.athlete.uid`), impedindo ataques IDOR onde um usuário tenta pagar em nome de outro.

---

## 3. CATÁLOGO AUTORITATIVO DE PLANOS (`PLAN_CATALOG`)

| Plano | Slug | Valor (BRL) | Valor (Centavos) | Recursos Inclusos |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | `FREE` | R$ 0,00 | 0 | Prescrição básica, 10 msgs IA/mês, treinos limitados |
| **PRO** | `PRO` | R$ 15,00 | 1500 | IA Coach ilimitado, Análise Biomecânica, BioAtlas, Histórico Completo |
| **APEX ELITE** | `APEX_ELITE` | R$ 120,00 | 12000 | Acompanhamento em tempo real, Consultoria biomecânica avançada, prioridade máxima |

---

## 4. ESTADOS CANÔNICOS DE ASSINATURA

| Estado Canônico | Significado Comercial | Permite Acesso Premium? |
| :--- | :--- | :--- |
| `FREE` | Plano padrão sem cobrança ativa | Não |
| `ACTIVE` | Pagamento confirmado e dentro da validade | **Sim** |
| `TRIAL` | Período de avaliação ativo | **Sim** |
| `PAST_DUE` | Falha no pagamento / Renovação pendente | Não (Bloqueado) |
| `CANCELED` | Assinatura cancelada (mantém até o end period se `cancelAtPeriodEnd`) | Sim (se dentro do período contratado) |
| `EXPIRED` | Ciclo encerrado sem renovação | Não (Fallback para FREE) |

---

## 5. ENDPOINTS DA API DE BILLING

- `POST /api/billing/checkout`: Inicia o checkout (requer autenticação Bearer).
- `GET /api/billing/status/:transactionId`: Consulta status de transação (protegido por UID).
- `GET /api/billing/history`: Histórico de faturamento do atleta autenticado.
- `POST /api/billing/cancel`: Solicita cancelamento da assinatura.
- `POST /api/billing/reactivate`: Reativa assinatura cancelada.
- `POST /api/billing/change-plan`: Altera plano (downgrade para FREE; upgrade exige checkout).
- `POST /api/billing/webhooks/:provider`: Endpoint público para webhooks do gateway (autenticação via HMAC-SHA256).
