# ATLETA AI — Auditoria e Correções

Data: 2026-08-29

## Correções aplicadas nesta rodada

1. Remoção de secrets de webhook com fallback hardcoded em produção.
2. Falha explícita de configuração para secrets obrigatórios quando `NODE_ENV=production` e `PAYMENT_MODE=live`.
3. CORS de produção passa a depender de allowlist explícita; domínios amplos do Google deixam de ser aceitos genericamente.
4. Rate limiting do endpoint de IA passa a considerar usuário autenticado quando disponível, mantendo IP como dimensão adicional.
5. Preparação documental para substituir o rate limiter em memória por armazenamento distribuído antes de múltiplas instâncias.

## Pendências para próxima etapa

- Reconciliação matemática de macros e porções em todos os templates nutricionais.
- Revisão clínica/regulatória de linguagem nutricional e de saúde.
- Evolução do volume semanal para feedback adaptativo baseado em desempenho/fadiga.
- Rate limiter distribuído (Redis ou equivalente) para produção multi-instância.
