# ATHLETA AI — SECURITY & COMPLIANCE SPECIFICATION

> **Security Level:** Enterprise Grade & OWASP Top 10 Compliant  
> **Target Standard:** HIPAA (Health Data Privacy) & GDPR / LGPD Readiness  
> **Version:** 2.0.0

---

## 1. Core Security Architectural Controls

### 1.1 Secret Management & API Protection
- **Rule 1**: Zero secret exposure in client bundles. `GEMINI_API_KEY` is restricted strictly to the Node.js server (`server.ts`).
- **Rule 2**: Public environment variables are restricted strictly to non-sensitive configuration keys in `.env.example`.
- **Rule 3**: Cross-Origin Resource Sharing (CORS) is explicitly configured on Express endpoints to restrict origin access.

### 1.2 Authentication & Authorization Guardrails
- **JWT Token Verification**: All requests to protected `/api/*` endpoints require a valid Firebase Auth Bearer Token in the `Authorization` header.
- **Role-Based Access Control (RBAC)**:
  - `core_free`: Access to standard Fullbody Matrix & BioAtlas 3D.
  - `apex_pass`: Full access to KINETIX AI™ endpoint, export engines, and advanced NeuroFatigue analytics.

### 1.3 Data Input Sanitization & Prompt Injection Protection
- Inputs sent to `POST /api/ai-coach` are sanitized to prevent prompt injection and system prompt override attempts.
- System instructions enforce strict domain boundaries: KINETIX AI™ responds exclusively to fitness, biomechanics, exercise science, and nutrition topics.

---

## 2. OWASP Top 10 Risk Mitigation Matrix

| Vulnerability | Athleta AI Mitigation Control | Status |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Firestore security rules enforce strict `request.auth.uid == userId` checks. | Implemented / Hardened |
| **A02: Cryptographic Failures** | HTTPS forced across Cloud Run / Nginx reverse proxy. SSL TLS 1.3. | Implemented |
| **A03: Injection (SQL / Prompt)** | Parameterized API payloads + System Prompt Boundaries on Gemini API calls. | Implemented |
| **A04: Insecure Design** | Server-side proxy architecture isolates third-party keys from browser DOM. | Implemented |
| **A05: Security Misconfiguration** | Disabled HMR in dev runtime; production environment uses esbuild CJS bundle. | Implemented |

---

*Document created and maintained by Athleta AI Information Security & DevSecOps.*
