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
      books: {
        Row: {
          collection_id: string | null
          cover_url: string | null
          created_at: string
          folder_id: string | null
          icon: string | null
          id: string
          position: number
          subtitle: string | null
          theme: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          cover_url?: string | null
          created_at?: string
          folder_id?: string | null
          icon?: string | null
          id?: string
          position?: number
          subtitle?: string | null
          theme?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          cover_url?: string | null
          created_at?: string
          folder_id?: string | null
          icon?: string | null
          id?: string
          position?: number
          subtitle?: string | null
          theme?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          fields: Json
          icon: string | null
          id: string
          name: string
          parent_collection_id: string | null
          position: number
          updated_at: string
          user_id: string
          view: Json
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          fields?: Json
          icon?: string | null
          id?: string
          name?: string
          parent_collection_id?: string | null
          position?: number
          updated_at?: string
          user_id: string
          view?: Json
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          fields?: Json
          icon?: string | null
          id?: string
          name?: string
          parent_collection_id?: string | null
          position?: number
          updated_at?: string
          user_id?: string
          view?: Json
        }
        Relationships: [
          {
            foreignKeyName: "collections_parent_collection_id_fkey"
            columns: ["parent_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      datagrid_rows: {
        Row: {
          content: Json
          cover_url: string | null
          created_at: string
          datagrid_id: string
          icon: string | null
          id: string
          position: number
          properties: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          cover_url?: string | null
          created_at?: string
          datagrid_id: string
          icon?: string | null
          id?: string
          position?: number
          properties?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          cover_url?: string | null
          created_at?: string
          datagrid_id?: string
          icon?: string | null
          id?: string
          position?: number
          properties?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datagrid_rows_datagrid_id_fkey"
            columns: ["datagrid_id"]
            isOneToOne: false
            referencedRelation: "datagrids"
            referencedColumns: ["id"]
          },
        ]
      }
      datagrid_views: {
        Row: {
          config: Json
          created_at: string
          datagrid_id: string
          id: string
          is_default: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          datagrid_id: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          datagrid_id?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datagrid_views_datagrid_id_fkey"
            columns: ["datagrid_id"]
            isOneToOne: false
            referencedRelation: "datagrids"
            referencedColumns: ["id"]
          },
        ]
      }
      datagrids: {
        Row: {
          collection_id: string
          cover_url: string | null
          created_at: string
          fields: Json
          icon: string | null
          id: string
          name: string
          position: number
          subtitle: string | null
          theme: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          cover_url?: string | null
          created_at?: string
          fields?: Json
          icon?: string | null
          id?: string
          name?: string
          position?: number
          subtitle?: string | null
          theme?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          cover_url?: string | null
          created_at?: string
          fields?: Json
          icon?: string | null
          id?: string
          name?: string
          position?: number
          subtitle?: string | null
          theme?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datagrids_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          banner_color: string | null
          banner_text: string | null
          book_id: string
          content: Json
          cover_url: string | null
          created_at: string
          font_overrides: Json | null
          icon: string | null
          id: string
          is_title_page: boolean
          parent_document_id: string | null
          position: number
          show_contents: boolean
          show_outline: boolean
          show_subtitle: boolean
          spellcheck_enabled: boolean
          spellcheck_ignores: Json
          subtitle: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_color?: string | null
          banner_text?: string | null
          book_id: string
          content?: Json
          cover_url?: string | null
          created_at?: string
          font_overrides?: Json | null
          icon?: string | null
          id?: string
          is_title_page?: boolean
          parent_document_id?: string | null
          position?: number
          show_contents?: boolean
          show_outline?: boolean
          show_subtitle?: boolean
          spellcheck_enabled?: boolean
          spellcheck_ignores?: Json
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_color?: string | null
          banner_text?: string | null
          book_id?: string
          content?: Json
          cover_url?: string | null
          created_at?: string
          font_overrides?: Json | null
          icon?: string | null
          id?: string
          is_title_page?: boolean
          parent_document_id?: string | null
          position?: number
          show_contents?: boolean
          show_outline?: boolean
          show_subtitle?: boolean
          spellcheck_enabled?: boolean
          spellcheck_ignores?: Json
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          collection_id: string
          content: Json
          cover_url: string | null
          created_at: string
          icon: string | null
          id: string
          position: number
          properties: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          content?: Json
          cover_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          position?: number
          properties?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          content?: Json
          cover_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          position?: number
          properties?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_folder_id: string | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_folder_id?: string | null
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      fonts: {
        Row: {
          cached_path: string | null
          created_at: string
          family: string
          id: string
          source_url: string | null
          user_id: string
          weights: string[]
        }
        Insert: {
          cached_path?: string | null
          created_at?: string
          family: string
          id?: string
          source_url?: string | null
          user_id: string
          weights?: string[]
        }
        Update: {
          cached_path?: string | null
          created_at?: string
          family?: string
          id?: string
          source_url?: string | null
          user_id?: string
          weights?: string[]
        }
        Relationships: []
      }
      links: {
        Row: {
          created_at: string
          id: string
          kind: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_font: string | null
          dictionary: Json
          display_name: string | null
          fonts: Json
          id: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_font?: string | null
          dictionary?: Json
          display_name?: string | null
          fonts?: Json
          id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_font?: string | null
          dictionary?: Json
          display_name?: string | null
          fonts?: Json
          id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      taggables: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taggables_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whiteboards: {
        Row: {
          collection_id: string
          cover_url: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          position: number
          scene: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          cover_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number
          scene?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          cover_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number
          scene?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboards_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
