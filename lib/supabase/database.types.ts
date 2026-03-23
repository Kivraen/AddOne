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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      board_backups: {
        Row: {
          backed_up_at: string
          backup_day: string
          board_days: Json
          board_id: string
          created_at: string
          current_week_start: string
          history_era: number
          id: string
          settings: Json
          source_device_id: string | null
          source_snapshot_hash: string | null
          source_snapshot_revision: number
          today_row: number
          updated_at: string
        }
        Insert: {
          backed_up_at?: string
          backup_day: string
          board_days: Json
          board_id: string
          created_at?: string
          current_week_start: string
          history_era: number
          id?: string
          settings?: Json
          source_device_id?: string | null
          source_snapshot_hash?: string | null
          source_snapshot_revision?: number
          today_row: number
          updated_at?: string
        }
        Update: {
          backed_up_at?: string
          backup_day?: string
          board_days?: Json
          board_id?: string
          created_at?: string
          current_week_start?: string
          history_era?: number
          id?: string
          settings?: Json
          source_device_id?: string | null
          source_snapshot_hash?: string | null
          source_snapshot_revision?: number
          today_row?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_backups_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_backups_source_device_id_fkey"
            columns: ["source_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      board_habit_eras: {
        Row: {
          board_id: string
          created_at: string
          daily_minimum: string | null
          ended_at: string | null
          habit_name: string
          habit_started_on_local: string | null
          history_era: number
          started_at: string
          updated_at: string
          weekly_target: number
        }
        Insert: {
          board_id: string
          created_at?: string
          daily_minimum?: string | null
          ended_at?: string | null
          habit_name: string
          habit_started_on_local?: string | null
          history_era: number
          started_at?: string
          updated_at?: string
          weekly_target: number
        }
        Update: {
          board_id?: string
          created_at?: string
          daily_minimum?: string | null
          ended_at?: string | null
          habit_name?: string
          habit_started_on_local?: string | null
          history_era?: number
          started_at?: string
          updated_at?: string
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_habit_eras_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          active_history_era: number
          archived_at: string | null
          created_at: string
          history_era_started_at: string
          id: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          active_history_era?: number
          archived_at?: string | null
          created_at?: string
          history_era_started_at?: string
          id?: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          active_history_era?: number
          archived_at?: string | null
          created_at?: string
          history_era_started_at?: string
          id?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_commands: {
        Row: {
          applied_at: string | null
          delivered_at: string | null
          device_id: string
          failed_at: string | null
          id: string
          kind: Database["public"]["Enums"]["device_command_kind"]
          last_error: string | null
          payload: Json
          request_key: string | null
          requested_at: string
          requested_by_user_id: string | null
          status: Database["public"]["Enums"]["device_command_status"]
        }
        Insert: {
          applied_at?: string | null
          delivered_at?: string | null
          device_id: string
          failed_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["device_command_kind"]
          last_error?: string | null
          payload?: Json
          request_key?: string | null
          requested_at?: string
          requested_by_user_id?: string | null
          status?: Database["public"]["Enums"]["device_command_status"]
        }
        Update: {
          applied_at?: string | null
          delivered_at?: string | null
          device_id?: string
          failed_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["device_command_kind"]
          last_error?: string | null
          payload?: Json
          request_key?: string | null
          requested_at?: string
          requested_by_user_id?: string | null
          status?: Database["public"]["Enums"]["device_command_status"]
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_day_events: {
        Row: {
          actor_user_id: string | null
          client_event_id: string | null
          created_at: string
          desired_state: boolean
          device_event_id: string | null
          device_id: string
          effective_at: string
          history_era: number
          id: string
          local_date: string
          source: Database["public"]["Enums"]["device_event_source"]
        }
        Insert: {
          actor_user_id?: string | null
          client_event_id?: string | null
          created_at?: string
          desired_state: boolean
          device_event_id?: string | null
          device_id: string
          effective_at?: string
          history_era: number
          id?: string
          local_date: string
          source: Database["public"]["Enums"]["device_event_source"]
        }
        Update: {
          actor_user_id?: string | null
          client_event_id?: string | null
          created_at?: string
          desired_state?: boolean
          device_event_id?: string | null
          device_id?: string
          effective_at?: string
          history_era?: number
          id?: string
          local_date?: string
          source?: Database["public"]["Enums"]["device_event_source"]
        }
        Relationships: [
          {
            foreignKeyName: "device_day_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_day_states: {
        Row: {
          created_at: string
          device_id: string
          effective_at: string
          history_era: number
          is_done: boolean
          local_date: string
          updated_at: string
          updated_by_user_id: string | null
          updated_from: Database["public"]["Enums"]["device_event_source"]
        }
        Insert: {
          created_at?: string
          device_id: string
          effective_at: string
          history_era: number
          is_done: boolean
          local_date: string
          updated_at?: string
          updated_by_user_id?: string | null
          updated_from: Database["public"]["Enums"]["device_event_source"]
        }
        Update: {
          created_at?: string
          device_id?: string
          effective_at?: string
          history_era?: number
          is_done?: boolean
          local_date?: string
          updated_at?: string
          updated_by_user_id?: string | null
          updated_from?: Database["public"]["Enums"]["device_event_source"]
        }
        Relationships: [
          {
            foreignKeyName: "device_day_states_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_memberships: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          device_id: string
          id: string
          reminder_enabled: boolean
          reminder_time: string | null
          role: Database["public"]["Enums"]["device_membership_role"]
          status: Database["public"]["Enums"]["device_membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          device_id: string
          id?: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          role: Database["public"]["Enums"]["device_membership_role"]
          status: Database["public"]["Enums"]["device_membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          device_id?: string
          id?: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          role?: Database["public"]["Enums"]["device_membership_role"]
          status?: Database["public"]["Enums"]["device_membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_memberships_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_onboarding_sessions: {
        Row: {
          bootstrap_day_reset_time: string | null
          bootstrap_timezone: string | null
          cancelled_at: string | null
          claim_token_hash: string
          claim_token_prefix: string
          claimed_at: string | null
          created_at: string
          device_id: string | null
          expires_at: string
          hardware_profile_hint: string | null
          id: string
          last_error: string | null
          status: Database["public"]["Enums"]["device_onboarding_status"]
          updated_at: string
          user_id: string
          waiting_for_device_at: string | null
        }
        Insert: {
          bootstrap_day_reset_time?: string | null
          bootstrap_timezone?: string | null
          cancelled_at?: string | null
          claim_token_hash: string
          claim_token_prefix: string
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          expires_at?: string
          hardware_profile_hint?: string | null
          id?: string
          last_error?: string | null
          status?: Database["public"]["Enums"]["device_onboarding_status"]
          updated_at?: string
          user_id: string
          waiting_for_device_at?: string | null
        }
        Update: {
          bootstrap_day_reset_time?: string | null
          bootstrap_timezone?: string | null
          cancelled_at?: string | null
          claim_token_hash?: string
          claim_token_prefix?: string
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          expires_at?: string
          hardware_profile_hint?: string | null
          id?: string
          last_error?: string | null
          status?: Database["public"]["Enums"]["device_onboarding_status"]
          updated_at?: string
          user_id?: string
          waiting_for_device_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_onboarding_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_runtime_snapshots: {
        Row: {
          board_days: Json
          board_hash: string
          created_at: string
          current_week_start: string
          device_id: string
          generated_at: string
          history_era: number
          id: string
          revision: number
          settings: Json
          today_row: number
        }
        Insert: {
          board_days: Json
          board_hash: string
          created_at?: string
          current_week_start: string
          device_id: string
          generated_at?: string
          history_era: number
          id?: string
          revision: number
          settings?: Json
          today_row: number
        }
        Update: {
          board_days?: Json
          board_hash?: string
          created_at?: string
          current_week_start?: string
          device_id?: string
          generated_at?: string
          history_era?: number
          id?: string
          revision?: number
          settings?: Json
          today_row?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_runtime_snapshots_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_share_codes: {
        Row: {
          code: string
          created_at: string
          created_by_user_id: string | null
          device_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by_user_id?: string | null
          device_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by_user_id?: string | null
          device_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_share_codes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_share_requests: {
        Row: {
          approved_by_user_id: string | null
          created_at: string
          device_id: string
          id: string
          requester_user_id: string
          responded_at: string | null
          share_code_id: string | null
          status: Database["public"]["Enums"]["device_share_request_status"]
          updated_at: string
        }
        Insert: {
          approved_by_user_id?: string | null
          created_at?: string
          device_id: string
          id?: string
          requester_user_id: string
          responded_at?: string | null
          share_code_id?: string | null
          status?: Database["public"]["Enums"]["device_share_request_status"]
          updated_at?: string
        }
        Update: {
          approved_by_user_id?: string | null
          created_at?: string
          device_id?: string
          id?: string
          requester_user_id?: string
          responded_at?: string | null
          share_code_id?: string | null
          status?: Database["public"]["Enums"]["device_share_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_share_requests_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_share_requests_share_code_id_fkey"
            columns: ["share_code_id"]
            isOneToOne: false
            referencedRelation: "device_share_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        Insert: {
          account_removal_completed_at?: string | null
          account_removal_completion?:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at?: string | null
          account_removal_mode?:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at?: string | null
          account_removal_state?: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto?: boolean
          board_id?: string | null
          brightness?: number
          created_at?: string
          day_reset_time?: string
          device_auth_token_hash?: string | null
          firmware_version?: string
          hardware_profile?: string
          hardware_uid: string
          id?: string
          last_factory_reset_at?: string | null
          last_runtime_revision?: number
          last_seen_at?: string | null
          last_snapshot_at?: string | null
          last_snapshot_hash?: string | null
          last_sync_at?: string | null
          name?: string
          palette_custom?: Json
          palette_preset?: string
          recovery_state?: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch?: number
          reward_artwork_id?: string | null
          reward_enabled?: boolean
          reward_trigger?: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type?: Database["public"]["Enums"]["device_reward_type"]
          timezone?: string
          updated_at?: string
          week_start?: Database["public"]["Enums"]["device_week_start"]
          weekly_target?: number
        }
        Update: {
          account_removal_completed_at?: string | null
          account_removal_completion?:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at?: string | null
          account_removal_mode?:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at?: string | null
          account_removal_state?: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto?: boolean
          board_id?: string | null
          brightness?: number
          created_at?: string
          day_reset_time?: string
          device_auth_token_hash?: string | null
          firmware_version?: string
          hardware_profile?: string
          hardware_uid?: string
          id?: string
          last_factory_reset_at?: string | null
          last_runtime_revision?: number
          last_seen_at?: string | null
          last_snapshot_at?: string | null
          last_snapshot_hash?: string | null
          last_sync_at?: string | null
          name?: string
          palette_custom?: Json
          palette_preset?: string
          recovery_state?: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch?: number
          reward_artwork_id?: string | null
          reward_enabled?: boolean
          reward_trigger?: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type?: Database["public"]["Enums"]["device_reward_type"]
          timezone?: string
          updated_at?: string
          week_start?: Database["public"]["Enums"]["device_week_start"]
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "devices_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_reward_artwork_id_fkey"
            columns: ["reward_artwork_id"]
            isOneToOne: false
            referencedRelation: "reward_artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          first_name: string | null
          last_name: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reward_artworks: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_archived: boolean
          name: string
          owner_user_id: string
          pixel_data: Json
          prompt: string | null
          source: Database["public"]["Enums"]["reward_art_source"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_archived?: boolean
          name: string
          owner_user_id: string
          pixel_data?: Json
          prompt?: string | null
          source: Database["public"]["Enums"]["reward_art_source"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          owner_user_id?: string
          pixel_data?: Json
          prompt?: string | null
          source?: Database["public"]["Enums"]["reward_art_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_artworks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ack_device_command: {
        Args: {
          p_command_id: string
          p_device_auth_token: string
          p_hardware_uid: string
          p_last_error?: string
          p_status: Database["public"]["Enums"]["device_command_status"]
        }
        Returns: {
          applied_at: string | null
          delivered_at: string | null
          device_id: string
          failed_at: string | null
          id: string
          kind: Database["public"]["Enums"]["device_command_kind"]
          last_error: string | null
          payload: Json
          request_key: string | null
          requested_at: string
          requested_by_user_id: string | null
          status: Database["public"]["Enums"]["device_command_status"]
        }
        SetofOptions: {
          from: "*"
          to: "device_commands"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_device_settings_from_app: {
        Args: { p_device_id: string; p_patch: Json; p_request_id?: string }
        Returns: Json
      }
      apply_history_draft_from_app: {
        Args: {
          p_base_revision: number
          p_device_id: string
          p_draft_id?: string
          p_updates: Json
        }
        Returns: Json
      }
      approve_device_view_request: {
        Args: { p_request_id: string }
        Returns: {
          approved_by_user_id: string | null
          created_at: string
          device_id: string
          id: string
          requester_user_id: string
          responded_at: string | null
          share_code_id: string | null
          status: Database["public"]["Enums"]["device_share_request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "device_share_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_board_if_orphaned: {
        Args: { p_board_id: string }
        Returns: undefined
      }
      authenticate_device: {
        Args: { p_device_auth_token: string; p_hardware_uid: string }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      board_backup_is_valid: {
        Args: { p_board_days: Json; p_settings?: Json; p_today_row: number }
        Returns: boolean
      }
      board_has_valid_backup: {
        Args: { p_board_id: string; p_history_era: number }
        Returns: boolean
      }
      can_access_profile: { Args: { p_user_id: string }; Returns: boolean }
      cancel_device_onboarding_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: {
          bootstrap_day_reset_time: string | null
          bootstrap_timezone: string | null
          cancelled_at: string | null
          claim_token_hash: string
          claim_token_prefix: string
          claimed_at: string | null
          created_at: string
          device_id: string | null
          expires_at: string
          hardware_profile_hint: string | null
          id: string
          last_error: string | null
          status: Database["public"]["Enums"]["device_onboarding_status"]
          updated_at: string
          user_id: string
          waiting_for_device_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_onboarding_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_device: {
        Args: {
          p_hardware_profile?: string
          p_hardware_uid: string
          p_name?: string
          p_reset_epoch?: number
        }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_device_for_user: {
        Args: {
          p_firmware_version?: string
          p_hardware_profile?: string
          p_hardware_uid: string
          p_name?: string
          p_owner_user_id: string
          p_reset_epoch?: number
        }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_board_for_owner: {
        Args: { p_owner_user_id: string }
        Returns: string
      }
      create_device_onboarding_session: {
        Args: {
          p_bootstrap_day_reset_time?: string
          p_bootstrap_timezone?: string
          p_hardware_profile_hint?: string
        }
        Returns: {
          claim_token: string
          created_at: string
          expires_at: string
          hardware_profile_hint: string
          id: string
          status: Database["public"]["Enums"]["device_onboarding_status"]
        }[]
      }
      device_active_history_era: {
        Args: { p_device_id: string }
        Returns: number
      }
      device_heartbeat: {
        Args: {
          p_device_auth_token: string
          p_firmware_version?: string
          p_hardware_profile?: string
          p_hardware_uid: string
          p_last_sync_at?: string
        }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enter_wifi_recovery_from_app: {
        Args: { p_device_id: string; p_request_id?: string }
        Returns: Json
      }
      factory_reset_and_remove_device_from_app: {
        Args: { p_device_id: string; p_request_id?: string }
        Returns: Json
      }
      finalize_device_account_removal: {
        Args: {
          p_actor_user_id?: string
          p_completion?: Database["public"]["Enums"]["device_account_removal_completion"]
          p_device_id: string
        }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_stale_device_account_removals_for_user: {
        Args: never
        Returns: number
      }
      generate_share_code: { Args: { p_length?: number }; Returns: string }
      hash_claim_token: { Args: { p_claim_token: string }; Returns: string }
      history_week_start: {
        Args: {
          p_local_date: string
          p_week_start: Database["public"]["Enums"]["device_week_start"]
        }
        Returns: string
      }
      is_device_member: {
        Args: {
          p_device_id: string
          p_roles?: Database["public"]["Enums"]["device_membership_role"][]
          p_statuses?: Database["public"]["Enums"]["device_membership_status"][]
        }
        Returns: boolean
      }
      is_device_owner: { Args: { p_device_id: string }; Returns: boolean }
      list_device_history_metrics_for_user: {
        Args: never
        Returns: {
          current_daily_minimum: string
          current_habit_name: string
          current_habit_started_on_local: string
          current_weekly_target: number
          device_id: string
          history_era_started_at: string
          recorded_days_total: number
          successful_weeks_total: number
        }[]
      }
      list_device_share_requests: {
        Args: { p_device_id: string }
        Returns: {
          created_at: string
          id: string
          requester_avatar_url: string
          requester_display_name: string
          requester_user_id: string
          status: Database["public"]["Enums"]["device_share_request_status"]
        }[]
      }
      list_device_viewers: {
        Args: { p_device_id: string }
        Returns: {
          approved_at: string
          avatar_url: string
          display_name: string
          membership_id: string
          user_id: string
        }[]
      }
      list_restorable_board_backups_for_user: {
        Args: { p_device_id?: string }
        Returns: {
          backed_up_at: string
          backup_id: string
          board_id: string
          board_name: string
          source_device_id: string
          source_device_name: string
        }[]
      }
      logical_local_date_for_timestamp: {
        Args: {
          p_day_reset_time?: string
          p_timestamp: string
          p_timezone?: string
        }
        Returns: string
      }
      mark_device_onboarding_waiting: {
        Args: { p_session_id: string }
        Returns: {
          bootstrap_day_reset_time: string | null
          bootstrap_timezone: string | null
          cancelled_at: string | null
          claim_token_hash: string
          claim_token_prefix: string
          claimed_at: string | null
          created_at: string
          device_id: string | null
          expires_at: string
          hardware_profile_hint: string | null
          id: string
          last_error: string | null
          status: Database["public"]["Enums"]["device_onboarding_status"]
          updated_at: string
          user_id: string
          waiting_for_device_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_onboarding_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      next_device_history_era: {
        Args: { p_device_id: string }
        Returns: number
      }
      pull_device_commands: {
        Args: {
          p_device_auth_token: string
          p_hardware_uid: string
          p_limit?: number
        }
        Returns: {
          applied_at: string | null
          delivered_at: string | null
          device_id: string
          failed_at: string | null
          id: string
          kind: Database["public"]["Enums"]["device_command_kind"]
          last_error: string | null
          payload: Json
          request_key: string | null
          requested_at: string
          requested_by_user_id: string | null
          status: Database["public"]["Enums"]["device_command_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "device_commands"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      queue_device_command: {
        Args: {
          p_device_id: string
          p_kind: Database["public"]["Enums"]["device_command_kind"]
          p_payload?: Json
          p_request_key?: string
        }
        Returns: {
          applied_at: string | null
          delivered_at: string | null
          device_id: string
          failed_at: string | null
          id: string
          kind: Database["public"]["Enums"]["device_command_kind"]
          last_error: string | null
          payload: Json
          request_key: string | null
          requested_at: string
          requested_by_user_id: string | null
          status: Database["public"]["Enums"]["device_command_status"]
        }
        SetofOptions: {
          from: "*"
          to: "device_commands"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_day_state_event: {
        Args: {
          p_client_event_id?: string
          p_device_event_id?: string
          p_device_id: string
          p_effective_at?: string
          p_is_done: boolean
          p_local_date: string
          p_source?: Database["public"]["Enums"]["device_event_source"]
        }
        Returns: {
          actor_user_id: string | null
          client_event_id: string | null
          created_at: string
          desired_state: boolean
          device_event_id: string | null
          device_id: string
          effective_at: string
          history_era: number
          id: string
          local_date: string
          source: Database["public"]["Enums"]["device_event_source"]
        }
        SetofOptions: {
          from: "*"
          to: "device_day_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_day_state_from_device: {
        Args: {
          p_device_auth_token: string
          p_device_event_id: string
          p_effective_at?: string
          p_hardware_uid: string
          p_is_done: boolean
          p_local_date: string
        }
        Returns: {
          actor_user_id: string | null
          client_event_id: string | null
          created_at: string
          desired_state: boolean
          device_event_id: string | null
          device_id: string
          effective_at: string
          history_era: number
          id: string
          local_date: string
          source: Database["public"]["Enums"]["device_event_source"]
        }
        SetofOptions: {
          from: "*"
          to: "device_day_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_device_onboarding_claim: {
        Args: {
          p_claim_token: string
          p_device_auth_token?: string
          p_firmware_version?: string
          p_hardware_profile?: string
          p_hardware_uid: string
          p_name?: string
          p_reset_epoch?: number
        }
        Returns: {
          bootstrap_day_reset_time: string | null
          bootstrap_timezone: string | null
          cancelled_at: string | null
          claim_token_hash: string
          claim_token_prefix: string
          claimed_at: string | null
          created_at: string
          device_id: string | null
          expires_at: string
          hardware_profile_hint: string | null
          id: string
          last_error: string | null
          status: Database["public"]["Enums"]["device_onboarding_status"]
          updated_at: string
          user_id: string
          waiting_for_device_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_onboarding_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_factory_device: {
        Args: {
          p_device_auth_token: string
          p_firmware_version?: string
          p_hardware_profile?: string
          p_hardware_uid: string
          p_name?: string
        }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_device_view_request: {
        Args: { p_request_id: string }
        Returns: {
          approved_by_user_id: string | null
          created_at: string
          device_id: string
          id: string
          requester_user_id: string
          responded_at: string | null
          share_code_id: string | null
          status: Database["public"]["Enums"]["device_share_request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "device_share_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_device_from_account_from_app: {
        Args: {
          p_device_id: string
          p_remote_reset?: boolean
          p_request_id?: string
        }
        Returns: Json
      }
      report_device_factory_reset: {
        Args: {
          p_device_auth_token: string
          p_hardware_uid: string
          p_reset_epoch?: number
        }
        Returns: {
          account_removal_completed_at: string | null
          account_removal_completion:
            | Database["public"]["Enums"]["device_account_removal_completion"]
            | null
          account_removal_deadline_at: string | null
          account_removal_mode:
            | Database["public"]["Enums"]["device_account_removal_mode"]
            | null
          account_removal_requested_at: string | null
          account_removal_state: Database["public"]["Enums"]["device_account_removal_state"]
          ambient_auto: boolean
          board_id: string | null
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_factory_reset_at: string | null
          last_runtime_revision: number
          last_seen_at: string | null
          last_snapshot_at: string | null
          last_snapshot_hash: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
          recovery_state: Database["public"]["Enums"]["device_recovery_state"]
          reset_epoch: number
          reward_artwork_id: string | null
          reward_enabled: boolean
          reward_trigger: Database["public"]["Enums"]["device_reward_trigger"]
          reward_type: Database["public"]["Enums"]["device_reward_type"]
          timezone: string
          updated_at: string
          week_start: Database["public"]["Enums"]["device_week_start"]
          weekly_target: number
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_day_state_from_app: {
        Args: {
          p_base_revision?: number
          p_client_event_id?: string
          p_device_id: string
          p_effective_at?: string
          p_is_done: boolean
          p_local_date: string
        }
        Returns: Json
      }
      request_device_factory_reset_from_app: {
        Args: { p_device_id: string; p_request_id?: string }
        Returns: Json
      }
      request_device_view_access: {
        Args: { p_code: string }
        Returns: {
          approved_by_user_id: string | null
          created_at: string
          device_id: string
          id: string
          requester_user_id: string
          responded_at: string | null
          share_code_id: string | null
          status: Database["public"]["Enums"]["device_share_request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "device_share_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_runtime_snapshot_from_app: {
        Args: { p_device_id: string; p_request_id?: string }
        Returns: Json
      }
      reset_device_history_from_app: {
        Args: {
          p_daily_minimum: string
          p_device_id: string
          p_habit_name: string
          p_request_id?: string
          p_weekly_target: number
        }
        Returns: Json
      }
      restore_board_backup_to_device: {
        Args: {
          p_backup_id: string
          p_device_id: string
          p_request_id?: string
        }
        Returns: Json
      }
      rotate_device_share_code: {
        Args: { p_device_id: string }
        Returns: {
          code: string
          created_at: string
          created_by_user_id: string | null
          device_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "device_share_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_active_habit_start_date_from_app: {
        Args: { p_device_id: string; p_habit_started_on_local: string }
        Returns: Json
      }
      set_day_state_from_app: {
        Args: {
          p_client_event_id?: string
          p_device_id: string
          p_effective_at?: string
          p_is_done: boolean
          p_local_date: string
        }
        Returns: {
          actor_user_id: string | null
          client_event_id: string | null
          created_at: string
          desired_state: boolean
          device_event_id: string | null
          device_id: string
          effective_at: string
          history_era: number
          id: string
          local_date: string
          source: Database["public"]["Enums"]["device_event_source"]
        }
        SetofOptions: {
          from: "*"
          to: "device_day_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_active_habit_metadata_from_app: {
        Args: {
          p_daily_minimum: string
          p_device_id: string
          p_habit_name: string
          p_weekly_target: number
        }
        Returns: Json
      }
      upload_device_runtime_snapshot: {
        Args: {
          p_board_days: Json
          p_board_hash?: string
          p_current_week_start: string
          p_device_auth_token: string
          p_generated_at?: string
          p_hardware_uid: string
          p_revision: number
          p_settings?: Json
          p_today_row: number
        }
        Returns: {
          board_days: Json
          board_hash: string
          created_at: string
          current_week_start: string
          device_id: string
          generated_at: string
          history_era: number
          id: string
          revision: number
          settings: Json
          today_row: number
        }
        SetofOptions: {
          from: "*"
          to: "device_runtime_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      device_account_removal_completion:
        | "device_confirmed"
        | "timeout"
        | "account_only"
      device_account_removal_mode: "remote_reset_remove" | "account_only_remove"
      device_account_removal_state:
        | "active"
        | "pending_device_reset"
        | "removed"
      device_command_kind:
        | "set_day_state"
        | "sync_settings"
        | "sync_day_states_batch"
        | "request_runtime_snapshot"
        | "apply_history_draft"
        | "apply_device_settings"
        | "enter_wifi_recovery"
        | "factory_reset"
        | "restore_board_backup"
        | "reset_history"
      device_command_status:
        | "queued"
        | "delivered"
        | "applied"
        | "failed"
        | "cancelled"
      device_event_source: "device" | "cloud" | "recovery" | "migration"
      device_membership_role: "owner" | "viewer"
      device_membership_status: "pending" | "approved" | "revoked" | "rejected"
      device_onboarding_status:
        | "awaiting_ap"
        | "awaiting_cloud"
        | "claimed"
        | "expired"
        | "cancelled"
        | "failed"
      device_recovery_state: "ready" | "needs_recovery" | "recovering"
      device_reward_trigger: "daily" | "weekly"
      device_reward_type: "clock" | "paint"
      device_share_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      device_week_start: "locale" | "monday" | "sunday"
      reward_art_source: "preset" | "custom" | "ai"
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
      device_account_removal_completion: [
        "device_confirmed",
        "timeout",
        "account_only",
      ],
      device_account_removal_mode: [
        "remote_reset_remove",
        "account_only_remove",
      ],
      device_account_removal_state: [
        "active",
        "pending_device_reset",
        "removed",
      ],
      device_command_kind: [
        "set_day_state",
        "sync_settings",
        "sync_day_states_batch",
        "request_runtime_snapshot",
        "apply_history_draft",
        "apply_device_settings",
        "enter_wifi_recovery",
        "factory_reset",
        "restore_board_backup",
        "reset_history",
      ],
      device_command_status: [
        "queued",
        "delivered",
        "applied",
        "failed",
        "cancelled",
      ],
      device_event_source: ["device", "cloud", "recovery", "migration"],
      device_membership_role: ["owner", "viewer"],
      device_membership_status: ["pending", "approved", "revoked", "rejected"],
      device_onboarding_status: [
        "awaiting_ap",
        "awaiting_cloud",
        "claimed",
        "expired",
        "cancelled",
        "failed",
      ],
      device_recovery_state: ["ready", "needs_recovery", "recovering"],
      device_reward_trigger: ["daily", "weekly"],
      device_reward_type: ["clock", "paint"],
      device_share_request_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      device_week_start: ["locale", "monday", "sunday"],
      reward_art_source: ["preset", "custom", "ai"],
    },
  },
} as const
