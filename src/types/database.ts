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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      drop_items: {
        Row: {
          available_qty: number
          drop_id: string
          id: string
          item_id: string
          price_cents: number
          total_qty: number
        }
        Insert: {
          available_qty: number
          drop_id: string
          id?: string
          item_id: string
          price_cents: number
          total_qty: number
        }
        Update: {
          available_qty?: number
          drop_id?: string
          id?: string
          item_id?: string
          price_cents?: number
          total_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "drop_items_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          announce_days_before: number | null
          blast_count: number
          cancelled_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_window_ends_at: string
          order_window_starts_at: string
          partner_id: string
          pickup_window_ends_at: string
          pickup_window_starts_at: string
          published_at: string | null
          reminder_days_before: number | null
          slug: string
          state: Database["public"]["Enums"]["drop_state"]
        }
        Insert: {
          announce_days_before?: number | null
          blast_count?: number
          cancelled_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_window_ends_at: string
          order_window_starts_at: string
          partner_id: string
          pickup_window_ends_at: string
          pickup_window_starts_at: string
          published_at?: string | null
          reminder_days_before?: number | null
          slug: string
          state?: Database["public"]["Enums"]["drop_state"]
        }
        Update: {
          announce_days_before?: number | null
          blast_count?: number
          cancelled_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_window_ends_at?: string
          order_window_starts_at?: string
          partner_id?: string
          pickup_window_ends_at?: string
          pickup_window_starts_at?: string
          published_at?: string | null
          reminder_days_before?: number | null
          slug?: string
          state?: Database["public"]["Enums"]["drop_state"]
        }
        Relationships: [
          {
            foreignKeyName: "drops_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          archived_at: string | null
          created_at: string
          default_price_cents: number
          description: string | null
          id: string
          name: string
          partner_id: string
          photo_url: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_price_cents: number
          description?: string | null
          id?: string
          name: string
          partner_id: string
          photo_url?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_price_cents?: number
          description?: string | null
          id?: string
          name?: string
          partner_id?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_name: string
          order_id: string
          price_cents: number
          qty: number
        }
        Insert: {
          id?: string
          item_name: string
          order_id: string
          price_cents: number
          qty: number
        }
        Update: {
          id?: string
          item_name?: string
          order_id?: string
          price_cents?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          drop_id: string
          id: string
          paid_at: string
          picked_up_at: string | null
          platform_fee_cents: number
          ready_at: string | null
          refunded_at: string | null
          state: Database["public"]["Enums"]["order_state"]
          stripe_payment_intent_id: string
          subtotal_cents: number
          tip_cents: number
          total_cents: number
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          drop_id: string
          id?: string
          paid_at?: string
          picked_up_at?: string | null
          platform_fee_cents: number
          ready_at?: string | null
          refunded_at?: string | null
          state?: Database["public"]["Enums"]["order_state"]
          stripe_payment_intent_id: string
          subtotal_cents: number
          tip_cents?: number
          total_cents: number
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          drop_id?: string
          id?: string
          paid_at?: string
          picked_up_at?: string | null
          platform_fee_cents?: number
          ready_at?: string | null
          refunded_at?: string | null
          state?: Database["public"]["Enums"]["order_state"]
          stripe_payment_intent_id?: string
          subtotal_cents?: number
          tip_cents?: number
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          accent_color: string
          bg_color: string
          business_name: string
          created_at: string
          email: string
          fg_color: string
          font_style: string
          hero_url: string | null
          id: string
          intro_body: string | null
          intro_heading: string | null
          logo_url: string | null
          onboarding_state: Database["public"]["Enums"]["partner_onboarding_state"]
          phone: string | null
          pickup_address: string
          slug: string
          stripe_account_id: string | null
          tone: Json | null
          tone_researched_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string
          bg_color?: string
          business_name: string
          created_at?: string
          email: string
          fg_color?: string
          font_style?: string
          hero_url?: string | null
          id?: string
          intro_body?: string | null
          intro_heading?: string | null
          logo_url?: string | null
          onboarding_state?: Database["public"]["Enums"]["partner_onboarding_state"]
          phone?: string | null
          pickup_address: string
          slug: string
          stripe_account_id?: string | null
          tone?: Json | null
          tone_researched_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string
          bg_color?: string
          business_name?: string
          created_at?: string
          email?: string
          fg_color?: string
          font_style?: string
          hero_url?: string | null
          id?: string
          intro_body?: string | null
          intro_heading?: string | null
          logo_url?: string | null
          onboarding_state?: Database["public"]["Enums"]["partner_onboarding_state"]
          phone?: string | null
          pickup_address?: string
          slug?: string
          stripe_account_id?: string | null
          tone?: Json | null
          tone_researched_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          created_at: string
          customer_email: string
          drop_id: string
          id: string
          line_items: Json
          reserved_until: string
          stripe_session_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          drop_id: string
          id?: string
          line_items: Json
          reserved_until: string
          stripe_session_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          drop_id?: string
          id?: string
          line_items?: Json
          reserved_until?: string
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_orders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          id: string
          partner_id: string
          phone: string
          opted_in: boolean
          source: string
          name: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          phone: string
          opted_in?: boolean
          source?: string
          name?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          phone?: string
          opted_in?: boolean
          source?: string
          name?: string | null
          email?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      drop_state:
        | "scheduled"
        | "orders_open"
        | "orders_closed"
        | "pickup_open"
        | "pickup_closed"
        | "archived"
      order_state: "paid" | "ready" | "picked_up" | "no_show"
      partner_onboarding_state:
        | "signed_up"
        | "profile_complete"
        | "stripe_ready"
        | "stripe_action_required"
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
      drop_state: [
        "scheduled",
        "orders_open",
        "orders_closed",
        "pickup_open",
        "pickup_closed",
        "archived",
      ],
      order_state: ["paid", "ready", "picked_up", "no_show"],
      partner_onboarding_state: [
        "signed_up",
        "profile_complete",
        "stripe_ready",
        "stripe_action_required",
      ],
    },
  },
} as const
