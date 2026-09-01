# ATLETA AI — Auditoria e Correções

Data de referência: 2026-08-29

## Correções reaplicadas nesta rodada

1. Remoção de secrets de webhook com fallback hardcoded em produção.
2. Falha explícita de inicialização quando a configuração de produção é insegura.
3. `PAYMENT_MODE=mock` é rejeitado em produção.
4. Mercado Pago exige credencial server-side em produção quando é o provider configurado.
5. `PIX_WEBHOOK_SECRET` é obrigatório em produção.
6. CI executa em Node 22, alinhado à toolchain atual.
7. CI volta a detectar colisões de caminhos que diferem apenas por maiúsculas/minúsculas.

## Preservação deliberada

- A arquitetura de autenticação do Google AI Studio não foi substituída.
- As Firestore Rules já endurecidas foram preservadas.
- A configuração Firebase do AI Studio foi preservada.
- Nenhum segredo real foi adicionado ao repositório.
- A `main` não foi alterada diretamente; as mudanças estão em uma branch de correção revisável.

## Pendências

- Validar integralmente a suíte de testes no CI.
- Revisar a integração Mercado Pago ponta a ponta com credenciais de sandbox.
- Validar webhooks e reconciliação de pagamentos.
- Revisar rate limiting para ambiente multi-instância.
- Fazer revisão funcional da arquitetura de autenticação após a refatoração do AI Studio.
