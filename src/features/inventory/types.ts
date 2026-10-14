// Shapes recorded in the Frontend Guide. Field names are kept exactly as the API sends them,
// including legacy spellings (availabilty_date, furnatures_status).

type Flag = 0 | 1 | boolean;

export type UnitListItem = {
  id: number;
  crm_unit_id: string | null;
  project_id: number | null;
  building_id: number | null;
  unit_type_id: number | null;
  unit_number: string | null;
  unit_code: string | null;
  floor_num: number | null;
  status: string | null;
  construction_status: string | null;
  availability: string | null;
  active: Flag;
  rooms: number | null;
  bathrooms: number | null;
  total_area: string | null;
  price_in_tax: string | null;
  price_ex_tax: string | null;
  reservation_amount: string | null;
  version: number;
  updated_at: string;
};

export type Unit = UnitListItem & {
  unit_deed_no: string | null;
  availabilty_date: string | null;
  ownership_style: string | null;
  unit_template_id: number | null;
  unit_reserved: Flag;
  is_payment_available: Flag;
  reserved_by_crm_lead_id: string | null;
  client_id: number | null;
  broker_id: number | null;
  is_featured: Flag | null;
  finishing_type_id: number | null;
  entrances: number | null;
  building_area: string | null;
  terrace_area: string | null;
  facade_id: number | null;
  comments: string | null;
  price_total: string | null;
  price_meter_ex_tax: string | null;
  price_meter_in_tax: string | null;
  promotion_price: string | null;
  deed_status: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  furnatures_status: string | null;
  display_order: number | null;
  created_at: string;
};

/** A unit plus its ETag (equal to `version`), needed for If-Match on edits and status changes. */
export type VersionedUnit = { unit: Unit; etag: string };

/**
 * Fields the details form may send in PATCH /units/{id} (status, prices, client_id, version are
 * refused). On a template-linked unit, a shared field that differs from the template becomes an override.
 */
export type UnitPatch = Partial<{
  unit_type_id: number | null;
  unit_template_id: number | null;
  unit_number: string | null;
  unit_code: string | null;
  floor_num: number | null;
  unit_deed_no: string | null;
  facade_id: number | null;
  finishing_type_id: number | null;
  rooms: number | null;
  bathrooms: number | null;
  entrances: number | null;
  total_area: string | null;
  building_area: string | null;
  terrace_area: string | null;
  construction_status: string | null;
  availabilty_date: string | null;
  display_order: number | null;
  is_featured: boolean;
  active: boolean;
  descriptionAr: string | null;
  descriptionEn: string | null;
  comments: string | null;
}>;

export type Project = {
  id: number;
  crm_project_id: string | null;
  nameAr: string | null;
  nameEn: string | null;
  status: string | null;
  availability: string | null;
  active: Flag;
  city_id: number | null;
  display_order: number | null;
  updated_at: string;
  // Returned by GET /projects/{id} (and create/update); may be absent in list rows.
  developing_percentage?: number | null;
  featured?: Flag | null;
};

export type Building = {
  id: number;
  crm_building_id: string | null;
  building_code: string | null;
  project_id: number | null;
  stage_id: number | null;
  floors_count: number | null;
  active: Flag;
  updated_at: string;
  addressAr?: string | null;
  addressEn?: string | null;
};

export type UnitType = {
  id: number;
  nameEn: string | null;
  nameAr: string | null;
  crm_unit_type_id: string | null;
  crm_value: string | null;
  active: Flag;
};

export type StatusHistoryEntry = {
  id: number;
  unit_id: number;
  from_status: string | null;
  to_status: string;
  source: string;
  actor_id: number | null;
  reason: string | null;
  created_at: string;
};

export const PRICE_FIELDS = ["price_in_tax", "price_ex_tax", "price_total", "promotion_price", "reservation_amount"] as const;
export type PriceField = (typeof PRICE_FIELDS)[number];

export type PriceChange = {
  id: number;
  unit_id: number;
  field: string;
  old_value: string | null;
  new_value: string;
  status: string;
  source: string;
  reason: string | null;
  requested_by: number | null;
  approved_by: number | null;
  effective_from: string | null;
  decided_at: string | null;
  created_at: string;
};

export type PriceChangeInput = {
  field: PriceField;
  /** Decimal string; never a float. */
  new_value: string;
  reason?: string;
  effective_from?: string;
};

export type StatusChangeInput = { status: "available" | "unavailable" | "hidden"; reason?: string };

export type OwnershipRecord = {
  id: number;
  unit_id: number;
  client_id: number;
  sale_id: number | null;
  from_date: string;
  to_date: string | null;
  source: string;
  note: string | null;
};

export type Eligibility = {
  unit_id: number;
  after_sales: boolean;
  warranty: boolean;
  reasons: string[];
  warranties: { id: number; category: string; starts_on: string; expires_on: string }[];
};

export type Availability = {
  unit_id: number;
  available: boolean;
  status: string | null;
  reasons: string[];
  reservation_amount: string | null;
  hold_hours: number | null;
};

/** A named record nested in a project (developer, country, city). */
export type NamedRef = { id: number; nameAr: string | null; nameEn: string | null };

export type ProjectStage = NamedRef & { active: Flag; project_id: number; start_date: string | null };

export type ProjectDocument = { name: string; url: string };

/** GET /projects/{id}: JSON fields decoded, plus resolved relations, stats and buildings. */
export type ProjectDetail = Project & {
  project_code?: string | null;
  developer_id?: number | null;
  country_id?: number | null;
  license_num?: string | null;
  addressEn?: string | null;
  location_lang_lat?: string | null;
  documents?: ProjectDocument[] | null;
  developing_start_date?: string | null;
  developing_end_date?: string | null;
  estimated_delivery_date?: string | null;
  descriptionEn?: string | null;
  media?: string[] | null;
  project_image?: string | null;
  features?: number[] | null;
  total_area?: string | null;
  current_stages?: number | null;
  created_at?: string;
  developer?: NamedRef | null;
  country?: NamedRef | null;
  city?: NamedRef | null;
  current_stage?: ProjectStage | null;
  stages?: ProjectStage[];
  feature_items?: NamedRef[];
  stats?: { buildings_count: number; units_count: number; units_by_status: { status: string; count: number }[] | Record<string, number> };
  buildings?: Building[];
};

export const FEATURE_TYPES = ["project", "building", "unit"] as const;
export type FeatureType = (typeof FEATURE_TYPES)[number];

/** GET /features: one catalogue, typed project, building or unit. */
export type Feature = NamedRef & { feature_type: FeatureType; active: Flag; created_at?: string; updated_at?: string };

/** GET /unit-templates (= unit styles): the data units share. */
export type UnitTemplate = {
  id: number;
  style_code: string | null;
  nameAr?: string | null;
  nameEn: string | null;
  unit_type_id: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: string | null;
  price_in_tax: string | null;
  active: Flag;
  updated_at: string;
  units_count?: number;
};

/** GET /unit-templates/{id}: JSON fields (unit_media, features) arrive as JSON text. */
export type UnitTemplateDetail = UnitTemplate & {
  entrances?: number | null;
  building_area?: string | null;
  terrace_area?: string | null;
  price_ex_tax?: string | null;
  price_total?: string | null;
  reservation_amount?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  main_image?: string | null;
  unit_layout?: string | null;
  unit_media?: string | UnitMedia | null;
  features?: string | number[] | null;
};

export type UnitMedia = { unit_image?: string[]; unit_plan?: string[] };

/** PATCH /unit-templates/{id} meta: prices are stored on the template but never pushed to units. */
export type TemplateSaveMeta = { units_updated: number; prices_not_propagated: string[] };

/** One floor of a floors payload: a single floor_num, or floor_from..floor_to repeating the layout. */
export type FloorInput = ({ floor_num: number } | { floor_from: number; floor_to: number }) & {
  templates: { template_id: number; count: number }[];
};

/** GET /buildings/{id}/floor-templates: every floor, its units grouped by template. */
export type FloorLayout = {
  building_id: number;
  building_code: string | null;
  floors_count: number | null;
  floors: {
    floor_num: number;
    templates: {
      template_id: number | null;
      style_code: string | null;
      units_count: number;
      units: { id: number; unit_number: string | null; unit_code: string | null; status: string | null }[];
    }[];
  }[];
};

export type CloneResult = { building_id: number; building_code: string; units_created: number };

/** GET /lookups/{type}: read-only CRM lookup values. */
export type LookupValue = { id: number; crm_id: string | null; nameAr: string | null; nameEn: string | null; data_type: string; active: Flag };
