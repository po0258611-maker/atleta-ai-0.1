# ATHLETA AI — ESPECIFICAÇÃO MESTRE DO PROJETO

> **Nome da Aplicação:** ATHLETA AI — Apex Performance Suite  
> **Identidade da Marca:** Inteligência Atlética Científica de Alta Performance  
> **Status:** F1 — Estabilização e correção estrutural  
> **Versão:** 2.6.0  

---

## 1. Resumo Executivo

O ATHLETA AI é uma plataforma full-stack para treinamento de força, com prescrição determinística Full Body, biblioteca anatômica, análise de desempenho e consultoria assistida por IA.

A autenticação é baseada em Firebase Auth e a persistência operacional principal do backend usa Firestore. O backend é a autoridade para identidade, entitlements, quotas e estado de assinatura.

A implementação de pagamentos reais (PIX/Stripe/Google Play) está deliberadamente fora do escopo da F1 e permanece bloqueada para uma fase comercial específica.

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
11. **Gateway de Assinaturas** — `PENDENTE / FORA DA F1`
12. **App Nativo Mobile Flutter** — `PLANEJADO`

---

## 3. Fonte de Verdade e Dados

- **Firebase Auth:** autoridade de identidade e sessão.
- **Firestore:** persistência operacional do perfil, treinos, logs, progresso, sessões e medições.
- **Backend Firestore:** autoridade de assinatura, histórico, webhook e quotas.
- **Supabase:** camada de compatibilidade/integrações existentes; não deve competir com a fonte de verdade do domínio sem decisão arquitetural explícita.
- **localStorage:** apenas cache/persistência auxiliar de apresentação; nunca concede acesso Premium.

### Assinatura

`subscriptions/{uid}` é a fonte de verdade server-side para assinatura.  
O cliente não escreve estado de cobrança.

---

## 4. Segurança F1

- Firebase ID Token validado no backend.
- Rotas privadas exigem autenticação.
- Diagnósticos de banco exigem autenticação.
- Inspeção de integridade exige `ADMIN`.
- Entitlements são resolvidos pelo backend.
- Falhas de entitlement não são convertidas em sucesso `FREE` artificial.
- Quotas são consumidas atomicamente.
- Dados de assinatura não são migrados do localStorage.

---

## 5. Progressão F1

Logs de treino e estatísticas de progressão devem permanecer consistentes.

- gravação de log e incremento de progresso usam transação;
- regravação do mesmo log é idempotente;
- exclusão recalcula os agregados;
- streak é calculado por dias distintos, e não simplesmente por quantidade de treinos.

---

## 6. Pagamentos

Pagamentos reais permanecem **fora do escopo F1**.

Os providers atualmente existentes no código são tratados como infraestrutura pendente/simulada até que um gateway real seja selecionado e configurado. Nenhuma alteração F1 deve considerar mock como pagamento liquidado.

---

## 7. Documentação Oficial

- `/Project_Master.md`: documento mestre.
- `/Product_Roadmap.md`: cronograma e evolução.
- `/System_Architecture.md`: arquitetura e fluxos.
- `/DESIGN_SYSTEM.md`: sistema visual.
- `/BRANDBOOK.md`: identidade.
- `/Database_Schema.md`: esquema de dados.
- `/Security_Guide.md`: segurança.
- `/Change_Log.md`: histórico de versões.
- `/AUDIT_F1.md`: auditoria e correções da F1.
