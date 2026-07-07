# MixR Fusion - Complete Build Prompt for Lovable

> **IMPORTANT:** Before using this prompt in a new Lovable project, you must:
> 1. Create a Supabase project at supabase.com
> 2. Run the SQL schema (provided separately) in your Supabase SQL editor
> 3. Deploy the Edge Functions to your Supabase project
> 4. Connect your Supabase project to Lovable via Settings → Connectors → Supabase BEFORE enabling Lovable Cloud

---

## 🎯 Project Overview

Build **MixR Fusion** - a multi-tenant SaaS platform for salon color management. The application enables salons to:
- Track color formulas and mixing sessions
- Manage clients and their formula history
- Handle inventory with stock tracking and reorder alerts
- Manage staff with role-based permissions and PIN authentication
- View reports and analytics
- Platform admins can manage all tenants across the system

---

## 🏗️ Technology Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui component library
- **State Management:** TanStack React Query for server state
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Font:** Plus Jakarta Sans (@fontsource/plus-jakarta-sans)
- **Animations:** Framer Motion

---

## 🎨 Design System

### Color Palette (HSL format for Tailwind)

```css
/* Light Mode */
--background: 0 0% 98%;        /* #FAFAFA */
--foreground: 0 0% 12%;        /* #1E1E1E */
--card: 0 0% 100%;
--card-foreground: 0 0% 12%;
--primary: 0 0% 12%;           /* Dark charcoal */
--primary-foreground: 0 0% 98%;
--secondary: 240 5% 96%;       /* #F4F4F5 */
--muted: 240 5% 96%;
--muted-foreground: 220 9% 46%; /* #6B7280 */
--success: 142 71% 45%;        /* #22C55E */
--warning: 38 92% 50%;         /* #F59E0B */
--destructive: 0 84% 60%;      /* #EF4444 */
--border: 240 6% 90%;
--radius: 0.75rem;

/* Dark Mode */
--background: 0 0% 7%;
--foreground: 0 0% 95%;
--card: 0 0% 10%;
--primary: 0 0% 95%;
--secondary: 0 0% 15%;
--muted: 0 0% 15%;
--border: 0 0% 18%;
```

### Design Philosophy
- Clean, professional aesthetic suitable for salon environments
- Minimalist with generous whitespace
- Subtle shadows and smooth animations
- Mobile-responsive with touch-friendly targets
- Support for both light and dark modes

---

## 📊 Database Schema

### Core Tables Required

**1. Multi-Tenancy Tables:**
- `tenants` - Salon organizations (id, name, status, owner_user_id, primary_contact_email, notes)
- `tenant_users` - Maps auth users to tenants (id, tenant_id, user_id, role)
- `platform_admins` - Super admins (user_id only)

**2. Salon Operations:**
- `clients` - Salon customers (id, tenant_id, name, email, phone, preferences, client_since)
- `staff` - Employees with 20+ permission flags (id, tenant_id, user_id, name, email, phone, role, pin_hash, is_active, commission_percent, plus permission booleans like can_manage_staff, can_view_reports, can_create_bowls, etc.)
- `products` - Color inventory (id, tenant_id, brand, line, shade, name, type, cost_per_unit, stock, reorder_level, target_stock, size, size_unit)
- `salon_settings` - Per-tenant config (markup_percent, bowl_fee, waste_factor_percent, kiosk_mode_enabled, pin_timeout_minutes, etc.)

**3. Color Sessions:**
- `color_sessions` - Parent session record (id, tenant_id, client_id, stylist_id, session_date, total_amount_mixed, total_amount_used, total_cost, notes)
- `session_bowls` - Individual bowls (id, tenant_id, session_id, name, developer_product_id, developer_amount, amount_mixed, amount_used, notes)
- `bowl_items` - Products in each bowl (id, tenant_id, bowl_id, product_id, amount, unit, cost)
- `client_staff_relationships` - Tracks stylist-client history

**4. Billing (Platform Admin):**
- `plans` - Subscription plans (name, base_price_cents, seat_price_cents, features_json)
- `subscriptions` - Tenant subscriptions
- `invoices` - Billing records
- `payments` - Payment history

**5. Supporting Tables:**
- `profiles` - Auth user profiles
- `user_roles` - Role assignments
- `audit_logs` - Activity tracking
- `usage_daily` - Usage metrics per tenant
- `whitelabel_settings` - Custom branding per tenant

### Enums Required
```sql
product_type: 'Color', 'Developer', 'Lightener', 'Treatment'
app_role: 'owner', 'admin', 'manager', 'stylist', 'assistant', 'front_desk'
tenant_status: 'active', 'suspended', 'archived'
subscription_status: 'trialing', 'active', 'past_due', 'canceled'
invoice_status: 'draft', 'open', 'paid', 'void', 'uncollectible'
payment_status: 'succeeded', 'failed', 'pending', 'refunded'
actor_type: 'platform_admin', 'tenant_user'
```

### Database Functions Required
```sql
get_user_tenant_id() → uuid  -- Returns current user's tenant
is_platform_admin() → boolean  -- Checks if user is platform admin
has_role(user_id, role) → boolean  -- Checks if user has specific role
current_user_can_manage_staff() → boolean  -- Permission check
```

### Views
- `staff_directory` - Non-sensitive staff info (id, name, role, is_active)
- `staff_with_contacts` - Staff with contact info for admins

---

## 🔐 Authentication & Authorization

### Auth Flow
1. User signs up via Supabase Auth
2. Trigger creates profile record
3. User completes onboarding (creates tenant + tenant_user record)
4. User is assigned 'owner' role for their tenant

### Route Protection
- `/auth` - Public (login/signup)
- `/onboarding` - Protected, shown after first login
- All other routes - Protected, require authenticated user with tenant
- `/platform/*` - Protected, require platform_admin status

### Role Hierarchy
```
Platform Admin (super admin, cross-tenant access)
└── Tenant Roles:
    ├── owner (full access, cannot be demoted)
    ├── admin (full access except ownership transfer)
    ├── manager (staff, client, product management)
    ├── stylist (create bowls, manage own clients)
    ├── assistant (limited access)
    └── front_desk (client check-in only)
```

### RLS Pattern
All tables must have Row Level Security with policies like:
```sql
CREATE POLICY "Tenant users can view their data"
ON table_name FOR SELECT
USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());
```

---

## 📱 Pages & Routes

### Tenant Routes (Protected)
1. **`/` - Dashboard (Index)**
   - Welcome message
   - 6 navigation tiles: New Color Bowl, Clients, Reports, Inventory, Staff, Settings
   - Setup wizard for new tenants
   - Platform admin banner with link to admin portal

2. **`/new-bowl` - New Color Session**
   - Client selector (combobox with search)
   - Multiple bowl cards (add/duplicate/delete bowls)
   - Each bowl has: mix items (product + amount), developer selection, notes
   - Voice input placeholder
   - Maria AI assistant for waste suggestions
   - Log bowls action saves to database

3. **`/clients` - Client Management**
   - Searchable client list
   - Add client dialog
   - Client detail sheet with formula history
   - Import clients option
   - Click formula to pre-fill new bowl

4. **`/inventory` - Product Inventory**
   - Product list with status badges (In Stock/Low/Out)
   - Add/edit product dialog
   - Reorder report sheet
   - Import products option
   - Filter by product type

5. **`/staff` - Staff Management**
   - Staff list with roles
   - Add staff dialog
   - Staff detail sheet with permissions
   - PIN management for kiosk mode
   - Commission settings

6. **`/reports` - Analytics**
   - Date range selector
   - Revenue breakdown card
   - Product usage stats
   - Stylist performance metrics

7. **`/settings` - Salon Settings**
   - Salon name and logo
   - Markup percentage
   - Bowl fee
   - Waste factor percentage
   - Client requirements (email/phone)
   - Kiosk mode toggle
   - PIN timeout settings

8. **`/onboarding` - First-time Setup**
   - Salon name input
   - Initial setup steps
   - Calls complete-onboarding edge function

### Platform Admin Routes (Protected, platform_admins only)
1. **`/platform` - Dashboard**
   - Total tenants, MRR, active subscriptions metrics
   - Usage overview

2. **`/platform/tenants` - Tenant List**
   - Searchable tenant table
   - Status filters
   - Create tenant dialog

3. **`/platform/tenants/:tenantId` - Tenant Detail**
   - Tenant info and status
   - Subscription management
   - Usage metrics
   - Whitelabel settings

4. **`/platform/plans` - Plan Management**
   - Plan cards with pricing
   - Create/edit plan dialog
   - Feature configuration

5. **`/platform/settings` - Platform Settings**
   - Global configuration

---

## 🧩 Key Components

### Layout Components
- `Header` - App header with logo and sign-out
- `PageLayout` - Consistent page wrapper with title/subtitle
- `PlatformLayout` - Admin sidebar layout

### Bowl Components
- `BowlCard` - Individual bowl with mix items, developer, notes, cost calculation
- `ClientCombobox` - Searchable client selector
- `ProductCombobox` - Searchable product selector with status badges

### Dialog Components
- `AddClientDialog` - Create new client form
- `AddStaffDialog` - Create new staff member
- `ProductDialog` - Create/edit product
- `PinManagementDialog` - Set staff PIN

### Sheet Components (Slide-out panels)
- `ClientDetailSheet` - Full client info with formula history
- `StaffDetailSheet` - Staff info with permissions
- `ReorderReportSheet` - Low stock products list

### AI Components
- `MariaAssistant` - AI assistant popup for waste suggestions and tips

---

## 🔌 Edge Functions Required

### 1. `complete-onboarding`
- Creates tenant record
- Creates tenant_user record with 'owner' role
- Creates salon_settings record
- Updates setup_completed_at

### 2. `manage-pin`
- Accepts staff_id and PIN
- Hashes PIN using bcrypt
- Updates staff.pin_hash

### 3. `verify-pin`
- Accepts staff_id and PIN
- Compares against stored hash
- Returns verification result

---

## 📦 Key Features to Implement

### 1. Color Session Flow
```
Select client → Add bowl(s) → Add products to each bowl → 
Set developer → Record leftover → Calculate cost → Save session
```

### 2. Formula History
- Each client shows their past color sessions
- Click to pre-fill a new bowl with that formula
- Maria suggests optimizations based on waste history

### 3. Inventory Tracking
- Products have stock levels
- Reorder alerts when stock < reorder_level
- Cost per unit for pricing calculations

### 4. Cost Calculation
```
Bowl Cost = Σ(product amount × cost_per_unit) + developer cost
Session Cost = Σ(all bowl costs)
Client Charge = Session Cost × (1 + markup_percent/100) + bowl_fee
```

### 5. Setup Wizard
Track completion of:
- Add first staff member
- Add first product
- Add first client
- Review settings

---

## 🎯 Implementation Order

1. **Phase 1: Foundation**
   - Set up design system and index.css
   - Create shadcn/ui components
   - Implement AuthContext and TenantContext
   - Build ProtectedRoute and basic routing

2. **Phase 2: Core Pages**
   - Dashboard/Index page with navigation tiles
   - Auth page (login/signup)
   - Onboarding flow

3. **Phase 3: Data Management**
   - Clients page with CRUD
   - Inventory/Products page with CRUD
   - Staff page with CRUD and permissions

4. **Phase 4: Color Sessions**
   - NewBowl page with full functionality
   - Bowl components
   - Formula history display

5. **Phase 5: Reports & Settings**
   - Reports page with analytics
   - Settings page with all configurations

6. **Phase 6: Platform Admin**
   - Platform dashboard
   - Tenant management
   - Plan management
   - Platform settings

---

## 🗂️ File Structure

```
src/
├── components/
│   ├── auth/ProtectedRoute.tsx
│   ├── bowl/BowlCard.tsx, ClientCombobox.tsx, ProductCombobox.tsx
│   ├── clients/AddClientDialog.tsx, ClientDetailSheet.tsx, etc.
│   ├── home/NavigationTile.tsx, SetupWizard.tsx
│   ├── inventory/ProductDialog.tsx, ReorderReportSheet.tsx
│   ├── layout/Header.tsx, PageLayout.tsx
│   ├── maria/MariaAssistant.tsx
│   ├── platform/PlatformLayout.tsx, TenantTable.tsx, etc.
│   ├── reports/DateRangeSelector.tsx, RevenueBreakdownCard.tsx
│   ├── settings/ClientRequirementsCard.tsx
│   ├── staff/AddStaffDialog.tsx, StaffDetailSheet.tsx, etc.
│   └── ui/ (all shadcn components)
├── contexts/
│   ├── AuthContext.tsx
│   └── TenantContext.tsx
├── hooks/
│   ├── platform/usePlatformAdmin.ts, useTenants.ts, usePlans.ts
│   ├── useClients.ts, useProducts.ts, useStaff.ts
│   ├── useSalonSettings.ts, useCurrentStaff.ts
│   └── useSetupProgress.ts
├── pages/
│   ├── Auth.tsx, Index.tsx, Clients.tsx, Inventory.tsx
│   ├── NewBowl.tsx, Staff.tsx, Reports.tsx, Settings.tsx
│   ├── Onboarding.tsx, NotFound.tsx
│   └── platform/PlatformDashboard.tsx, PlatformTenants.tsx, etc.
└── App.tsx, main.tsx, index.css
```

---

## ⚠️ Critical Implementation Notes

1. **Never store tenant_id client-side** - Always fetch from database based on auth user
2. **All data queries must filter by tenant_id** - Use get_user_tenant_id() in RLS
3. **Owner role is protected** - Cannot be changed via UI or direct update
4. **PIN hashing must happen server-side** - Use edge function, never expose hashes
5. **Platform admins bypass tenant isolation** - They can see all data
6. **Auto-confirm email signups** - No email verification required for MVP
7. **Use semantic Tailwind tokens** - Never hardcode colors in components

---

## 🚀 Getting Started Prompt

```
I need you to build MixR Fusion - a multi-tenant salon color management SaaS.

I've already set up my Supabase project with the complete database schema, 
RLS policies, and edge functions. The Supabase project is connected to this 
Lovable project.

Start by:
1. Setting up the design system in index.css with the color palette I specified
2. Creating the AuthContext and TenantContext for authentication and multi-tenancy
3. Building the ProtectedRoute component
4. Creating the App.tsx with all routes
5. Building the Auth page (login/signup form)

Use shadcn/ui components, Tailwind CSS with semantic tokens, and TanStack Query 
for all data fetching. The design should be clean, minimal, and professional.
```

---

*This prompt was generated from MixR Fusion codebase - January 2026*
