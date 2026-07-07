export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bowl_items: {
        Row: {
          amount: number
          bowl_id: string
          cost: number | null
          created_at: string
          id: string
          item_type: string
          product_id: string
          tenant_id: string | null
          unit: string
        }
        Insert: {
          amount: number
          bowl_id: string
          cost?: number | null
          created_at?: string
          id?: string
          item_type?: string
          product_id: string
          tenant_id?: string | null
          unit?: string
        }
        Update: {
          amount?: number
          bowl_id?: string
          cost?: number | null
          created_at?: string
          id?: string
          item_type?: string
          product_id?: string
          tenant_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "bowl_items_bowl_id_fkey"
            columns: ["bowl_id"]
            isOneToOne: false
            referencedRelation: "session_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowl_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowl_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowl_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowl_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          catalog_id: string | null
          created_at: string | null
          default_size: number | null
          default_size_unit: string | null
          id: string
          name: string
          shade: string | null
          suggested_cost_per_unit: number | null
          type: string
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string | null
          default_size?: number | null
          default_size_unit?: string | null
          id?: string
          name: string
          shade?: string | null
          suggested_cost_per_unit?: number | null
          type: string
        }
        Update: {
          catalog_id?: string | null
          created_at?: string | null
          default_size?: number | null
          default_size_unit?: string | null
          id?: string
          name?: string
          shade?: string | null
          suggested_cost_per_unit?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_staff_relationships: {
        Row: {
          client_id: string
          created_at: string
          id: string
          relationship_type: string
          staff_id: string
          tenant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          relationship_type?: string
          staff_id: string
          tenant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          relationship_type?: string
          staff_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_staff_relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_relationships_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_relationships_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_since: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          preferences: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          client_since?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          preferences?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          client_since?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          preferences?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      color_sessions: {
        Row: {
          canvas_data: Json | null
          canvas_preview_url: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          service_id: string | null
          session_date: string
          stylist_id: string | null
          tenant_id: string | null
          total_amount_mixed: number | null
          total_amount_used: number | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          canvas_data?: Json | null
          canvas_preview_url?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          service_id?: string | null
          session_date?: string
          stylist_id?: string | null
          tenant_id?: string | null
          total_amount_mixed?: number | null
          total_amount_used?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          canvas_data?: Json | null
          canvas_preview_url?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          service_id?: string | null
          session_date?: string
          stylist_id?: string | null
          tenant_id?: string | null
          total_amount_mixed?: number | null
          total_amount_used?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "color_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sessions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sessions_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sessions_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "staff_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          id: string
          metadata: Json | null
          tenant_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          period_end: string | null
          period_start: string | null
          provider: string
          provider_invoice_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_due_cents?: number
          amount_paid_cents?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_invoice_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_invoice_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      line_developer_defaults: {
        Row: {
          brand: string
          created_at: string | null
          developer_brand: string
          developer_line: string
          id: string
          line: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          developer_brand: string
          developer_line: string
          id?: string
          line: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          developer_brand?: string
          developer_line?: string
          id?: string
          line?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "line_developer_defaults_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          product_id: string | null
          tenant_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          product_id?: string | null
          tenant_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          product_id?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          invoice_id: string | null
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          base_price_cents: number
          created_at: string
          currency: string
          features_json: Json | null
          id: string
          is_active: boolean
          name: string
          seat_price_cents: number
          stripe_price_id: string | null
        }
        Insert: {
          base_price_cents?: number
          created_at?: string
          currency?: string
          features_json?: Json | null
          id?: string
          is_active?: boolean
          name: string
          seat_price_cents?: number
          stripe_price_id?: string | null
        }
        Update: {
          base_price_cents?: number
          created_at?: string
          currency?: string
          features_json?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          seat_price_cents?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_catalogs: {
        Row: {
          brand: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          line: string
          logo_url: string | null
          product_count: number | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          line: string
          logo_url?: string | null
          product_count?: number | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          line?: string
          logo_url?: string | null
          product_count?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          cost_per_unit: number
          created_at: string
          id: string
          is_active: boolean
          line: string | null
          name: string
          reorder_level: number
          shade: string | null
          size: number | null
          size_unit: string | null
          stock: number
          target_stock: number
          tenant_id: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          brand: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          line?: string | null
          name: string
          reorder_level?: number
          shade?: string | null
          size?: number | null
          size_unit?: string | null
          stock?: number
          target_stock?: number
          tenant_id?: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          brand?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          line?: string | null
          name?: string
          reorder_level?: number
          shade?: string | null
          size?: number | null
          size_unit?: string | null
          stock?: number
          target_stock?: number
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salon_bowls: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          tare_unit: string
          tare_weight: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          tare_unit?: string
          tare_weight?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          tare_unit?: string
          tare_weight?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      salon_settings: {
        Row: {
          backbar_multiplier: number
          bowl_fee: number
          commission_basis: string
          created_at: string
          id: string
          kiosk_mode_enabled: boolean
          markup_percent: number
          notify_low_stock: boolean | null
          notify_waste_warnings: boolean | null
          notify_weekly_reports: boolean | null
          pin_timeout_minutes: number
          preferred_display_unit: string
          require_client_email: boolean
          require_client_phone: boolean
          retail_markup_percent: number
          rounding_amount: number
          salon_logo_url: string | null
          salon_name: string | null
          setup_completed_at: string | null
          stylists_see_all_clients: boolean
          stylists_see_product_costs: boolean
          tenant_id: string | null
          updated_at: string
          waste_factor_percent: number
        }
        Insert: {
          backbar_multiplier?: number
          bowl_fee?: number
          commission_basis?: string
          created_at?: string
          id?: string
          kiosk_mode_enabled?: boolean
          markup_percent?: number
          notify_low_stock?: boolean | null
          notify_waste_warnings?: boolean | null
          notify_weekly_reports?: boolean | null
          pin_timeout_minutes?: number
          preferred_display_unit?: string
          require_client_email?: boolean
          require_client_phone?: boolean
          retail_markup_percent?: number
          rounding_amount?: number
          salon_logo_url?: string | null
          salon_name?: string | null
          setup_completed_at?: string | null
          stylists_see_all_clients?: boolean
          stylists_see_product_costs?: boolean
          tenant_id?: string | null
          updated_at?: string
          waste_factor_percent?: number
        }
        Update: {
          backbar_multiplier?: number
          bowl_fee?: number
          commission_basis?: string
          created_at?: string
          id?: string
          kiosk_mode_enabled?: boolean
          markup_percent?: number
          notify_low_stock?: boolean | null
          notify_waste_warnings?: boolean | null
          notify_weekly_reports?: boolean | null
          pin_timeout_minutes?: number
          preferred_display_unit?: string
          require_client_email?: boolean
          require_client_phone?: boolean
          retail_markup_percent?: number
          rounding_amount?: number
          salon_logo_url?: string | null
          salon_name?: string | null
          setup_completed_at?: string | null
          stylists_see_all_clients?: boolean
          stylists_see_product_costs?: boolean
          tenant_id?: string | null
          updated_at?: string
          waste_factor_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "salon_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_menu: {
        Row: {
          color_amount: number
          color_unit: string
          created_at: string | null
          developer_amount: number
          developer_unit: string
          id: string
          is_active: boolean
          name: string
          price: number
          product_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color_amount?: number
          color_unit?: string
          created_at?: string | null
          developer_amount?: number
          developer_unit?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          product_type?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color_amount?: number
          color_unit?: string
          created_at?: string | null
          developer_amount?: number
          developer_unit?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          product_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_menu_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_menu_components: {
        Row: {
          created_at: string
          developer_amount: number
          developer_ratio: number | null
          developer_unit: string
          id: string
          product_amount: number
          product_type: string
          product_unit: string
          service_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          developer_amount?: number
          developer_ratio?: number | null
          developer_unit?: string
          id?: string
          product_amount?: number
          product_type: string
          product_unit?: string
          service_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          developer_amount?: number
          developer_ratio?: number | null
          developer_unit?: string
          id?: string
          product_amount?: number
          product_type?: string
          product_unit?: string
          service_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_menu_components_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_menu"
            referencedColumns: ["id"]
          },
        ]
      }
      session_bowls: {
        Row: {
          amount_mixed: number | null
          amount_used: number | null
          bowl_preset_id: string | null
          bowl_tare_unit: string | null
          bowl_tare_weight: number | null
          created_at: string
          developer_amount: number | null
          developer_product_id: string | null
          developer_unit: string | null
          id: string
          name: string
          notes: string | null
          parent_bowl_id: string | null
          remix_index: number
          reweighed_amount: number | null
          reweighed_unit: string | null
          session_id: string
          tenant_id: string | null
        }
        Insert: {
          amount_mixed?: number | null
          amount_used?: number | null
          bowl_preset_id?: string | null
          bowl_tare_unit?: string | null
          bowl_tare_weight?: number | null
          created_at?: string
          developer_amount?: number | null
          developer_product_id?: string | null
          developer_unit?: string | null
          id?: string
          name?: string
          notes?: string | null
          parent_bowl_id?: string | null
          remix_index?: number
          reweighed_amount?: number | null
          reweighed_unit?: string | null
          session_id: string
          tenant_id?: string | null
        }
        Update: {
          amount_mixed?: number | null
          amount_used?: number | null
          bowl_preset_id?: string | null
          bowl_tare_unit?: string | null
          bowl_tare_weight?: number | null
          created_at?: string
          developer_amount?: number | null
          developer_product_id?: string | null
          developer_unit?: string | null
          id?: string
          name?: string
          notes?: string | null
          parent_bowl_id?: string | null
          remix_index?: number
          reweighed_amount?: number | null
          reweighed_unit?: string | null
          session_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_bowls_bowl_preset_id_fkey"
            columns: ["bowl_preset_id"]
            isOneToOne: false
            referencedRelation: "salon_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bowls_developer_product_id_fkey"
            columns: ["developer_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bowls_developer_product_id_fkey"
            columns: ["developer_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bowls_developer_product_id_fkey"
            columns: ["developer_product_id"]
            isOneToOne: false
            referencedRelation: "products_with_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bowls_parent_bowl_id_fkey"
            columns: ["parent_bowl_id"]
            isOneToOne: false
            referencedRelation: "session_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bowls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "color_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bowls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          can_create_bowls: boolean
          can_edit_formulas: boolean
          can_manage_clients: boolean
          can_manage_own_clients: boolean
          can_manage_products: boolean
          can_manage_settings: boolean
          can_manage_staff: boolean
          can_view_all_clients: boolean
          can_view_basic_client_info: boolean
          can_view_own_commission: boolean
          can_view_product_costs: boolean
          can_view_reports: boolean
          commission_percent: number
          created_at: string
          custom_bowl_fee: number
          custom_markup_percent: number
          custom_role_name: string | null
          email: string | null
          has_custom_bowl_fee: boolean
          has_custom_markup: boolean
          id: string
          invitation_status: string | null
          is_active: boolean
          name: string
          phone: string | null
          pin_hash: string | null
          receives_commission: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          can_create_bowls?: boolean
          can_edit_formulas?: boolean
          can_manage_clients?: boolean
          can_manage_own_clients?: boolean
          can_manage_products?: boolean
          can_manage_settings?: boolean
          can_manage_staff?: boolean
          can_view_all_clients?: boolean
          can_view_basic_client_info?: boolean
          can_view_own_commission?: boolean
          can_view_product_costs?: boolean
          can_view_reports?: boolean
          commission_percent?: number
          created_at?: string
          custom_bowl_fee?: number
          custom_markup_percent?: number
          custom_role_name?: string | null
          email?: string | null
          has_custom_bowl_fee?: boolean
          has_custom_markup?: boolean
          id?: string
          invitation_status?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          pin_hash?: string | null
          receives_commission?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          can_create_bowls?: boolean
          can_edit_formulas?: boolean
          can_manage_clients?: boolean
          can_manage_own_clients?: boolean
          can_manage_products?: boolean
          can_manage_settings?: boolean
          can_manage_staff?: boolean
          can_view_all_clients?: boolean
          can_view_basic_client_info?: boolean
          can_view_own_commission?: boolean
          can_view_product_costs?: boolean
          can_view_reports?: boolean
          commission_percent?: number
          created_at?: string
          custom_bowl_fee?: number
          custom_markup_percent?: number
          custom_role_name?: string | null
          email?: string | null
          has_custom_bowl_fee?: boolean
          has_custom_markup?: boolean
          id?: string
          invitation_status?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          pin_hash?: string | null
          receives_commission?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          expires_at: string
          id: string
          invited_by: string | null
          short_code: string
          staff_id: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          short_code: string
          staff_id: string
          status?: string
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          short_code?: string
          staff_id?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          change_amount: number
          created_at: string | null
          id: string
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          reason: Database["public"]["Enums"]["stock_adjustment_reason"]
          staff_id: string | null
          tenant_id: string | null
        }
        Insert: {
          change_amount: number
          created_at?: string | null
          id?: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          product_id: string
          reason: Database["public"]["Enums"]["stock_adjustment_reason"]
          staff_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          change_amount?: number
          created_at?: string | null
          id?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          reason?: Database["public"]["Enums"]["stock_adjustment_reason"]
          staff_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          seat_count: number
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          seat_count?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          seat_count?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          created_by_platform_admin: string | null
          id: string
          name: string
          notes: string | null
          owner_user_id: string | null
          primary_contact_email: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_platform_admin?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_user_id?: string | null
          primary_contact_email?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_platform_admin?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          primary_contact_email?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      usage_daily: {
        Row: {
          bowls_count: number
          clients_added_count: number
          color_sessions_count: number
          created_at: string
          date: string
          id: string
          products_used_count: number
          tenant_id: string
        }
        Insert: {
          bowls_count?: number
          clients_added_count?: number
          color_sessions_count?: number
          created_at?: string
          date: string
          id?: string
          products_used_count?: number
          tenant_id: string
        }
        Update: {
          bowls_count?: number
          clients_added_count?: number
          color_sessions_count?: number
          created_at?: string
          date?: string
          id?: string
          products_used_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whitelabel_settings: {
        Row: {
          app_name: string | null
          created_at: string
          custom_domain: string | null
          email_from_domain: string | null
          email_from_name: string | null
          logo_url: string | null
          primary_color: string | null
          support_email: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          app_name?: string | null
          created_at?: string
          custom_domain?: string | null
          email_from_domain?: string | null
          email_from_name?: string | null
          logo_url?: string | null
          primary_color?: string | null
          support_email?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          app_name?: string | null
          created_at?: string
          custom_domain?: string | null
          email_from_domain?: string | null
          email_from_name?: string | null
          logo_url?: string | null
          primary_color?: string | null
          support_email?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whitelabel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clients_basic: {
        Row: {
          client_since: string | null
          created_at: string | null
          id: string | null
          name: string | null
          preferences: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_since?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          preferences?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_since?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          preferences?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients_with_contacts: {
        Row: {
          client_since: string | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          phone: string | null
          preferences: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_since?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          preferences?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_since?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          preferences?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products_public: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          line: string | null
          name: string | null
          reorder_level: number | null
          shade: string | null
          size: number | null
          size_unit: string | null
          stock: number | null
          target_stock: number | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["product_type"] | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          line?: string | null
          name?: string | null
          reorder_level?: number | null
          shade?: string | null
          size?: number | null
          size_unit?: string | null
          stock?: number | null
          target_stock?: number | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"] | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          line?: string | null
          name?: string | null
          reorder_level?: number | null
          shade?: string | null
          size?: number | null
          size_unit?: string | null
          stock?: number | null
          target_stock?: number | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products_with_costs: {
        Row: {
          brand: string | null
          cost_per_unit: number | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          line: string | null
          name: string | null
          reorder_level: number | null
          shade: string | null
          size: number | null
          size_unit: string | null
          stock: number | null
          target_stock: number | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["product_type"] | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          line?: string | null
          name?: string | null
          reorder_level?: number | null
          shade?: string | null
          size?: number | null
          size_unit?: string | null
          stock?: number | null
          target_stock?: number | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"] | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          line?: string | null
          name?: string | null
          reorder_level?: number | null
          shade?: string | null
          size?: number | null
          size_unit?: string | null
          stock?: number | null
          target_stock?: number | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_with_contacts: {
        Row: {
          can_create_bowls: boolean | null
          can_manage_clients: boolean | null
          can_manage_own_clients: boolean | null
          can_manage_products: boolean | null
          can_manage_settings: boolean | null
          can_manage_staff: boolean | null
          can_view_all_clients: boolean | null
          can_view_basic_client_info: boolean | null
          can_view_own_commission: boolean | null
          can_view_product_costs: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          custom_role_name: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          can_create_bowls?: boolean | null
          can_manage_clients?: boolean | null
          can_manage_own_clients?: boolean | null
          can_manage_products?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_staff?: boolean | null
          can_view_all_clients?: boolean | null
          can_view_basic_client_info?: boolean | null
          can_view_own_commission?: boolean | null
          can_view_product_costs?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          custom_role_name?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          can_create_bowls?: boolean | null
          can_manage_clients?: boolean | null
          can_manage_own_clients?: boolean | null
          can_manage_products?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_staff?: boolean | null
          can_view_all_clients?: boolean | null
          can_view_basic_client_info?: boolean | null
          can_view_own_commission?: boolean | null
          can_view_product_costs?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          custom_role_name?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_product_stock: {
        Args: { p_delta: number; p_product_id: string }
        Returns: number
      }
      check_onboarding_needed: { Args: never; Returns: boolean }
      current_staff_can_view_client: {
        Args: { client_id: string }
        Returns: boolean
      }
      current_staff_has_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      current_staff_is_admin_or_owner: { Args: never; Returns: boolean }
      current_user_can_manage_staff: { Args: never; Returns: boolean }
      get_current_staff_self: {
        Args: never
        Returns: {
          can_create_bowls: boolean
          can_edit_formulas: boolean
          can_manage_clients: boolean
          can_manage_own_clients: boolean
          can_manage_products: boolean
          can_manage_settings: boolean
          can_manage_staff: boolean
          can_view_all_clients: boolean
          can_view_basic_client_info: boolean
          can_view_own_commission: boolean
          can_view_product_costs: boolean
          can_view_reports: boolean
          created_at: string
          custom_role_name: string
          email: string
          id: string
          invitation_status: string
          is_active: boolean
          name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_report_aggregates: {
        Args: {
          p_from_date: string
          p_stylist_id?: string
          p_tenant_id?: string
          p_to_date: string
        }
        Returns: {
          bowl_count: number
          session_count: number
          total_developer_cost: number
          total_mixed: number
          total_product_cost: number
          total_used: number
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage_daily: {
        Args: { p_field_name: string; p_tenant_id: string }
        Returns: undefined
      }
      is_platform_admin: { Args: never; Returns: boolean }
      list_tenant_staff_directory: {
        Args: never
        Returns: {
          created_at: string
          custom_role_name: string
          email: string
          id: string
          invitation_status: string
          is_active: boolean
          name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      log_audit: {
        Args: {
          p_action: string
          p_actor_type: Database["public"]["Enums"]["actor_type"]
          p_actor_user_id: string
          p_metadata?: Json
          p_tenant_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      actor_type: "platform_admin" | "tenant_user"
      app_role:
        | "admin"
        | "owner"
        | "stylist"
        | "assistant"
        | "manager"
        | "front_desk"
      invoice_status: "draft" | "open" | "paid" | "void" | "uncollectible"
      payment_status: "succeeded" | "failed" | "pending" | "refunded"
      product_status: "In Stock" | "Low Stock" | "Out of Stock"
      product_type:
        | "Color"
        | "Developer"
        | "Lightener"
        | "Treatment"
        | "Toner"
        | "Additive"
      stock_adjustment_reason:
        | "received_order"
        | "service_usage"
        | "manual_correction"
        | "damaged"
        | "returned"
        | "initial_stock"
      subscription_status: "trialing" | "active" | "past_due" | "canceled"
      tenant_status: "active" | "suspended" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      actor_type: ["platform_admin", "tenant_user"],
      app_role: [
        "admin",
        "owner",
        "stylist",
        "assistant",
        "manager",
        "front_desk",
      ],
      invoice_status: ["draft", "open", "paid", "void", "uncollectible"],
      payment_status: ["succeeded", "failed", "pending", "refunded"],
      product_status: ["In Stock", "Low Stock", "Out of Stock"],
      product_type: [
        "Color",
        "Developer",
        "Lightener",
        "Treatment",
        "Toner",
        "Additive",
      ],
      stock_adjustment_reason: [
        "received_order",
        "service_usage",
        "manual_correction",
        "damaged",
        "returned",
        "initial_stock",
      ],
      subscription_status: ["trialing", "active", "past_due", "canceled"],
      tenant_status: ["active", "suspended", "archived"],
    },
  },
} as const
