# ATHLETA AI — ROADMAP DO PRODUTO & MATRIZ DE ENTREGAS

> **Produto:** ATHLETA AI — Apex Performance Suite  
> **Status:** Código-Alinhado (Auditado)  
> **Versão:** 2.1.0  

---

## 1. Visão Geral das Fases de Desenvolvimento

```
+-----------------------------------------------------------------------------------+
| FASE 1: FUNDAÇÃO DO MOTOR & ARQUITETURA WEB (Concluída)                           |
| - Motores de Treino (Fullbody), Nutrição (IIFYM) e Progressão (RIR/1RM)           |
| - Catálogo 3D BioAtlas com mapas de calor muscular e execução biomecânica        |
| - Servidor Express com isolamento estrito de chaves de IA (Gemini Flash)          |
| - Exportação de treinos em PDF (jsPDF) e Backup no Google Drive                   |
| Status: IMPLEMENTADO ✅                                                           |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| FASE 2: PERSISTÊNCIA, AUTORIZAÇÃO & SEGURANÇA SERVER-SIDE (Concluída / Em Curso)  |
| - Autenticação Firebase (E-mail/Senha, Google Popup, Sessão com Token)            |
| - Persistência NoSQL Cloud Firestore com regras de segurança por UID              |
| - Motor de Entitlements & RBAC Server-Side (Cotas e Permissões de Acesso)         |
| - Salvaguarda contra Injeção de Prompt e Vazamento de Chaves (`aiSecurityGuard`)  |
| - Adapters e Webhooks de Pagamento (Stripe/Pix em Sandbox)                        |
| Status: IMPLEMENTADO / PARCIAL (Pagamentos em Sandbox) 🔄                          |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| FASE 3: APLICATIVO NATIVO MOBILE FLUTTER & WEARABLES (Planejado)                  |
| - Portabilidade para Flutter 3.x (iOS e Android) com arquitetura BLoC             |
| - Integração de telemetria com Apple HealthKit e Google Fit em hardware nativo   |
| - Notificações Push locais e cronômetros de descanso em background                |
| Status: PLANEJADO ⏳                                                              |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| FASE 4: PORTAL B2B PARA TREINADORES, INTERNACIONALIZAÇÃO & GATEWAY LIVE (Planejado)|
| - Credenciamento de Gateway de Produção (Stripe Live / Banco Central Pix)        |
| - Portal Web B2B para Personal Trainers e Academias gerenciarem múltiplos atletas |
| - Internacionalização completa (i18n: Inglês, Espanhol, Alemão)                   |
| Status: PLANEJADO ⏳                                                              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Detalhamento dos Módulos e Funcionalidades

| Item do Roadmap | Fase Prevista | Classificação | Observações Técnicas |
| :--- | :--- | :--- | :--- |
| **Geração de Treino Fullbody (2-6 dias)** | Fase 1 | `IMPLEMENTADO` | Determinístico, testado e validado em `src/engine/workoutEngine.ts`. |
| **Biblioteca Anatômica 3D (BioAtlas)** | Fase 1 | `IMPLEMENTADO` | 23 exercícios com renders 3D em `src/engine/exerciseData.ts`. |
| **Cálculo de TMB e Macros (NutriFlux)** | Fase 1 | `IMPLEMENTADO` | Equação de Mifflin-St Jeor em `src/engine/dietEngine.ts`. |
| **KINETIX AI™ Biomechanical Studio** | Fase 1 | `IMPLEMENTADO` | API proxy protegida no servidor via `@google/genai`. |
| **Exportação PDF de Treinos** | Fase 1 | `IMPLEMENTADO` | Geração direta no cliente com biblioteca `jspdf`. |
| **Sincronização com Google Drive** | Fase 1 | `REMOVIDO` | Integração descontinuada e removida do aplicativo. |
| **Autenticação Firebase & Sessão** | Fase 2 | `IMPLEMENTADO` | Suporte a Google Auth, Email/Senha e Sessão criptográfica. |
| **Persistência Firestore Multi-tenant**| Fase 2 | `IMPLEMENTADO` | Coleções particionadas por UID de usuário com fallback local. |
| **Controle de Cotas e RBAC no Backend**| Fase 2 | `IMPLEMENTADO` | Avaliação no servidor com bloqueio automático ao atingir cotas. |
| **Proteção de IA contra Prompt Injection**| Fase 2 | `IMPLEMENTADO` | Sanitizador regex e verificação contra o catálogo canônico. |
| **Gateway de Pagamento Stripe/Pix** | Fase 2 | `PARCIAL` / `SIMULADO` | Arquitetura completa com webhooks e idempotência; operando em sandbox de desenvolvimento. |
| **App Mobile Nativo em Flutter** | Fase 3 | `PLANEJADO` | Portabilidade da base de código para ecossistema mobile nativo. |
| **Telemetria de Wearables (HealthKit)** | Fase 3 | `PLANEJADO` | Coleta contínua de frequência cardíaca e gasto calórico passivo. |
| **Painel B2B para Treinadores** | Fase 4 | `PLANEJADO` | Gestão de alunos e prescrição remota por profissionais de educação física. |
| **Internacionalização (i18n)** | Fase 4 | `PLANEJADO` | Suporte a múltiplos idiomas (atualmente 100% em Português do Brasil). |

---

## 3. Matriz de Riscos Técnicos e Mitigações

| Risco Técnico | Probabilidade | Impacto | Estratégia de Mitigação Implementada |
| :--- | :--- | :--- | :--- |
| **Vazamento de Chaves de API** | Baixa | Crítico | Chamadas de IA isoladas no backend Express (`server.ts`); nenhuma chave no cliente. |
| **Falha de Conectividade / Offline** | Média | Médio | Sistema de fallback e migração local com cache em `localStorage`. |
| **Injeção de Prompt em Consultas de IA** | Média | Alto | Filtros de segurança pré-processamento e validação de saída em `aiSecurityGuard.ts`. |
| **Duplicação de Eventos de Pagamento** | Média | Alto | Cache de idempotência implementado no serviço de webhooks. |
