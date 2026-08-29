# ATLETA AI — ANÁLISE TÉCNICA DE PRIVACIDADE E DADOS (PRIVACY-TECHNICAL.md)

## 1. Mapeamento de Dados Pessoais
- **Identificação Básica**: Nome, e-mail e UID autenticado via Firebase Auth.
- **Métricas Biométricas**: Idade, peso, altura, sexo, objetivo de treino, histórico de cargas e logs de execução.

## 2. Minimização e Acesso Restrito
- Apenas os atributos de treino necessários para os cálculos biomecânicos são repassados ao contexto das requisições.
- Nenhum e-mail, senha ou token pessoal do usuário é enviado às chamadas externas da API Gemini.

## 3. Direitos do Atleta (Exclusão e Exportação)
- Suporte técnico a exportação integral dos dados biométricos em formato JSON/PDF através das telas do aplicativo.
- Suporte a solicitação e limpeza completa de dados armazenados sob `users/{uid}` mediante confirmação atômica.
- **Conformidade Legal**: Mapeamento técnico preparado para auditoria jurídica e salvaguardas da LGPD.
