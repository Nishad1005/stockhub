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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      entries: {
        Row: {
          assigned_code: string | null
          category: string | null
          created_at: string
          created_by: string
          defn: string | null
          fixture_type: Database["public"]["Enums"]["fixture_type"]
          id: string
          master_code: string | null
          name: string
          notes: string | null
          photo_url: string | null
          qty: number | null
          scanned_barcode: string | null
          shelf_code: string
          updated_at: string
          zone_code: string
        }
        Insert: {
          assigned_code?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          defn?: string | null
          fixture_type: Database["public"]["Enums"]["fixture_type"]
          id?: string
          master_code?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          qty?: number | null
          scanned_barcode?: string | null
          shelf_code: string
          updated_at?: string
          zone_code: string
        }
        Update: {
          assigned_code?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          defn?: string | null
          fixture_type?: Database["public"]["Enums"]["fixture_type"]
          id?: string
          master_code?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          qty?: number | null
          scanned_barcode?: string | null
          shelf_code?: string
          updated_at?: string
          zone_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_master_code_fkey"
            columns: ["master_code"]
            isOneToOne: false
            referencedRelation: "master_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "entries_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["code"]
          },
        ]
      }
      master_items: {
        Row: {
          category: string | null
          code: string
          created_at: string
          definition: string | null
          name: string
          sku: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          definition?: string | null
          name: string
          sku?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          definition?: string | null
          name?: string
          sku?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      movements: {
        Row: {
          authorized_by: string | null
          created_at: string
          created_by: string
          fixture_type: Database["public"]["Enums"]["fixture_type"]
          id: string
          item_code: string | null
          item_name: string
          notes: string | null
          qty: number
          reason: string | null
          ref_number: string
          shelf_code: string
          source_or_dest: string
          type: Database["public"]["Enums"]["movement_type"]
          zone_code: string
        }
        Insert: {
          authorized_by?: string | null
          created_at?: string
          created_by: string
          fixture_type: Database["public"]["Enums"]["fixture_type"]
          id?: string
          item_code?: string | null
          item_name: string
          notes?: string | null
          qty: number
          reason?: string | null
          ref_number: string
          shelf_code: string
          source_or_dest: string
          type: Database["public"]["Enums"]["movement_type"]
          zone_code: string
        }
        Update: {
          authorized_by?: string | null
          created_at?: string
          created_by?: string
          fixture_type?: Database["public"]["Enums"]["fixture_type"]
          id?: string
          item_code?: string | null
          item_name?: string
          notes?: string | null
          qty?: number
          reason?: string | null
          ref_number?: string
          shelf_code?: string
          source_or_dest?: string
          type?: Database["public"]["Enums"]["movement_type"]
          zone_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "master_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "movements_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          manager_password_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          manager_password_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          manager_password_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string
          created_by: string
          dest_shelf: string
          dest_zone: string
          helper: string | null
          id: string
          item_category: string | null
          item_code: string | null
          item_defn: string | null
          item_name: string
          notes: string | null
          qty: number
          reason: string | null
          source_deducted: boolean
          source_shelf: string
          source_zone: string
          stn_number: string
          storekeeper: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          dest_shelf: string
          dest_zone: string
          helper?: string | null
          id?: string
          item_category?: string | null
          item_code?: string | null
          item_defn?: string | null
          item_name: string
          notes?: string | null
          qty: number
          reason?: string | null
          source_deducted?: boolean
          source_shelf: string
          source_zone: string
          stn_number: string
          storekeeper?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dest_shelf?: string
          dest_zone?: string
          helper?: string | null
          id?: string
          item_category?: string | null
          item_code?: string | null
          item_defn?: string | null
          item_name?: string
          notes?: string | null
          qty?: number
          reason?: string | null
          source_deducted?: boolean
          source_shelf?: string
          source_zone?: string
          stn_number?: string
          storekeeper?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_dest_zone_fkey"
            columns: ["dest_zone"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transfers_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "master_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transfers_source_zone_fkey"
            columns: ["source_zone"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["code"]
          },
        ]
      }
      zones: {
        Row: {
          code: string
          default_category: string | null
          display_order: number
          name: string
          purpose: string | null
        }
        Insert: {
          code: string
          default_category?: string | null
          display_order?: number
          name: string
          purpose?: string | null
        }
        Update: {
          code?: string
          default_category?: string | null
          display_order?: number
          name?: string
          purpose?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      running_stock: {
        Row: {
          master_code: string | null
          shelf_code: string | null
          stock: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      next_item_code: { Args: never; Returns: string }
      next_stn_number: { Args: never; Returns: string }
      set_manager_password: { Args: { pw: string }; Returns: undefined }
      verify_manager_password: { Args: { pw: string }; Returns: boolean }
    }
    Enums: {
      fixture_type: "S" | "G" | "P" | "R"
      movement_type: "IN" | "OUT"
      user_role: "storekeeper" | "manager" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      fixture_type: ["S", "G", "P", "R"],
      movement_type: ["IN", "OUT"],
      user_role: ["storekeeper", "manager", "admin"],
    },
  },
} as const
