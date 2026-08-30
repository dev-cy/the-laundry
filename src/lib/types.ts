export interface ReportEntry {
  id?: string;
  report_id?: string;
  customer_name: string;
  total_payment: number;
  payment_received: boolean;
  created_at?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  slug: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  branch_id: string;
  report_date: string;
  staff_names: string;
  qty_1: number;
  qty_5: number;
  qty_10: number;
  qty_20: number;
  qty_50: number;
  qty_100: number;
  qty_200: number;
  qty_500: number;
  qty_1000: number;
  total_cash: number;
  unpaid: number;
  unpaid_previous: number;
  total_sales: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface Transaction {
  id: string;
  branch_id: string;
  customer_name: string | null;
  description: string;
  amount: number;
  payment_status: "paid" | "unpaid" | "partial";
  payment_method: "cash" | "gcash" | "bank";
  service_type: "regular" | "blankets" | "comforters";
  weight_kg_whole: number;
  weight_kg_frac: number;
  transaction_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface Schedule {
  id: string;
  branch_id: string;
  staff_id?: string | null;
  customer_name: string;
  customer_phone: string | null;
  service_type: "pickup" | "delivery" | "both";
  scheduled_date: string;
  scheduled_time: string | null;
  scheduled_time_out: string | null;
  actual_time_in?: string | null;
  actual_time_out?: string | null;
  overtime_minutes?: number;
  undertime_minutes?: number;
  daily_pay_override?: number | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface InventoryCatalog {
  id: string;
  sku: string;
  item_name: string;
  unit: string;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  branch_id: string;
  catalog_id: string;
  quantity: number;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
  inventory_catalog?: InventoryCatalog;
}

export interface Staff {
  id: string;
  branch_id: string;
  name: string;
  birthday: string | null;
  address: string | null;
  phone_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  date_hired: string | null;
  salary: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface StaffCashAdvance {
  id: string;
  staff_id: string;
  branch_id: string;
  amount: number;
  advance_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashRelease {
  id: string;
  branch_id: string;
  amount: number;
  release_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface Expense {
  id: string;
  branch_id: string;
  amount: number;
  expense_date: string;
  description: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export type CashQuantities = {
  qty_1: number;
  qty_5: number;
  qty_10: number;
  qty_20: number;
  qty_50: number;
  qty_100: number;
  qty_200: number;
  qty_500: number;
  qty_1000: number;
};
