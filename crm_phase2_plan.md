# Lumeo CRM — Phase 2 Implementation Plan (Enterprise Parity)

> **Objective:** Evolve the foundational CRM into an enterprise-grade platform (Zoho CRM parity).  
> **Rule:** Execute ONE step at a time. Confirm completion before moving on. Payments are explicitly deferred to the very end.

---

## 🏗️ STAGE 11 — Team Collaboration & RBAC
*Goal: Allow companies to invite members and restrict what they can see/do.*

### STEP K — Team Management (API & UI)
- **Backend:** Create API endpoints to generate invite tokens, send invite emails (via Celery), and list workspace members.
- **Frontend:** Build out the `/team` page. Add data tables for active members and pending invites. Add an "Invite Member" modal.

### STEP L — Role-Based Access Control (RBAC)
- **Backend:** Implement strict permission classes. Example: "Admins" can delete records and access billing/settings; "Standard Users" can only view/edit records assigned to them or their team.
- **Frontend:** Conditionally hide UI elements (like the Billing/Settings sidebar links or Delete buttons) based on the logged-in user's role.

---

## 🔍 STAGE 12 — Global Search & Navigation
*Goal: Instant access to any record across the entire CRM.*

### STEP M — Global Search API
- **Backend:** Create a unified search endpoint `/api/v1/search/?q=xyz` that queries Leads, Customers, Deals, and Tasks simultaneously using Django's `Q` objects or Postgres Full-Text Search.

### STEP N — Command Palette UI
- **Frontend:** Wire up the existing `Ctrl+K` search bar in the topbar. Implement a headless UI command palette (like Raycast/Spotlight) that displays categorized search results and allows instant keyboard navigation to records.

---

## ⚙️ STAGE 13 — Workspace & User Preferences
*Goal: Allow personalization and brand configuration.*

### STEP O — Settings Page (`/settings`)
- **Backend:** Add endpoints for users to update their profile (avatar, password, timezone) and for Admins to update company settings (company name, currency, domain).
- **Frontend:** Build out the `/settings` UI with tabs for "Profile", "Workspace", "Notifications", and "Security". Wire up the topbar user dropdown menu.

---

## 📞 STAGE 14 — Core CRM Enhancements
*Goal: Add depth to the sales process with activity tracking and files.*

### STEP P — Activity Timeline
- **Backend:** Create an `Activity` model (polymorphic or GenericForeignKey) to log Calls, Meetings, and Emails against Leads/Deals.
- **Frontend:** Upgrade the Lead/Deal detail views to show a rich, chronological timeline of all activities, status changes, and notes.

### STEP Q — Document Library
- **Backend:** Configure media storage (local or AWS S3) and create an `Attachment` model linked to core CRM entities.
- **Frontend:** Add drag-and-drop file upload zones to Deals and Customers.

---

## 💰 STAGE 15 — Sales Operations
*Goal: Move beyond tracking deals to actually generating revenue documents.*

### STEP R — Product Catalog
- **Backend/Frontend:** Create a `Product` inventory system (SKU, price, description, tax rate).

### STEP S — Quotes & Invoices
- **Backend:** Create `Quote` and `Invoice` models with line items linked to Products. Implement a PDF generation endpoint using tools like `WeasyPrint` or `ReportLab`.
- **Frontend:** Add UI to convert a "Won Deal" directly into a Quote or Invoice and download the PDF.

---

## 🤖 STAGE 16 — Advanced Customization
*Goal: Let users shape the CRM to their specific business logic.*

### STEP T — Custom Fields (JSONB)
- **Backend:** Add a `custom_data` JSONField to core models. Create an API to define the "schema" for these fields per company.
- **Frontend:** Dynamically render form inputs based on the company's custom field schema.

### STEP U — Basic Workflow Automation
- **Backend:** Build a lightweight rules engine. Example: *Trigger* (Deal Stage = Won) -> *Action* (Create Task "Send Onboarding Email").

---

## 💳 STAGE 17 — Payment Integration (FINAL)
*Goal: Monetize the SaaS platform.*

### STEP V — Razorpay Integration
- **Backend:** Integrate Razorpay Subscriptions API. Create a secure webhook handler (`/api/v1/webhooks/razorpay/`) to listen for `subscription.charged` and `subscription.halted` events to automatically update the `Subscription` model.
- **Frontend:** Update the `/billing` page. When a user clicks "Upgrade", open the Razorpay checkout modal. Handle success callbacks to refresh the user's active plan UI.

---

## Execution Order (Phase 2)

| # | Step | Status | Priority |
|---|------|--------|----------|
| K | Team Management (Invites) | ✅ Done | 🔴 High |
| L | Role-Based Access Control | ✅ Done | 🔴 High |
| M | Global Search API | ✅ Done | 🟡 Medium |
| N | Command Palette UI | ✅ Done | 🟡 Medium |
| O | Settings & Profile UI | ✅ Done | 🟡 Medium |
| P | Activity Timeline | ✅ Done | 🟢 Normal |
| Q | Document Library | ✅ Done | 🟢 Normal |
| R | Product Catalog | ✅ Done | 🟢 Normal |
| S | Quotes & Invoices | ✅ Done | 🟢 Normal |
| T | Custom Fields | ✅ Done | 🔵 Low |
| U | Workflow Automation | ✅ Done | 🔵 Low |
| V | **Razorpay Payments** | ✅ Done | 🟣 **Final Step** |
