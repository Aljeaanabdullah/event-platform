// ⚠️ ملف مولّد تلقائيًا من مخطط Supabase — لا تعدّله يدويًا.
// يُعاد توليده بعد كل Migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      event_categories: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          is_active: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_images: {
        Row: {
          alt_ar: string | null;
          alt_en: string | null;
          created_at: string;
          event_id: string;
          id: string;
          sort_order: number;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          alt_ar?: string | null;
          alt_en?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          alt_ar?: string | null;
          alt_en?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          address_ar: string | null;
          address_en: string | null;
          area: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          category_id: string;
          cover_image_path: string | null;
          created_at: string;
          created_by: string;
          description_ar: string | null;
          description_en: string | null;
          ends_at: string;
          governorate: Database["public"]["Enums"]["kuwait_governorate"] | null;
          id: string;
          is_featured: boolean;
          is_online: boolean;
          latitude: number | null;
          longitude: number | null;
          organizer_id: string;
          published_at: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          search_vector: unknown;
          slug: string;
          starts_at: string;
          status: Database["public"]["Enums"]["event_status"];
          submitted_at: string | null;
          summary_ar: string | null;
          summary_en: string | null;
          timezone: string;
          title_ar: string;
          title_en: string;
          updated_at: string;
          venue_name_ar: string | null;
          venue_name_en: string | null;
        };
        Insert: {
          address_ar?: string | null;
          address_en?: string | null;
          area?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          category_id: string;
          cover_image_path?: string | null;
          created_at?: string;
          created_by: string;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at: string;
          governorate?: Database["public"]["Enums"]["kuwait_governorate"] | null;
          id?: string;
          is_featured?: boolean;
          is_online?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          organizer_id: string;
          published_at?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          search_vector?: unknown;
          slug: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["event_status"];
          submitted_at?: string | null;
          summary_ar?: string | null;
          summary_en?: string | null;
          timezone?: string;
          title_ar: string;
          title_en: string;
          updated_at?: string;
          venue_name_ar?: string | null;
          venue_name_en?: string | null;
        };
        Update: {
          address_ar?: string | null;
          address_en?: string | null;
          area?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          category_id?: string;
          cover_image_path?: string | null;
          created_at?: string;
          created_by?: string;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at?: string;
          governorate?: Database["public"]["Enums"]["kuwait_governorate"] | null;
          id?: string;
          is_featured?: boolean;
          is_online?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          organizer_id?: string;
          published_at?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          search_vector?: unknown;
          slug?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["event_status"];
          submitted_at?: string | null;
          summary_ar?: string | null;
          summary_en?: string | null;
          timezone?: string;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
          venue_name_ar?: string | null;
          venue_name_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "event_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "organizers";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body_ar: string | null;
          body_en: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title_ar: string;
          title_en: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body_ar?: string | null;
          body_en?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title_ar: string;
          title_en: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body_ar?: string | null;
          body_en?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title_ar?: string;
          title_en?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total_fils: number;
          order_id: string;
          quantity: number;
          ticket_name_ar: string;
          ticket_name_en: string;
          ticket_type_id: string;
          unit_price_fils: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total_fils: number;
          order_id: string;
          quantity: number;
          ticket_name_ar: string;
          ticket_name_en: string;
          ticket_type_id: string;
          unit_price_fils: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total_fils?: number;
          order_id?: string;
          quantity?: number;
          ticket_name_ar?: string;
          ticket_name_en?: string;
          ticket_type_id?: string;
          unit_price_fils?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          buyer_email: string | null;
          buyer_name: string | null;
          buyer_phone: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          event_id: string;
          expires_at: string | null;
          id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          order_number: string;
          organizer_net_fils: number;
          paid_at: string | null;
          platform_commission_fils: number;
          refunded_fils: number;
          service_fee_fils: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_fils: number;
          total_fils: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          event_id: string;
          expires_at?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          order_number?: string;
          organizer_net_fils: number;
          paid_at?: string | null;
          platform_commission_fils?: number;
          refunded_fils?: number;
          service_fee_fils?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_fils: number;
          total_fils: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          event_id?: string;
          expires_at?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          order_number?: string;
          organizer_net_fils?: number;
          paid_at?: string | null;
          platform_commission_fils?: number;
          refunded_fils?: number;
          service_fee_fils?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_fils?: number;
          total_fils?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      organizer_members: {
        Row: {
          created_at: string;
          id: string;
          organizer_id: string;
          role: Database["public"]["Enums"]["member_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organizer_id: string;
          role?: Database["public"]["Enums"]["member_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organizer_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizer_members_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "organizers";
            referencedColumns: ["id"];
          },
        ];
      };
      organizers: {
        Row: {
          commercial_reg_no: string | null;
          commission_bps: number | null;
          contact_email: string;
          contact_phone: string | null;
          created_at: string;
          created_by: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          logo_path: string | null;
          name_ar: string;
          name_en: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: Database["public"]["Enums"]["organizer_status"];
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          commercial_reg_no?: string | null;
          commission_bps?: number | null;
          contact_email: string;
          contact_phone?: string | null;
          created_at?: string;
          created_by: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          logo_path?: string | null;
          name_ar: string;
          name_en: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["organizer_status"];
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          commercial_reg_no?: string | null;
          commission_bps?: number | null;
          contact_email?: string;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          logo_path?: string | null;
          name_ar?: string;
          name_en?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["organizer_status"];
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          created_at: string;
          error: string | null;
          event_type: string | null;
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
          provider_event_id: string;
          signature_valid: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          event_type?: string | null;
          id?: string;
          payload: Json;
          processed_at?: string | null;
          provider: string;
          provider_event_id: string;
          signature_valid: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          event_type?: string | null;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
          provider_event_id?: string;
          signature_valid?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_fils: number;
          created_at: string;
          currency: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          method: string | null;
          order_id: string;
          provider: string;
          provider_invoice_id: string | null;
          provider_payment_id: string | null;
          raw_response: Json | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_fils: number;
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          idempotency_key: string;
          method?: string | null;
          order_id: string;
          provider: string;
          provider_invoice_id?: string | null;
          provider_payment_id?: string | null;
          raw_response?: Json | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_fils?: number;
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string;
          method?: string | null;
          order_id?: string;
          provider?: string;
          provider_invoice_id?: string | null;
          provider_payment_id?: string | null;
          raw_response?: Json | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_items: {
        Row: {
          amount_fils: number;
          created_at: string;
          id: string;
          order_id: string;
          payout_id: string;
        };
        Insert: {
          amount_fils: number;
          created_at?: string;
          id?: string;
          order_id: string;
          payout_id: string;
        };
        Update: {
          amount_fils?: number;
          created_at?: string;
          id?: string;
          order_id?: string;
          payout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payout_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "payouts";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          commission_fils: number;
          created_at: string;
          created_by: string | null;
          gross_fils: number;
          id: string;
          net_fils: number;
          notes: string | null;
          organizer_id: string;
          paid_at: string | null;
          period_end: string;
          period_start: string;
          reference: string | null;
          refunds_fils: number;
          status: Database["public"]["Enums"]["payout_status"];
          updated_at: string;
        };
        Insert: {
          commission_fils: number;
          created_at?: string;
          created_by?: string | null;
          gross_fils: number;
          id?: string;
          net_fils: number;
          notes?: string | null;
          organizer_id: string;
          paid_at?: string | null;
          period_end: string;
          period_start: string;
          reference?: string | null;
          refunds_fils?: number;
          status?: Database["public"]["Enums"]["payout_status"];
          updated_at?: string;
        };
        Update: {
          commission_fils?: number;
          created_at?: string;
          created_by?: string | null;
          gross_fils?: number;
          id?: string;
          net_fils?: number;
          notes?: string | null;
          organizer_id?: string;
          paid_at?: string | null;
          period_end?: string;
          period_start?: string;
          reference?: string | null;
          refunds_fils?: number;
          status?: Database["public"]["Enums"]["payout_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "organizers";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          created_at: string;
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          platform_role: Database["public"]["Enums"]["platform_role"];
          preferred_locale: Database["public"]["Enums"]["app_locale"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          preferred_locale?: Database["public"]["Enums"]["app_locale"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          preferred_locale?: Database["public"]["Enums"]["app_locale"];
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          amount_fils: number;
          created_at: string;
          failure_reason: string | null;
          id: string;
          order_id: string;
          payment_id: string | null;
          processed_at: string | null;
          processed_by: string | null;
          provider_refund_id: string | null;
          reason: string | null;
          requested_by: string | null;
          status: Database["public"]["Enums"]["refund_status"];
          updated_at: string;
        };
        Insert: {
          amount_fils: number;
          created_at?: string;
          failure_reason?: string | null;
          id?: string;
          order_id: string;
          payment_id?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          provider_refund_id?: string | null;
          reason?: string | null;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
          updated_at?: string;
        };
        Update: {
          amount_fils?: number;
          created_at?: string;
          failure_reason?: string | null;
          id?: string;
          order_id?: string;
          payment_id?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          provider_refund_id?: string | null;
          reason?: string | null;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_types: {
        Row: {
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          event_id: string;
          id: string;
          is_active: boolean;
          max_per_order: number;
          min_per_order: number;
          name_ar: string;
          name_en: string;
          price_fils: number;
          quantity_reserved: number;
          quantity_sold: number;
          quantity_total: number;
          sales_end_at: string | null;
          sales_start_at: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          event_id: string;
          id?: string;
          is_active?: boolean;
          max_per_order?: number;
          min_per_order?: number;
          name_ar: string;
          name_en: string;
          price_fils: number;
          quantity_reserved?: number;
          quantity_sold?: number;
          quantity_total: number;
          sales_end_at?: string | null;
          sales_start_at?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          event_id?: string;
          id?: string;
          is_active?: boolean;
          max_per_order?: number;
          min_per_order?: number;
          name_ar?: string;
          name_en?: string;
          price_fils?: number;
          quantity_reserved?: number;
          quantity_sold?: number;
          quantity_total?: number;
          sales_end_at?: string | null;
          sales_start_at?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          checked_in_at: string | null;
          checked_in_by: string | null;
          code: string;
          created_at: string;
          event_id: string;
          id: string;
          order_id: string;
          order_item_id: string;
          owner_user_id: string;
          qr_token: string;
          status: Database["public"]["Enums"]["ticket_status"];
          ticket_type_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          code?: string;
          created_at?: string;
          event_id: string;
          id?: string;
          order_id: string;
          order_item_id: string;
          owner_user_id: string;
          qr_token?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          ticket_type_id: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          code?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          order_id?: string;
          order_item_id?: string;
          owner_user_id?: string;
          qr_token?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          ticket_type_id?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _finalize_order: {
        Args: { p_from_reserved: boolean; p_order_id: string };
        Returns: undefined;
      };
      apply_as_organizer: {
        Args: {
          p_commercial_reg_no?: string;
          p_contact_email: string;
          p_contact_phone?: string;
          p_description_ar?: string;
          p_description_en?: string;
          p_name_ar: string;
          p_name_en: string;
          p_slug: string;
          p_website_url?: string;
        };
        Returns: string;
      };
      can_manage_event: { Args: { p_event_id: string }; Returns: boolean };
      can_manage_organizer: {
        Args: { p_organizer_id: string };
        Returns: boolean;
      };
      cancel_pending_order: { Args: { p_order_id: string }; Returns: undefined };
      check_in_ticket: {
        Args: { p_event_id?: string; p_qr_token: string };
        Returns: Json;
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      confirm_order_payment: {
        Args: {
          p_amount_fils: number;
          p_order_id: string;
          p_provider: string;
          p_provider_payment_id: string;
        };
        Returns: string;
      };
      get_popular_events: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          event_id: string;
          favorites_count: number;
          score: number;
          tickets_sold: number;
        }[];
      };
      get_ticket_qr_token: { Args: { p_ticket_id: string }; Returns: string };
      is_admin: { Args: never; Returns: boolean };
      is_org_member: {
        Args: {
          p_organizer_id: string;
          p_roles?: Database["public"]["Enums"]["member_role"][];
        };
        Returns: boolean;
      };
      log_audit: {
        Args: {
          p_action: string;
          p_after?: Json;
          p_before?: Json;
          p_entity_id: string;
          p_entity_type: string;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      release_expired_holds: { Args: never; Returns: number };
      reserve_tickets: {
        Args: {
          p_buyer_email?: string;
          p_buyer_name?: string;
          p_buyer_phone?: string;
          p_event_id: string;
          p_items: Json;
          p_locale?: Database["public"]["Enums"]["app_locale"];
        };
        Returns: {
          expires_at: string;
          order_id: string;
          order_number: string;
          status: Database["public"]["Enums"]["order_status"];
          total_fils: number;
        }[];
      };
      review_event: {
        Args: { p_approve: boolean; p_event_id: string; p_reason?: string };
        Returns: undefined;
      };
      set_event_featured: {
        Args: { p_event_id: string; p_featured: boolean };
        Returns: undefined;
      };
      set_organizer_status: {
        Args: {
          p_organizer_id: string;
          p_reason?: string;
          p_status: Database["public"]["Enums"]["organizer_status"];
        };
        Returns: undefined;
      };
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["platform_role"];
          p_user_id: string;
        };
        Returns: undefined;
      };
      setting_int: {
        Args: { p_default: number; p_key: string };
        Returns: number;
      };
      storage_path_organizer: { Args: { p_name: string }; Returns: string };
      submit_event_for_review: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      withdraw_event_submission: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_locale: "ar" | "en";
      event_status: "draft" | "pending_review" | "published" | "rejected" | "cancelled";
      kuwait_governorate: "capital" | "hawalli" | "farwaniya" | "ahmadi" | "jahra" | "mubarak-al-kabeer";
      member_role: "owner" | "manager" | "scanner";
      order_status:
        | "pending_payment"
        | "paid"
        | "expired"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
        | "needs_refund";
      organizer_status: "pending" | "approved" | "rejected" | "suspended";
      payment_status: "initiated" | "pending" | "succeeded" | "failed" | "cancelled" | "refunded";
      payout_status: "pending" | "processing" | "paid" | "failed";
      platform_role: "customer" | "admin";
      refund_status: "requested" | "approved" | "processing" | "succeeded" | "failed" | "rejected";
      ticket_status: "valid" | "checked_in" | "void";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_locale: ["ar", "en"],
      event_status: ["draft", "pending_review", "published", "rejected", "cancelled"],
      kuwait_governorate: ["capital", "hawalli", "farwaniya", "ahmadi", "jahra", "mubarak-al-kabeer"],
      member_role: ["owner", "manager", "scanner"],
      order_status: [
        "pending_payment",
        "paid",
        "expired",
        "cancelled",
        "refunded",
        "partially_refunded",
        "needs_refund",
      ],
      organizer_status: ["pending", "approved", "rejected", "suspended"],
      payment_status: ["initiated", "pending", "succeeded", "failed", "cancelled", "refunded"],
      payout_status: ["pending", "processing", "paid", "failed"],
      platform_role: ["customer", "admin"],
      refund_status: ["requested", "approved", "processing", "succeeded", "failed", "rejected"],
      ticket_status: ["valid", "checked_in", "void"],
    },
  },
} as const;
