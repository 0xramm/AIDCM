# AIDCM — AI Enabled Control and Automated SOX Monitoring
## Development Plan & Data Model (Project 1)

---

## 1. Project Overview

AIDCM automates SOX control monitoring for SAP S/4 (and other systems like Oracle, ERP JDA) by:
1. Pulling user/role data from connected systems (via SAP BTP Cloud Connector for S/4)
2. Evaluating that data against configured **Controls** (rules like "flag any user with SAP_ALL")
3. Routing flagged items through a **review chain**: 1st Level Reviewer → 2nd Level Reviewer → Escalation Manager
4. Giving an **Administrator** the ability to configure Business Sectors/Regions, Systems, Controls, and the mapping between them

**Stack (target/production):** SAP BTP, SAP CAP (Node.js flavor), SAPUI5/Fiori Elements, HANA (prod) / SQLite (dev), Cloud Connector to on-prem/cloud S/4.

**Stack (this sandbox/prototype):** CAP project structure using `@sap/cds` with SQLite as the dev DB (`cds-sqlite`), since we can't reach a real BTP subaccount or S/4 system here. This keeps the CDS models, service definitions, and folder structure genuinely portable to a real BTP deployment later — only `mocked auth` and a `mock S/4 user feed` (seed data / CSV) stand in for the real Cloud Connector integration.

---

## 1a. Alignment with Founder's Walkthrough (meeting transcript)

Cross-checked against the founder's recorded explanation — confirms the model below, plus a few real-world details worth keeping in mind:

- **Real dev environment**: actual build happens in **SAP Business Application Studio (BAS)**, in dev spaces (one per developer for now, dev/prod project split later). DB in BAS could be Postgres or HANA. Our CAP + SQLite structure here is portable to that setup — same CDS models, different DB adapter.
- **Cloud Connector to S/4** is still being explored by the team as a separate workstream. Confirms our approach: mock the S/4 user/role feed (`SourceSystemUsers`) now, swap in the real Cloud Connector feed later without changing the data model.
- **CON01 logic confirmed**: scan all S/4 users and their roles/permissions, filter to whoever matches the rule condition (e.g. role == SAP_ALL), only matches flow into the 1st Level Reviewer screen. This is exactly what `SourceSystemUsers` → rule check → `ReviewRecords` does.
- **Reviewer screen columns confirmed** 1:1 against `ReviewRecords`: Business Sector, Region, System, Control ID, Control Description, User ID, Role/Permission, Decision (approve/reject, expandable), Reason, Comments.
- **"AI Enabled" part of AIDCM**: founder flagged that AI needs to sit on top of this at some point (rule authoring from plain English, and/or anomaly detection beyond exact rule matches) — **decision for now: keep the rule engine simple/deterministic (Section 6), design it so an AI layer can be swapped in later without reworking the data model.** Revisit once the deterministic version is working end-to-end.

## 2. User Roles & Personas

| Role | Purpose |
|---|---|
| **Administrator** | Configures master data: Business Sectors & Regions, Systems, Controls, System-Control mapping (rules) |
| **1st Level Reviewer** | Reviews flagged items (e.g. CON01 violations), makes initial Approve/Reject decision with reason |
| **2nd Level Reviewer** | Reviews 1st level decisions, can override/escalate |
| **Escalation Manager** | Handles exceptions escalated from 2nd level, final decision authority |

Each user has exactly **one role** in v1 (simple model). Role is set by Admin when creating the user record.

---

## 3. High-Level Architecture

```
┌─────────────┐        Cloud Connector        ┌─────────────┐
│   SAP BTP   │◄──────────────────────────────►│     S/4     │
│  (AIDCM app)│                                 │ (or mocked  │
│             │                                 │  in dev)    │
└──────┬──────┘                                 └─────────────┘
       │
       │  CAP Service Layer (Node.js)
       │  - auth.js (login, role resolution)
       │  - controls-engine.js (rule evaluation, e.g. CON01)
       │
       ▼
┌─────────────────┐
│ SQLite (dev) /   │
│ HANA (prod)      │
└─────────────────┘
       ▲
       │ OData/REST
       ▼
┌─────────────────┐
│  UI5 App(s)      │
│  - Login         │
│  - Admin (x4)    │
│  - Reviewer x2   │
│  - Escalation    │
└─────────────────┘
```

---

## 4. Data Model (CDS-style)

```cds
namespace aidcm;

entity Users {
  key ID       : UUID;
  email        : String(150) @assert.unique;
  passwordHash : String(255);
  fullName     : String(100);
  role         : String(30) enum {
    Administrator; FirstLevelReviewer; SecondLevelReviewer; EscalationManager;
  };
  active       : Boolean default true;
  createdAt    : Timestamp @cds.on.insert: $now;
}

entity BusinessSectors {
  key ID   : UUID;
  name     : String(100);   // e.g. "Health Science"
}

entity Regions {
  key ID   : UUID;
  code     : String(20);    // ASPAC / EMEA / NA / LATAM
  name     : String(50);
}

entity Systems {
  key ID       : UUID;
  name         : String(50);    // SAP S/4, Oracle, ERP JDA
  connectionType : String(30);  // e.g. "CloudConnector", "DirectDB"
}

entity Controls {
  key ID          : UUID;
  code            : String(20);    // CON01, CON02...
  description     : String(255);   // "User with SAP_ALL"
  system          : Association to Systems;
  ruleLogic       : String(1000);  // human-readable / stored rule expression
}

/* Admin's 4th screen: ties everything together per Business Sector/Region/System/Control */
entity SystemControlMapping {
  key ID          : UUID;
  businessSector  : Association to BusinessSectors;
  region          : Association to Regions;
  system          : Association to Systems;
  control         : Association to Controls;
  active          : Boolean default true;
}

/* Mock feed of users/roles pulled from S/4 via Cloud Connector */
entity SourceSystemUsers {
  key ID        : UUID;
  system        : Association to Systems;
  sourceUserId  : String(50);   // "User A"
  rolesProfiles : String(500);  // "SAP_ALL" / "ZCustom1" / "SAP_NEW"
  syncedAt      : Timestamp;
}

/* Generated review rows — matches the 1st Level Reviewer screen table */
entity ReviewRecords {
  key ID              : UUID;
  businessSector      : Association to BusinessSectors;
  region              : Association to Regions;
  system              : Association to Systems;
  control             : Association to Controls;
  sourceUser          : Association to SourceSystemUsers;
  rolePermissions     : String(200);
  decision            : String(20) enum { Pending; Approved; Rejected; Escalated };
  reasonForApproval   : String(500);
  comments            : String(500);
  reviewLevel         : String(30) enum {
    FirstLevel; SecondLevel; EscalationManager;
  };
  assignedTo          : Association to Users;
  createdAt           : Timestamp @cds.on.insert: $now;
  decidedAt           : Timestamp;
}

entity AuditLog {
  key ID          : UUID;
  reviewRecord    : Association to ReviewRecords;
  action          : String(50);   // "Approved", "Escalated", etc.
  actor           : Association to Users;
  timestamp       : Timestamp @cds.on.insert: $now;
  notes           : String(500);
}
```

**Notes on the model:**
- `SystemControlMapping` is the Admin's 4th screen — it's what lets the rule engine know "for Business Sector X / Region Y / System Z, apply Control CON01."
- `ReviewRecords` is what the 1st Level Reviewer table in your screenshot maps to directly (Business Sector, Region, System, Control ID, Control Desc, User ID, Role/Permissions, Decision, Reason, Comments).
- `SourceSystemUsers` stands in for the live Cloud Connector → S/4 pull. In prod this table would be refreshed by a scheduled job calling S/4 APIs; in the sandbox we'll seed it with User A/B/C exactly like your notes.

---

## 5. Screens & Navigation Flow

```
Login Page
  │  (email + password → role lookup)
  ▼
┌─────────────────────────────────────────────┐
│ role == Administrator                        │──► Admin Shell (4 tabs/steps):
│                                               │      1. Business Sectors & Regions
│                                               │      2. Systems
│                                               │      3. Controls
│                                               │      4. System & Controls (mapping)
├───────────────────────────────────────────────┤
│ role == FirstLevelReviewer                    │──► 1st Level Reviewer dashboard (table + decision)
├───────────────────────────────────────────────┤
│ role == SecondLevelReviewer                   │──► 2nd Level Reviewer dashboard
├───────────────────────────────────────────────┤
│ role == EscalationManager                     │──► Escalation Manager dashboard
└─────────────────────────────────────────────┘
```

### 5.1 Login Page
- Left panel: logo/branding (Anshiya Innovations, per your notes)
- Right panel: email + password fields, "Login" button
- On submit: verify against `Users` table (hashed password), resolve `role`, redirect to the matching dashboard route
- No self-signup — Admin creates users

### 5.2 Admin Dashboard — 4 screens
1. **Business Sectors and Regions** — CRUD list; Sectors (e.g. Health Science) and Regions (ASPAC/EMEA/NA/LATAM)
2. **Systems** — CRUD list; SAP S/4, Oracle, ERP JDA, connection type
3. **Controls** — CRUD list; Control code, description, linked system, rule logic text
4. **System and Controls** — the mapping screen; pick Business Sector + Region + System + Control to activate a rule combination

### 5.3 Reviewer / Escalation Dashboards
Table view (from your screenshot) with columns: Business Sector | Region | System | Control ID | Control Desc | User ID | Role/Permissions | Decision | Reason for Approval/Rejection | Comments — plus Approve/Reject/Escalate actions.

---

## 6. Control Rule Logic (example: CON01)

```
Rule CON01: Flag any user with role/profile == "SAP_ALL"

Execution:
1. Pull SourceSystemUsers for the mapped System (S/4)
2. For each user, check rolesProfiles against rule condition
3. If match → create ReviewRecord (Pending, FirstLevel) with that user's details
4. 1st Level Reviewer sees it on their dashboard → Approve / Reject / Escalate
```//
This can start as a simple rule table (condition strings evaluated in JS) rather than a full rules engine — enough to prove CON01/CON02 today, extensible later.

---

## 7. Development Phases (Roadmap)

| Phase | Deliverable |
|---|---|
| **0 (done)** | This plan + data model |
| **1** | CAP project scaffold, SQLite DB, `Users` entity + seed data, **Login page** with role-based routing |
| **2** | Admin screens 1–4 (Business Sectors/Regions, Systems, Controls, System & Controls) with full CRUD |
| **3** | `SourceSystemUsers` seed data + CON01 rule evaluation job → generates `ReviewRecords` |
| **4** | 1st Level Reviewer dashboard (table + decisions) |
| **5** | 2nd Level Reviewer + Escalation Manager dashboards, audit log |
| **6** | Polish: real Cloud Connector integration notes, auth hardening (XSUAA), deployment guide for real BTP |
| **7 (future)** | AI layer on top of the deterministic rule engine — plain-English rule authoring and/or anomaly detection, once Phases 1–6 are solid |

We're starting **Phase 1: Login + role-based routing** next.

---

## 8. Assumptions (flag if any of these are wrong)

- One role per user (not multi-role)
- Admin is the only one who creates/manages user accounts
- Password auth for now (not SSO/XSUAA) — easy to swap later since CAP supports pluggable auth strategies
- SQLite in dev is a stand-in for HANA in prod — CDS models are portable, no logic rewrite needed
- CON01/CON02-style rules can start as simple condition checks; we're not building a generic rule DSL in v1
