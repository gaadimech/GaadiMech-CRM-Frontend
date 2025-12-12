export type LeadStatus =
  | "Did Not Pick Up"
  | "Needs Followup"
  | "Confirmed"
  | "Open"
  | "Completed"
  | "Feedback"
  | "New Lead";

export interface Lead {
  id: number;
  customer_name: string;
  mobile: string;
  car_registration?: string | null;
  car_model?: string | null;
  followup_date: string; // ISO string in UTC
  status: LeadStatus;
  remarks?: string | null;
  creator_id: number;
  creator_name?: string;
  created_at?: string;
  modified_at?: string;
}

export interface QueueItem extends Lead {
  overdue: boolean;
}

export interface QueueResponse {
  date: string;
  items: QueueItem[];
}

export interface BulkStatusRequest {
  lead_ids: number[];
  status: LeadStatus;
  remarks?: string;
}

export interface BulkRescheduleRequest {
  lead_ids: number[];
  followup_date: string; // YYYY-MM-DD (IST intended)
  remarks?: string;
}

export interface WhatsAppSendRequest {
  lead_id: number;
  template_id?: string;
  message?: string;
  schedule_at?: string; // ISO
}

