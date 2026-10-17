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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          label: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          label: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_label: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string
        }
        Relationships: []
      }
      candidate_activity: {
        Row: {
          actor_id: string | null
          actor_name: string
          candidate_id: string
          created_at: string
          event: string
          id: string
          metadata: Json
          remarks: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name: string
          candidate_id: string
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          remarks?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          candidate_id?: string
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_activity_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_assignment_history: {
        Row: {
          assignment_type: string
          candidate_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_user: string | null
          previous_user: string | null
          remarks: string | null
        }
        Insert: {
          assignment_type: string
          candidate_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_user?: string | null
          previous_user?: string | null
          remarks?: string | null
        }
        Update: {
          assignment_type?: string
          candidate_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_user?: string | null
          previous_user?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assignment_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assignment_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assignment_history_new_user_fkey"
            columns: ["new_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assignment_history_previous_user_fkey"
            columns: ["previous_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_assignments: {
        Row: {
          assignment_type: string
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          assignment_type: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          assignment_type?: string
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_education: {
        Row: {
          candidate_id: string
          completion_year: number | null
          created_at: string
          created_by: string | null
          degree: string | null
          education_type: string | null
          id: string
          institution: string | null
          qualification_level: string | null
          score: string | null
          specialization: string | null
          start_year: number | null
          status: string | null
          university: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          candidate_id: string
          completion_year?: number | null
          created_at?: string
          created_by?: string | null
          degree?: string | null
          education_type?: string | null
          id?: string
          institution?: string | null
          qualification_level?: string | null
          score?: string | null
          specialization?: string | null
          start_year?: number | null
          status?: string | null
          university?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          candidate_id?: string
          completion_year?: number | null
          created_at?: string
          created_by?: string | null
          degree?: string | null
          education_type?: string | null
          id?: string
          institution?: string | null
          qualification_level?: string | null
          score?: string | null
          specialization?: string | null
          start_year?: number | null
          status?: string | null
          university?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_education_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_education_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_education_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_employment: {
        Row: {
          candidate_id: string
          company_name: string | null
          created_at: string
          created_by: string | null
          ctc: string | null
          currently_working: boolean
          designation: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          industry: string | null
          location: string | null
          reason_for_leaving: string | null
          remarks: string | null
          role_description: string | null
          start_date: string | null
          technologies: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          candidate_id: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          ctc?: string | null
          currently_working?: boolean
          designation?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          reason_for_leaving?: string | null
          remarks?: string | null
          role_description?: string | null
          start_date?: string | null
          technologies?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          candidate_id?: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          ctc?: string | null
          currently_working?: boolean
          designation?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          reason_for_leaving?: string | null
          remarks?: string | null
          role_description?: string | null
          start_date?: string | null
          technologies?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_employment_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_employment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_employment_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_portal_links: {
        Row: {
          activated_at: string
          candidate_id: string
          created_at: string
          created_by: string | null
          disabled_at: string | null
          id: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_portal_links_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_portal_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_portal_links_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_portal_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_program_plans: {
        Row: {
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      candidate_status_history: {
        Row: {
          candidate_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          remarks: string | null
        }
        Insert: {
          candidate_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          remarks?: string | null
        }
        Update: {
          candidate_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_status_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_year_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      candidates: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          alternate_email: string | null
          alternate_mobile: string | null
          candidate_code: string
          candidate_preferred_role: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string | null
          current_career_situation: string | null
          currently_in_gap: boolean
          date_of_birth: string | null
          employment_status: string
          enrollment_date: string | null
          existing_skills: string | null
          expected_ctc: string | null
          full_name: string
          gap_duration: string | null
          gap_end_date: string | null
          gap_explanation: string | null
          gap_internal_remarks: string | null
          gap_reason: string | null
          gap_start_date: string | null
          gender: string | null
          has_career_gap: boolean
          id: string
          internal_remarks: string | null
          journey_status: string
          last_ctc: string | null
          last_designation: string | null
          last_industry: string | null
          open_to_relocation: boolean
          personal_email: string
          pin_code: string | null
          portal_status: string
          preferred_locations: string | null
          preferred_work_mode: string | null
          primary_mobile: string
          profile_photo: string | null
          program_plan: string | null
          program_status: string | null
          relevant_it_experience: number | null
          roadmap_duration: number
          source_reference: string | null
          state: string | null
          tentative_end_date: string | null
          tentative_start_date: string | null
          tools_known: string | null
          total_experience: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          alternate_email?: string | null
          alternate_mobile?: string | null
          candidate_code: string
          candidate_preferred_role?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          current_career_situation?: string | null
          currently_in_gap?: boolean
          date_of_birth?: string | null
          employment_status?: string
          enrollment_date?: string | null
          existing_skills?: string | null
          expected_ctc?: string | null
          full_name: string
          gap_duration?: string | null
          gap_end_date?: string | null
          gap_explanation?: string | null
          gap_internal_remarks?: string | null
          gap_reason?: string | null
          gap_start_date?: string | null
          gender?: string | null
          has_career_gap?: boolean
          id?: string
          internal_remarks?: string | null
          journey_status?: string
          last_ctc?: string | null
          last_designation?: string | null
          last_industry?: string | null
          open_to_relocation?: boolean
          personal_email: string
          pin_code?: string | null
          portal_status?: string
          preferred_locations?: string | null
          preferred_work_mode?: string | null
          primary_mobile: string
          profile_photo?: string | null
          program_plan?: string | null
          program_status?: string | null
          relevant_it_experience?: number | null
          roadmap_duration?: number
          source_reference?: string | null
          state?: string | null
          tentative_end_date?: string | null
          tentative_start_date?: string | null
          tools_known?: string | null
          total_experience?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          alternate_email?: string | null
          alternate_mobile?: string | null
          candidate_code?: string
          candidate_preferred_role?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          current_career_situation?: string | null
          currently_in_gap?: boolean
          date_of_birth?: string | null
          employment_status?: string
          enrollment_date?: string | null
          existing_skills?: string | null
          expected_ctc?: string | null
          full_name?: string
          gap_duration?: string | null
          gap_end_date?: string | null
          gap_explanation?: string | null
          gap_internal_remarks?: string | null
          gap_reason?: string | null
          gap_start_date?: string | null
          gender?: string | null
          has_career_gap?: boolean
          id?: string
          internal_remarks?: string | null
          journey_status?: string
          last_ctc?: string | null
          last_designation?: string | null
          last_industry?: string | null
          open_to_relocation?: boolean
          personal_email?: string
          pin_code?: string | null
          portal_status?: string
          preferred_locations?: string | null
          preferred_work_mode?: string | null
          primary_mobile?: string
          profile_photo?: string | null
          program_plan?: string | null
          program_status?: string | null
          relevant_it_experience?: number | null
          roadmap_duration?: number
          source_reference?: string | null
          state?: string | null
          tentative_end_date?: string | null
          tentative_start_date?: string | null
          tools_known?: string | null
          total_experience?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_program_plan_fkey"
            columns: ["program_plan"]
            isOneToOne: false
            referencedRelation: "candidate_program_plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "candidates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          module: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          module: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          module?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          mobile: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          mobile?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_code: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          mobile?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_code?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_staff: boolean
          is_system: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_staff?: boolean
          is_system?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_staff?: boolean
          is_system?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_candidate: { Args: { _id: string }; Returns: boolean }
      candidate_assert: {
        Args: { _id: string; _permission: string }
        Returns: undefined
      }
      candidate_change_status: {
        Args: { _id: string; _remarks?: string; _status: string }
        Returns: undefined
      }
      candidate_log: {
        Args: {
          _event: string
          _id: string
          _metadata?: Json
          _remarks?: string
        }
        Returns: undefined
      }
      candidate_options: { Args: never; Returns: Json }
      candidate_portal_summary: { Args: never; Returns: Json }
      candidate_save: {
        Args: {
          _assignments?: Json
          _education?: Json
          _employment?: Json
          _id: string
          _record: Json
        }
        Returns: string
      }
      candidate_set_assignment: {
        Args: { _id: string; _remarks?: string; _type: string; _user: string }
        Returns: undefined
      }
      candidate_set_portal: {
        Args: { _disable?: boolean; _id: string; _user?: string }
        Returns: undefined
      }
      current_user_context: { Args: never; Returns: Json }
      has_permission: { Args: { _key: string; _uid: string }; Returns: boolean }
      is_active_user: { Args: { _uid: string }; Returns: boolean }
      record_login: { Args: never; Returns: undefined }
    }
    Enums: {
      user_status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      user_status: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    },
  },
} as const
