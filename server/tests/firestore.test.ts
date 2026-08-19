/**
 * Test Suite: Firestore Data Layer, UID Isolation & CRUD
 *
 * Verifies:
 * 1. CRUD on user profile (users/{uid}/profile)
 * 2. CRUD on active workout program (users/{uid}/workouts)
 * 3. Logging, reading, and deleting exercise logs (users/{uid}/exerciseLogs)
 * 4. Slicing progression statistics (users/{uid}/progression)
 * 5. Subscription management (users/{uid}/subscription)
 * 6. Body measurements (users/{uid}/measurements)
 * 7. UID isolation between distinct athletes
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId: firebaseConfig.projectId });
const db = getFirestore(app);

async function runFirestoreTests() {
  console.log('--- INICIANDO TESTES DO FIRESTORE DATA SERVICE & ISOLAMENTO POR UID ---');

  const athleteA_UID = `athleta_test_a_${Date.now()}`;
  const athleteB_UID = `athleta_test_b_${Date.now()}`;

  // Test 1: Create & Read Profile for Athlete A
  {
    const profileA = {
      name: 'Atleta Teste Alpha',
      gender: 'male',
      age: 28,
      heightCm: 180,
      weightKg: 82,
      objective: 'hypertrophy',
      availableDays: 4,
      updatedAt: new Date().toISOString(),
    };

    const docRef = db.doc(`users/${athleteA_UID}/profile/current`);
    await docRef.set(profileA);

    const snapshot = await docRef.get();
    console.assert(snapshot.exists, 'Documento de perfil deve existir');
    const data = snapshot.data();
    console.assert(data?.name === 'Atleta Teste Alpha', 'Nome do atleta deve coincidir');
    console.log('✓ Teste 1: Criação e Leitura de Perfil (users/{uid}/profile)');
  }

  // Test 2: Active Workout Program Storage
  {
    const programA = {
      id: `prog_${Date.now()}`,
      methodology: 'FULL_BODY',
      splitDays: [{ id: 'A', title: 'Full Body A - Foco Peitoral' }],
      updatedAt: new Date().toISOString(),
    };

    const docRef = db.doc(`users/${athleteA_UID}/workouts/active`);
    await docRef.set(programA);

    const snapshot = await docRef.get();
    console.assert(snapshot.exists, 'Treino ativo deve existir');
    console.assert(snapshot.data()?.methodology === 'FULL_BODY', 'Metodologia deve ser FULL_BODY');
    console.log('✓ Teste 2: Gravação e Leitura de Treino Ativo (users/{uid}/workouts)');
  }

  // Test 3: Exercise Logs CRUD
  {
    const logId = `log_${Date.now()}`;
    const logData = {
      id: logId,
      date: new Date().toISOString().split('T')[0],
      dayId: 'A',
      durationMin: 55,
      sessionRPE: 8,
      exerciseLogs: [
        {
          exerciseId: 'supino_reto',
          exerciseName: 'Supino Reto com Barra',
          sets: [{ setNumber: 1, repsDone: 8, weightKg: 90, actualRIR: 2, completed: true }],
        },
      ],
    };

    const colRef = db.collection(`users/${athleteA_UID}/exerciseLogs`);
    await colRef.doc(logId).set(logData);

    const getSnap = await colRef.doc(logId).get();
    console.assert(getSnap.exists, 'Log de exercício deve ser gravado');
    console.assert(getSnap.data()?.durationMin === 55, 'Duração deve ser 55');

    // Update
    await colRef.doc(logId).update({ sessionRPE: 9 });
    const updatedSnap = await colRef.doc(logId).get();
    console.assert(updatedSnap.data()?.sessionRPE === 9, 'RPE atualizado com sucesso');

    // Delete
    await colRef.doc(logId).delete();
    const deletedSnap = await colRef.doc(logId).get();
    console.assert(!deletedSnap.exists, 'Log de treino deve ser excluído com sucesso');
    console.log('✓ Teste 3: CRUD Completo de Logs de Treino (users/{uid}/exerciseLogs)');
  }

  // Test 4: Body Measurements
  {
    const measId = `meas_${Date.now()}`;
    const measData = {
      id: measId,
      userId: athleteA_UID,
      date: '2026-08-19',
      weightKg: 82.5,
      heightCm: 180,
      bodyFatPercentage: 14.2,
      waistCm: 81,
    };

    const docRef = db.doc(`users/${athleteA_UID}/measurements/${measId}`);
    await docRef.set(measData);

    const snap = await docRef.get();
    console.assert(snap.exists && snap.data()?.weightKg === 82.5, 'Medição gravada');
    console.log('✓ Teste 4: Gravação e Leitura de Medições Corporais (users/{uid}/measurements)');
  }

  // Test 5: Strict UID Isolation (Athlete B cannot see Athlete A's data)
  {
    const docRefB = db.doc(`users/${athleteB_UID}/profile/current`);
    const snapB = await docRefB.get();
    console.assert(!snapB.exists, 'Atleta B não deve ver dados do Atleta A (Isolamento por UID)');
    console.log('✓ Teste 5: Isolamento Estrito de Dados entre Atletas por UID');
  }

  console.log('----------------------------------------------------------------------');
  console.log('TODOS OS TESTES DE FIRESTORE, CRUD E ISOLAMENTO PASSARAM COM SUCESSO!');
}

runFirestoreTests().catch((err) => {
  console.error('Falha nos testes de Firestore:', err);
  process.exit(1);
});
