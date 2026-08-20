# ATHLETA AI — ESPECIFICAÇÃO DE ARQUITETURA DO SISTEMA

> **Padrão Arquitetural:** Clean Architecture + Server-Side API Proxy + Multi-Engine Modular  
> **Status:** Código-Alinhado (Auditado)  
> **Versão:** 2.1.0  

---

## 1. Matriz de Status dos Componentes e Camadas Arquiteturais

| Camada / Módulo | Componente Técnico | Classificação | Descrição & Realidade do Código |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | React 18+ & Vite (TypeScript + Tailwind CSS) | `IMPLEMENTADO` | Interface SPA responsiva montada em tela única com sub-visualizadores modulares (`src/components/*`). |
| **Backend Express** | Node.js + Express 4.x (`server.ts` + `dist/server.cjs`) | `IMPLEMENTADO` | Servidor intermediário que centraliza chamadas de IA, autenticação, verificação de permissões e entrega de assets estáticos em produção. |
| **Workout Engine** | `src/engine/workoutEngine.ts` | `IMPLEMENTADO` | Motor determinístico de prescrição de treinos Fullbody (2 a 6 dias), distribuição de volume, seleção de exercícios e substituição equivalente. |
| **Progression Engine** | `src/services/progressionEngine.ts` | `IMPLEMENTADO` | Algoritmo de dupla progressão com ajuste de carga baseado em RIR e critérios de Deload por fadiga acumulada. |
| **1RM Estimation Engine** | `src/services/oneRepMaxService.ts` | `IMPLEMENTADO` | Cálculo multi-fórmula de 1RM estimada (Brzycki, Epley, Lander, Lombardi, Mayhew, O'Conner, Wathan). |
| **NeuroFatigue Engine** | `src/services/fatigueEngine.ts` | `IMPLEMENTADO` | Monitoramento de estresse sistêmico, índice de fadiga muscular e cálculo de prontidão de recuperação neuromuscular. |
| **NutriFlux Engine** | `src/engine/dietEngine.ts` | `IMPLEMENTADO` | Motor metabólico baseado na equação de Mifflin-St Jeor com cálculo de TMB, GET e divisão de macronutrientes (IIFYM). |
| **BioAtlas 3D Library** | `src/engine/exerciseData.ts` & `src/services/bioAtlasService.ts` | `IMPLEMENTADO` | Catálogo de 23 exercícios com visualização 3D ray-traced (mapas de brilho muscular), mecânica e links de execução. |
| **KINETIX AI™ (Gemini)** | `server/services/aiService.ts` & `src/components/AICoachView.tsx` | `IMPLEMENTADO` | Assistente biomecânico integrado via `@google/genai` (Gemini Flash), operando com sanitização de segurança e cotas no servidor. |
| **Motor de Entitlements & RBAC**| `server/services/entitlementService.ts` | `IMPLEMENTADO` | Controle de acesso a recursos (`FREE` vs `PRO/PREMIUM`) com contagem de uso e validação em rotas `/api/entitlements/*`. |
| **Exportação PDF** | `src/services/pdfExporter.ts` | `IMPLEMENTADO` | Geração direta no cliente de fichas e matrizes de treino em formato PDF via biblioteca `jspdf`. |
| **Google Drive Cloud Backup** | `src/services/googleDriveService.ts` & `src/services/googleDriveAuth.ts` | `IMPLEMENTADO` | Integração com Google Identity Services (GSI) e Google Drive REST API para exportação e restauração de backups JSON. |
| **Persistência Firestore** | `src/services/firestoreDataService.ts` & `firestore.rules` | `IMPLEMENTADO` | Persistência NoSQL multi-tenant com isolamento estrito por UID de usuário. |
| **Cache Offline / Fallback Local**| `src/services/dataMigrationService.ts` | `IMPLEMENTADO` | Sincronização automática e persistência em `localStorage` para operação offline sem perda de estado do atleta. |
| **Gateway de Pagamento (Stripe/Pix)**| `server/services/payments/*` & `paymentGatewayAdapter.ts` | `PARCIAL` / `SIMULADO` | Fluxo completo de checkout, assinatura, geração de QR Code PIX e webhooks com idempotência; executando com chaves de sandbox no ambiente de desenvolvimento. |
| **Motor de Imitação de Arquétipos** | `src/services/aiImitationEngine.ts` | `IMPLEMENTADO` | Sistema de modelagem de cadência, RIR e tempo sob tensão para 4 arquétipos de atletas (Powerlifting, Hipertrofia, Híbrido, Calistenia). |
| **Gamificação (Conquistas)** | `src/services/achievementsService.ts` | `IMPLEMENTADO` | Sistema de badges desbloqueáveis por volume total levantado, sequência de dias e marcos de avaliação física. |
| **Aplicativo Nativo Flutter (iOS/Android)**| Portabilidade Nativa Mobile | `PLANEJADO` | Desenvolvimento de app nativo em Flutter com arquitetura BLoC/Clean Architecture (previsto no Roadmap). |
| **Telemetria de Wearables (HealthKit / Google Fit)**| Integração direta de Hardware | `PLANEJADO` | Leitura em tempo real de sensores biométricos nativos (dependente da fase mobile). |

---

## 2. Diagrama de Fluxo de Dados e Interações

```
+-----------------------------------------------------------------------------------+
|                                 CAMADA CLIENTE (SPA)                             |
|  +-----------------------------------+   +-------------------------------------+  |
|  |  React 18 + Vite (Tailwind CSS)   |   |  Visualizadores e Modais            |  |
|  |  - Command Center (`overview`)    |   |  - AICoachView (KINETIX AI™)        |  |
|  |  - Fullbody Matrix View           |   |  - ExerciseLibraryView (BioAtlas 3D)|  |
|  |  - NutriFlux View (Dieta IIFYM)   |   |  - FatigueProgressView (NeuroFatigue|  |
|  +-----------------------------------+   +-------------------------------------+  |
|                                     |                                             |
|                     +---------------+---------------+                             |
|                     |                               |                             |
|          +----------v-----------+        +----------v-----------+                 |
|          | Motores Locais (TS)  |        | Cache & Fallback     |                 |
|          | - workoutEngine.ts   |        | - localStorage       |                 |
|          | - dietEngine.ts      |        | - Data Migration     |                 |
|          | - progressionEngine  |        | - jsPDF Exporter     |                 |
|          +----------------------+        +----------------------+                 |
+------------------------------------------+----------------------------------------+
                                           |
                               HTTPS / REST (com Bearer Token)
                                           |
+------------------------------------------v----------------------------------------+
|                            CAMADA SERVIDOR (Node.js + Express)                    |
|  +-----------------------------------------------------------------------------+  |
|  |  Middleware: authGuard (JWT/Session), Rate Limit, ErrorHandler, Logger      |  |
|  |  Endpoints Protegidos:                                                      |  |
|  |  - POST /api/ai-coach (aiSecurityGuard -> Gemini Flash AI Service)           |  |
|  |  - GET/POST /api/entitlements (Avaliação de Cotas e Permissões)             |  |
|  |  - POST /api/subscriptions/checkout (Stripe / Pix Payment Sessions)         |  |
|  |  - POST /api/subscriptions/webhook (Processamento Idempotente)              |  |
|  +-----------------------------------------------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           |
                 +-------------------------+-------------------------+
                 |                                                   |
+----------------v-----------------------+   +-----------------------v--------------+
|            SERVIÇOS EXTERNOS           |   |          PERSISTÊNCIA REMOTA         |
|  - Google GenAI (@google/genai)        |   |  - Firebase Auth (Tokens JWT)        |
|  - Gemini 2.5 / 1.5 Flash              |   |  - Cloud Firestore (Multi-tenant)    |
|  - Google Drive REST API (OAuth Backup)|   |  - Repositórios Server-Side          |
+----------------------------------------+   +--------------------------------------+
```

---

## 3. Diretrizes de Isolamento e Segurança Arquitetural

1. **Separação Rígida de Responsabilidades**:
   - Os cálculos biomecânicos e metabólicos ocorrem de forma determinística e síncrona nos motores especializados (`src/engine/*`), sem dependência de APIs externas para a geração base.
   - A IA generativa atua estritamente como consultora analítica complementar, protegida por barreiras de segurança pré e pós-processamento.
2. **Autorização Centralizada no Servidor**:
   - A validação de planos e permissões (`entitlementService.ts`) é a autoridade máxima, impedindo que modificações do lado do cliente concedam acessos indevidos.
