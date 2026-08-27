# ATHLETA AI — ESPECIFICAÇÃO MESTRE DO PROJETO

> **Nome da Aplicação:** ATHLETA AI — Apex Performance Suite  
> **Identidade da Marca:** Inteligência Atlética Científica de Alta Performance  
> **Status:** Código-Alinhado (Auditado)  
> **Versão:** 2.1.0  

---

## 1. Resumo Executivo

O ATHLETA AI é uma plataforma full-stack para atletas, praticantes de musculação e entusiastas do treinamento de força baseado em evidências. Ele integra prescrição determinística de treinos Fullbody, biblioteca anatômica 3D com mapas de contração muscular, motor nutricional flexível (NutriFlux) e consultoria analítica com IA generativa (KINETIX AI™).

---

## 2. Índice de Módulos Operacionais e Status

1. **Command Center (`overview`)** — `IMPLEMENTADO`
2. **Fullbody Matrix (`workout_engine`)** — `IMPLEMENTADO`
3. **Tensile Load Logger (`workout_logger`)** — `IMPLEMENTADO`
4. **NutriFlux Engine (`diet`)** — `IMPLEMENTADO`
5. **KINETIX AI™ (`ai_coach`)** — `IMPLEMENTADO`
6. **BioAtlas 3D (`exercise_library`)** — `IMPLEMENTADO`
7. **BioProfile Studio (`assessment`)** — `IMPLEMENTADO`
8. **NeuroFatigue Analytics (`fatigue`)** — `IMPLEMENTADO`
9. **Exportador PDF (`pdfExporter`)** — `IMPLEMENTADO`
10. **Google Drive Cloud Sync** — `REMOVIDO`
11. **Gateway de Assinaturas (Stripe/Pix)** — `PARCIAL` / `SIMULADO` (Sandbox)
12. **App Nativo Mobile Flutter** — `PLANEJADO`

---

## 3. Padrões de Arte e Renderização Anatômica 3D

- **Padrão de Modelo**: Modelos anatômicos tridimensionais em posturas ativas de execução.
- **Destaque Agonista (Músculo Alvo)**: Brilho Neon Carmesim / Vermelho Intenso (`#E11D48` / `#FF2A55`).
- **Destaque Sinergista (Músculo Secundário)**: Brilho Âmbar (`#F59E0B`) ou Ciano (`#06B6D4`).
- **Ambiente de Fundo**: Studio Minimalista Dark Charcoal (`#09090B`).

---

## 4. Índice de Documentação Oficial

- `/Product_Roadmap.md`: Cronograma de fases e evolução técnica.
- `/System_Architecture.md`: Arquitetura em camadas, separação de responsabilidades e fluxo de dados.
- `/DESIGN_SYSTEM.md`: Sistema de componentes, tipografia e diretrizes visuais.
- `/BRANDBOOK.md`: Identidade verbal, nomenclaturas e regras de microcopy.
- `/Database_Schema.md`: Esquema de dados NoSQL do Firestore e regras de acesso.
- `/Security_Guide.md`: Diretrizes técnicas de proteção de segredos e autorização.
- `/Change_Log.md`: Histórico de lançamentos e versões.
