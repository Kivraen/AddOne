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
          ambient_auto: boolean
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
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
          ambient_auto?: boolean
          brightness?: number
          created_at?: string
          day_reset_time?: string
          device_auth_token_hash?: string | null
          firmware_version?: string
          hardware_profile?: string
          hardware_uid: string
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          name?: string
          palette_custom?: Json
          palette_preset?: string
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
          ambient_auto?: boolean
          brightness?: number
          created_at?: string
          day_reset_time?: string
          device_auth_token_hash?: string | null
          firmware_version?: string
          hardware_profile?: string
          hardware_uid?: string
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          name?: string
          palette_custom?: Json
          palette_preset?: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
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
      authenticate_device: {
        Args: { p_device_auth_token: string; p_hardware_uid: string }
        Returns: {
          ambient_auto: boolean
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
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
      can_access_profile: { Args: { p_user_id: string }; Returns: boolean }
      claim_device: {
        Args: {
          p_hardware_profile?: string
          p_hardware_uid: string
          p_name?: string
        }
        Returns: {
          ambient_auto: boolean
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
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
        }
        Returns: {
          ambient_auto: boolean
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
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
      create_device_onboarding_session: {
        Args: { p_hardware_profile_hint?: string }
        Returns: {
          claim_token: string
          created_at: string
          expires_at: string
          hardware_profile_hint: string
          id: string
          status: Database["public"]["Enums"]["device_onboarding_status"]
        }[]
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
          ambient_auto: boolean
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
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
      generate_share_code: { Args: { p_length?: number }; Returns: string }
      hash_claim_token: { Args: { p_claim_token: string }; Returns: string }
      is_device_member: {
        Args: {
          p_device_id: string
          p_roles?: Database["public"]["Enums"]["device_membership_role"][]
          p_statuses?: Database["public"]["Enums"]["device_membership_status"][]
        }
        Returns: boolean
      }
      is_device_owner: { Args: { p_device_id: string }; Returns: boolean }
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
      mark_device_onboarding_waiting: {
        Args: { p_session_id: string }
        Returns: {
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
        }
        Returns: {
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
          ambient_auto: boolean
          brightness: number
          created_at: string
          day_reset_time: string
          device_auth_token_hash: string | null
          firmware_version: string
          hardware_profile: string
          hardware_uid: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          name: string
          palette_custom: Json
          palette_preset: string
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
    }
    Enums: {
      device_command_kind: "set_day_state" | "sync_settings"
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
      device_command_kind: ["set_day_state", "sync_settings"],
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
