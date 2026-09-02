/**
 * Test Suite: errorHandler Middleware Security & Sanitization
 *
 * Verifies:
 * 1. Erro conhecido (400, 401, 403, 404, 409, 429) -> Retorna código e mensagem segura
 * 2. Erro desconhecido sem status -> Retorna HTTP 500 com mensagem genérica segura
 * 3. Erro 500 explícito com mensagem interna -> Mensagem é mascarada como 'Ocorreu um erro interno no servidor.'
 * 4. Erro com stack trace -> Stack trace NÃO aparece na resposta pública
 * 5. Erro contendo informações sensíveis (API Key, Database, Token, Postgres, File Paths) -> Mascarado em código/mensagem segura
 * 6. Preservação de status HTTP correto (400, 401, 403, 404, 409, 500)
 */

import { errorHandler, ApiError } from '../middlewares/errorHandler';
import type { Request, Response, NextFunction } from 'express';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION_FAILED] ${message}`);
  }
}

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: any };
}

function createMockRequest(path = '/api/test', method = 'POST'): Request {
  return {
    path,
    method,
    ip: '127.0.0.1',
    headers: {},
  } as unknown as Request;
}

const mockNext: NextFunction = () => {};

async function runErrorHandlerTestSuite() {
  console.log('===================================================================');
  console.log('   ATLETA AI — SECURE ERROR HANDLER TEST SUITE                    ');
  console.log('===================================================================');

  // Test 1: Erro conhecido 400 (Bad Request com mensagem segura)
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('Parâmetro peso inválido.');
    err.statusCode = 400;
    err.code = 'INVALID_INPUT';

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 400, 'Status deve ser 400');
    assert(res.body.error.code === 'INVALID_INPUT', 'Código deve ser INVALID_INPUT');
    assert(res.body.error.message === 'Parâmetro peso inválido.', 'Mensagem segura preservada');
    assert(!res.body.error.stack, 'Stack trace não deve existir no payload');
    console.log('✓ [1] Erro 400 conhecido tratado com código e mensagem segura');
  }

  // Test 2: Erro conhecido 401 (Unauthorized)
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('Autenticação necessária.');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 401, 'Status deve ser 401');
    assert(res.body.error.code === 'UNAUTHORIZED', 'Código deve ser UNAUTHORIZED');
    assert(res.body.error.message === 'Autenticação necessária.', 'Mensagem de auth retornada');
    console.log('✓ [2] Erro 401 tratado com código e mensagem seguros');
  }

  // Test 3: Erro conhecido 403 (Forbidden)
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('Acesso negado para este recurso.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 403, 'Status deve ser 403');
    assert(res.body.error.code === 'FORBIDDEN', 'Código deve ser FORBIDDEN');
    assert(res.body.error.message === 'Acesso negado para este recurso.', 'Mensagem segura');
    console.log('✓ [3] Erro 403 tratado com segurança');
  }

  // Test 4: Erro conhecido 404 (Not Found)
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('Treino não encontrado.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 404, 'Status deve ser 404');
    assert(res.body.error.code === 'NOT_FOUND', 'Código deve ser NOT_FOUND');
    assert(res.body.error.message === 'Treino não encontrado.', 'Mensagem segura');
    console.log('✓ [4] Erro 404 tratado com segurança');
  }

  // Test 5: Erro 409 (Conflict)
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('Conflito de versão ao atualizar treino.');
    err.statusCode = 409;
    err.code = 'CONFLICT';

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 409, 'Status deve ser 409');
    assert(res.body.error.code === 'CONFLICT', 'Código deve ser CONFLICT');
    assert(res.body.error.message === 'Conflito de versão ao atualizar treino.', 'Mensagem segura de conflito');
    console.log('✓ [5] Erro 409 tratado com sucesso');
  }

  // Test 6: Erro Desconhecido / 500 Não Tratado
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err = new Error('Unexpected null pointer exception at line 42');

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 500, 'Status deve ser 500');
    assert(res.body.error.code === 'INTERNAL_SERVER_ERROR', 'Código deve ser INTERNAL_SERVER_ERROR');
    assert(
      res.body.error.message === 'Ocorreu um erro interno no servidor.',
      'Mensagem pública deve ser estritamente genérica'
    );
    assert(!JSON.stringify(res.body).includes('line 42'), 'Detalhes internos não devem vazar');
    console.log('✓ [6] Erro desconhecido mascarado como HTTP 500 genérico');
  }

  // Test 7: Erro 500 com Stack Trace longo
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('V8 Engine Crash');
    err.statusCode = 500;
    err.stack = 'Error: V8 Engine Crash\n    at Object.runInternal (/app/server/secret.ts:12:34)\n    at node_modules/express/...';

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 500, 'Status deve ser 500');
    assert(!res.body.error.stack, 'Stack trace não deve existir no JSON');
    assert(!JSON.stringify(res.body).includes('/app/server/secret.ts'), 'Path do sistema não pode vazar');
    assert(!JSON.stringify(res.body).includes('node_modules'), 'node_modules não pode vazar');
    console.log('✓ [7] Stack trace completamente omitido da resposta pública');
  }

  // Test 8: Erro no cliente (400) mas com mensagem contendo dados sensíveis / credenciais
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('Falha ao autenticar com apiKey AIzaSyD927498724 no firestore database');
    err.statusCode = 400;

    errorHandler(err, req, res, mockNext);

    assert(res.statusCode === 400, 'Status 400 mantido');
    assert(!JSON.stringify(res.body).includes('AIzaSyD'), 'API Key não deve constar na resposta');
    assert(!JSON.stringify(res.body).includes('firestore'), 'Nome de infraestrutura não deve constar');
    assert(res.body.error.message === 'Requisição inválida.', 'Mensagem revertida para o default seguro');
    console.log('✓ [8] Mensagem com dados sensíveis (API Key / DB) redigida para mensagem segura');
  }

  // Test 9: Erro com segredo do PostgreSQL / Supabase
  {
    const req = createMockRequest();
    const res = createMockResponse();
    const err: ApiError = new Error('SELECT * FROM users WHERE password_hash = "secret123" failed on postgres');
    err.statusCode = 400;

    errorHandler(err, req, res, mockNext);

    assert(!JSON.stringify(res.body).includes('password'), 'Palavra password redigida');
    assert(!JSON.stringify(res.body).includes('postgres'), 'Termo postgres redigido');
    assert(res.body.error.message === 'Requisição inválida.', 'Mensagem segura');
    console.log('✓ [9] Queries SQL e referências a tabelas/senhas devidamente redigidas');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DO ERROR HANDLER SEGURO PASSARAM COM SUCESSO!     ');
  console.log('===================================================================');
}

runErrorHandlerTestSuite().catch((err) => {
  console.error('Falha nos testes do errorHandler:', err);
  process.exit(1);
});
