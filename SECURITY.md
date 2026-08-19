# SocietyHub Comprehensive Security Policy & Architecture Guide

This document outlines the complete **Defense-in-Depth Security Architecture**, cryptographic controls, access management matrices, threat mitigations, and compliance specifications implemented across **SocietyHub**.

---

## 1. Security Architecture Overview

SocietyHub operates under a **Zero-Trust Multi-Tenant Architecture**. No client-side request or identity claim is trusted implicitly; all operations are strictly verified across network proxy, session middleware, server-side action guards, and tenant-scoped database queries.

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
│  - @/lib/csv.ts: Formula / DDE Injection Escaping (=, +, -, @, \t, \r) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Data Layer, Cryptography & Audit Trail                                │
│  - Active Write-Time AES-256-GCM Field-Level Encryption (@/lib/crypto) │
│  - PII & Financial Masking on UI Views (@/lib/masking)                 │
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
| **Committee Members** | `PRESIDENT`, `VICE_PRESIDENT`, `SECRETARY`, `JOINT_SECRETARY`, `TREASURER`, `MANAGER`, `ACCOUNTANT` | Statutory registers (meetings, shares, nominations, mortgages), vendors, amenities. |
| **Resident Members** | `MEMBER` | View flat bills, execute payments, book amenities for own flat, view notices. |
| **Gate Security** | `SECURITY` | Visitor entry logs, vehicle tracking, delivery verification. |

---

## 3. Comprehensive Security Controls

### A. Network & Edge Proxy Hardening
- **HTTP Strict Transport Security (HSTS)**: `max-age=31536000; includeSubDomains; preload` enforces HTTPS everywhere.
- **Content Security Policy (CSP)**: Strict allowlist defining safe script, style, font, image, and Supabase connection origins with `frame-ancestors 'none'`.
- **Cross-Origin Context Isolation**: `Cross-Origin-Opener-Policy: same-origin` (COOP) and `Cross-Origin-Resource-Policy: same-origin` (CORP) isolate application execution memory from side-channel memory leaks (Spectre/Meltdown) and window-opener hijacking.
- **Clickjacking Defense**: `X-Frame-Options: DENY` prevents framing in any `<iframe>`.
- **MIME Sniffing Protection**: `X-Content-Type-Options: nosniff`.
- **Permissions Policy**: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`.

### B. CSRF Defense & Safe Session Management
- **Origin Verification**: State-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the `Origin` or `Referer` header to match the request host; cross-origin mutations are rejected with HTTP 403 Forbidden.
- **POST-Only Sign-Out**: Sign-out routes (`/logout` and `/admin/logout`) are restricted exclusively to `POST` requests with 303 redirects, preventing image-tag (`<img>`) cross-site logout attacks.
- **Anti-Caching for Sensitive APIs**: `/api/auth/me` and `/api/users` enforce `Cache-Control: no-store, no-cache, must-revalidate, private` to prevent caching of user credentials in browser history or intermediate corporate proxies.

### C. Zero-Trust Multi-Tenant Isolation (IDOR Defense)
- Server actions never trust client-supplied society IDs.
- User session and active society memberships are resolved server-side.
- All database operations enforce tenant isolation (`where: { id, societyId }` or `where: { block: { societyId } }`).

### D. Active Field-Level AES-256-GCM Encryption at Rest
- Sensitive financial data (Bank Account numbers, IFSC codes, Vendor PAN numbers, Loan Account numbers) are encrypted on write using **AES-256-GCM** authenticated encryption with 96-bit random IVs and 128-bit authentication tags (`@/lib/crypto.ts`).
- Ciphertext format: `enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- In the event of a raw PostgreSQL database breach or backup leakage, stored bank accounts and tax identifiers remain unreadable ciphertext.

### E. PII & Financial Identifier Masking
- Automated UI masking (`@/lib/masking.ts`) automatically decrypts ciphertext and safely masks sensitive identifiers:
  - Bank Account: `••••••••1234`
  - PAN Number: `AB••••••F`
  - Phone Number: `••••••1234`
  - Email Address: `m••••••@example.com`
  - Aadhaar Number: `•••• •••• 1234`

### F. Brute-Force & Rate Limiting Defense
- Sliding-window in-memory rate limiter (`@/lib/rateLimit.ts`).
- Sign-in pre-flight probe (`/api/auth/login-limit`) limits sign-in attempts to **5 attempts per 5 minutes** per IP and normalized email.
- User directory API (`/api/users`) is throttled to **30 requests per minute** to prevent automated account enumeration.

### G. Input Sanitization & Stored XSS Mitigation
- User-submitted text fields (meeting minutes, resolutions, expense descriptions, vendor names, notes) are sanitized via `@/lib/sanitize.ts` before database writes.
- Strips `<script>` tags, HTML markup, `javascript:` protocols, `data:text/html` payloads, and dangerous unicode control characters.

### H. CSV & Spreadsheet Formula Injection Defense
- Tabular exports use `@/lib/csv.ts` to neutralize spreadsheet formula execution triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote `'`.
- Protects administrators from malicious spreadsheet DDE macro execution when opening exported CSVs in Microsoft Excel, LibreOffice, or Google Sheets.

### I. Cryptographic Tamper-Proof Audit Log Hash Chaining
- Audit logs are chained chronologically using HMAC-SHA256 hash signatures (`@/lib/auditCrypto.ts`), linking each record to the preceding entry's signature (Merkle audit chain).
- **Super Admin Audit Explorer** (`/admin/audit-logs`) includes real-time mathematical chain verification that detects any record modification, backdating, or deletion.
- **Society Audit Explorer** (`/society/[code]/audit-logs`) provides tenant-isolated audit trails for committee transparency and statutory compliance.

### J. Production Error Sanitization & Environment Validation
- Error extractor (`@/lib/errors.ts`) prevents raw PostgreSQL schema details, SQL syntax, or Prisma constraint error leakage in production responses.
- Runtime environment validator (`@/lib/env.ts`) verifies required secrets (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) at boot time using Zod.

### K. Security Health & Diagnostics Probe
- Automated health check endpoint at `/api/health/security` verifies:
  - Database ping latency.
  - AES-256-GCM cipher round-trip parity.
  - HMAC-SHA256 audit engine signature generation.
  - Rate limiter memory readiness.

---

## 4. Verification & Continuous Compliance

Run the unified security and build validation pipeline:

```bash
npm run security:check
```

This script executes:
1. ESLint rule validation (0 warnings, 0 errors).
2. Next.js production build and TypeScript type-checking across all 42 routes.

---

## 5. Reporting a Vulnerability

We take the security of SocietyHub and its residents seriously. If you discover a security vulnerability, please report it responsibly:

1. **Do not** file public GitHub issues for security vulnerabilities.
2. Email your findings with reproduction steps to **security@societyhub.in** (or contact the system administrator).
3. Include:
   - Vulnerability description & impact.
   - Step-by-step reproduction guide or proof-of-concept.
   - Affected URLs, routes, or endpoints.

We will acknowledge reports within **48 hours** and provide regular progress updates through remediation and deployment.
