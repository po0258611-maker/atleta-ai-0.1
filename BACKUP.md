# ATLETA AI — ESTRATÉGIA DE BACKUP E RETENÇÃO DE DADOS (BACKUP.md)

## 1. Arquitetura do Backup Lógico
- **Firestore**: Suporte a exportação de coleções via Cloud Storage Bucket com agendamento diário (`gcloud firestore export gs://[BUCKET_NAME]`).
- **Supabase / PostgreSQL**: Suporte a relatórios `pg_dump` lógicos e backups automáticos diários com Point-In-Time Recovery (PITR) ativado na infraestrutura gerenciada.

## 2. Isolamento e Criptografia
- Todos os backups são criptografados em repouso com chaves de criptografia gerenciadas pelo Google Cloud (CMEK/GCM).
- O acesso aos backups exige perfil administrativo dedicado de infraestrutura com autenticação MFA ativada.

## 3. Retenção de Dados
- **Snapshots Diários**: Retenção por 30 dias para mitigação de falhas de aplicação.
- **Snapshots Mensais**: Retenção por 12 meses para conformidade e integridade operacional.
