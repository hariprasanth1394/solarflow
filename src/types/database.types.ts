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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          company: string | null
          country: string | null
          current_stage: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          state: string | null
          status: string
          system_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          current_stage?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          state?: string | null
          status?: string
          system_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          current_stage?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          state?: string | null
          status?: string
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_progress: {
        Row: {
          changed_by: string | null
          created_at: string
          current_stage: string
          customer_id: string
          id: string
          metadata: Json
          next_required_action: string | null
          organization_id: string
          previous_stage: string | null
          trigger_event: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          current_stage: string
          customer_id: string
          id?: string
          metadata?: Json
          next_required_action?: string | null
          organization_id: string
          previous_stage?: string | null
          trigger_event: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          current_stage?: string
          customer_id?: string
          id?: string
          metadata?: Json
          next_required_action?: string | null
          organization_id?: string
          previous_stage?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_progress_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_progress_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          settings_json: Json
          widget_name: string
          widget_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          settings_json?: Json
          widget_name: string
          widget_type: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          settings_json?: Json
          widget_name?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          organization_id: string
          related_customer_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          organization_id: string
          related_customer_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          organization_id?: string
          related_customer_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_customer_id_fkey"
            columns: ["related_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          company_name: string | null
          created_at: string
          currency: string | null
          id: string
          language: string | null
          logo_url: string | null
          organization_id: string
          timezone: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          organization_id: string
          timezone?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          organization_id?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          plan: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          plan?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          plan?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          file_url: string | null
          generated_by: string | null
          id: string
          name: string
          organization_id: string
          report_type: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          name: string
          organization_id: string
          report_type: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spares: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string
          id: string
          min_stock: number
          name: string
          organization_id: string
          stock_quantity: number
          supplier_id: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          organization_id: string
          stock_quantity?: number
          supplier_id?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          organization_id?: string
          stock_quantity?: number
          supplier_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spares_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spares_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          quantity: number
          reference: string | null
          spare_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          quantity: number
          reference?: string | null
          spare_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          quantity?: number
          reference?: string | null
          spare_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_spare_id_fkey"
            columns: ["spare_id"]
            isOneToOne: false
            referencedRelation: "spares"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_components: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          quantity_required: number
          spare_id: string
          system_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          quantity_required: number
          spare_id: string
          system_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          quantity_required?: number
          spare_id?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_components_spare_id_fkey"
            columns: ["spare_id"]
            isOneToOne: false
            referencedRelation: "spares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_components_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          capacity_kw: number
          created_at: string
          description: string | null
          id: string
          organization_id: string
          system_name: string
        }
        Insert: {
          capacity_kw: number
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          system_name: string
        }
        Update: {
          capacity_kw?: number
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          system_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "systems_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          related_customer_id: string | null
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          related_customer_id?: string | null
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          related_customer_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_customer_id_fkey"
            columns: ["related_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          notifications_enabled: boolean
          organization_id: string
          theme: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          organization_id: string
          theme?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          organization_id?: string
          theme?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          organization_id: string
          role: string
          status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          organization_id: string
          role?: string
          status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          organization_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_system_inventory_availability: {
        Row: {
          available_systems: number | null
          capacity_kw: number | null
          system_id: string | null
          system_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_system_inventory_availability: {
        Args: { p_organization_id?: string }
        Returns: {
          available_systems: number
          capacity_kw: number
          system_id: string
          system_name: string
        }[]
      }
      current_user_org_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

