# ATHLETA AI — REPOSITORY CHANGE LOG

All notable changes to the Athleta AI codebase and architecture are documented in this file.

---

## [2.1.0] - 2026-08-07
### 🚀 Phase 1: Athleta Core Pass (Free Tier) Implementation
- **Authentication & Persistence Service**:
  - Full Email + Password registration (`registerUserAccount`), login (`loginWithEmailAndPassword`), and persistent sessions (`localStorage` + session state).
  - One-click Google Authentication (`loginWithGoogleAccount`) and Guest Access (`visitante.corepass@athleta.ai`).
  - Email Verification workflow (`verifyUserEmail` & email verification banner in Command Center).
  - Password Reset Request flow (`requestPasswordReset`).
- **Initial Onboarding & Physical Assessment**:
  - `OnboardingWizard` and `BioProfile Studio` for initial physical assessment, goal selection, and automatic initial workout generation.
- **Body Measurements Repository**:
  - Created `BodyMeasurementsService` and `BodyMeasurementsModal` for logging and viewing weight, height, body fat %, waist, chest, and arm circumferences over time.
- **Gamified Achievements Engine**:
  - Created `AchievementsService` and `AchievementsView` featuring 8 core badges (*Pioneiro Athleta*, *BioProfile Concluído*, *Primeiro Treino*, *Foco na Balança*, *Mestre da Frequência*, *1.000 kg Levantados*, *Consistência de Aço*, *Evolução Apex*).
- **Centralized Permission Gating**:
  - Created `PermissionService` (`/src/services/permissionService.ts`) enforcing feature limits for Core Pass vs APEX Membership.
  - Built non-disruptive `PremiumGateModal` for locking non-free features without interrupting user navigation.
  - Implemented 12 free exercise limit in `BioAtlas 3D` with padlock indicators on advanced exercises.
  - Limited KINETIX AI™ queries to 3 free queries per session/day for Core Pass users.
  - Prepared Clean Architecture adapters for future Phase 2 APEX Membership payments.

---

## [2.0.0] - 2026-08-07
### 🎨 Visual & Art Direction Audit (Standardization)
- **3D Anatomical Model Standardization**: Generated high-fidelity 3D ray-traced anatomical renders with crimson red neon muscular glow highlights (`athletic_squat_3d`, `athletic_bench_3d`, `athletic_row_3d`, `athletic_overhead_3d`, `athletic_arms_3d`, `athletic_hinge_3d`).
- **Design System Rules**: Created `/DESIGN_SYSTEM.md` establishing 3D anatomical rendering rules, lighting standards, and component badge colors.
- **Updated Exercise Data**: Mapped all 23 exercise entries in `src/engine/exerciseData.ts` to standard 3D anatomical ray-traced assets.

### 🏷️ Naming Matrix & Brand Identity Upgrade
- **Brand Name**: Standardized to **ATHLETA AI** (*Apex Performance Suite*).
- **AI Coach**: Renamed to **KINETIX AI™** (*Senior Biomechanical Intelligence*).
- **Core Modules**:
  - Overview ➔ **Command Center**
  - Treinos Fullbody ➔ **Fullbody Matrix**
  - Dieta Flexível ➔ **NutriFlux Engine**
  - Guia de Exercícios ➔ **BioAtlas 3D**
  - Gerenciar Perfis ➔ **BioProfile Studio**
  - Plano PRO ➔ **APEX Membership**
- **Brandbook**: Created `/BRANDBOOK.md` establishing brand values, tone of voice, and CTA microcopy standards.
- **Product Master**: Created `/Product_Master.md` detailing all architectural modules and monetization tiers.

### 🏗️ Master Architectural Specifications
- **Roadmap**: Created `/Product_Roadmap.md` detailing Phase 1 through Phase 4 enterprise rollout.
- **System Architecture**: Created `/System_Architecture.md` documenting Clean Architecture, Express proxying, and Flutter target design.
- **Database Schema**: Created `/Database_Schema.md` specifying Firestore schemas and security rules.
- **Security Guide**: Created `/Security_Guide.md` outlining OWASP Top 10 compliance and secret isolation.

---

## [1.0.0] - Initial Prototype Build
- React 19 + Vite + Express + Tailwind CSS fullbody workout engine prototype.
