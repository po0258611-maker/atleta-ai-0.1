# ATHLETA AI — ESPECIFICAÇÃO MESTRE DE PRODUTO

> **Produto:** ATHLETA AI — Apex Performance Suite  
> **Status:** Código-Alinhado (Auditado)  
> **Versão:** 2.1.0  

---

## 1. Matriz de Auditoria de Funcionalidades do Produto

| Módulo / Funcionalidade | Classificação | Estado Real no Código-Fonte |
| :--- | :--- | :--- |
| **Command Center (`overview`)** | `IMPLEMENTADO` | Dashboard executivo com indicador de prontidão de recuperação, volume semanal acumulado, divisão de treino ativa e atalhos de navegação. |
| **Fullbody Matrix (`workout_engine`)** | `IMPLEMENTADO` | Geração completa de treinos Fullbody adaptativos (2 a 6 dias), seleção de exercícios, cálculo de séries/reps/RIR e substituição de exercícios biomecanicamente equivalentes. |
| **Tensile Load Logger (`workout_logger`)** | `IMPLEMENTADO` | Interface interativa de registro de treino durante a sessão, cronômetro de descanso, salvamento de cargas e repetições reais por série. |
| **NutriFlux Engine (`diet`)** | `IMPLEMENTADO` | Cálculo metabólico (TMB e GET via Mifflin-St Jeor), ajuste de superávit/déficit calórico e divisão de macronutrientes (Proteínas, Carboidratos, Gorduras, Fibras) por refeições. |
| **KINETIX AI™ Coach (`ai_coach`)** | `IMPLEMENTADO` | Chat analítico com assistente de IA conectado ao Google Gemini no backend, com sanitização de segurança contra prompt injection, censura de chaves e controle de cotas. |
| **BioAtlas 3D Library (`exercise_library`)** | `IMPLEMENTADO` | Catálogo de 23 exercícios com visualização 3D de alta fidelidade (destaque de agonistas e sinergistas em cores neon), dicas biomecânicas e vídeos de execução. |
| **BioProfile Studio (`assessment`)** | `IMPLEMENTADO` | Formulário e gestão de perfil físico (peso, altura, objetivo, experiência, restrições e equipamentos disponíveis) com persistência multi-usuário. |
| **NeuroFatigue & RPE Analytics (`fatigue`)** | `IMPLEMENTADO` | Painel de monitoramento de fadiga acumulada, prontidão de recuperação neuromuscular e gatilhos automáticos de recomendação de Deload. |
| **BioMeasurements Tracker** | `IMPLEMENTADO` | Modal de registro de medidas corporais com histórico temporal de peso, circunferências corporais e cálculo do percentual de gordura. |
| **Gamificação & Conquistas (`achievements`)** | `IMPLEMENTADO` | Sistema de 8 medalhas e conquistas desbloqueadas dinamicamente com base em marcos reais de treino e consistência. |
| **Exportação de Treino em PDF** | `IMPLEMENTADO` | Exportador cliente que sintetiza e faz download de fichas de treino diagramadas no formato PDF via `jspdf`. |
| **Backup em Nuvem via Google Drive** | `REMOVIDO` | Funcionalidade descontinuada e removida do aplicativo. |
| **Gating de Permissões (Free vs Pro)** | `IMPLEMENTADO` | Modal de bloqueio não invasivo (`PremiumGateModal`) e controle de acesso a recursos avançados baseado no plano do usuário. |
| **Mecanismo de Assinatura & Checkout** | `PARCIAL` / `SIMULADO` | Telas de seleção de planos, geração de QR Code Pix e criação de sessões Stripe implementadas; executando em modo sandbox/emulado no ambiente de desenvolvimento. |
| **Modo de Imitação de Arquétipos de Atletas** | `IMPLEMENTADO` | Modelagem biomecânica de cadência (TUT) e RIR baseada em 4 arquétipos de atletas de alto rendimento (`aiImitationEngine.ts`). |
| **Aplicativo Nativo Mobile (iOS e Android)** | `PLANEJADO` | Portabilidade para aplicativo nativo em Flutter (conforme planejado nas próximas fases do roadmap). |
| **Integração Direta com Wearables de Hardware** | `PLANEJADO` | Coleta contínua de telemetria via Apple HealthKit e Google Fit em hardware nativo. |
| **Portal Multi-Atleta para Treinadores/Academias** | `PLANEJADO` | Painel B2B para personal trainers gerenciarem múltiplos alunos simultaneamente. |

---

## 2. Nomenclatura Padrão do Sistema

- **Nome Oficial do Produto**: ATHLETA AI — Apex Performance Suite
- **Assistente Biomecânico**: KINETIX AI™
- **Módulos Oficiais**:
  - `overview`: **Command Center**
  - `workout_engine`: **Fullbody Matrix**
  - `workout_logger`: **Tensile Load Logger**
  - `diet`: **NutriFlux Engine**
  - `ai_coach`: **KINETIX AI™ Studio**
  - `exercise_library`: **BioAtlas 3D**
  - `assessment`: **BioProfile Studio**
  - `fatigue`: **NeuroFatigue Analytics**

---

## 3. Planos e Tiers de Monetização

1. **Athleta Core Pass (`FREE`)**:
   - Geração de treinos essenciais Full Body.
   - Acesso aos 12 exercícios fundamentais do BioAtlas 3D.
   - Cota mensal de 10 consultas com o KINETIX AI™.
   - Registro de treinos e medidas corporais.
2. **Athleta APEX Membership (`PRO` / `PREMIUM`)**:
   - Consultas ilimitadas com o KINETIX AI™.
   - Acesso irrestrito a todos os 23 exercícios 3D avançados.
   - Periodização avançada e métricas de NeuroFatigue ilimitadas.
   - Exportação ilimitada de matrizes em PDF e suporte prioritário.
