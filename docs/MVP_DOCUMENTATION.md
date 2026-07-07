# MixR Fusion - MVP Documentation

## 📋 Overview

**MixR Fusion** is a multi-tenant SaaS platform for salon color management. It enables salons to track color formulas, manage clients, inventory, and staff while providing platform administrators with oversight of all tenants.

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | TanStack React Query |
| **Routing** | React Router v6 |
| **Backend** | Supabase (Lovable Cloud) |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth |
| **Edge Functions** | Deno (Supabase Edge Functions) |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/                    # Authentication components
│   │   └── ProtectedRoute.tsx   # Route guard for authenticated users
│   ├── bowl/                    # Color mixing bowl components
│   │   ├── BowlCard.tsx
│   │   ├── ClientCombobox.tsx
│   │   └── ProductCombobox.tsx
│   ├── clients/                 # Client management
│   │   ├── AddClientDialog.tsx
│   │   ├── ClientDetailSheet.tsx
│   │   ├── ClientImportCard.tsx
│   │   ├── ClientsSetupOptions.tsx
│   │   └── FormulaHistoryCard.tsx
│   ├── home/                    # Dashboard components
│   │   ├── NavigationTile.tsx
│   │   └── SetupWizard.tsx
│   ├── inventory/               # Product/inventory management
│   │   ├── InventorySetupOptions.tsx
│   │   ├── ProductDialog.tsx
│   │   ├── ProductImportCard.tsx
│   │   └── ReorderReportSheet.tsx
│   ├── layout/                  # Layout components
│   │   ├── Header.tsx
│   │   └── PageLayout.tsx
│   ├── maria/                   # AI Assistant
│   │   └── MariaAssistant.tsx
│   ├── platform/                # Platform admin components
│   │   ├── CreateTenantDialog.tsx
│   │   ├── PlanCard.tsx
│   │   ├── PlanDialog.tsx
│   │   ├── PlatformLayout.tsx
│   │   ├── PlatformProtectedRoute.tsx
│   │   ├── StatCard.tsx
│   │   └── TenantTable.tsx
│   ├── reports/                 # Reporting components
│   │   ├── DateRangeSelector.tsx
│   │   └── RevenueBreakdownCard.tsx
│   ├── settings/                # Settings components
│   │   └── ClientRequirementsCard.tsx
│   ├── staff/                   # Staff management
│   │   ├── AddStaffDialog.tsx
│   │   ├── PinManagementDialog.tsx
│   │   ├── StaffDetailSheet.tsx
│   │   └── StaffPermissions.tsx
│   └── ui/                      # shadcn/ui components
│
├── contexts/
│   ├── AuthContext.tsx          # Authentication state
│   └── TenantContext.tsx        # Tenant/multi-tenancy state
│
├── hooks/
│   ├── platform/                # Platform admin hooks
│   │   ├── usePlans.ts
│   │   ├── usePlatformAdmin.ts
│   │   ├── usePlatformMetrics.ts
│   │   └── useTenants.ts
│   ├── useClients.ts            # Client CRUD operations
│   ├── useCurrentStaff.ts       # Current staff member
│   ├── useOnboardingStatus.ts   # Onboarding flow
│   ├── useProducts.ts           # Product/inventory operations
│   ├── useReportsData.ts        # Report data fetching
│   ├── useSalonSettings.ts      # Salon configuration
│   ├── useSetupProgress.ts      # Setup wizard progress
│   ├── useStaff.ts              # Staff CRUD operations
│   └── useTenant.ts             # Tenant data fetching
│
├── integrations/
│   └── supabase/
│       ├── client.ts            # Supabase client (auto-generated)
│       └── types.ts             # Database types (auto-generated)
│
├── lib/
│   ├── clientUtils.ts           # Client utility functions
│   └── utils.ts                 # General utilities (cn, etc.)
│
├── pages/
│   ├── Auth.tsx                 # Login/Signup page
│   ├── Clients.tsx              # Client management page
│   ├── Index.tsx                # Dashboard/Home
│   ├── Inventory.tsx            # Product inventory page
│   ├── NewBowl.tsx              # Create color session
│   ├── NotFound.tsx             # 404 page
│   ├── Onboarding.tsx           # New user onboarding
│   ├── Reports.tsx              # Analytics & reports
│   ├── Settings.tsx             # Salon settings
│   ├── Staff.tsx                # Staff management
│   └── platform/                # Platform admin pages
│       ├── PlatformDashboard.tsx
│       ├── PlatformPlans.tsx
│       ├── PlatformSettings.tsx
│       ├── PlatformTenantDetail.tsx
│       └── PlatformTenants.tsx
│
├── App.tsx                      # Main app with routing
├── main.tsx                     # Entry point
└── index.css                    # Global styles & design tokens

supabase/
├── config.toml                  # Supabase configuration
├── functions/
│   ├── complete-onboarding/     # Onboarding completion
│   ├── manage-pin/              # PIN management
│   └── verify-pin/              # PIN verification
└── migrations/                  # Database migrations
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  platform_admins│       │     tenants     │       │   tenant_users  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ user_id (PK)    │       │ id (PK)         │◄──────│ tenant_id (FK)  │
│ created_at      │       │ name            │       │ user_id         │
└─────────────────┘       │ owner_user_id   │       │ role            │
                          │ status          │       │ id (PK)         │
                          │ primary_contact │       └─────────────────┘
                          │ notes           │
                          │ created_at      │
                          └────────┬────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│    clients    │          │    products   │          │     staff     │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ id (PK)       │          │ id (PK)       │          │ id (PK)       │
│ tenant_id(FK) │          │ tenant_id(FK) │          │ tenant_id(FK) │
│ name          │          │ brand         │          │ name          │
│ email         │          │ line          │          │ email         │
│ phone         │          │ shade         │          │ role          │
│ preferences   │          │ type          │          │ pin_hash      │
│ client_since  │          │ cost_per_unit │          │ permissions...|
└───────┬───────┘          │ stock         │          └───────────────┘
        │                  │ reorder_level │
        │                  └───────┬───────┘
        │                          │
        ▼                          ▼
┌───────────────┐          ┌───────────────┐
│color_sessions │          │ session_bowls │
├───────────────┤          ├───────────────┤
│ id (PK)       │◄─────────│ session_id(FK)│
│ client_id(FK) │          │ id (PK)       │
│ stylist_id(FK)│          │ tenant_id(FK) │
│ tenant_id(FK) │          │ name          │
│ session_date  │          │ developer_id  │
│ total_cost    │          │ amount_mixed  │
│ notes         │          └───────┬───────┘
└───────────────┘                  │
                                   ▼
                           ┌───────────────┐
                           │  bowl_items   │
                           ├───────────────┤
                           │ id (PK)       │
                           │ bowl_id (FK)  │
                           │ product_id(FK)│
                           │ amount        │
                           │ cost          │
                           │ unit          │
                           └───────────────┘
```

### Core Tables

#### 1. Multi-Tenancy Tables

| Table | Purpose |
|-------|---------|
| `tenants` | Salon organizations (multi-tenant isolation) |
| `tenant_users` | Maps auth users to tenants with roles |
| `platform_admins` | Super admins with cross-tenant access |

#### 2. Salon Operations Tables

| Table | Purpose |
|-------|---------|
| `clients` | Salon clients/customers |
| `staff` | Salon employees with roles & permissions |
| `products` | Color products, developers, treatments |
| `salon_settings` | Per-tenant configuration |

#### 3. Color Session Tables

| Table | Purpose |
|-------|---------|
| `color_sessions` | Parent record for a color service |
| `session_bowls` | Individual bowls mixed in a session |
| `bowl_items` | Products used in each bowl |
| `client_staff_relationships` | Tracks which stylists worked with which clients |

#### 4. Billing & Subscription Tables

| Table | Purpose |
|-------|---------|
| `plans` | Available subscription plans |
| `subscriptions` | Tenant subscriptions to plans |
| `invoices` | Billing invoices |
| `payments` | Payment records |

#### 5. Platform Tables

| Table | Purpose |
|-------|---------|
| `audit_logs` | Activity logging |
| `usage_daily` | Daily usage metrics per tenant |
| `whitelabel_settings` | Custom branding per tenant |
| `profiles` | Auth user profiles |
| `user_roles` | User role assignments |

---

## 🔐 Authentication & Authorization

### Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│  Supabase    │────▶│  profiles    │
│   Signs Up   │     │  Auth        │     │  table       │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ handle_new_  │
                     │ user trigger │
                     └──────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       ┌──────────────┐           ┌──────────────┐
       │ Create       │           │ Assign       │
       │ profile      │           │ stylist role │
       └──────────────┘           └──────────────┘
```

### Role Hierarchy

```
Platform Admin (Super Admin)
    │
    └── Can access all tenants
    └── Manages plans, subscriptions
    └── Views platform-wide analytics

Tenant Roles:
    ├── owner      → Full access, cannot be demoted
    ├── admin      → Full access except ownership transfer
    ├── manager    → Staff, client, product management
    ├── stylist    → Create bowls, manage own clients
    ├── assistant  → Limited access
    └── front_desk → Client check-in only
```

### Row Level Security (RLS)

All tables use RLS policies that leverage these helper functions:

```sql
-- Get current user's tenant
get_user_tenant_id() → uuid

-- Check if user is platform admin
is_platform_admin() → boolean

-- Check if user has specific role
has_role(_user_id uuid, _role app_role) → boolean
```

**Example RLS Pattern:**
```sql
-- Tenant users can view their own tenant's clients
CREATE POLICY "Tenant users can view their clients"
ON public.clients
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id()) 
  OR is_platform_admin()
);
```

---

## 🎯 Key Features

### 1. Color Session Management
- Create color formulas with multiple bowls
- Track products used with amounts
- Automatic cost calculation
- Formula history per client

### 2. Client Management
- Client profiles with preferences
- Formula history
- Stylist relationships
- Import/export capabilities

### 3. Inventory Management
- Track product stock levels
- Reorder alerts
- Cost tracking
- Product categorization (Color, Developer, Lightener, Treatment)

### 4. Staff Management
- Role-based permissions
- PIN authentication for kiosk mode
- Commission tracking
- Custom markup per stylist

### 5. Reporting
- Revenue breakdown
- Product usage analytics
- Stylist performance
- Date range filtering

### 6. Platform Administration
- Tenant management
- Subscription management
- Usage metrics
- Audit logging

---

## 🔄 Data Flow

### Creating a Color Session

```
1. User selects client
       │
       ▼
2. Creates color_session record
       │
       ▼
3. Adds session_bowls (one per bowl)
       │
       ▼
4. Adds bowl_items (products in each bowl)
       │
       ▼
5. Trigger calculates costs
       │
       ▼
6. Updates session totals
       │
       ▼
7. Creates client_staff_relationship
```

### Database Triggers

| Trigger | Purpose |
|---------|---------|
| `calculate_bowl_item_cost` | Auto-calculates item cost from product price |
| `update_session_totals` | Aggregates bowl costs to session |
| `create_staff_client_relationship` | Links stylist to client after session |
| `protect_owner_role` | Prevents owner role modification |
| `handle_new_user` | Creates profile on signup |
| `handle_platform_admin_signup` | Auto-assigns platform admin role |

---

## 🚀 Edge Functions

### `/complete-onboarding`
Completes tenant onboarding, creates initial salon settings.

### `/manage-pin`
Handles PIN creation/update for staff kiosk mode.

### `/verify-pin`
Validates staff PIN for kiosk authentication.

---

## 📊 Enums

```typescript
product_type: "Color" | "Developer" | "Lightener" | "Treatment"

app_role: "admin" | "owner" | "stylist" | "assistant" | "manager" | "front_desk"

tenant_status: "active" | "suspended" | "archived"

subscription_status: "trialing" | "active" | "past_due" | "canceled"

invoice_status: "draft" | "open" | "paid" | "void" | "uncollectible"

payment_status: "succeeded" | "failed" | "pending" | "refunded"

actor_type: "platform_admin" | "tenant_user"
```

---

## 🔒 Security Considerations

1. **Multi-tenant Isolation**: All queries filtered by `tenant_id`
2. **RLS Everywhere**: No table accessible without policy check
3. **PIN Hashing**: Staff PINs hashed via edge function
4. **Role Protection**: Owner role immutable
5. **Audit Logging**: All significant actions logged
6. **Platform Admin Separation**: Distinct from tenant roles

---

## 📝 Configuration

### Salon Settings
- `markup_percent`: Price markup on products
- `bowl_fee`: Fixed fee per bowl
- `waste_factor_percent`: Waste allowance
- `rounding_amount`: Price rounding
- `kiosk_mode_enabled`: PIN-based auth
- `pin_timeout_minutes`: Session timeout
- `stylists_see_all_clients`: Client visibility

---

## 🛠️ Development Notes

### File Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Pages: `PascalCase.tsx`

### State Management
- **Server State**: TanStack Query
- **Auth State**: AuthContext
- **Tenant State**: TenantContext
- **Form State**: React Hook Form + Zod

### Styling
- Semantic Tailwind tokens from `index.css`
- shadcn/ui component library
- Dark mode support via CSS variables

---

*Last Updated: January 2026*
