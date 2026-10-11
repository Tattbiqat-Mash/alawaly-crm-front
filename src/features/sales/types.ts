// Shapes recorded in the Frontend Guide (reservations, sales, installments, documents, warranties).

export type Reservation = {
  id: number;
  client_id: number | null;
  unit_id: number;
  /** Legacy unit-style status ("reserved"); the reservation flow uses `state`. */
  status: string;
  state: string;
  expires_at: string | null;
  payment_status: string | null;
  payment_amount: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by: number | null;
  created_by_user: number | null;
};

export type Sale = {
  id: number;
  unit_id: number;
  client_id: number;
  reservation_id: number | null;
  status: string;
  price_agreed: string;
  price_basis: string | null;
  sold_at: string | null;
  contracted_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type Installment = {
  id: number;
  sale_id: number;
  unit_id: number;
  client_id: number;
  amount: string;
  status: string;
  state: string | null;
  date: string;
  method: string | null;
  paid_at: string | null;
  confirmed_by: number | null;
  project_percentage: number | null;
  payment_titleAr: string | null;
  payment_titleEn: string | null;
};

/** GET /sales/{id}/installments carries money totals in `meta`, not paging. */
export type InstallmentSchedule = { items: Installment[]; total: string | number | null; paid: string | number | null };

export type SaleDocument = {
  id: number;
  type: string;
  version: number;
  original_name: string;
  mime: string;
  size: number;
  checksum: string;
  superseded_by?: number | null;
  created_at?: string;
};

export type WarrantyPolicy = {
  id: number;
  category: string;
  name_ar: string | null;
  name_en: string | null;
  months: number | null;
  terms_ar: string | null;
  terms_en: string | null;
  /** 1 / 0, or null while the business has not decided ("undecided"). */
  transferable: boolean | 0 | 1 | null;
  active: boolean | 0 | 1;
  created_at?: string;
  updated_at?: string;
};

export type Warranty = {
  id: number;
  sale_id: number | null;
  unit_id: number;
  policy_id: number;
  starts_on: string;
  expires_on: string;
  expiry_notified_at: string | null;
};

export type SaleHandover = {
  id: number;
  sale_id: number;
  status: string;
  scheduled_at: string | null;
  inspected_at?: string | null;
  accepted_at?: string | null;
  accepted_by_client_id?: number | null;
  inspected_by?: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CancelSaleResult = { sale: Sale; paid_total_to_review_for_refund: string | number };
