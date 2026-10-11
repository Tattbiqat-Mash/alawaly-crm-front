// All API paths in one place (relative to /api/v2). Paths only, no request logic.
type Id = string | number;

/** Staff API: everything outside /owner/*. Called through the staff BFF (/bff/staff). */
export const staffEndpoints = {
  login: "/auth/login",
  logout: "/auth/logout",
  me: "/me",

  units: "/units",
  unit: (id: Id) => `/units/${id}`,
  unitStatus: (id: Id) => `/units/${id}/status`,
  unitStatusHistory: (id: Id) => `/units/${id}/status-history`,
  unitPriceChanges: (id: Id) => `/units/${id}/price-changes`,
  unitOwnershipHistory: (id: Id) => `/units/${id}/ownership-history`,
  unitEligibility: (id: Id) => `/units/${id}/eligibility`,
  unitAvailability: (id: Id) => `/units/${id}/availability`,
  priceChanges: "/price-changes",
  approvePriceChange: (id: Id) => `/price-changes/${id}/approve`,
  rejectPriceChange: (id: Id) => `/price-changes/${id}/reject`,
  unitsImport: "/units/import",
  unitsDuplicates: "/units-duplicates",
  projects: "/projects",
  project: (id: Id) => `/projects/${id}`,
  buildings: "/buildings",
  building: (id: Id) => `/buildings/${id}`,
  unitTypes: "/unit-types",
  unitType: (id: Id) => `/unit-types/${id}`,
  lookups: (type: string) => `/lookups/${type}`,

  reservations: "/reservations",
  reservation: (id: Id) => `/reservations/${id}`,
  extendReservation: (id: Id) => `/reservations/${id}/extend`,
  cancelReservation: (id: Id) => `/reservations/${id}/cancel`,

  sales: "/sales",
  sale: (id: Id) => `/sales/${id}`,
  saleTransition: (id: Id) => `/sales/${id}/transition`,
  saleCancel: (id: Id) => `/sales/${id}/cancel`,
  saleInstallments: (id: Id) => `/sales/${id}/installments`,
  generateInstallments: (id: Id) => `/sales/${id}/installments/generate`,
  installment: (id: Id) => `/installments/${id}`,
  saleDocuments: (id: Id) => `/sales/${id}/documents`,
  saleDocumentLink: (id: Id, docId: Id) => `/sales/${id}/documents/${docId}/link`,
  saleHandover: (id: Id) => `/sales/${id}/handover`,
  saleWarranties: (id: Id) => `/sales/${id}/warranties`,
  warrantyPolicies: "/warranty-policies",
  warrantyPolicy: (id: Id) => `/warranty-policies/${id}`,
  warranties: "/warranties",
  handovers: "/handovers",
  handover: (id: Id) => `/handovers/${id}`,
  inspectHandover: (id: Id) => `/handovers/${id}/inspect`,
  handoverItems: (id: Id) => `/handovers/${id}/items`,
  handoverItem: (id: Id) => `/handover-items/${id}`,
  closeHandover: (id: Id) => `/handovers/${id}/close`,
  ownerships: "/ownerships",
  transferOwnership: (unitId: Id) => `/units/${unitId}/ownership/transfer`,

  paymentsInitiate: "/payments/initiate",
  payment: (id: Id) => `/payments/${id}`,
  paymentTransactions: "/payment-transactions",
  confirmOffline: "/payments/confirm-offline",
  approveTransaction: (id: Id) => `/payment-transactions/${id}/approve`,
  rejectTransaction: (id: Id) => `/payment-transactions/${id}/reject`,
  refundTransaction: (id: Id) => `/payment-transactions/${id}/refund`,
  reconcile: "/payments/reconcile",

  serviceRequests: "/service-requests",
  serviceRequest: (id: Id) => `/service-requests/${id}`,
  serviceRequestAction: (id: Id, action: string) => `/service-requests/${id}/${action}`,
  serviceAttachmentLink: (attId: Id) => `/service-attachments/${attId}/link`,
  visit: (id: Id) => `/visits/${id}`,
  visitMaterials: (id: Id) => `/visits/${id}/materials`,
  maintenance: (resource: "teams" | "technicians" | "contractors") => `/maintenance/${resource}`,
  maintenanceItem: (resource: "teams" | "technicians" | "contractors", id: Id) => `/maintenance/${resource}/${id}`,
  notificationTemplates: "/notification-templates",
  notificationTemplate: (id: Id) => `/notification-templates/${id}`,

  facilities: "/facilities",
  facility: (id: Id) => `/facilities/${id}`,
  assets: "/assets",
  asset: (id: Id) => `/assets/${id}`,
  assetHistory: (id: Id) => `/assets/${id}/history`,
  pmSchedules: "/pm-schedules",
  pmSchedule: (id: Id) => `/pm-schedules/${id}`,
  pmTasks: "/pm-tasks",
  pmTaskAction: (id: Id, action: "start" | "complete" | "skip") => `/pm-tasks/${id}/${action}`,
  incidents: "/incidents",
  incidentAction: (id: Id, action: "investigate" | "resolve" | "close") => `/incidents/${id}/${action}`,

  reports: {
    inventorySummary: "/reports/inventory-summary",
    salesSummary: "/reports/sales-summary",
    serviceWorkload: "/reports/service-workload",
    facilitiesSummary: "/reports/facilities-summary",
    integrations: "/reports/integrations",
  },

  exports: (what: "units" | "sales" | "payments" | "service-requests") => `/exports/${what}`,
} as const;

/**
 * Owner API: only /owner/*. Called through the owner BFF (/bff/owner), which adds the
 * /owner prefix, so these paths are relative to /api/v2/owner.
 */
export const ownerEndpoints = {
  requestCode: "/auth/code",
  verify: "/auth/verify",
  logout: "/auth/logout",

  units: "/units",
  sales: "/sales",
  saleInstallments: (saleId: Id) => `/sales/${saleId}/installments`,
  saleHandover: (saleId: Id) => `/sales/${saleId}/handover`,
  serviceRequests: "/service-requests",
  notifications: "/notifications",
} as const;
