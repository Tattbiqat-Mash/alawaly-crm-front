// Report shapes recorded in the Frontend Guide (GET /reports/*).

export type InventorySummary = {
  units_total: number;
  by_status: Record<string, number>;
  by_project: { id: number; nameEn: string; nameAr?: string; units: number; available: string | number }[];
  inactive_units: number;
  without_unit_type: number;
  duplicate_groups: number;
};

export type SalesSummary = {
  sales_by_status: { status: string; count: number; value: string }[];
  /** Recorded as a number (not a decimal string) — see DECISIONS.md. */
  collected: number | string;
  refunded: number | string;
  installments_outstanding: number | string;
  reservations_by_state: Record<string, number>;
};

export type ServiceWorkload = {
  technicians: { id: number; name: string; open_visits: number }[];
  sla_breached: number;
  open_requests: number;
  average_rating: number | null;
};

export type FacilitiesSummary = {
  assets_by_status: Record<string, number>;
  tasks_overdue: number;
  tasks_open: number;
  incidents_open: number;
  incidents_critical_open: number;
};

export type IntegrationHealth = {
  by_status: Record<string, number>;
  dead: number;
  oldest_pending: string | null;
  subscriptions: Record<string, string[]>;
  systems_configured: string[];
};
