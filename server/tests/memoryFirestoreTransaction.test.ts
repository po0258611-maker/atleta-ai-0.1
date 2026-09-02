/**
 * Test Suite: MemoryFirestoreAdapter Transaction Properties & Guarantees
 *
 * Verifies:
 * 1. Múltiplos writes em transação (todos aplicados e aguardados antes do retorno)
 * 2. Delete em transação (remoção de documentos)
 * 3. Erro durante transação (atomicidade: nenhum write staged é aplicado em falha)
 * 4. Leitura seguida de escrita (read-modify-write com dados íntegros)
 * 5. Transação vazia (execução sem operações staged)
 * 6. Ordem das operações (ordem sequencial de sets e deletes respeitada)
 * 7. Estado final correto após transações encadeadas e concorrentes
 */

import { MemoryFirestoreAdapter } from '../repositories/firestoreAdapter';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION_FAILED] ${message}`);
  }
}

async function runMemoryFirestoreTransactionSuite() {
  console.log('===================================================================');
  console.log('   ATLETA AI — MEMORY FIRESTORE TRANSACTION TEST SUITE             ');
  console.log('===================================================================');

  // Test 1: Múltiplos writes em transação
  {
    const adapter = new MemoryFirestoreAdapter();
    const result = await adapter.runTransaction(async (tx) => {
      tx.set('users', 'usr_1', { name: 'Carlos', role: 'ATHLETE', points: 100 });
      tx.set('users', 'usr_2', { name: 'Mariana', role: 'COACH', points: 250 });
      tx.set('metrics', 'global', { totalAthletes: 2 });
      return { success: true, count: 3 };
    });

    assert(result.success === true, 'Transação com múltiplos writes deve retornar resultado esperado');
    assert(result.count === 3, 'Contagem retornada deve ser 3');

    // Verifica que os dados foram de fato persistidos imediatamente no fim do await runTransaction
    const snap1 = await adapter.collection('users').doc('usr_1').get();
    const snap2 = await adapter.collection('users').doc('usr_2').get();
    const snapGlobal = await adapter.collection('metrics').doc('global').get();

    assert(snap1.exists && snap1.data()?.name === 'Carlos', 'usr_1 deve ter sido gravado com sucesso');
    assert(snap2.exists && snap2.data()?.points === 250, 'usr_2 deve ter sido gravado com sucesso');
    assert(snapGlobal.exists && snapGlobal.data()?.totalAthletes === 2, 'metrics global deve ter sido gravado');
    console.log('✓ [1] Múltiplos writes executados e persistidos corretamente');
  }

  // Test 2: Delete dentro de transação
  {
    const adapter = new MemoryFirestoreAdapter({
      items: {
        item_to_delete: { title: 'Temporário', active: true },
        item_to_keep: { title: 'Permanente', active: true },
      },
    });

    await adapter.runTransaction(async (tx) => {
      tx.delete('items', 'item_to_delete');
      tx.set('items', 'item_new', { title: 'Novo Item' });
    });

    const deletedSnap = await adapter.collection('items').doc('item_to_delete').get();
    const keptSnap = await adapter.collection('items').doc('item_to_keep').get();
    const newSnap = await adapter.collection('items').doc('item_new').get();

    assert(!deletedSnap.exists, 'Documento item_to_delete deve ter sido removido');
    assert(keptSnap.exists && keptSnap.data()?.title === 'Permanente', 'item_to_keep deve permanecer intacto');
    assert(newSnap.exists && newSnap.data()?.title === 'Novo Item', 'item_new deve existir');
    console.log('✓ [2] Delete em transação aplicado com sucesso');
  }

  // Test 3: Erro durante a transação (Rollback / Ausência de efeitos colaterais)
  {
    const adapter = new MemoryFirestoreAdapter({
      accounts: {
        acc_100: { balance: 500 },
        acc_200: { balance: 300 },
      },
    });

    let errorThrown = false;
    try {
      await adapter.runTransaction(async (tx) => {
        // Tenta debitar da conta 100
        tx.set('accounts', 'acc_100', { balance: 400 });
        // Simula falha ou validação de negócio que rejeita a operação
        throw new Error('SALDO_INSUFICIENTE_OU_FALHA_SIMULADA');
      });
    } catch (err: any) {
      errorThrown = true;
      assert(err.message === 'SALDO_INSUFICIENTE_OU_FALHA_SIMULADA', 'Erro original deve ser propagado');
    }

    assert(errorThrown, 'Transação abortada deve lançar erro');

    // Verifica que nenhum staged write foi aplicado à conta 100
    const snap100 = await adapter.collection('accounts').doc('acc_100').get();
    assert(snap100.data()?.balance === 500, 'Saldo de acc_100 não deve ter sido alterado após erro na transação');
    console.log('✓ [3] Erro durante transação aborta writes staged sem efeitos colaterais');
  }

  // Test 4: Leitura seguida de escrita (Read-Modify-Write)
  {
    const adapter = new MemoryFirestoreAdapter({
      counters: {
        daily_workouts: { count: 42 },
      },
    });

    const updated = await adapter.runTransaction(async (tx) => {
      const snap = await tx.get('counters', 'daily_workouts');
      assert(snap.exists, 'Documento deve existir para leitura');
      const current = snap.data()?.count || 0;
      const next = current + 1;
      tx.set('counters', 'daily_workouts', { count: next }, { merge: true });
      return next;
    });

    assert(updated === 43, 'Valor retornado da transação deve ser 43');
    const finalSnap = await adapter.collection('counters').doc('daily_workouts').get();
    assert(finalSnap.data()?.count === 43, 'Persistência pós read-modify-write deve conter count = 43');
    console.log('✓ [4] Leitura seguida de escrita (read-modify-write) com integridade garantida');
  }

  // Test 5: Transação vazia (sem mutações staged)
  {
    const adapter = new MemoryFirestoreAdapter();
    const result = await adapter.runTransaction(async (tx) => {
      const snap = await tx.get('nonexistent', 'doc_1');
      assert(!snap.exists, 'Documento não existe');
      return 'NO_OP_SUCCESS';
    });

    assert(result === 'NO_OP_SUCCESS', 'Transação sem writes deve retornar valor com sucesso');
    console.log('✓ [5] Transação vazia executada e finalizada sem erros');
  }

  // Test 6: Ordem estrita das operações (FIFO de sets e deletes no mesmo documento)
  {
    const adapter = new MemoryFirestoreAdapter();

    // Caso A: Set -> Set Merge -> Delete -> Set (Final deve existir com último set)
    await adapter.runTransaction(async (tx) => {
      tx.set('logs', 'l1', { v: 1 });
      tx.set('logs', 'l1', { extra: 'abc' }, { merge: true });
      tx.delete('logs', 'l1');
      tx.set('logs', 'l1', { v: 99, final: true });
    });

    const snapA = await adapter.collection('logs').doc('l1').get();
    assert(snapA.exists, 'Doc deve existir');
    assert(snapA.data()?.v === 99 && snapA.data()?.final === true, 'Estado final deve refletir última escrita');
    assert(snapA.data()?.extra === undefined, 'Propriedade antes do delete não deve existir');

    // Caso B: Set -> Delete (Final deve ser inexistente)
    await adapter.runTransaction(async (tx) => {
      tx.set('logs', 'l2', { v: 50 });
      tx.delete('logs', 'l2');
    });

    const snapB = await adapter.collection('logs').doc('l2').get();
    assert(!snapB.exists, 'Doc com set seguido de delete deve estar excluído');
    console.log('✓ [6] Ordem estrita de operações (sets, merges e deletes) respeitada');
  }

  // Test 7: Estado final e concorrência garantida (Transações simultâneas serializadas)
  {
    const adapter = new MemoryFirestoreAdapter({
      shared_state: {
        accumulator: { total: 0, ops: [] },
      },
    });

    // Dispara 5 transações simultâneas que realizam read-modify-write com incrementos
    const promises = [1, 2, 3, 4, 5].map((val) =>
      adapter.runTransaction(async (tx) => {
        const snap = await tx.get('shared_state', 'accumulator');
        const data = snap.data();
        const currentTotal = data?.total || 0;
        const currentOps = Array.isArray(data?.ops) ? data.ops : [];

        // Pequeno atraso assíncrono para simular trabalho de I/O
        await new Promise((r) => setTimeout(r, 5));

        tx.set(
          'shared_state',
          'accumulator',
          {
            total: currentTotal + val,
            ops: [...currentOps, val],
          },
          { merge: true }
        );

        return val;
      })
    );

    const results = await Promise.all(promises);
    assert(results.length === 5, 'Todas as 5 transações concorrentes devem ser concluídas');

    const finalSnap = await adapter.collection('shared_state').doc('accumulator').get();
    const finalData = finalSnap.data();

    // 1 + 2 + 3 + 4 + 5 = 15
    assert(finalData?.total === 15, `Total acumulado deve ser 15, recebido: ${finalData?.total}`);
    assert(finalData?.ops?.length === 5, 'Exatamente 5 operações registradas no array');
    console.log('✓ [7] Estado final íntegro sob concorrência (serialização e locks atômicos)');
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE TRANSAÇÃO DO MEMORY FIRESTORE ADAPTER PASSARAM!');
  console.log('===================================================================');
}

runMemoryFirestoreTransactionSuite().catch((err) => {
  console.error('Falha na suíte de testes de transação do MemoryFirestoreAdapter:', err);
  process.exit(1);
});
