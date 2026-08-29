# ATLETA AI — MANUAL DE OBSERVABILIDADE E LOGS (OBSERVABILITY.md)

## 1. Padrão de Logs Estruturados
Todos os logs do servidor seguem o formato JSON padronizado:
```json
{
  "level": "INFO|WARN|ERROR",
  "message": "Descrição amigável da operação",
  "timestamp": "ISO-8601 UTC",
  "requestId": "UUID-v4 associado ao cabeçalho X-Request-ID",
  "path": "/api/...",
  "status": 200
}
```

## 2. Rastreabilidade e Múltiplas Chamadas
- Cada requisição HTTP no backend recebe um `X-Request-ID` único propagado através dos middlewares de autorização, banco de dados e camadas de inferência de IA.

## 3. Prevenção de VAZAMENTO em Logs
- Senhas, tokens Bearer, chaves de API (`GEMINI_API_KEY`) e dados financeiros são estritamente mascarados antes de qualquer escrita no stdout/stderr.
