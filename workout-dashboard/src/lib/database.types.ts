// Hand-written to match supabase/migrations/0001_init.sql. If the schema
// changes, update this alongside the migration — there's no live Supabase
// project in this repo to run `supabase gen types` against.

export type WorkoutStatus = "scheduled" | "completed" | "skipped" | "rest" | "active_recovery";
export type RecoverySource = "manual" | "oura" | "garmin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          timezone: string;
          diet_constraints: string[];
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      macro_targets: {
        Row: {
          id: string;
          user_id: string;
          effective_date: string;
          protein_g: number;
          carb_g: number;
          fat_g: number;
          step_goal: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["macro_targets"]["Row"]> & {
          user_id: string;
          protein_g: number;
          carb_g: number;
          fat_g: number;
        };
        Update: Partial<Database["public"]["Tables"]["macro_targets"]["Row"]>;
        Relationships: [];
      };
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number;
          workout_type: string;
          label: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_templates"]["Row"]> & {
          user_id: string;
          day_of_week: number;
          workout_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_templates"]["Row"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["exercises"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Row"]>;
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          workout_type: string;
          status: WorkoutStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_logs"]["Row"]> & {
          user_id: string;
          date: string;
          workout_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_logs"]["Row"]>;
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_log_id: string;
          user_id: string;
          exercise_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          superset_group: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_sets"]["Row"]> & {
          workout_log_id: string;
          user_id: string;
          exercise_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sets"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sets_workout_log_id_fkey";
            columns: ["workout_log_id"];
            isOneToOne: false;
            referencedRelation: "workout_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          steps: number | null;
          weight: number | null;
          energy_level: number | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["daily_metrics"]["Row"]> & {
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_metrics"]["Row"]>;
        Relationships: [];
      };
      macro_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          protein_g: number;
          carb_g: number;
          fat_g: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["macro_logs"]["Row"]> & {
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["macro_logs"]["Row"]>;
        Relationships: [];
      };
      recovery_data: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          source: RecoverySource;
          sleep_quality: number | null;
          sleep_score: number | null;
          hrv: number | null;
          resting_hr: number | null;
          temperature_deviation: number | null;
          readiness_score: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recovery_data"]["Row"]> & {
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["recovery_data"]["Row"]>;
        Relationships: [];
      };
      integration_tokens: {
        Row: {
          id: string;
          user_id: string;
          service: "oura" | "garmin";
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          last_sync_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["integration_tokens"]["Row"]> & {
          user_id: string;
          service: "oura" | "garmin";
        };
        Update: Partial<Database["public"]["Tables"]["integration_tokens"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      seed_default_plan: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
