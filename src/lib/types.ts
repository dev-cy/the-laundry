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
  transaction_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface Schedule {
  id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  service_type: "pickup" | "delivery" | "both";
  scheduled_date: string;
  scheduled_time: string | null;
  scheduled_time_out: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
}

export interface InventoryItem {
  id: string;
  branch_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
  branches?: Branch;
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
