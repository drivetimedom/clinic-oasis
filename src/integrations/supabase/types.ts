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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          clinic_id: string | null
          created_at: string
          description: string | null
          doctor_id: string
          end_time: string
          id: string
          is_recurring: boolean
          patient_id: string | null
          procedure_id: string | null
          recurrence_end_date: string | null
          recurrence_group_id: string | null
          recurrence_type: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          doctor_id: string
          end_time: string
          id?: string
          is_recurring?: boolean
          patient_id?: string | null
          procedure_id?: string | null
          recurrence_end_date?: string | null
          recurrence_group_id?: string | null
          recurrence_type?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string
          end_time?: string
          id?: string
          is_recurring?: boolean
          patient_id?: string | null
          procedure_id?: string | null
          recurrence_end_date?: string | null
          recurrence_group_id?: string | null
          recurrence_type?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          active: boolean
          clinic_id: string | null
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          slot_duration: number
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string | null
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          slot_duration?: number
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          clinic_id?: string | null
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          slot_duration?: number
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_payments: {
        Row: {
          amount_paid: number
          billing_id: string
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
        }
        Insert: {
          amount_paid?: number
          billing_id: string
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
        }
        Update: {
          amount_paid?: number
          billing_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_payments_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      billings: {
        Row: {
          amount: number
          amount_paid: number
          billing_date: string
          clinic_id: string
          created_at: string
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string | null
          procedure_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          billing_date?: string
          clinic_id: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          billing_date?: string
          clinic_id?: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_photos: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          observation: string | null
          patient_id: string
          photo_date: string
          photo_type: string
          photo_url: string
          procedure_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          observation?: string | null
          patient_id: string
          photo_date?: string
          photo_type?: string
          photo_url: string
          procedure_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          observation?: string | null
          patient_id?: string
          photo_date?: string
          photo_type?: string
          photo_url?: string
          procedure_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_photos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_photos_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          billing_date: string
          billing_id: string | null
          clinic_id: string
          commission_amount: number
          commission_percentage: number
          created_at: string
          doctor_id: string
          id: string
          procedure_amount: number
          procedure_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          billing_date?: string
          billing_id?: string | null
          clinic_id: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          doctor_id: string
          id?: string
          procedure_amount?: number
          procedure_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          billing_date?: string
          billing_id?: string | null
          clinic_id?: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          doctor_id?: string
          id?: string
          procedure_amount?: number
          procedure_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          active: boolean
          clinic_id: string | null
          color: string
          commission_percentage: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          clinic_id?: string | null
          color?: string
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          clinic_id?: string | null
          color?: string
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      facial_assessments: {
        Row: {
          assessment_date: string
          clinic_id: string
          clinical_notes: string | null
          created_at: string
          doctor_id: string | null
          facial_asymmetry: string | null
          flaccidity_level: string | null
          id: string
          lip_volume: string | null
          malar_volume: string | null
          mandibular_volume: string | null
          patient_id: string
          skin_type: string | null
          updated_at: string
          wrinkles: string | null
        }
        Insert: {
          assessment_date?: string
          clinic_id: string
          clinical_notes?: string | null
          created_at?: string
          doctor_id?: string | null
          facial_asymmetry?: string | null
          flaccidity_level?: string | null
          id?: string
          lip_volume?: string | null
          malar_volume?: string | null
          mandibular_volume?: string | null
          patient_id: string
          skin_type?: string | null
          updated_at?: string
          wrinkles?: string | null
        }
        Update: {
          assessment_date?: string
          clinic_id?: string
          clinical_notes?: string | null
          created_at?: string
          doctor_id?: string | null
          facial_asymmetry?: string | null
          flaccidity_level?: string | null
          id?: string
          lip_volume?: string | null
          malar_volume?: string | null
          mandibular_volume?: string | null
          patient_id?: string
          skin_type?: string | null
          updated_at?: string
          wrinkles?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facial_assessments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_assessments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_evolutions: {
        Row: {
          clinic_id: string
          created_at: string
          description: string
          doctor_id: string | null
          evolution_date: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description: string
          doctor_id?: string | null
          evolution_date?: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string
          doctor_id?: string | null
          evolution_date?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_evolutions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_procedures: {
        Row: {
          area_treated: string | null
          clinic_id: string
          clinical_notes: string | null
          created_at: string
          doctor_id: string | null
          id: string
          patient_id: string
          procedure_date: string
          procedure_id: string | null
          protocol_id: string | null
          quantity_applied: string | null
          updated_at: string
        }
        Insert: {
          area_treated?: string | null
          clinic_id: string
          clinical_notes?: string | null
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id: string
          procedure_date?: string
          procedure_id?: string | null
          protocol_id?: string | null
          quantity_applied?: string | null
          updated_at?: string
        }
        Update: {
          area_treated?: string | null
          clinic_id?: string
          clinical_notes?: string | null
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id?: string
          procedure_date?: string
          procedure_id?: string | null
          protocol_id?: string | null
          quantity_applied?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_procedures_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_procedures_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_procedures_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          clinic_id: string | null
          cpf: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          clinic_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          clinic_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          category: string
          clinic_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          status: string
          supplier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          clinic_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          clinic_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_categories: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          active: boolean
          category_id: string
          clinic_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          suggested_price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          clinic_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          suggested_price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          clinic_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          suggested_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "procedure_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      protocols: {
        Row: {
          clinic_id: string
          clinical_notes: string | null
          created_at: string
          description: string | null
          id: string
          materials: string | null
          name: string
          procedure_id: string
          steps: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinical_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          materials?: string | null
          name: string
          procedure_id: string
          steps?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinical_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          materials?: string | null
          name?: string
          procedure_id?: string
          steps?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocols_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          category: string
          clinic_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          patient_id: string | null
          payment_date: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          clinic_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          clinic_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          batch_number: string
          clinic_id: string
          created_at: string
          expiry_date: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          batch_number: string
          clinic_id: string
          created_at?: string
          expiry_date: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          batch_number?: string
          clinic_id?: string
          created_at?: string
          expiry_date?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          clinic_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          responsible: string | null
          type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          responsible?: string | null
          type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          responsible?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_products: {
        Row: {
          active: boolean
          brand: string | null
          category: string | null
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          min_stock: number
          name: string
          quantity_in_stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          quantity_in_stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          category?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          quantity_in_stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_products_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_clinic_with_admin: {
        Args: {
          _address?: string
          _email?: string
          _name: string
          _phone?: string
        }
        Returns: string
      }
      get_clinic_role: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: string
      }
      get_super_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      has_clinic_role: {
        Args: { _clinic_id: string; _roles: string[]; _user_id: string }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "reception" | "financial" | "profissional"
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
      app_role: ["admin", "manager", "reception", "financial", "profissional"],
    },
  },
} as const
