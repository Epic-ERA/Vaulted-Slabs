//types.database.ts
export type UserRole = 'admin' | 'user';

export type ConditionType = 'graded' | 'raw';

export type GradingCompany = 'PSA' | 'CGC' | 'BGS' | 'SGC' | 'RAW' | 'OTHER';

export type Variant = '1st_edition' | 'shadowless' | 'unlimited' | 'reverse_holo' | 'other';

export type ImageKind = 'front' | 'back' | 'label' | 'other';

export type ListingStatus = 'draft' | 'active' | 'sold' | 'canceled';

export type SaleType = 'buy_now' | 'offer';

export type SyncStatus = 'running' | 'success' | 'failed';

export type Supertype = 'Pokémon' | 'Trainer' | 'Energy';

export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      tcg_sets: {
        Row: {
          id: string;
          name: string;
          series: string | null;
          printed_total: number | null;
          total: number | null;
          release_date: string | null;
          updated_at_api: string | null;
          symbol_url: string | null;
          logo_url: string | null;
          raw: any;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          series?: string | null;
          printed_total?: number | null;
          total?: number | null;
          release_date?: string | null;
          updated_at_api?: string | null;
          symbol_url?: string | null;
          logo_url?: string | null;
          raw?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          series?: string | null;
          printed_total?: number | null;
          total?: number | null;
          release_date?: string | null;
          updated_at_api?: string | null;
          symbol_url?: string | null;
          logo_url?: string | null;
          raw?: any;
          created_at?: string;
        };
      };
      tcg_cards: {
        Row: {
          id: string;
          set_id: string;
          number: string;
          name: string;
          rarity: string | null;
          supertype: string | null;
          subtypes: string[] | null;
          types: string[] | null;
          national_pokedex_numbers: number[] | null;
          small_image_url: string | null;
          large_image_url: string | null;
          api_updated_at: string | null;
          raw: any;
          created_at: string;
        };
        Insert: {
          id: string;
          set_id: string;
          number: string;
          name: string;
          rarity?: string | null;
          supertype?: string | null;
          subtypes?: string[] | null;
          types?: string[] | null;
          national_pokedex_numbers?: number[] | null;
          small_image_url?: string | null;
          large_image_url?: string | null;
          api_updated_at?: string | null;
          raw?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          set_id?: string;
          number?: string;
          name?: string;
          rarity?: string | null;
          supertype?: string | null;
          subtypes?: string[] | null;
          types?: string[] | null;
          national_pokedex_numbers?: number[] | null;
          small_image_url?: string | null;
          large_image_url?: string | null;
          api_updated_at?: string | null;
          raw?: any;
          created_at?: string;
        };
      };
      set_logo_assets: {
        Row: {
          set_id: string;
          local_asset_key: string;
          created_at: string;
        };
        Insert: {
          set_id: string;
          local_asset_key: string;
          created_at?: string;
        };
        Update: {
          set_id?: string;
          local_asset_key?: string;
          created_at?: string;
        };
      };
      collection_items: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          condition_type: ConditionType;
          grading_company: GradingCompany | null;
          grade_label: string | null;
          grade_value: number | null;
          cert_number: string | null;
          variant: Variant | null;
          psa_verified: boolean;
          psa_verified_at: string | null;
          psa_image_url: string | null;
          psa_payload: any;
          notes: string | null;
          acquired_at: string | null;
          purchase_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          condition_type: ConditionType;
          grading_company?: GradingCompany | null;
          grade_label?: string | null;
          grade_value?: number | null;
          cert_number?: string | null;
          variant?: Variant | null;
          psa_verified?: boolean;
          psa_verified_at?: string | null;
          psa_image_url?: string | null;
          psa_payload?: any;
          notes?: string | null;
          acquired_at?: string | null;
          purchase_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          condition_type?: ConditionType;
          grading_company?: GradingCompany | null;
          grade_label?: string | null;
          grade_value?: number | null;
          cert_number?: string | null;
          variant?: Variant | null;
          psa_verified?: boolean;
          psa_verified_at?: string | null;
          psa_image_url?: string | null;
          psa_payload?: any;
          notes?: string | null;
          acquired_at?: string | null;
          purchase_price?: number | null;
          created_at?: string;
        };
      };
      collection_item_images: {
        Row: {
          id: string;
          item_id: string;
          image_path: string;
          kind: ImageKind;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          image_path: string;
          kind?: ImageKind;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          image_path?: string;
          kind?: ImageKind;
          created_at?: string;
        };
      };
      admin_card_prices: {
        Row: {
          id: string;
          card_id: string;
          grading_company: string;
          grade_value: number | null;
          variant: string | null;
          avg_price: number;
          as_of_month: string;
          source_note: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          grading_company: string;
          grade_value?: number | null;
          variant?: string | null;
          avg_price: number;
          as_of_month: string;
          source_note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          grading_company?: string;
          grade_value?: number | null;
          variant?: string | null;
          avg_price?: number;
          as_of_month?: string;
          source_note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      sync_logs: {
        Row: {
          id: string;
          job_name: string;
          started_at: string;
          finished_at: string | null;
          status: SyncStatus;
          details: any;
        };
        Insert: {
          id?: string;
          job_name: string;
          started_at?: string;
          finished_at?: string | null;
          status: SyncStatus;
          details?: any;
        };
        Update: {
          id?: string;
          job_name?: string;
          started_at?: string;
          finished_at?: string | null;
          status?: SyncStatus;
          details?: any;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_user_id: string;
          collection_item_id: string;
          status: ListingStatus;
          sale_type: SaleType;
          buy_now_price: number | null;
          offer_min_price: number | null;
          requires_psa_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_user_id: string;
          collection_item_id: string;
          status?: ListingStatus;
          sale_type?: SaleType;
          buy_now_price?: number | null;
          offer_min_price?: number | null;
          requires_psa_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_user_id?: string;
          collection_item_id?: string;
          status?: ListingStatus;
          sale_type?: SaleType;
          buy_now_price?: number | null;
          offer_min_price?: number | null;
          requires_psa_verified?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
