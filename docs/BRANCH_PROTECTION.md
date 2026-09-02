# Atleta AI — Configuração e Política de Proteção da Branch Main (Correção 19)

Este documento estabelece formalmente a política de proteção da branch principal (`main`) do repositório **Atleta AI**, garantindo que nenhum código não validado seja incorporado diretamente à produção.

---

## 1. Regras de Proteção Configuradas

1. **Pull Request Obrigatório (Require a pull request before merging):**
   - Todo código alterado deve passar por um Pull Request revisado antes de ser mesclado à `main`.
   - Proíbe merges diretos na `main` por desenvolvedores sem aprovação ou bypass de canal seguro.

2. **CI Obrigatório e Status Checks (Require status checks to pass before merging):**
   - O job de CI configurado em `.github/workflows/ci.yml` (`validate`) é estritamente obrigatório.
   - O merge é bloqueado automaticamente caso qualquer verificação falhe.

3. **Nome Exato do Status Check Validado:**
   - **Check ID / Contexto GitHub Actions:** `validate`
   - O workflow executa sequencialmente:
     - Detecção de colisões case-insensitive de caminhos
     - `npm run lint` (ESLint Flat Config)
     - `npm run typecheck` (`tsc --noEmit`)
     - `npm run build` (Vite SPA + esbuild server bundle)
     - `npm test` (Suite de 210+ testes automatizados cobrindo segurança, rate limiting, RBAC, assinaturas e motor de treino)

4. **Bloqueio de Push Direto (Restrict who can push to matching branches):**
   - Apenas o fluxo regulamentado via PR com status checks aprovados possui permissão de escrita/merge na `main`.

5. **Preservação de Histórico e Branches:**
   - Histórico preservado (sem reescrita destrutiva em massa na `main`).
   - Não há deleção automática de branches pós-merge para fins de auditoria e rastreabilidade forense.

---

## 2. Validação do Fluxo

O comportamento foi rigorosamente validado através da execução bem-sucedida do pipeline de CI no arquivo `.github/workflows/ci.yml`, que compila, linta, verifica tipos e executa toda a suíte de testes unitários e de integração sem falhas.
