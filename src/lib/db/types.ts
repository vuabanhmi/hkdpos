/**
 * Sinh tự động từ Supabase local, KHÔNG sửa tay. Sinh lại mỗi khi thêm migration mới:
 *   supabase gen types typescript --local > src/lib/db/types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "allow_negative_stock": boolean,"id": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_negative_stock"?: boolean,"id"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "allow_negative_stock"?: boolean,"id"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"app_users": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"role": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"business_profile": {
                  Row: {
                    "address": string | null,"id": boolean,"name": string | null,"tax_code": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"id"?: boolean,"name"?: string | null,"tax_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"id"?: boolean,"name"?: string | null,"tax_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_profile_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_categories": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"kind": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"kind": string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cash_entries": {
                  Row: {
                    "amount": number,"category_id": string,"contact_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"entry_no": string,"evidence_note": string | null,"id": string,"kind": string,"method": string,"occurred_at": string,"reversed_of": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category_id": string,"contact_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"entry_no": string,"evidence_note"?: string | null,"id"?: string,"kind": string,"method": string,"occurred_at"?: string,"reversed_of"?: string | null
                  }
                  Update: {
                    "amount"?: number,"category_id"?: string,"contact_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"entry_no"?: string,"evidence_note"?: string | null,"id"?: string,"kind"?: string,"method"?: string,"occurred_at"?: string,"reversed_of"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_entries_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "cash_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_entries_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_entries_reversed_of_fkey"
      columns: ["reversed_of"]
isOneToOne: false
      referencedRelation: "cash_entries"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "address": string | null,"bank_account": string | null,"bank_name": string | null,"created_at": string,"created_by": string | null,"email": string | null,"id": string,"is_active": boolean,"is_customer": boolean,"is_supplier": boolean,"name": string,"note": string | null,"phone": string | null,"tax_code": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"bank_account"?: string | null,"bank_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"is_active"?: boolean,"is_customer"?: boolean,"is_supplier"?: boolean,"name": string,"note"?: string | null,"phone"?: string | null,"tax_code"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"bank_account"?: string | null,"bank_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"is_active"?: boolean,"is_customer"?: boolean,"is_supplier"?: boolean,"name"?: string,"note"?: string | null,"phone"?: string | null,"tax_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"counter_product_groups": {
                  Row: {
                    "counter_id": string,"product_group_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "counter_id": string,"product_group_id": string
                  }
                  Update: {
                    "counter_id"?: string,"product_group_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "counter_product_groups_counter_id_fkey"
      columns: ["counter_id"]
isOneToOne: false
      referencedRelation: "counters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "counter_product_groups_product_group_id_fkey"
      columns: ["product_group_id"]
isOneToOne: true
      referencedRelation: "product_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"counters": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"is_active": boolean,"manager_name": string | null,"name": string,"note": string | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"manager_name"?: string | null,"name": string,"note"?: string | null,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"manager_name"?: string | null,"name"?: string,"note"?: string | null,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ledger_periods": {
                  Row: {
                    "created_at": string,"id": string,"lock_note": string | null,"locked_at": string | null,"locked_by": string | null,"period_end": string,"period_start": string,"period_type": string,"status": string,"unlock_reason": string | null,"unlocked_at": string | null,"unlocked_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lock_note"?: string | null,"locked_at"?: string | null,"locked_by"?: string | null,"period_end": string,"period_start": string,"period_type": string,"status"?: string,"unlock_reason"?: string | null,"unlocked_at"?: string | null,"unlocked_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lock_note"?: string | null,"locked_at"?: string | null,"locked_by"?: string | null,"period_end"?: string,"period_start"?: string,"period_type"?: string,"status"?: string,"unlock_reason"?: string | null,"unlocked_at"?: string | null,"unlocked_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_periods_locked_by_fkey"
      columns: ["locked_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_periods_unlocked_by_fkey"
      columns: ["unlocked_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"manual_revenue_entries": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"description": string,"entry_date": string,"entry_no": string,"evidence_note": string | null,"id": string,"payment_method": string,"reversed_of": string | null,"tax_category_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"description": string,"entry_date": string,"entry_no": string,"evidence_note"?: string | null,"id"?: string,"payment_method": string,"reversed_of"?: string | null,"tax_category_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"description"?: string,"entry_date"?: string,"entry_no"?: string,"evidence_note"?: string | null,"id"?: string,"payment_method"?: string,"reversed_of"?: string | null,"tax_category_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "manual_revenue_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_revenue_entries_reversed_of_fkey"
      columns: ["reversed_of"]
isOneToOne: false
      referencedRelation: "manual_revenue_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_revenue_entries_tax_category_id_fkey"
      columns: ["tax_category_id"]
isOneToOne: false
      referencedRelation: "tax_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "allocated_order_discount": number | null,"counter_id": string | null,"counter_name_snapshot": string | null,"created_at": string,"discount": number,"gross_amount": number | null,"id": string,"line_total": number,"net_amount": number | null,"order_id": string,"product_code_snapshot": string,"product_id": string,"product_name_snapshot": string,"quantity": number,"tax_category_id_snapshot": string | null,"unit_cost_snapshot": number | null,"unit_name_snapshot": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "allocated_order_discount"?: number | null,"counter_id"?: string | null,"counter_name_snapshot"?: string | null,"created_at"?: string,"discount"?: number,"gross_amount"?: number | null,"id"?: string,"line_total": number,"net_amount"?: number | null,"order_id": string,"product_code_snapshot": string,"product_id": string,"product_name_snapshot": string,"quantity": number,"tax_category_id_snapshot"?: string | null,"unit_cost_snapshot"?: number | null,"unit_name_snapshot": string,"unit_price": number
                  }
                  Update: {
                    "allocated_order_discount"?: number | null,"counter_id"?: string | null,"counter_name_snapshot"?: string | null,"created_at"?: string,"discount"?: number,"gross_amount"?: number | null,"id"?: string,"line_total"?: number,"net_amount"?: number | null,"order_id"?: string,"product_code_snapshot"?: string,"product_id"?: string,"product_name_snapshot"?: string,"quantity"?: number,"tax_category_id_snapshot"?: string | null,"unit_cost_snapshot"?: number | null,"unit_name_snapshot"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_counter_id_fkey"
      columns: ["counter_id"]
isOneToOne: false
      referencedRelation: "counters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_tax_category_id_snapshot_fkey"
      columns: ["tax_category_id_snapshot"]
isOneToOne: false
      referencedRelation: "tax_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"order_return_items": {
                  Row: {
                    "amount": number,"counter_id": string | null,"counter_name_snapshot": string | null,"gross_amount": number | null,"id": string,"net_amount": number | null,"order_item_id": string,"order_return_id": string,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"counter_id"?: string | null,"counter_name_snapshot"?: string | null,"gross_amount"?: number | null,"id"?: string,"net_amount"?: number | null,"order_item_id": string,"order_return_id": string,"quantity": number
                  }
                  Update: {
                    "amount"?: number,"counter_id"?: string | null,"counter_name_snapshot"?: string | null,"gross_amount"?: number | null,"id"?: string,"net_amount"?: number | null,"order_item_id"?: string,"order_return_id"?: string,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_return_items_counter_id_fkey"
      columns: ["counter_id"]
isOneToOne: false
      referencedRelation: "counters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_return_items_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_return_items_order_return_id_fkey"
      columns: ["order_return_id"]
isOneToOne: false
      referencedRelation: "order_returns"
      referencedColumns: ["id"]
    }
                  ]
                },"order_returns": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"occurred_at": string,"order_id": string,"reason": string,"return_no": string,"total_amount": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"occurred_at"?: string,"order_id": string,"reason": string,"return_no": string,"total_amount"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"occurred_at"?: string,"order_id"?: string,"reason"?: string,"return_no"?: string,"total_amount"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_returns_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_returns_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"completed_at": string | null,"contact_id": string | null,"created_at": string,"created_by": string | null,"debt_total": number,"discount_total": number,"id": string,"note": string | null,"order_no": string,"ordered_at": string,"paid_total": number,"sale_channel": string,"status": string,"subtotal": number,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"contact_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"debt_total"?: number,"discount_total"?: number,"id"?: string,"note"?: string | null,"order_no": string,"ordered_at"?: string,"paid_total"?: number,"sale_channel"?: string,"status"?: string,"subtotal"?: number,"total"?: number
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"contact_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"debt_total"?: number,"discount_total"?: number,"id"?: string,"note"?: string | null,"order_no"?: string,"ordered_at"?: string,"paid_total"?: number,"sale_channel"?: string,"status"?: string,"subtotal"?: number,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_by": string | null,"id": string,"method": string,"note": string | null,"order_id": string,"paid_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_by"?: string | null,"id"?: string,"method": string,"note"?: string | null,"order_id": string,"paid_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_by"?: string | null,"id"?: string,"method"?: string,"note"?: string | null,"order_id"?: string,"paid_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"price_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": string,"new_price": number,"old_price": number | null,"price_list_id": string,"product_id": string,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: string,"new_price": number,"old_price"?: number | null,"price_list_id": string,"product_id": string,"reason"?: string | null
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: string,"new_price"?: number,"old_price"?: number | null,"price_list_id"?: string,"product_id"?: string,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_history_price_list_id_fkey"
      columns: ["price_list_id"]
isOneToOne: false
      referencedRelation: "price_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_history_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "price_history_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"price_list_items": {
                  Row: {
                    "id": string,"price": number,"price_list_id": string,"product_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"price": number,"price_list_id": string,"product_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "id"?: string,"price"?: number,"price_list_id"?: string,"product_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_list_items_price_list_id_fkey"
      columns: ["price_list_id"]
isOneToOne: false
      referencedRelation: "price_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_list_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "price_list_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_list_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"price_lists": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"is_default": boolean,"name": string,"valid_from": string | null,"valid_to": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string,"valid_from"?: string | null,"valid_to"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string,"valid_from"?: string | null,"valid_to"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_lists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"product_groups": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "barcode": string | null,"code": string,"cost_price": number,"counter_id": string | null,"created_at": string,"created_by": string | null,"group_id": string | null,"id": string,"is_active": boolean,"min_stock_qty": number | null,"name": string,"note": string | null,"tax_category_id": string | null,"track_stock": boolean,"unit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "barcode"?: string | null,"code": string,"cost_price"?: number,"counter_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id"?: string | null,"id"?: string,"is_active"?: boolean,"min_stock_qty"?: number | null,"name": string,"note"?: string | null,"tax_category_id"?: string | null,"track_stock"?: boolean,"unit_id": string
                  }
                  Update: {
                    "barcode"?: string | null,"code"?: string,"cost_price"?: number,"counter_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id"?: string | null,"id"?: string,"is_active"?: boolean,"min_stock_qty"?: number | null,"name"?: string,"note"?: string | null,"tax_category_id"?: string | null,"track_stock"?: boolean,"unit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_counter_id_fkey"
      columns: ["counter_id"]
isOneToOne: false
      referencedRelation: "counters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "product_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_tax_category_id_fkey"
      columns: ["tax_category_id"]
isOneToOne: false
      referencedRelation: "tax_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_daily_snapshots": {
                  Row: {
                    "avg_cost": number,"created_at": string,"product_id": string,"quantity": number,"snapshot_date": string,"value": number,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avg_cost"?: number,"created_at"?: string,"product_id": string,"quantity"?: number,"snapshot_date": string,"value"?: number,"warehouse_id": string
                  }
                  Update: {
                    "avg_cost"?: number,"created_at"?: string,"product_id"?: string,"quantity"?: number,"snapshot_date"?: string,"value"?: number,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_daily_snapshots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "stock_daily_snapshots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_daily_snapshots_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_document_lines": {
                  Row: {
                    "id": string,"note": string | null,"product_id": string,"quantity": number,"stock_document_id": string,"unit_cost": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"note"?: string | null,"product_id": string,"quantity": number,"stock_document_id": string,"unit_cost"?: number | null
                  }
                  Update: {
                    "id"?: string,"note"?: string | null,"product_id"?: string,"quantity"?: number,"stock_document_id"?: string,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_document_lines_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "stock_document_lines_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_document_lines_stock_document_id_fkey"
      columns: ["stock_document_id"]
isOneToOne: false
      referencedRelation: "stock_documents"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_documents": {
                  Row: {
                    "contact_id": string | null,"created_at": string,"created_by": string | null,"doc_no": string,"doc_type": string,"id": string,"note": string | null,"occurred_at": string,"status": string,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"doc_no": string,"doc_type": string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"status"?: string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null,"warehouse_id": string
                  }
                  Update: {
                    "contact_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"doc_no"?: string,"doc_type"?: string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"status"?: string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_documents_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_documents_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_documents_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_movements": {
                  Row: {
                    "avg_cost_after": number,"created_at": string,"created_by": string | null,"id": string,"movement_type": string,"note": string | null,"occurred_at": string,"product_id": string,"quantity": number,"ref_id": string | null,"ref_type": string | null,"unit_cost": number,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avg_cost_after"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"movement_type": string,"note"?: string | null,"occurred_at"?: string,"product_id": string,"quantity": number,"ref_id"?: string | null,"ref_type"?: string | null,"unit_cost"?: number,"warehouse_id": string
                  }
                  Update: {
                    "avg_cost_after"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"movement_type"?: string,"note"?: string | null,"occurred_at"?: string,"product_id"?: string,"quantity"?: number,"ref_id"?: string | null,"ref_type"?: string | null,"unit_cost"?: number,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_movements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "stock_movements_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"stocktake_lines": {
                  Row: {
                    "counted_qty": number | null,"diff_qty": number | null,"diff_value": number | null,"id": string,"product_id": string,"reason": string | null,"stocktake_id": string,"system_qty": number,"unit_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "counted_qty"?: number | null,"diff_qty"?: never,"diff_value"?: never,"id"?: string,"product_id": string,"reason"?: string | null,"stocktake_id": string,"system_qty": number,"unit_cost"?: number
                  }
                  Update: {
                    "counted_qty"?: number | null,"diff_qty"?: never,"diff_value"?: never,"id"?: string,"product_id"?: string,"reason"?: string | null,"stocktake_id"?: string,"system_qty"?: number,"unit_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "stocktake_lines_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_stock_summary"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "stocktake_lines_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stocktake_lines_stocktake_id_fkey"
      columns: ["stocktake_id"]
isOneToOne: false
      referencedRelation: "stocktakes"
      referencedColumns: ["id"]
    }
                  ]
                },"stocktakes": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"created_at": string,"created_by": string | null,"id": string,"note": string | null,"snapshot_taken_at": string,"status": string,"stocktake_date": string,"stocktake_no": string,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"snapshot_taken_at"?: string,"status"?: string,"stocktake_date": string,"stocktake_no": string,"warehouse_id": string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"snapshot_taken_at"?: string,"status"?: string,"stocktake_date"?: string,"stocktake_no"?: string,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stocktakes_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stocktakes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stocktakes_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"tax_categories": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"is_default": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tax_rules": {
                  Row: {
                    "created_at": string,"created_by": string | null,"effective_from": string,"effective_to": string | null,"id": string,"key": string,"source_note": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"effective_from": string,"effective_to"?: string | null,"id"?: string,"key": string,"source_note"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"effective_from"?: string,"effective_to"?: string | null,"id"?: string,"key"?: string,"source_note"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "tax_rules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "app_users"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"warehouses": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"is_active": boolean,"is_default": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "cash_ledger": {
                  Row: {
                    "amount": number | null,"category_id": string | null,"category_name": string | null,"contact_id": string | null,"description": string | null,"entry_no": string | null,"kind": string | null,"method": string | null,"occurred_at": string | null,"reversed_of": string | null,"source": string | null,"source_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"product_stock_summary": {
                  Row: {
                    "avg_cost": number | null,"product_id": string | null,"quantity": number | null,"value": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"revenue_ledger_lines": {
                  Row: {
                    "amount": number | null,"description": string | null,"doc_no": string | null,"occurred_at": string | null,"source_id": string | null,"source_type": string | null,"tax_category_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "approve_stocktake":
{ Args: { "p_stocktake_id": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"created_at": string,
"created_by": string | null,
"id": string,
"note": string | null,
"snapshot_taken_at": string,
"status": string,
"stocktake_date": string,
"stocktake_no": string,
"warehouse_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "stocktakes"
        isOneToOne: true
        isSetofReturn: false
      } },
"assert_period_not_locked":
{ Args: { "p_at": string }; Returns: undefined
                           },
"avg_cost_as_of":
{ Args: { "p_date": string,"p_product_id": string }; Returns: number
                           },
"bulk_set_price_list_item_prices":
{ Args: { "p_items": Json,"p_price_list_id": string,"p_reason"?: string }; Returns: {
              "id": string,
"price": number,
"price_list_id": string,
"product_id": string,
"updated_at": string,
"updated_by": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "price_list_items"
        isOneToOne: false
        isSetofReturn: true
      } },
"cancel_order":
{ Args: { "p_order_id": string,"p_reason": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"completed_at": string | null,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"debt_total": number,
"discount_total": number,
"id": string,
"note": string | null,
"order_no": string,
"ordered_at": string,
"paid_total": number,
"sale_channel": string,
"status": string,
"subtotal": number,
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"complete_order":
{ Args: { "p_order_id": string,"p_payments": Json }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"completed_at": string | null,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"debt_total": number,
"discount_total": number,
"id": string,
"note": string | null,
"order_no": string,
"ordered_at": string,
"paid_total": number,
"sale_channel": string,
"status": string,
"subtotal": number,
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"counter_daily_report":
{ Args: { "p_date_from": string,"p_date_to": string }; Returns: {
              "counter_id": string,"counter_name": string,"discount_amount": number,"gross_amount": number,"net_amount": number,"order_count": number,"report_date": string,"return_amount": number,"total_quantity": number
            }[]
                           },
"create_cash_entry":
{ Args: { "p_amount": number,"p_category_id": string,"p_contact_id"?: string,"p_description"?: string,"p_evidence_note"?: string,"p_kind": string,"p_method": string,"p_occurred_at": string }; Returns: {
              "amount": number,
"category_id": string,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"entry_no": string,
"evidence_note": string | null,
"id": string,
"kind": string,
"method": string,
"occurred_at": string,
"reversed_of": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "cash_entries"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_cash_entry_reversal":
{ Args: { "p_entry_id": string,"p_reason": string }; Returns: {
              "amount": number,
"category_id": string,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"entry_no": string,
"evidence_note": string | null,
"id": string,
"kind": string,
"method": string,
"occurred_at": string,
"reversed_of": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "cash_entries"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_draft_order":
{ Args: { "p_contact_id"?: string,"p_sale_channel"?: string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"completed_at": string | null,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"debt_total": number,
"discount_total": number,
"id": string,
"note": string | null,
"order_no": string,
"ordered_at": string,
"paid_total": number,
"sale_channel": string,
"status": string,
"subtotal": number,
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_manual_revenue_entry":
{ Args: { "p_amount": number,"p_description": string,"p_entry_date": string,"p_evidence_note"?: string,"p_payment_method": string,"p_tax_category_id": string }; Returns: {
              "amount": number,
"created_at": string,
"created_by": string | null,
"description": string,
"entry_date": string,
"entry_no": string,
"evidence_note": string | null,
"id": string,
"payment_method": string,
"reversed_of": string | null,
"tax_category_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "manual_revenue_entries"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_manual_revenue_entry_reversal":
{ Args: { "p_entry_id": string,"p_reason": string }; Returns: {
              "amount": number,
"created_at": string,
"created_by": string | null,
"description": string,
"entry_date": string,
"entry_no": string,
"evidence_note": string | null,
"id": string,
"payment_method": string,
"reversed_of": string | null,
"tax_category_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "manual_revenue_entries"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_return":
{ Args: { "p_lines": Json,"p_order_id": string,"p_reason": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"id": string,
"occurred_at": string,
"order_id": string,
"reason": string,
"return_no": string,
"total_amount": number
            }
                          SetofOptions: {
        from: "*"
        to: "order_returns"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_stocktake":
{ Args: { "p_note"?: string,"p_product_ids"?: (string)[],"p_stocktake_date": string,"p_warehouse_id": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"created_at": string,
"created_by": string | null,
"id": string,
"note": string | null,
"snapshot_taken_at": string,
"status": string,
"stocktake_date": string,
"stocktake_no": string,
"warehouse_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "stocktakes"
        isOneToOne: true
        isSetofReturn: false
      } },
"generate_cash_entry_no":
{ Args: { "p_kind": string,"p_occurred_at": string }; Returns: string
                           },
"generate_manual_revenue_entry_no":
{ Args: { "p_entry_date": string }; Returns: string
                           },
"generate_order_no":
{ Args: { "p_occurred_at": string }; Returns: string
                           },
"generate_product_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"generate_return_no":
{ Args: { "p_occurred_at": string }; Returns: string
                           },
"generate_stock_doc_no":
{ Args: { "p_doc_type": string,"p_occurred_at": string }; Returns: string
                           },
"generate_stocktake_no":
{ Args: { "p_created_at": string }; Returns: string
                           },
"generate_tax_category_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_tax_rule_value":
{ Args: { "p_as_of": string,"p_key": string }; Returns: Json
                           },
"inventory_flow_report":
{ Args: { "p_date_from": string,"p_date_to": string,"p_group_id"?: string,"p_warehouse_id"?: string }; Returns: {
              "begin_qty": number,"begin_value": number,"end_qty": number,"end_value": number,"in_qty": number,"in_value": number,"out_qty": number,"out_value": number,"product_code": string,"product_id": string,"product_name": string,"unit_name": string
            }[]
                           },
"is_app_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lock_period":
{ Args: { "p_note"?: string,"p_period_end": string,"p_period_start": string,"p_period_type": string }; Returns: {
              "created_at": string,
"id": string,
"lock_note": string | null,
"locked_at": string | null,
"locked_by": string | null,
"period_end": string,
"period_start": string,
"period_type": string,
"status": string,
"unlock_reason": string | null,
"unlocked_at": string | null,
"unlocked_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "ledger_periods"
        isOneToOne: true
        isSetofReturn: false
      } },
"post_stock_document":
{ Args: { "p_contact_id"?: string,"p_doc_type": string,"p_lines": Json,"p_note"?: string,"p_occurred_at"?: string,"p_warehouse_id": string }; Returns: {
              "contact_id": string | null,
"created_at": string,
"created_by": string | null,
"doc_no": string,
"doc_type": string,
"id": string,
"note": string | null,
"occurred_at": string,
"status": string,
"void_reason": string | null,
"voided_at": string | null,
"voided_by": string | null,
"warehouse_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "stock_documents"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_order_payment":
{ Args: { "p_amount": number,"p_method": string,"p_note"?: string,"p_order_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"completed_at": string | null,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"debt_total": number,
"discount_total": number,
"id": string,
"note": string | null,
"order_no": string,
"ordered_at": string,
"paid_total": number,
"sale_channel": string,
"status": string,
"subtotal": number,
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"resolve_counter":
{ Args: { "p_product_id": string }; Returns: string
                           },
"revenue_by_tax_category":
{ Args: { "p_period_end": string,"p_period_start": string }; Returns: {
              "gtgt_amount": number,"gtgt_rate": number,"revenue": number,"tax_category_code": string,"tax_category_id": string,"tax_category_name": string,"tncn_amount": number,"tncn_rate": number
            }[]
                           },
"save_draft_order_items":
{ Args: { "p_contact_id": string,"p_discount_total": number,"p_items": Json,"p_note": string,"p_order_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"completed_at": string | null,
"contact_id": string | null,
"created_at": string,
"created_by": string | null,
"debt_total": number,
"discount_total": number,
"id": string,
"note": string | null,
"order_no": string,
"ordered_at": string,
"paid_total": number,
"sale_channel": string,
"status": string,
"subtotal": number,
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_price_list_item_price":
{ Args: { "p_price": number,"p_price_list_id": string,"p_product_id": string,"p_reason"?: string }; Returns: {
              "id": string,
"price": number,
"price_list_id": string,
"product_id": string,
"updated_at": string,
"updated_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "price_list_items"
        isOneToOne: true
        isSetofReturn: false
      } },
"snapshot_stock":
{ Args: { "p_date": string }; Returns: undefined
                           },
"stock_as_of":
{ Args: { "p_date": string,"p_product_id": string,"p_warehouse_id": string }; Returns: number
                           },
"stock_as_of_total":
{ Args: { "p_date": string,"p_product_id": string }; Returns: number
                           },
"stock_on_hand":
{ Args: { "p_as_of"?: string,"p_product_id": string,"p_warehouse_id": string }; Returns: number
                           },
"stock_on_hand_total":
{ Args: { "p_as_of"?: string,"p_product_id": string }; Returns: number
                           },
"stock_summary_as_of":
{ Args: { "p_date": string }; Returns: {
              "avg_cost": number,"product_id": string,"quantity": number,"value": number
            }[]
                           },
"unlock_period":
{ Args: { "p_id": string,"p_reason": string }; Returns: {
              "created_at": string,
"id": string,
"lock_note": string | null,
"locked_at": string | null,
"locked_by": string | null,
"period_end": string,
"period_start": string,
"period_type": string,
"status": string,
"unlock_reason": string | null,
"unlocked_at": string | null,
"unlocked_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "ledger_periods"
        isOneToOne: true
        isSetofReturn: false
      } },
"vn_day_end_exclusive":
{ Args: { "p_date": string }; Returns: string
                           },
"vn_day_start":
{ Args: { "p_date": string }; Returns: string
                           },
"void_stock_document":
{ Args: { "p_document_id": string,"p_reason": string }; Returns: {
              "contact_id": string | null,
"created_at": string,
"created_by": string | null,
"doc_no": string,
"doc_type": string,
"id": string,
"note": string | null,
"occurred_at": string,
"status": string,
"void_reason": string | null,
"voided_at": string | null,
"voided_by": string | null,
"warehouse_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "stock_documents"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
