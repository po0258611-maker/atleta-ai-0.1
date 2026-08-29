# ATHLETA AI — REGISTRO DE ALTERAÇÕES (CHANGE LOG)

Todas as alterações notáveis no código-fonte, arquitetura e motores do ATHLETA AI estão documentadas neste arquivo.

---

## [2.6.0-F1] - 2026-08-29
### 🛡️ Estabilização, Segurança e Integridade
- Removidos fallbacks hardcoded de Supabase e respostas artificiais de diagnóstico.
- Diagnósticos internos de banco passaram a exigir autenticação; integridade exige `ADMIN`.
- Entitlements passaram a falhar fechado quando a autoridade do backend está indisponível.
- Estado local de assinatura não concede nem restaura Premium.
- Migração de dados não promove mais assinatura do localStorage para a autoridade do servidor.
- Progressão de treino passou a usar atualização transacional/idempotente e recálculo após exclusões.
- Corrigida semântica de cancelamento imediato versus cancelamento ao fim do período.
- Transição para FREE não fabrica pagamento ou assinatura paga.
- CI foi alinhado ao `bun.lock` existente.
- Pagamentos reais não foram implementados na F1; endpoints de criação/status/webhook permanecem desativados até a fase específica de gateway.
- Adicionado `/api/ready` e sincronizada a versão operacional para `2.6.0`.
- Removido o documento duplicado por variação de maiúsculas/minúsculas (`projectmaster.md`).

---

## [2.2.0] - 2026-08-20
### 🗑️ Remoção da Integração com Google Drive
- Excluído o visualizador `GoogleDriveView.tsx` e os serviços `googleDriveService.ts` e `googleDriveAuth.ts`.
- Removido o item de menu "Google Drive" da navegação.

---

## [2.1.0] - 2026-08-20
### 🛡️ Auditoria de Alinhamento
- Documentação e classificação de funcionalidades alinhadas ao código existente.
- Suíte de testes automatizados e correções de autenticação, entitlement, webhook e IA.

---

## [2.0.0] - 2026-08-07
### 🎨 Padronização de Design e Arquitetura
- Padronização do BioAtlas 3D e nomenclaturas dos módulos.
- Proxy Express para a IA e persistência multi-tenant via Firestore.

---

## [1.0.0] - 2026-08-01
### 🚀 Lançamento Inicial do Protótipo
- Primeira versão do motor Full Body e calculadora nutricional.
