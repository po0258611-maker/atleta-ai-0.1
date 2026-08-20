# ATHLETA AI — GUIA DE SEGURANÇA E ARQUITETURA DE PROTEÇÃO DE DADOS

> **Documento:** Guia de Diretrizes Técnicas de Segurança  
> **Status:** Código-Alinhado (Auditado)  
> **Versão:** 2.1.0  
> **Nota de Conformidade:** Este documento descreve estritamente os controles técnicos e salvaguardas computacionais implementados no código-fonte. Não constitui certificação jurídica ou auditoria externa formal de conformidade (como HIPAA, GDPR, LGPD ou ISO/IEC).

---

## 1. Matriz de Status dos Controles de Segurança

| Controle / Funcionalidade | Classificação | Detalhes Técnicos da Implementação |
| :--- | :--- | :--- |
| **Isolamento de Segredos (API Keys)** | `IMPLEMENTADO` | `GEMINI_API_KEY` e segredos de backend operam exclusivamente no servidor Node.js (`server.ts` e `/server/services/*`). Nenhuma chave de IA é exposta ao bundle do cliente. |
| **Proteção contra Injeção de Prompt (AI Guard)** | `IMPLEMENTADO` | `aiSecurityGuard.ts` e `aiService.ts` implementam sanitização de tokens de prompt, bloqueio de palavras-chave de override de sistema e limites estritos de caracteres. |
| **Prevenção de Vazamento de Segredos em Respostas IA** | `IMPLEMENTADO` | Filtro de regex intercepta e mascara chaves de API (`AIza...`, `sk-...`, etc.) nas respostas geradas antes do envio ao cliente. |
| **Autenticação com JWT / Firebase Auth** | `IMPLEMENTADO` | `authGuard.ts` intercepta requisições a rotas protegidas (`/api/*`), validando tokens Bearer via Firebase Admin SDK ou token de sessão local. |
| **Autorização RBAC e Entitlements Server-Side** | `IMPLEMENTADO` | `entitlementService.ts` avalia planos (`FREE` vs `PRO/PREMIUM`) e cotas de uso mensais no backend, retornando 403 Forbidden quando limites são atingidos. |
| **Idempotência de Webhooks de Pagamento** | `IMPLEMENTADO` | `paymentWebhookService.ts` e `paymentProvider.ts` registram IDs de eventos processados com cache de expiração para rejeitar transações duplicadas. |
| **Headers HTTP de Segurança (CORS & Proteção Básica)** | `IMPLEMENTADO` | Express configurado com `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` e `X-XSS-Protection: 1; mode=block`. |
| **Regras de Segurança Firestore (Isolamento por UID)** | `IMPLEMENTADO` | `firestore.rules` restringe leitura e escrita exclusivamente ao proprietário do documento autenticado (`request.auth.uid == userId`). |
| **Criptografia de Senhas Locais (Fallback Auth)** | `IMPLEMENTADO` | Senhas salvas no repositório de fallback utilizam derivação com salt e hash criptográfico (PBKDF2 / SHA-256). |
| **Ambiente de Pagamentos em Produção (Live Gateway)** | `SIMULADO` | Adapters de Stripe e Pix possuem arquitetura completa de geração e liquidação, operando com chaves de teste/sandbox até provisionamento de credenciais bancárias ao vivo. |
| **Auditoria e Certificação Externa Formal** | `PLANEJADO` | Auditorias formais de penetração (Pentest) e selos de conformidade de terceiros. |

---

## 2. Salvaguardas do Motor de Inteligência Artificial (`aiSecurityGuard.ts`)

1. **Camada de Entrada (Input Barrier)**:
   - Sanitização de inputs do usuário contra técnicas de Jailbreak e Prompt Injection.
   - Bloqueio de comandos de sistema ("ignore previous instructions", "system override", "reveal API key").
   - Restrição temática obrigatória a ciências do exercício, biomecânica, nutrição e recuperação atlética.

2. **Camada de Saída (Output Sanitizer)**:
   - Verificação determinística contra o catálogo canônico de exercícios (`exerciseData.ts`), prevenindo invenção de movimentos biomecanicamente perigosos.
   - Detecção e censura preventiva de padrões de tokens confidenciais e credenciais de servidor.

---

## 3. Diretrizes para Variáveis de Ambiente

- Chaves privadas **NUNCA** devem ser prefixadas com `VITE_`.
- Novas variáveis públicas devem ser declaradas em `.env.example` sem valores confidenciais.
- A comunicação cliente-servidor para dados protegidos deve sempre transitar via cabeçalho `Authorization: Bearer <token>`.
