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
    PostgrestVersion: "12.2.3 (519615d)"
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
      banner: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      category: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_expert: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      category_markets: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      category_news: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          participant1_id: string
          participant2_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant1_id: string
          participant2_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant1_id?: string
          participant2_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          archived_at: string | null
          category: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          files: Json | null
          id: string
          image_url: string | null
          link_drive: string | null
          link_youtube: string | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          files?: Json | null
          id?: string
          image_url?: string | null
          link_drive?: string | null
          link_youtube?: string | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          files?: Json | null
          id?: string
          image_url?: string | null
          link_drive?: string | null
          link_youtube?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          id: number
          inserted_at: string
          name: string
          province: string
          updated_at: string
        }
        Insert: {
          id?: number
          inserted_at?: string
          name: string
          province: string
          updated_at?: string
        }
        Update: {
          id?: number
          inserted_at?: string
          name?: string
          province?: string
          updated_at?: string
        }
        Relationships: []
      }
      experts: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          id: number
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: number
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: number
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_prices: {
        Row: {
          created_at: string | null
          date: string
          deleted_at: string | null
          food_id: string
          id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          food_id: string
          id?: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          food_id?: string
          id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_prices_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          satuan: string
          search_vector: unknown
          slug: string
          specifications: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          satuan: string
          search_vector?: unknown
          slug: string
          specifications?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          satuan?: string
          search_vector?: unknown
          slug?: string
          specifications?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hero_data: {
        Row: {
          button_link: string | null
          button_text: string | null
          caption: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          caption?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          caption?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instructors: {
        Row: {
          created_at: string
          deleted_at: string | null
          district: string | null
          id: number
          note: string | null
          provinces: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          id?: number
          note?: string | null
          provinces?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          id?: number
          note?: string | null
          provinces?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_instructor_profile"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          archived_at: string | null
          attachments: string | null
          category: string
          contact_seller: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          links: Json | null
          name: string
          price: number | null
          price_range: string | null
          seller: string
          slug: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          attachments?: string | null
          category: string
          contact_seller?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          links?: Json | null
          name: string
          price?: number | null
          price_range?: string | null
          seller: string
          slug?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          attachments?: string | null
          category?: string
          contact_seller?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          links?: Json | null
          name?: string
          price?: number | null
          price_range?: string | null
          seller?: string
          slug?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          archived_at: string | null
          attachments: Json | null
          author_id: string | null
          category: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          link: string | null
          organization: string
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          attachments?: Json | null
          author_id?: string | null
          category: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          organization: string
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          attachments?: Json | null
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          organization?: string
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          is_read: boolean | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          attachment_url: string | null
          category: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          link: string | null
          published_at: string | null
          slug: string | null
          status_news: string
          sub_title: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          category: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          published_at?: string | null
          slug?: string | null
          status_news?: string
          sub_title?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          published_at?: string | null
          slug?: string | null
          status_news?: string
          sub_title?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_updated: {
        Row: {
          attachments: Json | null
          category: string
          content: Json
          cover_image: string | null
          created_at: string
          deleted_at: string | null
          id: string
          images: Json | null
          link: string | null
          published_at: string | null
          slug: string | null
          status_news: string
          sub_title: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          category: string
          content?: Json
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          images?: Json | null
          link?: string | null
          published_at?: string | null
          slug?: string | null
          status_news?: string
          sub_title?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string
          content?: Json
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          images?: Json | null
          link?: string | null
          published_at?: string | null
          slug?: string | null
          status_news?: string
          sub_title?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_updated_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_markets: {
        Row: {
          attachments: Json
          category: string
          contact_seller: string | null
          content: Json
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          images: Json
          links: Json
          name: string
          price: number | null
          price_range: string | null
          price_unit: string | null
          published_at: string | null
          seller: string
          slug: string | null
          status: string
          status_depriority: number | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json
          category: string
          contact_seller?: string | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          images?: Json
          links?: Json
          name: string
          price?: number | null
          price_range?: string | null
          price_unit?: string | null
          published_at?: string | null
          seller: string
          slug?: string | null
          status?: string
          status_depriority?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json
          category?: string
          contact_seller?: string | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          images?: Json
          links?: Json
          name?: string
          price?: number | null
          price_range?: string | null
          price_unit?: string | null
          published_at?: string | null
          seller?: string
          slug?: string | null
          status?: string
          status_depriority?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          archived_at: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          phone: string | null
          role: string | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: number
          link_yt: string
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: number
          link_yt: string
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: number
          link_yt?: string
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      visit_stats: {
        Row: {
          count: number
          created_at: string | null
          date: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          date: string
        }
        Update: {
          count?: number
          created_at?: string | null
          date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_or_get_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      generate_slug:
        | { Args: { input_text: string; table_name: string }; Returns: string }
        | { Args: { text_input: string }; Returns: string }
      get_all_latest_prices: {
        Args: never
        Returns: {
          category: string
          date: string
          description: string
          food_id: string
          image_url: string
          name: string
          price: number
          price_change: number
          satuan: string
          slug: string
        }[]
      }
      get_food_by_slug: {
        Args: { p_slug: string }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string
          name: string
          satuan: string
          slug: string
          specifications: string
          tags: string[]
          updated_at: string
        }[]
      }
      get_food_image_url: { Args: { p_file_path: string }; Returns: string }
      get_latest_price_by_slug: {
        Args: { p_slug: string }
        Returns: {
          category: string
          date: string
          food_id: string
          food_name: string
          image_url: string
          price: number
          satuan: string
        }[]
      }
      get_latest_prices_by_category: {
        Args: { p_category: string }
        Returns: {
          category: string
          date: string
          food_id: string
          image_url: string
          name: string
          price: number
          satuan: string
          slug: string
        }[]
      }
      get_price_stats_by_slug: {
        Args: { p_days?: number; p_slug: string }
        Returns: Json
      }
      get_price_trend_by_slug: {
        Args: { p_days?: number; p_slug: string }
        Returns: {
          date: string
          price: number
          price_change: number
          price_change_percent: number
        }[]
      }
      get_unread_messages_count: { Args: never; Returns: number }
      get_unread_notifications_count: { Args: never; Returns: number }
      get_user_role: { Args: never; Returns: string }
      get_user_stats: { Args: { p_user_id: string }; Returns: Json }
      increment_visit:
        | { Args: never; Returns: undefined }
        | { Args: { visit_date: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { conversation_id: string }
        Returns: boolean
      }
      is_expert: { Args: never; Returns: boolean }
      is_instructor: { Args: never; Returns: boolean }
      is_market_owner: { Args: { market_id: string }; Returns: boolean }
      is_meeting_author: { Args: { meeting_id: string }; Returns: boolean }
      is_news_author: { Args: { news_id: string }; Returns: boolean }
      is_profile_owner: { Args: { profile_id: string }; Returns: boolean }
      list_foods: {
        Args: { p_category?: string }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          name: string
          satuan: string
          slug: string
          tags: string[]
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_conversation_messages_read: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      search_foods: {
        Args: { p_category?: string; p_limit?: number; p_search_term: string }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          name: string
          rank: number
          satuan: string
          slug: string
        }[]
      }
      search_users: {
        Args: { search_term: string; user_limit?: number }
        Returns: {
          avatar_url: string
          bio: string
          full_name: string
          id: string
          role: string
          username: string
        }[]
      }
      send_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      update_food_image: {
        Args: { p_file_path: string; p_food_id: string }
        Returns: boolean
      }
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
