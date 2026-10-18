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
      assessment_development_areas: {
        Row: {
          assessment_id: string
          id: string
          item: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          id?: string
          item: string
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          id?: string
          item?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_development_areas_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_development_plan: {
        Row: {
          area: string
          assessment_id: string
          estimated_focus: string | null
          id: string
          priority: string
          recommendation: string | null
          sort_order: number
        }
        Insert: {
          area: string
          assessment_id: string
          estimated_focus?: string | null
          id?: string
          priority?: string
          recommendation?: string | null
          sort_order?: number
        }
        Update: {
          area?: string
          assessment_id?: string
          estimated_focus?: string | null
          id?: string
          priority?: string
          recommendation?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_development_plan_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_dimension_scores: {
        Row: {
          assessment_id: string
          dimension_key: string
          id: string
          label: string
          max_score: number
          rating: string | null
          remarks: string | null
          score: number | null
          sort_order: number
        }
        Insert: {
          assessment_id: string
          dimension_key: string
          id?: string
          label: string
          max_score: number
          rating?: string | null
          remarks?: string | null
          score?: number | null
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          dimension_key?: string
          id?: string
          label?: string
          max_score?: number
          rating?: string | null
          remarks?: string | null
          score?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_dimension_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_dimension_scores_dimension_key_fkey"
            columns: ["dimension_key"]
            isOneToOne: false
            referencedRelation: "assessment_dimensions"
            referencedColumns: ["key"]
          },
        ]
      }
      assessment_dimensions: {
        Row: {
          is_active: boolean
          key: string
          label: string
          max_score: number
          sort_order: number
        }
        Insert: {
          is_active?: boolean
          key: string
          label: string
          max_score: number
          sort_order?: number
        }
        Update: {
          is_active?: boolean
          key?: string
          label?: string
          max_score?: number
          sort_order?: number
        }
        Relationships: []
      }
      assessment_documents: {
        Row: {
          assessment_id: string
          candidate_id: string
          document_name: string
          document_type: string | null
          file_name: string
          id: string
          mime_type: string | null
          remarks: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          assessment_id: string
          candidate_id: string
          document_name: string
          document_type?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          remarks?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          assessment_id?: string
          candidate_id?: string
          document_name?: string
          document_type?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          remarks?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_not_recommended_paths: {
        Row: {
          assessment_id: string
          id: string
          master_track_id: string | null
          path: string
          reason: string | null
          sort_order: number
        }
        Insert: {
          assessment_id: string
          id?: string
          master_track_id?: string | null
          path: string
          reason?: string | null
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          id?: string
          master_track_id?: string | null
          path?: string
          reason?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_not_recommended_paths_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_recommendations: {
        Row: {
          assessment_id: string
          career_path: string | null
          id: string
          kind: string
          master_track_id: string | null
          rationale: string | null
          target_role: string | null
          technology_direction: string | null
        }
        Insert: {
          assessment_id: string
          career_path?: string | null
          id?: string
          kind: string
          master_track_id?: string | null
          rationale?: string | null
          target_role?: string | null
          technology_direction?: string | null
        }
        Update: {
          assessment_id?: string
          career_path?: string | null
          id?: string
          kind?: string
          master_track_id?: string | null
          rationale?: string | null
          target_role?: string | null
          technology_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_skill_gaps: {
        Row: {
          assessment_id: string
          current_level: string | null
          id: string
          priority: string
          remarks: string | null
          required_level: string | null
          skill: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          current_level?: string | null
          id?: string
          priority?: string
          remarks?: string | null
          required_level?: string | null
          skill: string
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          current_level?: string | null
          id?: string
          priority?: string
          remarks?: string | null
          required_level?: string | null
          skill?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_skill_gaps_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_strengths: {
        Row: {
          assessment_id: string
          id: string
          item: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          id?: string
          item: string
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          id?: string
          item?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_strengths_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_technical_skills: {
        Row: {
          assessment_id: string
          id: string
          level: string
          remarks: string | null
          skill: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          id?: string
          level: string
          remarks?: string | null
          skill: string
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          id?: string
          level?: string
          remarks?: string | null
          skill?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_technical_skills_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
        ]
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
      candidate_assessment_internal: {
        Row: {
          assessment_id: string
          internal_notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assessment_id: string
          internal_notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assessment_id?: string
          internal_notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assessment_internal_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "candidate_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assessment_internal_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_assessments: {
        Row: {
          assessed_by: string | null
          assessment_code: string
          assessment_date: string
          assessment_type: string
          assessor_summary: string | null
          candidate_id: string
          career_objective: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          expected_ctc: string | null
          finalized_at: string | null
          finalized_by: string | null
          gap_impact: string | null
          gap_mitigation: string | null
          gap_notes: string | null
          id: string
          learning_days_per_week: number | null
          learning_hours_per_day: number | null
          open_to_relocation: boolean
          overall_outcome: string | null
          overall_score: number | null
          preferred_career: string | null
          preferred_location: string | null
          preferred_technology: string | null
          preferred_work_mode: string | null
          sequence: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assessed_by?: string | null
          assessment_code: string
          assessment_date?: string
          assessment_type: string
          assessor_summary?: string | null
          candidate_id: string
          career_objective?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_ctc?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          gap_impact?: string | null
          gap_mitigation?: string | null
          gap_notes?: string | null
          id?: string
          learning_days_per_week?: number | null
          learning_hours_per_day?: number | null
          open_to_relocation?: boolean
          overall_outcome?: string | null
          overall_score?: number | null
          preferred_career?: string | null
          preferred_location?: string | null
          preferred_technology?: string | null
          preferred_work_mode?: string | null
          sequence: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assessed_by?: string | null
          assessment_code?: string
          assessment_date?: string
          assessment_type?: string
          assessor_summary?: string | null
          candidate_id?: string
          career_objective?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_ctc?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          gap_impact?: string | null
          gap_mitigation?: string | null
          gap_notes?: string | null
          id?: string
          learning_days_per_week?: number | null
          learning_hours_per_day?: number | null
          open_to_relocation?: boolean
          overall_outcome?: string | null
          overall_score?: number | null
          preferred_career?: string | null
          preferred_location?: string | null
          preferred_technology?: string | null
          preferred_work_mode?: string | null
          sequence?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assessments_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assessments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      candidate_execution_counters: {
        Row: {
          candidate_id: string
          kind: string
          last_value: number
        }
        Insert: {
          candidate_id: string
          kind: string
          last_value?: number
        }
        Update: {
          candidate_id?: string
          kind?: string
          last_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_execution_counters_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_execution_history: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          candidate_id: string
          created_at: string
          event: string
          from_status: string | null
          id: string
          kind: string
          reason: string | null
          record_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          candidate_id: string
          created_at?: string
          event: string
          from_status?: string | null
          id?: string
          kind: string
          reason?: string | null
          record_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          candidate_id?: string
          created_at?: string
          event?: string
          from_status?: string | null
          id?: string
          kind?: string
          reason?: string | null
          record_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_execution_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_execution_internal: {
        Row: {
          candidate_id: string
          kind: string
          notes: string | null
          record_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          candidate_id: string
          kind: string
          notes?: string | null
          record_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          candidate_id?: string
          kind?: string
          notes?: string | null
          record_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_execution_internal_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_execution_reviews: {
        Row: {
          attempt: number | null
          candidate_feedback: string | null
          candidate_id: string
          created_at: string
          id: string
          improvement_areas: string | null
          kind: string
          outcome: string
          ratings: Json
          record_id: string
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_remarks: string | null
          strengths: string | null
        }
        Insert: {
          attempt?: number | null
          candidate_feedback?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          improvement_areas?: string | null
          kind: string
          outcome: string
          ratings?: Json
          record_id: string
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_remarks?: string | null
          strengths?: string | null
        }
        Update: {
          attempt?: number | null
          candidate_feedback?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          improvement_areas?: string | null
          kind?: string
          outcome?: string
          ratings?: Json
          record_id?: string
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_remarks?: string | null
          strengths?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_execution_reviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_execution_submissions: {
        Row: {
          attempt: number
          candidate_id: string
          github_url: string | null
          id: string
          kind: string
          link: string | null
          live_url: string | null
          notes: string | null
          record_id: string
          submitted_at: string
        }
        Insert: {
          attempt: number
          candidate_id: string
          github_url?: string | null
          id?: string
          kind: string
          link?: string | null
          live_url?: string | null
          notes?: string | null
          record_id: string
          submitted_at?: string
        }
        Update: {
          attempt?: number
          candidate_id?: string
          github_url?: string | null
          id?: string
          kind?: string
          link?: string | null
          live_url?: string | null
          notes?: string | null
          record_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_execution_submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_pcbs: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          current_approved_version_id: string | null
          id: string
          pcb_code: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          current_approved_version_id?: string | null
          id?: string
          pcb_code: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          current_approved_version_id?: string | null
          id?: string
          pcb_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_pcbs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_pcbs_current_fk"
            columns: ["current_approved_version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
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
      candidate_premium_tasks: {
        Row: {
          assigned_by: string | null
          assigned_by_name: string | null
          assigned_date: string
          cancel_reason: string | null
          candidate_feedback: string | null
          candidate_id: string
          code: string
          completed_at: string | null
          created_at: string
          details: string | null
          due_date: string | null
          id: string
          last_activity_at: string
          lock_version: number
          name: string
          resource_link: string | null
          reviewer_id: string | null
          reviewer_remarks: string | null
          roadmap_id: string | null
          started_at: string | null
          status: string
          submission: string | null
          submission_link: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          assigned_date?: string
          cancel_reason?: string | null
          candidate_feedback?: string | null
          candidate_id: string
          code: string
          completed_at?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          last_activity_at?: string
          lock_version?: number
          name: string
          resource_link?: string | null
          reviewer_id?: string | null
          reviewer_remarks?: string | null
          roadmap_id?: string | null
          started_at?: string | null
          status?: string
          submission?: string | null
          submission_link?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          assigned_date?: string
          cancel_reason?: string | null
          candidate_feedback?: string | null
          candidate_id?: string
          code?: string
          completed_at?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          last_activity_at?: string
          lock_version?: number
          name?: string
          resource_link?: string | null
          reviewer_id?: string | null
          reviewer_remarks?: string | null
          roadmap_id?: string | null
          started_at?: string | null
          status?: string
          submission?: string | null
          submission_link?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_premium_tasks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_premium_tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_premium_tasks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
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
      candidate_projects: {
        Row: {
          actual_start_date: string | null
          cancel_reason: string | null
          candidate_feedback: string | null
          candidate_id: string
          code: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deliverables: string | null
          description: string | null
          github_url: string | null
          id: string
          last_activity_at: string
          live_url: string | null
          lock_version: number
          name: string
          objectives: string | null
          planned_due_date: string | null
          planned_start_date: string | null
          project_type: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_remarks: string | null
          roadmap_id: string | null
          scenario: string | null
          source_pcb_code: string | null
          source_pcb_project_id: string | null
          source_pcb_version: number | null
          source_pcb_version_id: string | null
          status: string
          submission_notes: string | null
          submitted_at: string | null
          technologies: string | null
          updated_at: string
        }
        Insert: {
          actual_start_date?: string | null
          cancel_reason?: string | null
          candidate_feedback?: string | null
          candidate_id: string
          code: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deliverables?: string | null
          description?: string | null
          github_url?: string | null
          id?: string
          last_activity_at?: string
          live_url?: string | null
          lock_version?: number
          name: string
          objectives?: string | null
          planned_due_date?: string | null
          planned_start_date?: string | null
          project_type?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_remarks?: string | null
          roadmap_id?: string | null
          scenario?: string | null
          source_pcb_code?: string | null
          source_pcb_project_id?: string | null
          source_pcb_version?: number | null
          source_pcb_version_id?: string | null
          status?: string
          submission_notes?: string | null
          submitted_at?: string | null
          technologies?: string | null
          updated_at?: string
        }
        Update: {
          actual_start_date?: string | null
          cancel_reason?: string | null
          candidate_feedback?: string | null
          candidate_id?: string
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deliverables?: string | null
          description?: string | null
          github_url?: string | null
          id?: string
          last_activity_at?: string
          live_url?: string | null
          lock_version?: number
          name?: string
          objectives?: string | null
          planned_due_date?: string | null
          planned_start_date?: string | null
          project_type?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_remarks?: string | null
          roadmap_id?: string | null
          scenario?: string | null
          source_pcb_code?: string | null
          source_pcb_project_id?: string | null
          source_pcb_version?: number | null
          source_pcb_version_id?: string | null
          status?: string
          submission_notes?: string | null
          submitted_at?: string | null
          technologies?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_projects_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_projects_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_projects_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_activity: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          event: string
          id: string
          metadata: Json
          roadmap_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          roadmap_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          roadmap_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_activity_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_item_status_history: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          from_status: string | null
          id: string
          is_candidate: boolean
          item_id: string
          roadmap_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          is_candidate?: boolean
          item_id: string
          roadmap_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          is_candidate?: boolean
          item_id?: string
          roadmap_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_item_status_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_item_status_history_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_items: {
        Row: {
          activity: string | null
          actual_minutes: number | null
          candidate_notes: string | null
          completed_at: string | null
          day_number: number
          description: string | null
          expected_output: string | null
          id: string
          learning_minutes: number | null
          lock_version: number
          module_id: string
          notes_updated_at: string | null
          objective: string | null
          phase_id: string
          planned_date: string | null
          practice_minutes: number | null
          roadmap_id: string
          sort_order: number
          source_pcb_day_item_id: string | null
          started_at: string | null
          status: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          activity?: string | null
          actual_minutes?: number | null
          candidate_notes?: string | null
          completed_at?: string | null
          day_number: number
          description?: string | null
          expected_output?: string | null
          id?: string
          learning_minutes?: number | null
          lock_version?: number
          module_id: string
          notes_updated_at?: string | null
          objective?: string | null
          phase_id: string
          planned_date?: string | null
          practice_minutes?: number | null
          roadmap_id: string
          sort_order?: number
          source_pcb_day_item_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          activity?: string | null
          actual_minutes?: number | null
          candidate_notes?: string | null
          completed_at?: string | null
          day_number?: number
          description?: string | null
          expected_output?: string | null
          id?: string
          learning_minutes?: number | null
          lock_version?: number
          module_id?: string
          notes_updated_at?: string | null
          objective?: string | null
          phase_id?: string
          planned_date?: string | null
          practice_minutes?: number | null
          roadmap_id?: string
          sort_order?: number
          source_pcb_day_item_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_items_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_modules: {
        Row: {
          id: string
          name: string
          objective: string | null
          phase_id: string
          roadmap_id: string
          sort_order: number
          source_pcb_module_id: string | null
        }
        Insert: {
          id?: string
          name: string
          objective?: string | null
          phase_id: string
          roadmap_id: string
          sort_order?: number
          source_pcb_module_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          objective?: string | null
          phase_id?: string
          roadmap_id?: string
          sort_order?: number
          source_pcb_module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_modules_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_modules_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_phases: {
        Row: {
          id: string
          name: string
          objective: string | null
          phase_number: number | null
          roadmap_id: string
          sort_order: number
          source_pcb_phase_id: string | null
        }
        Insert: {
          id?: string
          name: string
          objective?: string | null
          phase_number?: number | null
          roadmap_id: string
          sort_order?: number
          source_pcb_phase_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          objective?: string | null
          phase_number?: number | null
          roadmap_id?: string
          sort_order?: number
          source_pcb_phase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_phases_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_projects: {
        Row: {
          description: string | null
          end_day: number | null
          id: string
          name: string
          project_type: string | null
          roadmap_id: string
          sort_order: number
          source_pcb_project_id: string | null
          start_day: number | null
        }
        Insert: {
          description?: string | null
          end_day?: number | null
          id?: string
          name: string
          project_type?: string | null
          roadmap_id: string
          sort_order?: number
          source_pcb_project_id?: string | null
          start_day?: number | null
        }
        Update: {
          description?: string | null
          end_day?: number | null
          id?: string
          name?: string
          project_type?: string | null
          roadmap_id?: string
          sort_order?: number
          source_pcb_project_id?: string | null
          start_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_projects_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_remarks: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          item_id: string
          roadmap_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          item_id: string
          roadmap_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          item_id?: string
          roadmap_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_remarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_remarks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_resource_mappings: {
        Row: {
          id: string
          item_id: string | null
          module_id: string | null
          phase_id: string | null
          resource_id: string
          roadmap_id: string
        }
        Insert: {
          id?: string
          item_id?: string | null
          module_id?: string | null
          phase_id?: string | null
          resource_id: string
          roadmap_id: string
        }
        Update: {
          id?: string
          item_id?: string | null
          module_id?: string | null
          phase_id?: string | null
          resource_id?: string
          roadmap_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_resource_mappings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_resource_mappings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_resource_mappings_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_resource_mappings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmap_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmap_resource_mappings_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_resources: {
        Row: {
          course_name: string | null
          id: string
          is_paid: boolean
          name: string
          notes: string | null
          provider: string | null
          resource_type: string
          roadmap_id: string
          section: string | null
          sort_order: number
          source_pcb_resource_id: string | null
          url: string | null
        }
        Insert: {
          course_name?: string | null
          id?: string
          is_paid?: boolean
          name: string
          notes?: string | null
          provider?: string | null
          resource_type?: string
          roadmap_id: string
          section?: string | null
          sort_order?: number
          source_pcb_resource_id?: string | null
          url?: string | null
        }
        Update: {
          course_name?: string | null
          id?: string
          is_paid?: boolean
          name?: string
          notes?: string | null
          provider?: string | null
          resource_type?: string
          roadmap_id?: string
          section?: string | null
          sort_order?: number
          source_pcb_resource_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_resources_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmap_status_history: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          roadmap_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          roadmap_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          roadmap_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmap_status_history_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_roadmaps: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          candidate_id: string
          career_path: string | null
          code: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          daily_hours: number | null
          duration_days: number
          id: string
          last_activity_at: string
          lock_version: number
          pause_reason: string | null
          paused_at: string | null
          paused_by: string | null
          pcb_code: string
          pcb_id: string
          pcb_version: number
          pcb_version_id: string
          resumed_at: string | null
          resumed_by: string | null
          start_date: string
          started_at: string | null
          started_by: string | null
          status: string
          target_end_date: string
          target_role: string | null
          updated_at: string
          weekly_days: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          candidate_id: string
          career_path?: string | null
          code: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          daily_hours?: number | null
          duration_days: number
          id?: string
          last_activity_at?: string
          lock_version?: number
          pause_reason?: string | null
          paused_at?: string | null
          paused_by?: string | null
          pcb_code: string
          pcb_id: string
          pcb_version: number
          pcb_version_id: string
          resumed_at?: string | null
          resumed_by?: string | null
          start_date: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          target_end_date: string
          target_role?: string | null
          updated_at?: string
          weekly_days?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          candidate_id?: string
          career_path?: string | null
          code?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          daily_hours?: number | null
          duration_days?: number
          id?: string
          last_activity_at?: string
          lock_version?: number
          pause_reason?: string | null
          paused_at?: string | null
          paused_by?: string | null
          pcb_code?: string
          pcb_id?: string
          pcb_version?: number
          pcb_version_id?: string
          resumed_at?: string | null
          resumed_by?: string | null
          start_date?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          target_end_date?: string
          target_role?: string | null
          updated_at?: string
          weekly_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_roadmaps_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmaps_pcb_id_fkey"
            columns: ["pcb_id"]
            isOneToOne: false
            referencedRelation: "candidate_pcbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_roadmaps_pcb_version_id_fkey"
            columns: ["pcb_version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
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
      candidate_weekly_review_items: {
        Row: {
          answer: boolean | null
          candidate_id: string
          id: string
          label: string
          review_id: string
          sort_order: number
        }
        Insert: {
          answer?: boolean | null
          candidate_id: string
          id?: string
          label: string
          review_id: string
          sort_order?: number
        }
        Update: {
          answer?: boolean | null
          candidate_id?: string
          id?: string
          label?: string
          review_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_weekly_review_items_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_weekly_review_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "candidate_weekly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_weekly_reviews: {
        Row: {
          actual_date: string | null
          cancel_reason: string | null
          candidate_feedback: string | null
          candidate_id: string
          clarification_topics: string | null
          code: string
          completed_at: string | null
          completed_by: string | null
          consultant_remarks: string | null
          corrected_at: string | null
          corrected_by: string | null
          correction_reason: string | null
          created_at: string
          created_by: string | null
          id: string
          improvement_areas: string | null
          key_progress: string | null
          last_activity_at: string
          lock_version: number
          missed_at: string | null
          missed_by: string | null
          missed_reason: string | null
          next_week_plan: string | null
          period_end: string | null
          period_start: string | null
          result: string | null
          review_number: number
          reviewer_id: string | null
          roadblocks: string | null
          roadmap_id: string | null
          scheduled_date: string
          snap_completed: number | null
          snap_health: string | null
          snap_in_progress: number | null
          snap_overdue: number | null
          snap_pending: number | null
          snap_progress: number | null
          source_pcb_code: string | null
          source_pcb_version: number | null
          source_pcb_version_id: string | null
          source_review_template_id: string | null
          started_at: string | null
          status: string
          strengths: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          actual_date?: string | null
          cancel_reason?: string | null
          candidate_feedback?: string | null
          candidate_id: string
          clarification_topics?: string | null
          code: string
          completed_at?: string | null
          completed_by?: string | null
          consultant_remarks?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          improvement_areas?: string | null
          key_progress?: string | null
          last_activity_at?: string
          lock_version?: number
          missed_at?: string | null
          missed_by?: string | null
          missed_reason?: string | null
          next_week_plan?: string | null
          period_end?: string | null
          period_start?: string | null
          result?: string | null
          review_number: number
          reviewer_id?: string | null
          roadblocks?: string | null
          roadmap_id?: string | null
          scheduled_date: string
          snap_completed?: number | null
          snap_health?: string | null
          snap_in_progress?: number | null
          snap_overdue?: number | null
          snap_pending?: number | null
          snap_progress?: number | null
          source_pcb_code?: string | null
          source_pcb_version?: number | null
          source_pcb_version_id?: string | null
          source_review_template_id?: string | null
          started_at?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          actual_date?: string | null
          cancel_reason?: string | null
          candidate_feedback?: string | null
          candidate_id?: string
          clarification_topics?: string | null
          code?: string
          completed_at?: string | null
          completed_by?: string | null
          consultant_remarks?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          improvement_areas?: string | null
          key_progress?: string | null
          last_activity_at?: string
          lock_version?: number
          missed_at?: string | null
          missed_by?: string | null
          missed_reason?: string | null
          next_week_plan?: string | null
          period_end?: string | null
          period_start?: string | null
          result?: string | null
          review_number?: number
          reviewer_id?: string | null
          roadblocks?: string | null
          roadmap_id?: string | null
          scheduled_date?: string
          snap_completed?: number | null
          snap_health?: string | null
          snap_in_progress?: number | null
          snap_overdue?: number | null
          snap_pending?: number | null
          snap_progress?: number | null
          source_pcb_code?: string | null
          source_pcb_version?: number | null
          source_pcb_version_id?: string | null
          source_review_template_id?: string | null
          started_at?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_weekly_reviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_weekly_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_weekly_reviews_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "candidate_roadmaps"
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
      global_pcb_content: {
        Row: {
          code: string
          content: string | null
          content_type: string
          created_at: string
          id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      global_pcb_content_versions: {
        Row: {
          content: string | null
          content_id: string
          content_type: string | null
          created_at: string
          created_by: string | null
          id: string
          status: string | null
          title: string
          version: number
        }
        Insert: {
          content?: string | null
          content_id: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string | null
          title: string
          version: number
        }
        Update: {
          content?: string | null
          content_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_pcb_content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "global_pcb_content"
            referencedColumns: ["id"]
          },
        ]
      }
      master_track_versions: {
        Row: {
          alt_roles: string | null
          category: string
          change_summary: string | null
          created_at: string
          created_by: string | null
          created_from_version: string | null
          daily_hours: number | null
          description: string | null
          duration_days: number
          effective_date: string | null
          experience_level: string | null
          id: string
          name: string
          prereq_communication: string | null
          prereq_daily_time: string | null
          prereq_education: string | null
          prereq_infrastructure: string | null
          prereq_knowledge: string | null
          prereq_logical: string | null
          prereq_other: string | null
          primary_role: string | null
          short_name: string | null
          status: string
          track_id: string
          updated_at: string
          updated_by: string | null
          version: string
          weekly_days: number | null
        }
        Insert: {
          alt_roles?: string | null
          category?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          created_from_version?: string | null
          daily_hours?: number | null
          description?: string | null
          duration_days?: number
          effective_date?: string | null
          experience_level?: string | null
          id?: string
          name: string
          prereq_communication?: string | null
          prereq_daily_time?: string | null
          prereq_education?: string | null
          prereq_infrastructure?: string | null
          prereq_knowledge?: string | null
          prereq_logical?: string | null
          prereq_other?: string | null
          primary_role?: string | null
          short_name?: string | null
          status?: string
          track_id: string
          updated_at?: string
          updated_by?: string | null
          version: string
          weekly_days?: number | null
        }
        Update: {
          alt_roles?: string | null
          category?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          created_from_version?: string | null
          daily_hours?: number | null
          description?: string | null
          duration_days?: number
          effective_date?: string | null
          experience_level?: string | null
          id?: string
          name?: string
          prereq_communication?: string | null
          prereq_daily_time?: string | null
          prereq_education?: string | null
          prereq_infrastructure?: string | null
          prereq_knowledge?: string | null
          prereq_logical?: string | null
          prereq_other?: string | null
          primary_role?: string | null
          short_name?: string | null
          status?: string
          track_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          weekly_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_track_versions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "master_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tracks: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_tracks_current_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_content_blocks: {
        Row: {
          block_type: string
          code: string | null
          content: string | null
          copied_at: string | null
          id: string
          is_controlled: boolean
          is_included: boolean
          is_locked: boolean
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          title: string
          version_id: string
        }
        Insert: {
          block_type?: string
          code?: string | null
          content?: string | null
          copied_at?: string | null
          id?: string
          is_controlled?: boolean
          is_included?: boolean
          is_locked?: boolean
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title: string
          version_id: string
        }
        Update: {
          block_type?: string
          code?: string | null
          content?: string | null
          copied_at?: string | null
          id?: string
          is_controlled?: boolean
          is_included?: boolean
          is_locked?: boolean
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_content_blocks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_day_items: {
        Row: {
          activity: string | null
          copied_at: string | null
          day_number: number | null
          description: string | null
          expected_output: string | null
          id: string
          learning_minutes: number | null
          module_id: string
          notes: string | null
          objective: string | null
          practice_minutes: number | null
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          title: string
          topic: string | null
          version_id: string
        }
        Insert: {
          activity?: string | null
          copied_at?: string | null
          day_number?: number | null
          description?: string | null
          expected_output?: string | null
          id?: string
          learning_minutes?: number | null
          module_id: string
          notes?: string | null
          objective?: string | null
          practice_minutes?: number | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title: string
          topic?: string | null
          version_id: string
        }
        Update: {
          activity?: string | null
          copied_at?: string | null
          day_number?: number | null
          description?: string | null
          expected_output?: string | null
          id?: string
          learning_minutes?: number | null
          module_id?: string
          notes?: string | null
          objective?: string | null
          practice_minutes?: number | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title?: string
          topic?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_day_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "pcb_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_day_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_documents: {
        Row: {
          checksum: string | null
          file_name: string
          generated_at: string
          generated_by: string | null
          id: string
          size_bytes: number | null
          storage_path: string
          version_id: string
        }
        Insert: {
          checksum?: string | null
          file_name: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          size_bytes?: number | null
          storage_path: string
          version_id: string
        }
        Update: {
          checksum?: string | null
          file_name?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          size_bytes?: number | null
          storage_path?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_documents_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_milestones: {
        Row: {
          copied_at: string | null
          description: string | null
          evidence: string | null
          id: string
          name: string
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          target_day: number | null
          version_id: string
        }
        Insert: {
          copied_at?: string | null
          description?: string | null
          evidence?: string | null
          id?: string
          name: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          target_day?: number | null
          version_id: string
        }
        Update: {
          copied_at?: string | null
          description?: string | null
          evidence?: string | null
          id?: string
          name?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          target_day?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_milestones_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_modules: {
        Row: {
          copied_at: string | null
          description: string | null
          id: string
          name: string
          objective: string | null
          phase_id: string
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          suggested_duration: string | null
          version_id: string
        }
        Insert: {
          copied_at?: string | null
          description?: string | null
          id?: string
          name: string
          objective?: string | null
          phase_id: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          suggested_duration?: string | null
          version_id: string
        }
        Update: {
          copied_at?: string | null
          description?: string | null
          id?: string
          name?: string
          objective?: string | null
          phase_id?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          suggested_duration?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_modules_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "pcb_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_modules_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_phases: {
        Row: {
          copied_at: string | null
          end_day: number | null
          id: string
          name: string
          objective: string | null
          phase_number: number | null
          short_description: string | null
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          start_day: number | null
          version_id: string
        }
        Insert: {
          copied_at?: string | null
          end_day?: number | null
          id?: string
          name: string
          objective?: string | null
          phase_number?: number | null
          short_description?: string | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          start_day?: number | null
          version_id: string
        }
        Update: {
          copied_at?: string | null
          end_day?: number | null
          id?: string
          name?: string
          objective?: string | null
          phase_number?: number | null
          short_description?: string | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          start_day?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_phases_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_projects: {
        Row: {
          copied_at: string | null
          deliverables: string | null
          description: string | null
          difficulty: string | null
          end_day: number | null
          features: string | null
          id: string
          name: string
          project_type: string
          scenario: string | null
          selection_reason: string | null
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          start_day: number | null
          technologies: string | null
          version_id: string
        }
        Insert: {
          copied_at?: string | null
          deliverables?: string | null
          description?: string | null
          difficulty?: string | null
          end_day?: number | null
          features?: string | null
          id?: string
          name: string
          project_type?: string
          scenario?: string | null
          selection_reason?: string | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          start_day?: number | null
          technologies?: string | null
          version_id: string
        }
        Update: {
          copied_at?: string | null
          deliverables?: string | null
          description?: string | null
          difficulty?: string | null
          end_day?: number | null
          features?: string | null
          id?: string
          name?: string
          project_type?: string
          scenario?: string | null
          selection_reason?: string | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          start_day?: number | null
          technologies?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_projects_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_resource_mappings: {
        Row: {
          day_item_id: string | null
          id: string
          module_id: string | null
          phase_id: string | null
          resource_id: string
          sort_order: number
          version_id: string
        }
        Insert: {
          day_item_id?: string | null
          id?: string
          module_id?: string | null
          phase_id?: string | null
          resource_id: string
          sort_order?: number
          version_id: string
        }
        Update: {
          day_item_id?: string | null
          id?: string
          module_id?: string | null
          phase_id?: string | null
          resource_id?: string
          sort_order?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_resource_mappings_day_item_id_fkey"
            columns: ["day_item_id"]
            isOneToOne: false
            referencedRelation: "pcb_day_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_resource_mappings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "pcb_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_resource_mappings_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "pcb_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_resource_mappings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "pcb_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_resource_mappings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_resources: {
        Row: {
          copied_at: string | null
          course_name: string | null
          end_ref: string | null
          estimated_cost: number | null
          id: string
          is_paid: boolean
          name: string
          notes: string | null
          provider: string | null
          resource_type: string
          section: string | null
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          start_ref: string | null
          url: string | null
          version_id: string
        }
        Insert: {
          copied_at?: string | null
          course_name?: string | null
          end_ref?: string | null
          estimated_cost?: number | null
          id?: string
          is_paid?: boolean
          name: string
          notes?: string | null
          provider?: string | null
          resource_type?: string
          section?: string | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          start_ref?: string | null
          url?: string | null
          version_id: string
        }
        Update: {
          copied_at?: string | null
          course_name?: string | null
          end_ref?: string | null
          estimated_cost?: number | null
          id?: string
          is_paid?: boolean
          name?: string
          notes?: string | null
          provider?: string | null
          resource_type?: string
          section?: string | null
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          start_ref?: string | null
          url?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_resources_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_review_notes: {
        Row: {
          author_id: string | null
          author_name: string | null
          comment: string
          created_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          section: string
          status: string
          version_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          comment: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section?: string
          status?: string
          version_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          comment?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section?: string
          status?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_review_notes_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_skill_gaps: {
        Row: {
          action: string | null
          copied_at: string | null
          current_level: string | null
          description: string | null
          id: string
          priority: string
          skill: string
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          target_level: string | null
          version_id: string
        }
        Insert: {
          action?: string | null
          copied_at?: string | null
          current_level?: string | null
          description?: string | null
          id?: string
          priority?: string
          skill: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          target_level?: string | null
          version_id: string
        }
        Update: {
          action?: string | null
          copied_at?: string | null
          current_level?: string | null
          description?: string | null
          id?: string
          priority?: string
          skill?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          target_level?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_skill_gaps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_source_tracks: {
        Row: {
          copied_at: string
          id: string
          role: string
          sort_order: number
          track_code: string
          track_id: string | null
          track_name: string | null
          track_version: string
          track_version_id: string | null
          version_id: string
        }
        Insert: {
          copied_at?: string
          id?: string
          role?: string
          sort_order?: number
          track_code: string
          track_id?: string | null
          track_name?: string | null
          track_version: string
          track_version_id?: string | null
          version_id: string
        }
        Update: {
          copied_at?: string
          id?: string
          role?: string
          sort_order?: number
          track_code?: string
          track_id?: string | null
          track_name?: string | null
          track_version?: string
          track_version_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_source_tracks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_target_capabilities: {
        Row: {
          copied_at: string | null
          description: string | null
          evidence: string | null
          id: string
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          title: string
          version_id: string
        }
        Insert: {
          copied_at?: string | null
          description?: string | null
          evidence?: string | null
          id?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title: string
          version_id: string
        }
        Update: {
          copied_at?: string | null
          description?: string | null
          evidence?: string | null
          id?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_target_capabilities_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_version_internal: {
        Row: {
          internal_notes: string | null
          override_reason: string | null
          updated_at: string
          version_id: string
        }
        Insert: {
          internal_notes?: string | null
          override_reason?: string | null
          updated_at?: string
          version_id: string
        }
        Update: {
          internal_notes?: string | null
          override_reason?: string | null
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_version_internal_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: true
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_versions: {
        Row: {
          alt_career_path: string | null
          alt_target_role: string | null
          approval_remarks: string | null
          approved_at: string | null
          approved_by: string | null
          assessment_code: string | null
          assessment_id: string | null
          assessment_override: boolean
          assessment_snapshot: Json
          base_track_code: string | null
          base_track_id: string | null
          base_track_name: string | null
          base_track_version: string | null
          base_track_version_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          change_reason: string | null
          created_at: string
          created_by: string | null
          created_from_version: number | null
          current_profile_summary: string | null
          daily_hours: number | null
          duration_ack: boolean
          expected_outcome: string | null
          id: string
          lock_version: number
          pcb_id: string
          preferred_location: string | null
          primary_career_path: string | null
          primary_target_role: string | null
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          target_completion_window: string | null
          target_duration_days: number
          target_industry: string | null
          transition_goal: string | null
          updated_at: string
          updated_by: string | null
          version: number
          weekly_days: number | null
        }
        Insert: {
          alt_career_path?: string | null
          alt_target_role?: string | null
          approval_remarks?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_code?: string | null
          assessment_id?: string | null
          assessment_override?: boolean
          assessment_snapshot?: Json
          base_track_code?: string | null
          base_track_id?: string | null
          base_track_name?: string | null
          base_track_version?: string | null
          base_track_version_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          created_from_version?: number | null
          current_profile_summary?: string | null
          daily_hours?: number | null
          duration_ack?: boolean
          expected_outcome?: string | null
          id?: string
          lock_version?: number
          pcb_id: string
          preferred_location?: string | null
          primary_career_path?: string | null
          primary_target_role?: string | null
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          target_completion_window?: string | null
          target_duration_days?: number
          target_industry?: string | null
          transition_goal?: string | null
          updated_at?: string
          updated_by?: string | null
          version: number
          weekly_days?: number | null
        }
        Update: {
          alt_career_path?: string | null
          alt_target_role?: string | null
          approval_remarks?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_code?: string | null
          assessment_id?: string | null
          assessment_override?: boolean
          assessment_snapshot?: Json
          base_track_code?: string | null
          base_track_id?: string | null
          base_track_name?: string | null
          base_track_version?: string | null
          base_track_version_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          created_from_version?: number | null
          current_profile_summary?: string | null
          daily_hours?: number | null
          duration_ack?: boolean
          expected_outcome?: string | null
          id?: string
          lock_version?: number
          pcb_id?: string
          preferred_location?: string | null
          primary_career_path?: string | null
          primary_target_role?: string | null
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          target_completion_window?: string | null
          target_duration_days?: number
          target_industry?: string | null
          transition_goal?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          weekly_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pcb_versions_pcb_id_fkey"
            columns: ["pcb_id"]
            isOneToOne: false
            referencedRelation: "candidate_pcbs"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_weekly_review_items: {
        Row: {
          id: string
          item: string
          sort_order: number
          version_id: string
          weekly_review_id: string
        }
        Insert: {
          id?: string
          item: string
          sort_order?: number
          version_id: string
          weekly_review_id: string
        }
        Update: {
          id?: string
          item?: string
          sort_order?: number
          version_id?: string
          weekly_review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcb_weekly_review_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcb_weekly_review_items_weekly_review_id_fkey"
            columns: ["weekly_review_id"]
            isOneToOne: false
            referencedRelation: "pcb_weekly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      pcb_weekly_reviews: {
        Row: {
          copied_at: string | null
          expected_progress: string | null
          guidance: string | null
          id: string
          sort_order: number
          source_entity_id: string | null
          source_track_code: string | null
          source_track_version: string | null
          source_type: string
          title: string
          version_id: string
          week_number: number | null
        }
        Insert: {
          copied_at?: string | null
          expected_progress?: string | null
          guidance?: string | null
          id?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title: string
          version_id: string
          week_number?: number | null
        }
        Update: {
          copied_at?: string | null
          expected_progress?: string | null
          guidance?: string | null
          id?: string
          sort_order?: number
          source_entity_id?: string | null
          source_track_code?: string | null
          source_track_version?: string | null
          source_type?: string
          title?: string
          version_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pcb_weekly_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "pcb_versions"
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
      track_content_blocks: {
        Row: {
          block_type: string
          content: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          version_id: string
        }
        Insert: {
          block_type?: string
          content?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          version_id: string
        }
        Update: {
          block_type?: string
          content?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_content_blocks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_milestones: {
        Row: {
          description: string | null
          evidence: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          target_day: number | null
          version_id: string
        }
        Insert: {
          description?: string | null
          evidence?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          target_day?: number | null
          version_id: string
        }
        Update: {
          description?: string | null
          evidence?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          target_day?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_milestones_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_modules: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          name: string
          objective: string | null
          phase_id: string
          sort_order: number
          suggested_duration: string | null
          version_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          objective?: string | null
          phase_id: string
          sort_order?: number
          suggested_duration?: string | null
          version_id: string
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          objective?: string | null
          phase_id?: string
          sort_order?: number
          suggested_duration?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_modules_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "track_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_modules_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_outcomes: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          version_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          version_id: string
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_outcomes_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_phases: {
        Row: {
          end_day: number | null
          id: string
          is_active: boolean
          name: string
          objective: string | null
          phase_number: number | null
          short_description: string | null
          sort_order: number
          start_day: number | null
          version_id: string
        }
        Insert: {
          end_day?: number | null
          id?: string
          is_active?: boolean
          name: string
          objective?: string | null
          phase_number?: number | null
          short_description?: string | null
          sort_order?: number
          start_day?: number | null
          version_id: string
        }
        Update: {
          end_day?: number | null
          id?: string
          is_active?: boolean
          name?: string
          objective?: string | null
          phase_number?: number | null
          short_description?: string | null
          sort_order?: number
          start_day?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_phases_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_project_templates: {
        Row: {
          deliverables: string | null
          description: string | null
          difficulty: string | null
          end_day: number | null
          features: string | null
          id: string
          is_active: boolean
          name: string
          project_type: string
          scenario: string | null
          sort_order: number
          start_day: number | null
          technologies: string | null
          version_id: string
        }
        Insert: {
          deliverables?: string | null
          description?: string | null
          difficulty?: string | null
          end_day?: number | null
          features?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_type?: string
          scenario?: string | null
          sort_order?: number
          start_day?: number | null
          technologies?: string | null
          version_id: string
        }
        Update: {
          deliverables?: string | null
          description?: string | null
          difficulty?: string | null
          end_day?: number | null
          features?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_type?: string
          scenario?: string | null
          sort_order?: number
          start_day?: number | null
          technologies?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_project_templates_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_resource_mappings: {
        Row: {
          id: string
          is_active: boolean
          module_id: string | null
          phase_id: string | null
          resource_id: string
          roadmap_item_id: string | null
          sort_order: number
          version_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          module_id?: string | null
          phase_id?: string | null
          resource_id: string
          roadmap_item_id?: string | null
          sort_order?: number
          version_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          module_id?: string | null
          phase_id?: string | null
          resource_id?: string
          roadmap_item_id?: string | null
          sort_order?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_resource_mappings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "track_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_resource_mappings_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "track_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_resource_mappings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "track_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_resource_mappings_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "track_roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_resource_mappings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_resources: {
        Row: {
          course_name: string | null
          end_ref: string | null
          estimated_cost: number | null
          id: string
          is_active: boolean
          is_paid: boolean
          name: string
          notes: string | null
          provider: string | null
          resource_type: string
          section: string | null
          sort_order: number
          start_ref: string | null
          url: string | null
          version_id: string
        }
        Insert: {
          course_name?: string | null
          end_ref?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name: string
          notes?: string | null
          provider?: string | null
          resource_type?: string
          section?: string | null
          sort_order?: number
          start_ref?: string | null
          url?: string | null
          version_id: string
        }
        Update: {
          course_name?: string | null
          end_ref?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name?: string
          notes?: string | null
          provider?: string | null
          resource_type?: string
          section?: string | null
          sort_order?: number
          start_ref?: string | null
          url?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_resources_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_roadmap_items: {
        Row: {
          activity: string | null
          day_number: number | null
          description: string | null
          expected_output: string | null
          id: string
          is_active: boolean
          learning_minutes: number | null
          module_id: string
          notes: string | null
          objective: string | null
          practice_minutes: number | null
          resource_refs: string | null
          sort_order: number
          title: string
          topic: string | null
          version_id: string
        }
        Insert: {
          activity?: string | null
          day_number?: number | null
          description?: string | null
          expected_output?: string | null
          id?: string
          is_active?: boolean
          learning_minutes?: number | null
          module_id: string
          notes?: string | null
          objective?: string | null
          practice_minutes?: number | null
          resource_refs?: string | null
          sort_order?: number
          title: string
          topic?: string | null
          version_id: string
        }
        Update: {
          activity?: string | null
          day_number?: number | null
          description?: string | null
          expected_output?: string | null
          id?: string
          is_active?: boolean
          learning_minutes?: number | null
          module_id?: string
          notes?: string | null
          objective?: string | null
          practice_minutes?: number | null
          resource_refs?: string | null
          sort_order?: number
          title?: string
          topic?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_roadmap_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "track_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_roadmap_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_weekly_review_items: {
        Row: {
          id: string
          is_active: boolean
          item: string
          sort_order: number
          version_id: string
          weekly_review_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          item: string
          sort_order?: number
          version_id: string
          weekly_review_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          item?: string
          sort_order?: number
          version_id?: string
          weekly_review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_weekly_review_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_weekly_review_items_weekly_review_id_fkey"
            columns: ["weekly_review_id"]
            isOneToOne: false
            referencedRelation: "track_weekly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      track_weekly_reviews: {
        Row: {
          expected_progress: string | null
          guidance: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          version_id: string
          week_number: number | null
        }
        Insert: {
          expected_progress?: string | null
          guidance?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          version_id: string
          week_number?: number | null
        }
        Update: {
          expected_progress?: string | null
          guidance?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          version_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "track_weekly_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "master_track_versions"
            referencedColumns: ["id"]
          },
        ]
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
      assessment_add_document: {
        Args: {
          _file: string
          _id: string
          _mime: string
          _name: string
          _path: string
          _remarks: string
          _size: number
          _type: string
        }
        Returns: string
      }
      assessment_assert: {
        Args: { _cid: string; _perm: string }
        Returns: undefined
      }
      assessment_create: { Args: { _cid: string }; Returns: string }
      assessment_log: {
        Args: { _aid: string; _cid: string; _event: string }
        Returns: undefined
      }
      assessment_save: {
        Args: {
          _children: Json
          _header: Json
          _id: string
          _internal?: string
        }
        Returns: undefined
      }
      assessment_set_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      can_read_assessment: { Args: { _aid: string }; Returns: boolean }
      can_read_candidate: { Args: { _id: string }; Returns: boolean }
      can_read_candidate_assessments: {
        Args: { _cid: string }
        Returns: boolean
      }
      can_read_execution: {
        Args: { _cid: string; _kind: string }
        Returns: boolean
      }
      can_read_pcb_candidate: { Args: { _cid: string }; Returns: boolean }
      can_read_pcb_version: { Args: { _vid: string }; Returns: boolean }
      can_read_roadmap: { Args: { _rid: string }; Returns: boolean }
      can_read_roadmap_candidate: { Args: { _cid: string }; Returns: boolean }
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
      execution_next_seq: {
        Args: { _cid: string; _kind: string }
        Returns: number
      }
      has_permission: { Args: { _key: string; _uid: string }; Returns: boolean }
      is_active_user: { Args: { _uid: string }; Returns: boolean }
      pcb_copy_children: {
        Args: { _dst: string; _src: string }
        Returns: undefined
      }
      pcb_portal_summary: { Args: never; Returns: Json }
      record_login: { Args: never; Returns: undefined }
      roadmap_my_candidate: { Args: never; Returns: string }
      track_copy_version: {
        Args: {
          _actor: string
          _from: string
          _src: string
          _summary: string
          _track: string
          _version: string
        }
        Returns: string
      }
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
