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
      appointments: {
        Row: {
          appointment_type: string | null
          created_at: string | null
          description: string | null
          dossier_id: string | null
          end_time: string
          google_calendar_id: string | null
          id: string
          start_time: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
          workflow_step_id: string | null
          world_id: string | null
        }
        Insert: {
          appointment_type?: string | null
          created_at?: string | null
          description?: string | null
          dossier_id?: string | null
          end_time: string
          google_calendar_id?: string | null
          id?: string
          start_time: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
          workflow_step_id?: string | null
          world_id?: string | null
        }
        Update: {
          appointment_type?: string | null
          created_at?: string | null
          description?: string | null
          dossier_id?: string | null
          end_time?: string
          google_calendar_id?: string | null
          id?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          workflow_step_id?: string | null
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          target: string
          user_id: string | null
          world_code: Database["public"]["Enums"]["world_code"] | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target: string
          user_id?: string | null
          world_code?: Database["public"]["Enums"]["world_code"] | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target?: string
          user_id?: string | null
          world_code?: Database["public"]["Enums"]["world_code"] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          auto_generate: boolean | null
          created_at: string | null
          document_type: string
          id: string
          metadata: Json | null
          name: string
          needs_signature: boolean | null
          required_fields: Json | null
          template_content: Json
          updated_at: string | null
          workflow_step_id: string
        }
        Insert: {
          auto_generate?: boolean | null
          created_at?: string | null
          document_type: string
          id?: string
          metadata?: Json | null
          name: string
          needs_signature?: boolean | null
          required_fields?: Json | null
          template_content: Json
          updated_at?: string | null
          workflow_step_id: string
        }
        Update: {
          auto_generate?: boolean | null
          created_at?: string | null
          document_type?: string
          id?: string
          metadata?: Json | null
          name?: string
          needs_signature?: boolean | null
          required_fields?: Json | null
          template_content?: Json
          updated_at?: string | null
          workflow_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_attachments: {
        Row: {
          created_at: string | null
          document_type: string | null
          dossier_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          is_generated: boolean | null
          metadata: Json | null
          storage_path: string
          uploaded_by: string
          workflow_step_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          dossier_id: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          is_generated?: boolean | null
          metadata?: Json | null
          storage_path: string
          uploaded_by: string
          workflow_step_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          dossier_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          is_generated?: boolean | null
          metadata?: Json | null
          storage_path?: string
          uploaded_by?: string
          workflow_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_attachments_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_attachments_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_client_info: {
        Row: {
          adresse_sinistre: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          compagnie_assurance: string | null
          created_at: string | null
          date_sinistre: string | null
          dossier_id: string
          email: string | null
          id: string
          metadata: Json | null
          nom: string | null
          numero_police: string | null
          prenom: string | null
          telephone: string | null
          type_sinistre: string | null
          updated_at: string | null
        }
        Insert: {
          adresse_sinistre?: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          compagnie_assurance?: string | null
          created_at?: string | null
          date_sinistre?: string | null
          dossier_id: string
          email?: string | null
          id?: string
          metadata?: Json | null
          nom?: string | null
          numero_police?: string | null
          prenom?: string | null
          telephone?: string | null
          type_sinistre?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse_sinistre?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          compagnie_assurance?: string | null
          created_at?: string | null
          date_sinistre?: string | null
          dossier_id?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          nom?: string | null
          numero_police?: string | null
          prenom?: string | null
          telephone?: string | null
          type_sinistre?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_client_info_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_comments: {
        Row: {
          comment_type: Database["public"]["Enums"]["dossier_comment_type"]
          content: string
          created_at: string | null
          dossier_id: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          comment_type?: Database["public"]["Enums"]["dossier_comment_type"]
          content: string
          created_at?: string | null
          dossier_id: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          comment_type?: Database["public"]["Enums"]["dossier_comment_type"]
          content?: string
          created_at?: string | null
          dossier_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_comments_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_workflow_history: {
        Row: {
          created_at: string | null
          decision_reason: string | null
          decision_taken: string | null
          dossier_id: string
          id: string
          metadata: Json | null
          next_step_id: string | null
          previous_step_id: string | null
          user_id: string
          workflow_step_id: string
        }
        Insert: {
          created_at?: string | null
          decision_reason?: string | null
          decision_taken?: string | null
          dossier_id: string
          id?: string
          metadata?: Json | null
          next_step_id?: string | null
          previous_step_id?: string | null
          user_id: string
          workflow_step_id: string
        }
        Update: {
          created_at?: string | null
          decision_reason?: string | null
          decision_taken?: string | null
          dossier_id?: string
          id?: string
          metadata?: Json | null
          next_step_id?: string | null
          previous_step_id?: string | null
          user_id?: string
          workflow_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_workflow_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_workflow_history_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_workflow_history_previous_step_id_fkey"
            columns: ["previous_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_workflow_history_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_workflow_progress: {
        Row: {
          assigned_to: string | null
          blocked: boolean | null
          blocking_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          decision_taken: boolean | null
          dossier_id: string
          due_date: string | null
          form_data: Json | null
          id: string
          notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_progress_status"]
          updated_at: string | null
          workflow_step_id: string
        }
        Insert: {
          assigned_to?: string | null
          blocked?: boolean | null
          blocking_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          decision_taken?: boolean | null
          dossier_id: string
          due_date?: string | null
          form_data?: Json | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_progress_status"]
          updated_at?: string | null
          workflow_step_id: string
        }
        Update: {
          assigned_to?: string | null
          blocked?: boolean | null
          blocking_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          decision_taken?: boolean | null
          dossier_id?: string
          due_date?: string | null
          form_data?: Json | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_progress_status"]
          updated_at?: string | null
          workflow_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_workflow_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_workflow_progress_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_workflow_progress_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          status: Database["public"]["Enums"]["dossier_status"]
          tags: string[] | null
          title: string
          updated_at: string | null
          world_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id: string
          status?: Database["public"]["Enums"]["dossier_status"]
          tags?: string[] | null
          title: string
          updated_at?: string | null
          world_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["dossier_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          label: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          name?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string | null
          world_id: string
        }
        Insert: {
          assigned_to: string
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string | null
          world_id: string
        }
        Update: {
          assigned_to?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string | null
          world_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_world_access: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          world_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          world_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_world_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_world_access_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_world_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          user_id: string
          world_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          user_id: string
          world_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          user_id?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_world_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_world_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_world_permissions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          assigned_role: string | null
          auto_actions: Json | null
          can_loop_back: boolean | null
          conditions: Json | null
          created_at: string | null
          decision_no_next_step: number | null
          decision_no_next_step_id: string | null
          decision_yes_next_step: number | null
          decision_yes_next_step_id: string | null
          description: string | null
          estimated_duration: unknown
          form_fields: Json | null
          id: string
          is_optional: boolean | null
          is_required: boolean | null
          metadata: Json | null
          name: string
          next_step_id: string | null
          parallel_steps: Json | null
          requires_decision: boolean | null
          step_number: number
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          workflow_template_id: string
        }
        Insert: {
          assigned_role?: string | null
          auto_actions?: Json | null
          can_loop_back?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          decision_no_next_step?: number | null
          decision_no_next_step_id?: string | null
          decision_yes_next_step?: number | null
          decision_yes_next_step_id?: string | null
          description?: string | null
          estimated_duration?: unknown
          form_fields?: Json | null
          id?: string
          is_optional?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          name: string
          next_step_id?: string | null
          parallel_steps?: Json | null
          requires_decision?: boolean | null
          step_number: number
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          workflow_template_id: string
        }
        Update: {
          assigned_role?: string | null
          auto_actions?: Json | null
          can_loop_back?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          decision_no_next_step?: number | null
          decision_no_next_step_id?: string | null
          decision_yes_next_step?: number | null
          decision_yes_next_step_id?: string | null
          description?: string | null
          estimated_duration?: unknown
          form_fields?: Json | null
          id?: string
          is_optional?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          name?: string
          next_step_id?: string | null
          parallel_steps?: Json | null
          requires_decision?: boolean | null
          step_number?: number
          step_type?: Database["public"]["Enums"]["workflow_step_type"]
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_decision_no_next_step_id_fkey"
            columns: ["decision_no_next_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_decision_yes_next_step_id_fkey"
            columns: ["decision_yes_next_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          version: number
          world_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          version?: number
          world_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          version?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      world_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          world_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          world_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_permissions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      worlds: {
        Row: {
          code: Database["public"]["Enums"]["world_code"]
          created_at: string | null
          description: string | null
          id: string
          name: string
          theme_colors: Json
        }
        Insert: {
          code: Database["public"]["Enums"]["world_code"]
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          theme_colors: Json
        }
        Update: {
          code?: Database["public"]["Enums"]["world_code"]
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          theme_colors?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_workflow_step: {
        Args: { _decision?: boolean; _step_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_world_access: {
        Args: { _user_id: string; _world_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "editor" | "viewer"
      client_type:
        | "locataire"
        | "proprietaire"
        | "proprietaire_non_occupant"
        | "professionnel"
      dossier_comment_type:
        | "comment"
        | "status_change"
        | "step_completed"
        | "document_added"
        | "decision_made"
      dossier_status: "nouveau" | "en_cours" | "cloture"
      workflow_progress_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
        | "blocked"
      workflow_step_type:
        | "action"
        | "decision"
        | "document"
        | "meeting"
        | "notification"
      world_code: "JDE" | "JDMO" | "DBCS"
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
      app_role: ["superadmin", "admin", "editor", "viewer"],
      client_type: [
        "locataire",
        "proprietaire",
        "proprietaire_non_occupant",
        "professionnel",
      ],
      dossier_comment_type: [
        "comment",
        "status_change",
        "step_completed",
        "document_added",
        "decision_made",
      ],
      dossier_status: ["nouveau", "en_cours", "cloture"],
      workflow_progress_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
        "blocked",
      ],
      workflow_step_type: [
        "action",
        "decision",
        "document",
        "meeting",
        "notification",
      ],
      world_code: ["JDE", "JDMO", "DBCS"],
    },
  },
} as const
