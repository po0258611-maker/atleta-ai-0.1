# ATLETA AI — PLANO DE RECUPERAÇÃO DE DESASTRES (DISASTER-RECOVERY.md)

## 1. Métricas de Disponibilidade
- **RPO (Recovery Point Objective)**: Máximo de 24 horas (correspondente ao ciclo de backup diário).
- **RTO (Recovery Time Objective)**: Menor que 2 horas para restauração completa de contêiner e dados do banco.

## 2. Planos de Contingência
- **Indisponibilidade do Gemini**: O sistema aciona automaticamente o fallback determinístico (*BioAtlas Engine*), garantindo que a geração e progressão de treino do atleta continuem funcionando sem interrupção.
- **Corrupção de Dados**: Restauração pontual a partir do snapshot diário do Firestore/Supabase em ambiente secundário limpo com validação prévia de esquema.
- **Comprometimento de Credenciais**: Rotação imediata das chaves do Gemini/Firebase Admin através do painel de segredos do ambiente e re-deploy imediato do contêiner sem downtime percebido.
