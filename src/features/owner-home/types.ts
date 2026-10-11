// Owner-scoped shapes recorded in the Frontend Guide (GET /owner/*). The portal shows only
// what these endpoints return for the signed-in owner.

export type OwnerUnit = {
  id: number;
  project_id: number | null;
  building_id: number | null;
  unit_number: string | null;
  unit_code: string | null;
  status: string | null;
  owned_since: string | null;
  ownership_source: string | null;
};

export type OwnerSale = {
  id: number;
  unit_id: number;
  status: string;
  price_agreed: string | null;
  price_basis: string | null;
  sold_at: string | null;
  contracted_at: string | null;
  cancelled_at: string | null;
};

export type OwnerInstallment = {
  id: number;
  amount: string;
  status: string;
  date: string;
  paid_at: string | null;
  state: string | null;
  payment_titleAr: string | null;
  payment_titleEn: string | null;
};

export type OwnerServiceRequest = { id: number; title: string; status: string; type: string; priority: string; created_at: string };

export type OwnerNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: 0 | 1 | boolean;
  read_at: string | null;
  created_at: string;
};

export type OwnerHandover = {
  id: number;
  sale_id: number;
  status: string;
  scheduled_at: string | null;
  accepted_at: string | null;
};
