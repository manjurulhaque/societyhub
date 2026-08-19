# SocietyHub Security Policy & Architecture Guide

This document outlines the security policies, access control models, threat mitigations, and vulnerability reporting procedures implemented in **SocietyHub**.

---

## 1. Security Architecture Overview

SocietyHub operates on a **Defense-in-Depth, Multi-Tenant Zero-Trust Model**. All client requests are treated as untrusted, and access privileges are strictly verified at the network, proxy, server action, and database levels.

```
┌────────────────────────────────────────────────────────┐
│               Client / Browser Request                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Next.js 16 Edge Proxy (src/proxy.ts & SSR Auth Proxy) │
│  - Session Token Refresh & Verification                │
│  - CSRF Origin / Host Validation (Mutating Methods)    │
│  - HTTP Security Headers (HSTS, CSP, XFO, Nosniff)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Server-Side Authentication & Authorization Guards     │
│  - requireSuperAdmin()                                 │
│  - requireCommitteeAccess(code, FINANCIAL_ROLES)       │
│  - requireCommitteeAccess(code, COMMITTEE_ROLES)       │
│  - requireSocietyAccess(code)                          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Data Layer & Audit Trail                              │
│  - Tenant-Isolated Prisma Queries (societyId checks)   │
│  - Non-Blocking Immutable Audit Logs (AuditLog table)  │
│  - PII & Financial Masking (Bank A/C, PAN, Phone)      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) Matrix

SocietyHub implements a 6-tier functional role hierarchy:

| Role Category | Roles Included | Scope & Permissions |
| :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Global platform administration, society onboarding, user provisioning, global audit logs. |
| **Executive Committee** | `PRESIDENT`, `SECRETARY`, `TREASURER` | Society legal settings, code changes, resolution drafting, bylaws enforcement. |
| **Financial Operators** | `PRESIDENT`, `TREASURER`, `ACCOUNTANT`, `MANAGER` | Bank accounts, expenses, fixed deposits, cheques, petty cash entries, chart of accounts. |
| **Committee Members** | `PRESIDENT`, `VICE_PRESIDENT`, `SECRETARY`, `JOINT_SECRETARY`, `TREASURER`, `MANAGER`, `ACCOUNTANT` | Statutory registers (meetings, shares, nominations, mortgages), vendors, amenities. |
| **Resident Members** | `MEMBER` | View flat bills, make payments, book amenities for own flat, view notices. |
| **Gate Security** | `SECURITY` | Visitor entry logs, vehicle tracking, delivery verification. |

---

## 3. Core Security Controls

### A. Zero-Trust Multi-Tenant Isolation (IDOR Defense)
- Server actions do not trust client-supplied society IDs.
- Actions resolve the user's verified session via Supabase Auth and cross-reference active memberships.
- Tenant ID checks (`where: { id, societyId }` or `where: { block: { societyId } }`) are strictly enforced on all queries.

### B. Brute-Force & Rate Limiting Defense
- Sliding-window in-memory rate limiter (`@/lib/rateLimit`).
- Sign-in endpoint (`/api/auth/login-limit`) limits failed authentication attempts to 5 attempts per 5 minutes per IP/email.
- User directory API (`/api/users`) throttled to prevent automated enumeration.

### C. Input Sanitization & Stored XSS Mitigation
- User-submitted text fields (meeting minutes, resolutions, expense descriptions, vendor names, remarks) are sanitized via `@/lib/sanitize.ts` before database insertion.
- Dangerous HTML tags, script vectors, and invisible control characters are stripped.

### D. PII & Financial Identifier Masking
- Sensitive data is masked in UI tables and logs (`@/lib/masking.ts`):
  - Bank Account: `••••••••1234`
  - PAN: `AB••••••F`
  - Phone: `••••••1234`
  - Email: `m••••••@example.com`

### E. CSRF & Session Security
- State-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require verified origin headers.
- Sign-out routes are restricted to `POST` only with 303 redirects to eliminate image-tag cross-site logout attacks.
- Sensitive API routes (`/api/auth/me`, `/api/users`) enforce `Cache-Control: no-store, private`.

### F. Formula Injection / CSV Export Security
- Data exports use `@/lib/csv.ts` to neutralize spreadsheet formula execution triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single-quote escaping.

### G. Dual-Layer Audit Logging
- **Super Admin Audit Explorer** (`/admin/audit-logs`): Real-time system-wide mutation trails with IP and actor details.
- **Society Audit Explorer** (`/society/[code]/audit-logs`): Tenant-isolated audit log for committee transparency and statutory compliance.

---

## 4. Reporting a Vulnerability

We take the security of SocietyHub and its residents seriously. If you discover a security vulnerability, please report it responsibly:

1. **Do not** file public GitHub issues for security vulnerabilities.
2. Email your findings with reproduction steps to **security@societyhub.in** (or contact the administrator).
3. Include:
   - Vulnerability description & impact.
   - Step-by-step reproduction guide or proof-of-concept.
   - Affected URLs, routes, or endpoints.

We will acknowledge reports within **48 hours** and provide regular progress updates through remediation and deployment.
