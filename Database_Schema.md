# ATHLETA AI — DATABASE SCHEMA & DATA PERSISTENCE SPECIFICATION

> **Database Architecture:** Multi-tenant NoSQL (Firestore) + Client-side Caching  
> **Version:** 2.0.0

---

## 1. Data Collections & Entities Model

### 1.1 `users` Collection
- **Path**: `/users/{userId}`
- **Description**: Stores core biometric profiles, goals, and account status.

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
  availableDays: 2 | 3 | 4 | 5;
  timePerSessionMin: number;
  equipmentAccess: 'full_gym' | 'small_gym' | 'home_bodyweight';
  subscriptionTier: 'core_free' | 'apex_pass';
  createdAt: string; // ISO 8601
  updatedAt: string;
}
```

### 1.2 `workout_programs` Collection
- **Path**: `/users/{userId}/programs/{programId}`
- **Description**: Stores active and historic Fullbody Matrix workout programs.

```typescript
interface WorkoutProgramDocument {
  id: string;
  userId: string;
  title: string;
  splitType: 'fullbody';
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
    }>;
  }>;
  isActive: boolean;
  generatedAt: string;
}
```

### 1.3 `workout_logs` Collection
- **Path**: `/users/{userId}/logs/{logId}`
- **Description**: High-precision workout execution logs with set-by-set weight, reps, and RPE.

```typescript
interface WorkoutLogDocument {
  id: string;
  userId: string;
  programId: string;
  dayNumber: number;
  completedAt: string;
  durationSeconds: number;
  rpeFatigueRating: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
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

### 1.4 `diets` Collection
- **Path**: `/users/{userId}/diets/{dietId}`
- **Description**: Stores NutriFlux metabolic targets and IIFYM macronutrient plans.

```typescript
interface DietDocument {
  id: string;
  userId: string;
  tmbKcal: number;
  getKcal: number;
  targetKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
  meals: Array<{
    name: string;
    time: string;
    proteinPct: number;
    carbPct: number;
    fatPct: number;
  }>;
  updatedAt: string;
}
```

---

## 2. Firestore Security Rules Blueprint

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check authentication
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check owner access
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User documents
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
    }
  }
}
```

---

*Document created and maintained by Athleta AI Database Engineering.*
