# SocietyHub Comprehensive Security Policy & Architecture Guide

This document outlines the complete **Defense-in-Depth Security Architecture**, cryptographic controls, access management matrices, threat mitigations, and compliance specifications implemented across **SocietyHub**.

---

## 1. Security Architecture Overview

SocietyHub operates under a **Zero-Trust Multi-Tenant Architecture**. No client-side request or identity claim is trusted implicitly; all operations are strictly verified across network proxies, session guards, server-side action interceptors, and tenant-scoped database queries.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client / Browser Request                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Next.js 16 Edge Proxy (src/proxy.ts & SSR Auth Proxy)                 │
│  - Session Token Refresh & Automatic Revocation Check                  │
│  - CSRF Origin / Host Validation on Mutating Methods (POST/PUT/DELETE) │
│  - HTTP Headers: HSTS, Strict CSP, COOP, CORP, XFO, No-Sniff, Referrer │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Server-Side Authentication & Granular Committee RBAC Guards           │
│  - requireSuperAdmin()                                                 │
│  - requireCommitteeAccess(code, EXECUTIVE_ROLES)                       │
│  - requireCommitteeAccess(code, FINANCIAL_ROLES)                       │
│  - requireCommitteeAccess(code, COMMITTEE_ROLES)                       │
│  - requireSocietyAccess(code)                                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Input Sanitization & Injection Mitigation Layer                       │
│  - @/lib/sanitize.ts: Stored XSS & Control Character Stripping         │
│  - @/lib/auth/safeRedirect.ts: Centralized Open Redirect Defense       │
│  - @/lib/csv.ts: Formula / DDE Injection Escaping (=, +, -, @, \t, \r) │
│  - @/lib/errors.ts: Production Error Sanitization & Schema Suppression │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Data Layer, Cryptography & Audit Trail                                │
│  - Write-Time AES-256-GCM Field-Level Encryption (@/lib/crypto)        │
│  - Resident PAN / Aadhaar & Financial Number Masking (@/lib/masking)   │
│  - DPDP/GDPR Automated PII & Secret Redactor (@/lib/auditSanitizer)    │
│  - Cryptographic Tamper-Proof Audit Log Hash Chaining (@/lib/audit)    │
│  - Tenant-Isolated Prisma Queries (societyId enforced)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) Matrix

SocietyHub implements a 6-tier functional role hierarchy with strict separation of duties:

| Role Category | Roles Included | Scope & Permissions |
| :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Global platform administration, society onboarding, user provisioning, and platform-wide audit log exploration. |
| **Executive Committee** | `PRESIDENT`, `SECRETARY`, `TREASURER` | Society legal settings, code changes, resolution drafting, bylaws enforcement. |
| **Financial Operators** | `PRESIDENT`, `TREASURER`, `ACCOUNTANT`, `MANAGER` | Bank accounts, expense approvals, fixed deposits, cheques, petty cash entries, chart of accounts. |
| **Committee Members** | `PRESIDENT`, `VICE_PRESIDENT`, `SECRETARY`, `JOINT_SECRETARY`, `TREASURER`, `MANAGER`, `ACCOUNTANT` | Statutory registers (meetings, shares, nominations, mortgages), vendors, amenities, flat records. |
| **Resident Members** | `MEMBER` | View flat bills, execute payments, book amenities for own flat, view notices. |
| **Gate Security** | `SECURITY` | Visitor entry logs, vehicle tracking, delivery verification. |

---

## 3. Comprehensive Security Controls

### A. Network & Edge Proxy Hardening
- **Edge Proxy (`src/proxy.ts`)**: Next.js 16 App Router edge proxy updates authentication cookies, blocks unauthenticated access to protected routes, and injects hardened HTTP response headers on every request.
- **HTTP Strict Transport Security (HSTS)**: `max-age=31536000; includeSubDomains; preload` enforces HTTPS transport across all communication.
- **Content Security Policy (CSP)**: Strict allowlist defining safe script, style, font, image, and Supabase connection origins with hardened injection defenses:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';
  ```
- **Cross-Origin Context Isolation**: `Cross-Origin-Opener-Policy: same-origin` (COOP) and `Cross-Origin-Resource-Policy: same-origin` (CORP) isolate application execution memory from side-channel memory leaks (Spectre/Meltdown) and window-opener hijacking.
- **Clickjacking Defense**: `X-Frame-Options: DENY` prevents framing in any `<iframe>`.
- **MIME Sniffing Protection**: `X-Content-Type-Options: nosniff`.
- **Permissions Policy**: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`.

### B. CSRF Defense & Safe Session Management
- **Origin Verification**: State-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the `Origin` or `Referer` header to match the request host; cross-origin mutations are rejected with HTTP 403 Forbidden.
- **POST-Only Sign-Out**: Sign-out routes (`/logout` and `/admin/logout`) are restricted exclusively to `POST` requests with HTTP 303 See Other redirects, preventing image-tag (`<img>`) cross-site logout attacks.
- **Anti-Caching for Sensitive APIs**: `/api/auth/me` and `/api/users` enforce `Cache-Control: no-store, no-cache, must-revalidate, private` to prevent caching of user credentials in browser history or intermediate corporate proxies.

### C. Open Redirect Defense Protocol
- **Centralized Safe Redirect Validator (`@/lib/auth/safeRedirect.ts`)**:
  - `getSafeRedirectUrl(targetUrl, fallback)` strictly enforces safe relative paths (`/path`), rejecting:
    - Protocol-relative URLs (`//evil.com`)
    - Windows backslash traversal bypasses (`/\evil.com` or `\/evil.com`)
    - External schemes (`http://`, `https://`, `javascript:`, `data:`, `vbscript:`)
    - CRLF header injection characters (`\r`, `\n`) and null bytes (`\0`).
  - Integrated across all authentication redirects (`/login`, `/admin/login`).

### D. Zero-Trust Multi-Tenant Isolation (IDOR Defense)
- Server actions never trust client-supplied society IDs.
- User session and active society memberships are resolved server-side via `requireCommitteeAccess` and `requireSocietyAccess`.
- All database operations enforce tenant isolation (`where: { id, societyId }` or `where: { block: { societyId } }`).

### E. Active Field-Level AES-256-GCM Encryption at Rest
- Sensitive Personally Identifiable Information (PII) and financial data are encrypted on write using **AES-256-GCM** authenticated encryption with 96-bit random IVs and 128-bit authentication tags (`@/lib/crypto.ts`):
  - **Resident PII**: Permanent Account Number (`panNumber`) and Aadhaar Number (`aadhaarNumber`) in the `Person` table.
  - **Financial Accounts**: Bank Account Number (`accountNumber`) and IFSC codes in the `Account` table.
  - **Vendor PII**: Vendor PAN numbers (`panNumber`) in the `Vendor` table.
  - **Property Liens**: Loan Account Numbers (`loanAccountNumber`) in the `PropertyLien` table.
- Ciphertext format: `enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- In the event of a raw PostgreSQL database breach or backup snapshot leakage, stored government identity numbers and bank accounts remain protected ciphertext.
- **Backward-Compatible Decryption**: `decryptData(val)` transparently decrypts encrypted envelopes while gracefully handling legacy plaintext records during database migrations.

### F. PII & Financial Identifier Masking
- Automated UI masking (`@/lib/masking.ts`) decrypts ciphertext on the server and renders masked representations for browser display:
  - **PAN Number**: `ABCDE••••F` via `maskPan()` (e.g. Residents Directory, Vendor Bill Modals).
  - **Aadhaar Number**: `•••• •••• 1234` via `maskAadhaar()` (e.g. Residents Directory).
  - **Bank & Loan Account Numbers**: `••••1234` via `maskBankAccount()` (e.g. Flat Profile Mortgages, Financial Reports, Account Setup).
  - **Phone Number**: `••••••1234` via `maskPhone()`.
  - **Email Address**: `m••••••@example.com` via `maskEmail()`.

### G. Brute-Force Rate Limiting & Account Lockout Defense
- **Sliding-Window In-Memory Rate Limiter (`@/lib/rateLimit.ts`)**:
  - `peekRateLimit(key, options)`: Inspects remaining attempts without consuming quota hits.
  - `incrementRateLimit(key, options)`: Consumes attempt quota upon authentication failure.
  - `resetRateLimit(key)`: Resets the failure counter upon successful credential verification.
- **Login Rate Limit Dispatcher (`/api/auth/login-limit`)**:
  - `action: "CHECK"` executes pre-flight quota inspection before invoking authentication.
  - `action: "RECORD_FAILURE"` records failed attempts upon bad credentials (**5 attempts per 5 minutes** per IP and normalized email).
  - `action: "RESET"` immediately clears rate limit tally upon successful login.
- **Directory & User Provisioning Protection**:
  - `/api/users` is throttled to **30 requests per minute** (GET) and **10 requests per minute** (POST) to prevent automated account enumeration or creation flooding.

### H. NIST SP 800-63B & OWASP ASVS Password Policy Engine
- **Password Engine (`@/lib/auth/passwordValidation.ts`)**:
  - Minimum length: **10 characters** (NIST SP 800-63B standard).
  - Character diversity: Requires uppercase, lowercase, numeric digits, and special characters (`!@#$%^&*`).
  - Common / Breached Password Blocklist: Blocks top known breached passwords.
  - Contextual Rejection: Rejects passwords containing the user's email username or name.
  - Repeated Character Defense: Blocks trivial character repetitions (`aaaaaa`, `111111`).
  - Integrated into Zod validation schemas (`@/lib/validations/auth.ts`).

### I. Input Sanitization & Stored XSS Mitigation
- User-submitted text fields across all Server Actions and Forms are sanitized via `@/lib/sanitize.ts` prior to database writes.
- Sanitized entities include:
  - Resident profiles and emergency contacts (`residentActions.ts`)
  - Flat numbers, block names, and deed documents (`flats/actions.ts`)
  - Role titles and custom permission descriptions (`roles/actions.ts`)
  - Invoices and assessment titles (`bills/actions.ts`)
  - Payment references and transaction notes (`payments/actions.ts`)
  - Maintenance tariff rules and remarks (`rates/actions.ts`)
  - Amenity names and booking terms (`amenities/actions.ts`)
  - Asset serial numbers, categories, and service logs (`assets/actions.ts`)
  - Budget plan names and account allocations (`budgets/actions.ts`)
  - Meeting minutes, agendas, and formal resolutions (`meetings/actions.ts`)
  - Petty cash denomination logs (`petty-cash/closing/actions.ts`)
  - Society settings, registration, and tax numbers (`settings/actions.ts`)
  - Chart of account heads and ledger descriptions (`ledgers/page.tsx`)
  - Journal voucher lines and narrations (`ledgers/vouchers/actions.ts`)
  - Share certificate numbers (`registers/shares/page.tsx`)
  - Fixed deposit numbers and bank allocations (`investments/page.tsx`)
  - Cheque numbers, party names, and banks (`cheques/page.tsx`)
- Strips full `<script>` and `<style>` blocks, HTML markup, `javascript:` pseudo-protocols, and control characters / null bytes.

### J. Universal CSV / Excel Formula Injection (DDE) Defense
- All tabular data exports in Society and Admin reporting modules ([`SocietyReportsClient.tsx`](file:///d:/societyhub/src/app/society/%5Bcode%5D/reports/SocietyReportsClient.tsx) and [`AdminReportsClient.tsx`](file:///d:/societyhub/src/app/admin/%28protected%29/reports/AdminReportsClient.tsx)) pipe exports through `@/lib/csv.ts` (`generateSafeCsv`).
- Formula execution triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped by prepending a single quote `'` and rendered with UTF-8 BOM.
- Eliminates CSV / Excel formula injection (DDE code execution) when spreadsheets are opened in Microsoft Excel, LibreOffice Calc, or Google Sheets.

### K. Automated Audit PII & Secret Redaction (DPDP Act / GDPR)
- **Automatic Audit Redaction Engine (`@/lib/auditSanitizer.ts`)**:
  - `recordAuditLog` automatically runs deep recursive sanitization on `oldData` and `newData` before persistence.
  - Automatically redacts passwords, tokens, API keys, OTPs, session cookies, and masks PAN, Aadhaar, and Bank Account numbers within arbitrary JSON payloads.

### L. Cryptographic Tamper-Proof Audit Log Hash Chaining
- Audit logs are chained chronologically using HMAC-SHA256 hash signatures (`@/lib/auditCrypto.ts`), linking each record to the preceding entry's signature (Merkle audit chain).
- **Super Admin Audit Explorer** (`/admin/audit-logs`): Real-time mathematical chain verification that detects any record modification, backdating, or unauthorized deletion.
- **Society Audit Explorer** (`/society/[code]/audit-logs`): Tenant-isolated audit trails for committee transparency and statutory compliance.

### M. Production Error Sanitization & Environment Validation
- **Safe Error Handling (`@/lib/errors.ts`)**: In production, `getSafeErrorMessage(err)` suppresses raw PostgreSQL/Prisma error details, table names, foreign key constraints, and internal stack traces, returning sanitized, safe user feedback.
- **Runtime Environment Validator (`@/lib/env.ts`)**: Verifies required environment secrets (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_SECRET_KEY`, `AUDIT_HMAC_SECRET_KEY`) at boot time using Zod schemas.

### N. Security Health & Diagnostics Probe
- Automated health check endpoint at `/api/health/security` continuously verifies:
  1. Database connectivity (`SELECT 1`).
  2. AES-256-GCM encryption/decryption round-trip parity.
  3. HMAC-SHA256 audit engine signature generation.
  4. In-memory rate limiter peek/increment/reset lifecycle.

---

## 4. Verification & Continuous Compliance

Run the unified security and build validation pipeline:

```bash
npm run security:check
```

This script executes:
1. **Automated Cryptographic & Security Self-Tests (`tsx scripts/test-security.ts`)**: Mathematically validates all 8 cryptographic, rate limiting, sanitization, redirect, and password subsystems.
2. **ESLint Rule Validation**: Codebase-wide linting with 0 errors and 0 warnings.
3. **Next.js Production Build**: TypeScript type-checking and static/dynamic optimization across all 42 App Router routes.

---

## 5. Reporting a Vulnerability

We take the security of SocietyHub and its residents seriously. If you discover a security vulnerability, please report it responsibly:

1. **Do not** file public GitHub issues for security vulnerabilities.
2. Email your findings with reproduction steps to **security@societyhub.in** (or contact the system administrator).
3. Include:
   - Vulnerability description & potential impact.
   - Step-by-step reproduction guide or proof-of-concept.
   - Affected URLs, routes, or endpoints.

We will acknowledge reports within **48 hours** and provide regular progress updates through remediation and deployment.
