# ATHLETA AI — REGISTRO DE ALTERAÇÕES (CHANGE LOG)

Todas as alterações notáveis no código-fonte, arquitetura e motores do ATHLETA AI estão documentadas neste arquivo.

---

## [2.2.0] - 2026-08-20
### 🗑️ Remoção da Integração com Google Drive
- **Remoção de Módulo & Componentes**:
  - Excluído o visualizador `GoogleDriveView.tsx` e os serviços `googleDriveService.ts` e `googleDriveAuth.ts`.
  - Removido o item de menu "Google Drive" (ícone de Nuvem) da barra lateral de navegação (`SidebarNav.tsx`) e do menu de perfil no cabeçalho (`Header.tsx`).
  - Limpeza dos hooks (`useWorkout.ts`) e rotas principais (`App.tsx`).
  - Documentação do projeto atualizada refletindo a remoção do serviço.

---

## [2.1.0] - 2026-08-20
### 🛡️ Auditoria de Alinhamento (Documentação × Código Real)
- **Classificação Formal de Funcionalidades**:
  - Todas as especificações técnicas, esquemas de banco de dados e guias de segurança foram alinhados para refletir estritamente o código existente.
  - Funcionalidades marcadas de acordo com as categorias oficiais: `IMPLEMENTADO`, `PARCIAL`, `SIMULADO`, `PLANEJADO` e `REMOVIDO`.
  - Remoção de alegações de conformidade jurídica ou certificações externas que não foram formalmente auditadas por terceiros.

### 🧪 Suíte de Testes Automatizados Geral & Correção de IA
- **Cobertura de Testes**: Implementada suíte unificada via `npm test` cobrindo 27 verificações automatizadas de ponta a ponta:
  - *Workout Engine*: Validação de Happy Path, sanitização de inputs inválidos/extremos e restrições de tempo.
  - *Progression Engine*: Dupla progressão, recomendações de carga via RIR e deloads por fadiga.
  - *Auth & Repositories*: Registro, login com hash PBKDF2/SHA-256, rejeição de credenciais inválidas e emissão de tokens.
  - *Entitlements & RBAC*: Avaliação e bloqueio de cotas mensais de IA no backend.
  - *Payment Webhooks*: Processamento de confirmação de pagamento, tratamento de falhas e controle de idempotência.
  - *AI Security Guard*: Bloqueio de injeção de prompt e censura de credenciais na saída.
- **Correção da Interface do KINETIX AI™**: Sincronização do identificador de aba (`ai_coach`) no roteador principal da aplicação React, eliminando tela preta na seleção do módulo.

---

## [2.0.0] - 2026-08-07
### 🎨 Padronização de Design & Identidade Visual
- **BioAtlas 3D Ray-Traced**: Padronização dos modelos anatômicos tridimensionais com mapas de brilho muscular em cores neon para os 23 exercícios do catálogo canônico.
- **Nomenclatura Unificada**:
  - `overview` ➔ **Command Center**
  - `workout_engine` ➔ **Fullbody Matrix**
  - `workout_logger` ➔ **Tensile Load Logger**
  - `diet` ➔ **NutriFlux Engine**
  - `ai_coach` ➔ **KINETIX AI™ Studio**
  - `exercise_library` ➔ **BioAtlas 3D**
  - `assessment` ➔ **BioProfile Studio**
  - `fatigue` ➔ **NeuroFatigue Analytics**

### 🏗️ Arquitetura Server-Side Proxy & Persistência
- **Proxy Express Seguro**: Isolamento da chave `GEMINI_API_KEY` exclusivamente no backend Node.js (`server.ts` e `server/services/aiService.ts`).
- **Persistência Multi-tenant Firestore**: Modelagem de coleções particionadas por UID de usuário com regras em `firestore.rules` e fallback sincronizado em `localStorage`.
- **Exportador PDF & Backup Google Drive**: Exportação direta de fichas de treino em PDF e integração de backup/restauração via Google Drive REST API.

---

## [1.0.0] - 2026-08-01
### 🚀 Lançamento Inicial do Protótipo
- Versão inicial do motor de treino Full Body e calculadora nutricional básica desenvolvida em React + TypeScript + Vite + Tailwind CSS.
