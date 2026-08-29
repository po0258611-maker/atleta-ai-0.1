# ATLETA AI — DIRETRIZES TÉCNICAS DE SEGURANÇA (SECURITY.md)

## 1. Fonte Única de Verdade e Autenticação
- O backend (`server.ts`, Express, Firebase Admin SDK) é a autoridade absoluta.
- Todas as requisições protegidas transitam via `Authorization: Bearer <Firebase_ID_Token>`.
- O parâmetro `uid` enviado no corpo/query pelo cliente é estritamente ignorado em favor da identidade extraída do token validado (`req.user.uid`).

## 2. Isolamento de Segredos
- Chaves de API (`GEMINI_API_KEY`, Firebase Service Account) permanecem exclusivas no ambiente do servidor Node.js.
- Nenhuma chave confidenciais é exposta em variáveis públicas (`VITE_*`) ou no bundle do navegador.

## 3. Sanitização de IA e Proteção contra Injection
- O `AISecurityGuard` analisa todas as entradas contra palavras-chave de override ("ignore previous instructions", "system prompt", etc.).
- Todas as saídas da Gemini passam por filtro regex que censura preventivamente qualquer padrão parecido com chaves ou segredos.

## 4. Proteção contra IDOR e Matriz RBAC
- Os dados do atleta são estruturados em `users/{uid}/...` no Firestore e isolados via `firestore.rules` e RLS do Supabase.
- Papéis `ATHLETE`, `COACH`, `ADMIN` são atribuídos no servidor; tentativas de escalada por usuários de nível inferior são rejeitadas com HTTP 403 Forbidden.
