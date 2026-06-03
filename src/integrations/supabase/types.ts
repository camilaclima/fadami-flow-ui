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
      access_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          permissions: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      activity_history: {
        Row: {
          activity_id: string
          changed_by: string | null
          changed_by_email: string
          changes: Json
          created_at: string
          id: string
        }
        Insert: {
          activity_id: string
          changed_by?: string | null
          changed_by_email?: string
          changes?: Json
          created_at?: string
          id?: string
        }
        Update: {
          activity_id?: string
          changed_by?: string | null
          changed_by_email?: string
          changes?: Json
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      backlog_phase_history: {
        Row: {
          backlog_id: string
          completed_at: string | null
          created_at: string
          entered_at: string
          id: string
          phase: string
        }
        Insert: {
          backlog_id: string
          completed_at?: string | null
          created_at?: string
          entered_at?: string
          id?: string
          phase: string
        }
        Update: {
          backlog_id?: string
          completed_at?: string | null
          created_at?: string
          entered_at?: string
          id?: string
          phase?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_phase_history_backlog_id_fkey"
            columns: ["backlog_id"]
            isOneToOne: false
            referencedRelation: "backlogs"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_sub_items: {
        Row: {
          attachment: string | null
          backlog_id: string
          code_block: string
          complexity: string
          created_at: string
          effort_area: string
          estimate: number
          functional_detail: string
          id: string
          implementation_notes: string
          sort_order: number
          technical_detail: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attachment?: string | null
          backlog_id: string
          code_block?: string
          complexity?: string
          created_at?: string
          effort_area?: string
          estimate?: number
          functional_detail?: string
          id?: string
          implementation_notes?: string
          sort_order?: number
          technical_detail?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attachment?: string | null
          backlog_id?: string
          code_block?: string
          complexity?: string
          created_at?: string
          effort_area?: string
          estimate?: number
          functional_detail?: string
          id?: string
          implementation_notes?: string
          sort_order?: number
          technical_detail?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_sub_items_backlog_id_fkey"
            columns: ["backlog_id"]
            isOneToOne: false
            referencedRelation: "backlogs"
            referencedColumns: ["id"]
          },
        ]
      }
      backlogs: {
        Row: {
          approval: Json | null
          attachment: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          phase: string
          prioritization: Json | null
          product_id: string | null
          refinement: Json | null
          thermometer: string
          title: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval?: Json | null
          attachment?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          phase?: string
          prioritization?: Json | null
          product_id?: string | null
          refinement?: Json | null
          thermometer?: string
          title: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval?: Json | null
          attachment?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          phase?: string
          prioritization?: Json | null
          product_id?: string | null
          refinement?: Json | null
          thermometer?: string
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlogs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlogs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          area: string
          client_id: string
          concession: string
          created_at: string
          description: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: string
          client_id: string
          concession?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string
          client_id?: string
          concession?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          contact_email: string
          contact_name: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          contact_email?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          contact_email?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coordinator_tasks: {
        Row: {
          activity_id: string | null
          ai_message: string
          category: string
          context_payload: Json | null
          created_at: string
          created_by: string | null
          daily_status_id: string | null
          deadline_date: string | null
          dedup_hash: string | null
          description: string
          id: string
          postponements: Json
          product_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          responsible_member_id: string | null
          source: string
          sprint_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          urgency: string
        }
        Insert: {
          activity_id?: string | null
          ai_message?: string
          category?: string
          context_payload?: Json | null
          created_at?: string
          created_by?: string | null
          daily_status_id?: string | null
          deadline_date?: string | null
          dedup_hash?: string | null
          description?: string
          id?: string
          postponements?: Json
          product_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responsible_member_id?: string | null
          source?: string
          sprint_id?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          urgency?: string
        }
        Update: {
          activity_id?: string | null
          ai_message?: string
          category?: string
          context_payload?: Json | null
          created_at?: string
          created_by?: string | null
          daily_status_id?: string | null
          deadline_date?: string | null
          dedup_hash?: string | null
          description?: string
          id?: string
          postponements?: Json
          product_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responsible_member_id?: string | null
          source?: string
          sprint_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          urgency?: string
        }
        Relationships: []
      }
      daily_bottleneck_resolutions: {
        Row: {
          created_at: string
          descricao_key: string
          id: string
          note: string | null
          product_id: string | null
          resolved_by: string | null
          resolved_by_email: string | null
          sprint_id: string | null
        }
        Insert: {
          created_at?: string
          descricao_key: string
          id?: string
          note?: string | null
          product_id?: string | null
          resolved_by?: string | null
          resolved_by_email?: string | null
          sprint_id?: string | null
        }
        Update: {
          created_at?: string
          descricao_key?: string
          id?: string
          note?: string | null
          product_id?: string | null
          resolved_by?: string | null
          resolved_by_email?: string | null
          sprint_id?: string | null
        }
        Relationships: []
      }
      daily_status: {
        Row: {
          ai_insights: Json | null
          blocker_level: number
          created_at: string
          created_by: string | null
          id: string
          present_member_ids: Json
          product_id: string | null
          sprint_id: string | null
          sprint_label: string
          status_date: string
          summary: string
          updated_at: string
        }
        Insert: {
          ai_insights?: Json | null
          blocker_level?: number
          created_at?: string
          created_by?: string | null
          id?: string
          present_member_ids?: Json
          product_id?: string | null
          sprint_id?: string | null
          sprint_label?: string
          status_date?: string
          summary?: string
          updated_at?: string
        }
        Update: {
          ai_insights?: Json | null
          blocker_level?: number
          created_at?: string
          created_by?: string | null
          id?: string
          present_member_ids?: Json
          product_id?: string | null
          sprint_id?: string | null
          sprint_label?: string
          status_date?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_change_logs: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          target_email: string
          target_user_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          target_email: string
          target_user_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          target_email?: string
          target_user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profile_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_groups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          first_access: boolean
          first_name: string
          group_id: string | null
          id: string
          last_name: string
          product_id: string | null
          role_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          first_access?: boolean
          first_name?: string
          group_id?: string | null
          id?: string
          last_name?: string
          product_id?: string | null
          role_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          first_access?: boolean
          first_name?: string
          group_id?: string | null
          id?: string
          last_name?: string
          product_id?: string | null
          role_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_backlog_items: {
        Row: {
          approved: boolean
          category: string
          created_at: string
          deadline: string
          deadline_date: string | null
          dependency_id: string | null
          description: string
          id: string
          impact: string
          likely_owner: string
          parent_id: string | null
          product_id: string
          project_context_id: string | null
          responsible_id: string | null
          responsible_ids: string[]
          risk_mitigation: string
          sort_order: number
          sprint_id: string | null
          status: string
          task: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved?: boolean
          category?: string
          created_at?: string
          deadline?: string
          deadline_date?: string | null
          dependency_id?: string | null
          description?: string
          id?: string
          impact?: string
          likely_owner?: string
          parent_id?: string | null
          product_id: string
          project_context_id?: string | null
          responsible_id?: string | null
          responsible_ids?: string[]
          risk_mitigation?: string
          sort_order?: number
          sprint_id?: string | null
          status?: string
          task: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved?: boolean
          category?: string
          created_at?: string
          deadline?: string
          deadline_date?: string | null
          dependency_id?: string | null
          description?: string
          id?: string
          impact?: string
          likely_owner?: string
          parent_id?: string | null
          product_id?: string
          project_context_id?: string | null
          responsible_id?: string | null
          responsible_ids?: string[]
          risk_mitigation?: string
          sort_order?: number
          sprint_id?: string | null
          status?: string
          task?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_backlog_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_backlog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contexts: {
        Row: {
          ai_metadata: Json | null
          ai_summary: string
          attachment_url: string | null
          created_at: string
          documentation: string
          id: string
          product_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          ai_summary?: string
          attachment_url?: string | null
          created_at?: string
          documentation?: string
          id?: string
          product_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          ai_summary?: string
          attachment_url?: string | null
          created_at?: string
          documentation?: string
          id?: string
          product_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      project_stakeholders: {
        Row: {
          area: string
          concession: string
          contact: string
          created_at: string
          email: string
          id: string
          importance: string
          name: string
          phone: string
          product_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: string
          concession?: string
          contact?: string
          created_at?: string
          email?: string
          id?: string
          importance?: string
          name: string
          phone?: string
          product_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string
          concession?: string
          contact?: string
          created_at?: string
          email?: string
          id?: string
          importance?: string
          name?: string
          phone?: string
          product_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sprint_backlog_items: {
        Row: {
          actual_hours: number
          backlog_id: string
          backlog_sub_item_id: string
          checklist_access: string
          checklist_dependency: string
          checklist_questions: string
          checklist_tools: string
          created_at: string
          deadline: string | null
          id: string
          impediment_deadline: string | null
          impediment_text: string
          sprint_id: string
          status: string
          team_member_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_hours?: number
          backlog_id: string
          backlog_sub_item_id: string
          checklist_access?: string
          checklist_dependency?: string
          checklist_questions?: string
          checklist_tools?: string
          created_at?: string
          deadline?: string | null
          id?: string
          impediment_deadline?: string | null
          impediment_text?: string
          sprint_id: string
          status?: string
          team_member_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_hours?: number
          backlog_id?: string
          backlog_sub_item_id?: string
          checklist_access?: string
          checklist_dependency?: string
          checklist_questions?: string
          checklist_tools?: string
          created_at?: string
          deadline?: string | null
          id?: string
          impediment_deadline?: string | null
          impediment_text?: string
          sprint_id?: string
          status?: string
          team_member_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_backlog_items_backlog_id_fkey"
            columns: ["backlog_id"]
            isOneToOne: false
            referencedRelation: "backlogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_backlog_items_backlog_sub_item_id_fkey"
            columns: ["backlog_sub_item_id"]
            isOneToOne: false
            referencedRelation: "backlog_sub_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_backlog_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_backlog_items_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_diary_entries: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          sprint_backlog_item_id: string | null
          sprint_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          sprint_backlog_item_id?: string | null
          sprint_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          sprint_backlog_item_id?: string | null
          sprint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_diary_entries_sprint_backlog_item_id_fkey"
            columns: ["sprint_backlog_item_id"]
            isOneToOne: false
            referencedRelation: "sprint_backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_diary_entries_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_members: {
        Row: {
          created_at: string
          id: string
          sprint_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sprint_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sprint_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_members_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sprint_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sprint_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sprint_id?: string
        }
        Relationships: []
      }
      sprint_unavailabilities: {
        Row: {
          created_at: string
          description: string
          hours: number
          id: string
          sprint_member_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          hours?: number
          id?: string
          sprint_member_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          hours?: number
          id?: string
          sprint_member_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_unavailabilities_sprint_member_id_fkey"
            columns: ["sprint_member_id"]
            isOneToOne: false
            referencedRelation: "sprint_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          coordinator_id: string
          created_at: string
          diary: string
          end_date: string
          id: string
          name: string
          product_id: string | null
          ritual_hours: number
          start_date: string
          status: string
          sustentation_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coordinator_id: string
          created_at?: string
          diary?: string
          end_date: string
          id?: string
          name: string
          product_id?: string | null
          ritual_hours?: number
          start_date: string
          status?: string
          sustentation_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coordinator_id?: string
          created_at?: string
          diary?: string
          end_date?: string
          id?: string
          name?: string
          product_id?: string | null
          ritual_hours?: number
          start_date?: string
          status?: string
          sustentation_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          created_at: string
          id: string
          squad_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          squad_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          squad_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          squad_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          squad_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_products_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          leader_profile_id: string | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          leader_profile_id?: string | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          leader_profile_id?: string | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      team_member_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          team_member_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          allocation_percent: number
          coordinator_id: string
          created_at: string
          daily_capacity_hours: number
          email: string
          id: string
          name: string
          product_id: string | null
          role: string
          seniority: string
          specialty: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          allocation_percent?: number
          coordinator_id: string
          created_at?: string
          daily_capacity_hours?: number
          email?: string
          id?: string
          name: string
          product_id?: string | null
          role?: string
          seniority?: string
          specialty?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          allocation_percent?: number
          coordinator_id?: string
          created_at?: string
          daily_capacity_hours?: number
          email?: string
          id?: string
          name?: string
          product_id?: string | null
          role?: string
          seniority?: string
          specialty?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _perm: string; _user_id: string }
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
  public: {
    Enums: {},
  },
} as const
