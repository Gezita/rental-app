# Shared Properties — Implementation Plan

**Goal:** Let more than one Lessora account manage the same property. Example: User **AA** owns *31 Village St* (solo) and *55 Dundas Ave*. User **BB** co-owns *55 Dundas Ave* with AA. Both AA and BB log into their own accounts and both see and manage *55 Dundas Ave*, while *31 Village St* stays private to AA.

This document covers the **data model**, the **full list of code that changes**, the **invite flow**, and the **UX** for both the inviting account and the invited member.

---

## 1. Why this is a structural change

Ownership today is **one-to-one and hardcoded**. Every property belongs to exactly one user via `Property.userId`, and every authorization guard filters on it:

```ts
// src/lib/ownership.ts
where: { id: propertyId, userId }                    // requireProperty
where: { id: unitId, property: { userId } }          // requireUnit
where: { id: tenantId, unit: { property: { userId } } }   // requireTenant
where: { id: statementId, unit: { property: { userId } } } // requireStatement
```

There is **no path** for BB to reach AA's property. To allow sharing we replace "a property has one owner" with "**a property has members, each with a role**" (many-to-many between `User` and `Property`).

**Scope of impact:** ~136 `userId`-scoped query sites across `src/app` and `src/lib`, plus ~18 dashboard pages that call `prisma.property.findMany({ where: { userId } })` directly. The guards in `ownership.ts` absorb most of it, but the direct page/lib queries must each be converted to membership scoping.

---

## 2. Data model

### 2.1 New models (`prisma/schema.prisma`)

```prisma
model PropertyMember {
  id         String       @id @default(cuid())
  propertyId String
  userId     String
  role       PropertyRole @default(MANAGER)
  createdAt  DateTime     @default(now())

  property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([propertyId, userId])   // a user joins a property at most once
  @@index([userId])
}

model PropertyInvite {
  id         String        @id @default(cuid())
  propertyId String
  email      String        // invitee email (may not have an account yet)
  role       PropertyRole  @default(MANAGER)
  token      String        @unique @default(cuid())  // emailed accept link
  invitedById String       // which member sent it
  status     InviteStatus  @default(PENDING)
  createdAt  DateTime      @default(now())
  expiresAt  DateTime
  acceptedAt DateTime?

  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  invitedBy  User     @relation("InvitesSent", fields: [invitedById], references: [id], onDelete: Cascade)

  @@unique([propertyId, email])   // one outstanding invite per email per property
  @@index([email])
}

enum PropertyRole {
  OWNER     // full control: edit, bill, invite/remove members, delete property
  MANAGER   // edit, bill, send statements; cannot remove members or delete property
  VIEWER    // read-only: see everything, change nothing
}

enum InviteStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}
```

### 2.2 Changes to existing models

```prisma
model Property {
  // KEEP userId — it now means "creator / billing owner" (whose plan the units
  // count against). It is NOT used for access checks anymore.
  userId  String
  user    User             @relation("PropertyOwner", fields: [userId], references: [id], onDelete: Cascade)

  members PropertyMember[] // NEW — source of truth for access
  invites PropertyInvite[] // NEW
  // ...everything else unchanged
}

model User {
  properties      Property[]       @relation("PropertyOwner") // properties they created
  memberships     PropertyMember[] // NEW — properties they can access
  invitesSent     PropertyInvite[] @relation("InvitesSent")   // NEW
  // ...existing relations unchanged
}
```

**Decision — keep `Property.userId`.** It stays as the *creator / billing owner*. Two reasons: (1) the per-unit subscription needs an unambiguous payer; (2) it's a smaller, safer migration than dropping the column. Access is decided entirely by `PropertyMember`, never by `userId`.

### 2.3 Migration + backfill (critical)

Every existing property must get one `OWNER` membership for its current `userId`, or all current users instantly lose access.

```sql
-- after `prisma migrate` creates the tables:
INSERT INTO "PropertyMember" ("id", "propertyId", "userId", "role", "createdAt")
SELECT gen_random_uuid(), p."id", p."userId", 'OWNER', now()
FROM "Property" p;
```

Run as a data migration step. Use `npm run db:migrate` (not `db:push`) for production so the backfill ships as a versioned migration. **Verify count parity** (`SELECT count(*) FROM "Property"` == new `PropertyMember` rows) before deploying.

---

## 3. Authorization rewrite

### 3.1 `src/lib/ownership.ts` — the core change

Add a role-aware guard and switch every existing guard from `userId` equality to membership.

```ts
import { PropertyRole } from "@prisma/client";

const ROLE_RANK = { VIEWER: 0, MANAGER: 1, OWNER: 2 } as const;

/** A user can access a property if they have ANY membership row for it. */
const memberFilter = (userId: string) => ({ members: { some: { userId } } });

export async function requireProperty(
  userId: string,
  propertyId: string,
  minRole: PropertyRole = "VIEWER",
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...memberFilter(userId) },
    include: { members: { where: { userId }, select: { role: true } } },
  });
  if (!property) throw new Error("Property not found");

  const role = property.members[0]?.role ?? "VIEWER";
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Error("Insufficient permission");
  }
  return property;
}
```

`requireUnit`, `requireTenant`, `requireStatement` change identically — replace `property: { userId }` with `property: { members: { some: { userId } } }`, and accept an optional `minRole` that mutating callers pass as `"MANAGER"`.

**Write actions pass `minRole: "MANAGER"`; delete/destructive actions pass `"OWNER"`; read pages leave the default `"VIEWER"`.** This is where VIEWER vs MANAGER vs OWNER is actually enforced.

### 3.2 Direct page & lib queries (must each be converted)

Anywhere that does **not** go through a guard and filters properties by `userId` directly needs the membership filter. Convert:

```ts
// before
prisma.property.findMany({ where: { userId: user.id } })
// after
prisma.property.findMany({ where: { members: { some: { userId: user.id } } } })
```

Files/areas to convert (from a `userId`-scope grep — verify each during implementation):

**Dashboard pages (`src/app/(dashboard)/`)** — `properties/page.tsx`, `properties/[propertyId]/page.tsx` and its sub-pages (`utility-bills*`, `units/new`), `tenants/page.tsx`, `dashboard/page.tsx`, `billing/page.tsx`, `billing/statements/generate/page.tsx`, `billing/utility-bills/page.tsx`, `maintenance/page.tsx`, `maintenance/new`, `maintenance/receipts`, `inspections/new`, `documents/page.tsx`, `documents/notices/page.tsx`, `documents/notices/wizard`.

**Lib modules** — `statements.ts`, `statement-extras.ts`, `statement-preview.ts`, `statement-send.ts`, `statement-stats.ts`, `overdue.ts`, `past-statements.ts`, `lease-reminders.ts`, `dashboard-hero-stats.ts`, `portfolio-stats.ts`, `auto-billing.ts`, `t776-report.ts`, `export-t776.ts`, `record-payment.ts`.

**Actions (`src/app/actions/`)** — `properties.ts`, `statements.ts`, `communications.ts`, `documents.ts`, `inspections.ts`, `leases.ts`, `lease-signing.ts`, `maintenance.ts`, `search.ts`.

### 3.3 User-scoped resources that are NOT shared

Some things hang off `User`, not `Property`, and must **stay private** to each account even on a shared property:

- **`Document.userId`** — uploaded files. Decision below (§6). Default: documents stay private to uploader; shared-property docs require an explicit `propertyId` association + membership check (already partly handled by `assertDocumentAssociations`).
- **`UserSettings`** (landlord name, payment instructions, Stripe/DocuSign, auto-send) — **per account, never shared.** A statement sent by AA uses AA's settings; one sent by BB uses BB's. Flag this in product (§6).
- **`UtilityProfile.userId`** — reusable split templates stay private to each user.

### 3.4 Billing / subscription

Per-unit pricing counts units against **`Property.userId`** (the creator), not against every member. A co-manager (BB) joining AA's property does **not** add those units to BB's plan. Document this in the billing logic and the invite UI ("You won't be charged for properties you're invited to").

---

## 4. Invite flow (backend)

### 4.1 New action file: `src/app/actions/members.ts`

```ts
"use server";
// All guarded with requireProperty(user.id, propertyId, "OWNER")

inviteMember(propertyId, email, role)   // create PropertyInvite, email a link
revokeInvite(inviteId)                  // status -> REVOKED
resendInvite(inviteId)                   // re-send the email, bump expiresAt
acceptInvite(token)                      // invitee accepts -> create PropertyMember
removeMember(propertyId, memberId)      // OWNER removes a member (not self/last owner)
changeMemberRole(propertyId, memberId, role)
leaveProperty(propertyId)               // a member removes themselves
```

**Guards & rules**
- `inviteMember` / `revokeInvite` / `removeMember` / `changeMemberRole` require **OWNER** on the property.
- Cannot remove or demote the **last OWNER** (always ≥1 owner).
- `inviteMember` rejects an email that is already a member, and upserts on the `(propertyId, email)` unique to avoid duplicate pending invites.
- Invite token is single-use; on accept set `status = ACCEPTED`, `acceptedAt`, create the `PropertyMember`, then redirect to the property.
- Expired invites (`expiresAt < now`) are rejected on accept and surfaced as "invite expired — ask for a new one." Default TTL **14 days**.

### 4.2 Accept endpoint / page

`src/app/(auth)/invite/[token]/page.tsx` (or an API route under `src/app/api/invite/`):

1. Look up invite by token; validate `PENDING` and not expired.
2. **If the visitor is signed in** and their email matches → call `acceptInvite`, redirect to the property.
3. **If signed in but a different email** → show "This invite was sent to {email}. Sign in as that account to accept."
4. **If not signed in:**
   - Email already has an account → send to `/sign-in?next=/invite/{token}`.
   - No account yet → send to `/sign-up?email={email}&next=/invite/{token}`; after sign-up, auto-accept.

### 4.3 Email

Reuse `src/server/emails/send.ts` + the layout builder in `src/lib/email-templates.ts`. New template: **"{InviterName} invited you to manage {PropertyName} on Lessora"** with a CTA button to `/invite/{token}` and a line stating the role granted and that they won't be billed for it.

---

## 5. UX — inviting account (e.g. AA)

### 5.1 Where it lives

Add a **"Members"** (or "Sharing") section on the **property detail page** — `src/app/(dashboard)/properties/[propertyId]/`. Sharing is per-property, so it belongs on the property, not in global Settings. Add a `Card` titled **"People with access"** below the existing property sections, plus a new tab `Members` if the property page becomes tabbed.

Optionally surface a small **avatar/initials stack** in the property card on `/properties` so AA can see at a glance which properties are shared.

### 5.2 The Members card (OWNER view)

```
People with access — 55 Dundas Ave                    [ + Invite ]

  AA (you)            haygezza@gmail.com      Owner        —
  BB                  bb@example.com          Manager  ▾   Remove
  ──────────────────────────────────────────────────────────────
  Pending invites
  cc@example.com      Viewer                  Invited 2d ago
                                              Resend · Revoke
```

- **`+ Invite`** opens a modal/inline form: email input + role select (`Owner` / `Manager` / `Viewer`) with one-line descriptions. Submitting calls `inviteMember`, shows a `FlashAlert` success ("Invite sent to bb@example.com").
- Each active member row: role dropdown (`changeMemberRole`) and **Remove** (`removeMember`), both OWNER-only and disabled for the last owner / for yourself where it would orphan the property.
- Pending invites: **Resend** and **Revoke**.
- **MANAGER / VIEWER viewing this card** see the roster **read-only** (no Invite button, no Remove, no role dropdowns).

### 5.3 Role descriptions shown in the invite form

- **Owner** — Full control. Can edit the property, bill tenants, and invite or remove people.
- **Manager** — Can edit the property, manage units/tenants, and send statements. Cannot remove people or delete the property.
- **Viewer** — Read-only. Can see statements, payments, and documents but cannot change anything.

### 5.4 Empty / private state

A solo property (*31 Village St*) shows the card with just AA as Owner and a subtle hint: *"Invite a co-owner or property manager to share access."* No structural difference between a "private" and "shared" property — sharing is just the count of members.

---

## 6. UX — invited member (e.g. BB)

### 6.1 Receiving the invite

1. BB gets the email: **"AA invited you to manage 55 Dundas Ave on Lessora."** Body states the role and "You won't be charged for this property."
2. BB clicks **Accept invitation**.
   - **No account:** lands on sign-up prefilled with their email → creates account → invite auto-accepts → dropped directly on the *55 Dundas Ave* property page with a welcome `FlashAlert`: *"You now have Manager access to 55 Dundas Ave."*
   - **Has account:** prompted to sign in → invite auto-accepts → same landing.

### 6.2 After accepting

- *55 Dundas Ave* now appears in BB's **`/properties`** list and everywhere properties are aggregated (dashboard stats, billing, tenants, documents) — exactly like a property BB created, **except** scoped by the role.
- A small **"Shared" badge** (or owner attribution, e.g. *"Owned by AA"*) on the property card distinguishes invited properties from BB's own.
- BB's **other** properties remain untouched and invisible to AA.

### 6.3 Role-shaped UI for BB

- **VIEWER:** all create/edit/send/delete buttons hidden or disabled with a tooltip *"You have view-only access to this property."* Server still enforces via `minRole` (UI hiding is convenience, not security).
- **MANAGER:** can do everything operational (units, tenants, statements, payments, utility bills, documents) but the Members card is read-only and there's no "Delete property."
- **OWNER (co-owner):** full parity with AA, including inviting others and removing members (but cannot remove the last owner).

### 6.4 Whose settings/branding are used

Statements, receipts, and emails use the **acting user's** `UserSettings` (landlord name, payment instructions, Stripe account, signature). Make this explicit in the invite UI and in the Members card: *"Statements you send use your own profile and payment details."* If the product wants consistent tenant-facing branding regardless of who sends, that's a **follow-up** (property-level settings overriding user settings) — out of scope here.

### 6.5 Leaving

BB can **Leave property** from the Members card (`leaveProperty`), removing their own membership. Confirm dialog. The last remaining OWNER cannot leave without transferring ownership or deleting the property.

---

## 7. Product decisions to confirm before building

1. **Billing** — confirmed default: units count against the creator (`Property.userId`); invited members are never charged for shared properties. ✅ (adjust if you want cost-splitting)
2. **Who can invite** — Owners only (Managers cannot). Confirm, or allow Managers to invite Viewers.
3. **Viewer role** — keep all three roles, or ship with just Owner/Manager to start? (Viewer adds UI gating work in §6.3.)
4. **Documents on shared properties** — do co-managers see each other's uploaded `Document`s? Default plan: documents explicitly associated to a shared `propertyId`/`unitId` are visible to all members; unassociated personal uploads stay private. Confirm.
5. **Tenant-facing branding** — acceptable that statement branding varies by sender (each uses own profile), or do you need property-level branding now? (Default: per-sender; property-level is a follow-up.)

---

## 8. Build order (suggested)

1. Schema: add `PropertyMember`, `PropertyInvite`, enums; relations on `User`/`Property`. `npm run db:migrate`.
2. **Backfill migration** — one OWNER membership per existing property. Verify parity.
3. Rewrite `src/lib/ownership.ts` guards (membership + `minRole`). Keep signatures backward-compatible (default `VIEWER`).
4. Convert direct `userId`-scoped queries (§3.2) — pages first (read), then lib aggregations, then actions.
5. Add `minRole: "MANAGER"`/`"OWNER"` to mutating/destructive action guards.
6. `src/app/actions/members.ts` + invite email template.
7. Accept route/page `/invite/[token]` + sign-up/sign-in `next=` wiring.
8. Members card UI on the property detail page (OWNER + read-only variants).
9. Role-shaped UI gating for VIEWER/MANAGER; "Shared" badges on property cards.
10. QA matrix: solo property unaffected; OWNER invites MANAGER; MANAGER blocked from Members/delete; VIEWER blocked from all writes; invite to existing account; invite to new account; expired/revoked invite; last-owner protections; billing count unchanged for invitee.

---

## 9. Risks / watch-outs

- **Missed query site = data leak or lockout.** The 136 `userId` references are the risk surface. Grep-driven conversion + the QA matrix in §8 are the safety net. Consider a temporary lint/test that fails on `property: { userId }` patterns outside `ownership.ts`.
- **`Property.userId` ambiguity.** It no longer means "only owner." Add a code comment on the field and in `ownership.ts` so future code doesn't reintroduce `where: { userId }` access checks.
- **Cron / auto-billing** (`auto-billing.ts`) iterates properties by user — make sure it bills per property/creator once, not once per member.
- **Cascade deletes.** Deleting a `User` cascades their created `Property`s (and thus memberships). Deleting a property cascades its memberships/invites. A co-owner's account deletion should **not** delete shared properties they merely joined — verify the cascade only fires on `PropertyOwner`, which it does since members link via `PropertyMember`, not `Property.userId`.
