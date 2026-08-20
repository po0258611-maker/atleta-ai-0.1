# ATHLETA AI — ESQUEMA DE BANCO DE DADOS E PERSISTÊNCIA

> **Arquitetura de Dados:** NoSQL Multi-tenant (Cloud Firestore) + Sincronização Local (LocalStorage)  
> **Status:** Código-Alinhado (Auditado)  
> **Versão:** 2.1.0  

---

## 1. Matriz de Status das Coleções e Entidades de Dados

| Coleção / Entidade | Caminho no Firestore | Classificação | Descrição & Estrutura no Código |
| :--- | :--- | :--- | :--- |
| **Usuários (`users`)** | `/users/{userId}` | `IMPLEMENTADO` | Perfil biométrico base (peso, altura, objetivo, nível, dias disponíveis, tempo de sessão, equipamentos e plano ativo). |
| **Programas de Treino (`programs`)** | `/users/{userId}/programs/{programId}` | `IMPLEMENTADO` | Matriz de treinos gerada pelo Workout Engine, contendo divisão por dias, exercícios, faixas de reps, RIR alvo e tempos de descanso. |
| **Registros de Treino (`logs`)** | `/users/{userId}/logs/{logId}` | `IMPLEMENTADO` | Execução detalhada série a série (carga levantada, repetições realizadas, RIR real, percepção de esforço e duração). |
| **Planos Nutricionais (`diets`)** | `/users/{userId}/diets/{dietId}` | `IMPLEMENTADO` | Metas de TMB, GET, calorias totais, divisão de macronutrientes (proteínas, carboidratos, gorduras, fibras) e proporções por refeição. |
| **Medições Corporais (`measurements`)** | `/users/{userId}/measurements/{measurementId}` | `IMPLEMENTADO` | Histórico cronológico de peso, percentual de gordura corporal (%BF) e circunferências corporais (cintura, tórax, braço, etc.). |
| **Assinaturas & Status (`subscriptions`)** | `/users/{userId}/subscriptions/{subId}` | `IMPLEMENTADO` | Registro de status da assinatura (`active`, `past_due`, `canceled`), plano (`FREE`, `PRO`), provedor (`stripe`, `pix`) e datas de vigência. |
| **Conquistas Desbloqueadas (`achievements`)** | `/users/{userId}/achievements/{id}` | `IMPLEMENTADO` | Badges e marcos desbloqueados pelo atleta com carimbo de data/hora e metadados de progresso. |
| **Trilha de Auditoria de Pagamentos** | `/server/repositories/subscriptionServerRepository.ts` | `IMPLEMENTADO` | Armazenamento de logs de eventos e webhooks de transações com controle de idempotência. |
| **Banco de Dados Relacional SQL (PostgreSQL)** | N/A | `REMOVIDO` / `NÃO APLICÁVEL` | O sistema utiliza arquitetura orientada a documentos NoSQL no Firestore aliada a cache no cliente. |

---

## 2. Modelos de Documentos Tipados em TypeScript

### 2.1 Coleção `users` (`/users/{userId}`)
```typescript
interface UserDocument {
  uid: string;
  email: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  weightKg: number;
  heightCm: number;
  objective: 'hypertrophy' | 'fat_loss' | 'strength' | 'recomposition';
  experience: 'beginner' | 'intermediate' | 'advanced';
  availableDays: 2 | 3 | 4 | 5 | 6;
  timePerSessionMin: number;
  equipmentAccess: 'full_gym' | 'small_gym' | 'home_bodyweight';
  subscriptionTier: 'FREE' | 'PRO' | 'APEX';
  createdAt: string; // ISO 8601
  updatedAt: string;
}
```

### 2.2 Subcoleção `programs` (`/users/{userId}/programs/{programId}`)
```typescript
interface WorkoutProgramDocument {
  id: string;
  userId: string;
  title: string;
  splitType: 'fullbody' | 'custom';
  splitDays: Array<{
    dayNumber: number;
    title: string;
    focus: string;
    exercises: Array<{
      exerciseId: string;
      name: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      targetRIR: number;
      restSeconds: number;
      notes?: string;
      warmupSets?: Array<{ sets: number; reps: number; pct1RM: number }>;
    }>;
  }>;
  isActive: boolean;
  generatedAt: string;
}
```

### 2.3 Subcoleção `logs` (`/users/{userId}/logs/{logId}`)
```typescript
interface WorkoutLogDocument {
  id: string;
  userId: string;
  programId: string;
  dayNumber: number;
  completedAt: string;
  durationSeconds: number;
  rpeFatigueRating: number; // 1 a 10
  notes?: string;
  setsCompleted: Array<{
    exerciseId: string;
    setIndex: number;
    weightKg: number;
    repsCompleted: number;
    rirAchieved: number;
  }>;
}
```

### 2.4 Subcoleção `measurements` (`/users/{userId}/measurements/{measurementId}`)
```typescript
interface BodyMeasurementDocument {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  bodyFatPercentage?: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
}
```

---

## 3. Regras de Segurança do Firestore (`firestore.rules`)

As regras implementadas garantem isolamento rigoroso de inquilinos (multi-tenant) verificando a correspondência do identificador do usuário autenticado (`request.auth.uid`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      match /programs/{programId} {
        allow read, write: if isOwner(userId);
      }
      match /logs/{logId} {
        allow read, write: if isOwner(userId);
      }
      match /diets/{dietId} {
        allow read, write: if isOwner(userId);
      }
      match /measurements/{measurementId} {
        allow read, write: if isOwner(userId);
      }
      match /subscriptions/{subscriptionId} {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
      match /achievements/{achievementId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```
