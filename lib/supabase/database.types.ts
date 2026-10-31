export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "user";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "admin" | "user";
          created_at?: string;
        };
      };
      theme_categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      event_themes: {
        Row: {
          id: string;
          theme_name: string;
          title?: string | null;
          category: string;
          category_id?: string | null;
          keywords: string | null;
          theme_link: string | null;
          executed_ppts_link: string | null;
          client_persona: string | null;
          color_palette: string[] | null;
          total_event_value: string | null;
          ideal_venue: string | null;
          launch_status: string | null;
          material_download_link: string | null;
          additional_notes: string | null;
          r2_file_key: string | null;
          thumbnail_url: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          theme_name: string;
          title?: string | null;
          category: string;
          category_id?: string | null;
          keywords?: string | null;
          theme_link?: string | null;
          executed_ppts_link?: string | null;
          client_persona?: string | null;
          color_palette?: string[] | null;
          total_event_value?: string | null;
          ideal_venue?: string | null;
          launch_status?: string | null;
          material_download_link?: string | null;
          additional_notes?: string | null;
          r2_file_key?: string | null;
          thumbnail_url?: string | null;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          theme_name?: string;
          title?: string | null;
          category?: string;
          category_id?: string | null;
          keywords?: string | null;
          theme_link?: string | null;
          executed_ppts_link?: string | null;
          client_persona?: string | null;
          color_palette?: string[] | null;
          total_event_value?: string | null;
          ideal_venue?: string | null;
          launch_status?: string | null;
          material_download_link?: string | null;
          additional_notes?: string | null;
          r2_file_key?: string | null;
          thumbnail_url?: string | null;
          tags?: string[];
          created_at?: string;
        };
      };
      access_logs: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          event_type: string;
          ip_address: string | null;
          location: string | null;
          user_agent: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          event_type?: string;
          ip_address?: string | null;
          location?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          event_type?: string;
          ip_address?: string | null;
          location?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
      };
    };
    Views: {};
    Functions: {
      log_access: {
        Args: {
          p_user_id: string | null;
          p_email: string | null;
          p_ip_address: string | null;
          p_location: string | null;
          p_user_agent: string | null;
          p_event_type?: string;
        };
        Returns: void;
      };
      log_auth_event: {
        Args: {
          p_event_type: string;
          p_ip_address?: string | null;
          p_location?: string | null;
          p_user_agent?: string | null;
        };
        Returns: void;
      };
    };
    Enums: {};
  };
}
