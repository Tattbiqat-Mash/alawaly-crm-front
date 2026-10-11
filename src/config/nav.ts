import {
  BadgeCheck,
  Bell,
  Boxes,
  Building,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Copy,
  CreditCard,
  Download,
  FileText,
  Handshake,
  HardHat,
  Home,
  KeyRound,
  LayoutDashboard,
  Layers,
  ListChecks,
  Plug,
  Receipt,
  RotateCcw,
  Scale,
  ScrollText,
  ShieldCheck,
  Siren,
  Tags,
  Upload,
  Users,
  UserSquare,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "./permissions";

export type NavItemKey = keyof (typeof import("../messages/en.json"))["nav"]["items"];
export type NavGroupKey = keyof (typeof import("../messages/en.json"))["nav"]["groups"];

export type NavItem = {
  key: NavItemKey;
  href: string;
  icon: LucideIcon;
  /** Any one is enough; null = every signed-in staff user. */
  permissions: readonly Permission[] | null;
  /** Screens not built yet stay out of the menu (no dead links). */
  ready: boolean;
};

export type NavGroup = { key: NavGroupKey; items: NavItem[] };

// Order and grouping follow wireframe S42; routes follow the screen map.
export const NAV: NavGroup[] = [
  {
    key: "overview",
    items: [{ key: "dashboard", href: "/", icon: LayoutDashboard, permissions: null, ready: true }],
  },
  {
    key: "inventory",
    items: [
      { key: "units", href: "/units", icon: Home, permissions: ["inventory.view"], ready: true },
      { key: "priceApprovals", href: "/price-changes", icon: BadgeCheck, permissions: ["pricing.approve"], ready: true },
      { key: "importUnits", href: "/units/import", icon: Upload, permissions: ["inventory.import"], ready: true },
      { key: "duplicates", href: "/units/duplicates", icon: Copy, permissions: ["inventory.admin"], ready: true },
      { key: "projects", href: "/projects", icon: Building2, permissions: ["inventory.view"], ready: true },
      { key: "buildings", href: "/buildings", icon: Building, permissions: ["inventory.view"], ready: true },
      { key: "unitTypes", href: "/unit-types", icon: Tags, permissions: ["inventory.view"], ready: true },
    ],
  },
  {
    key: "sales",
    items: [
      { key: "reservations", href: "/reservations", icon: CalendarClock, permissions: ["sales.view"], ready: true },
      { key: "sales", href: "/sales", icon: Handshake, permissions: ["sales.view"], ready: true },
      { key: "handovers", href: "/handovers", icon: KeyRound, permissions: ["sales.view"], ready: false },
      { key: "ownership", href: "/ownership", icon: UserSquare, permissions: ["ownership.manage", "sales.view"], ready: false },
    ],
  },
  {
    key: "finance",
    items: [
      { key: "transactions", href: "/payments", icon: CreditCard, permissions: ["finance.view"], ready: false },
      {
        key: "confirmations",
        href: "/payments/confirmations",
        icon: ClipboardCheck,
        permissions: ["finance.confirm", "finance.confirm.second"],
        ready: false,
      },
      { key: "refunds", href: "/payments/refunds", icon: RotateCcw, permissions: ["finance.refund"], ready: false },
      { key: "reconciliation", href: "/payments/reconcile", icon: Scale, permissions: ["finance.reconcile"], ready: false },
    ],
  },
  {
    key: "afterSales",
    items: [
      { key: "serviceDesk", href: "/service-requests", icon: Wrench, permissions: ["service.view", "service.manage"], ready: false },
      { key: "warranty", href: "/warranty", icon: ShieldCheck, permissions: ["warranty.manage"], ready: false },
      { key: "teams", href: "/maintenance", icon: HardHat, permissions: ["maint.manage"], ready: false },
      {
        key: "notificationTemplates",
        href: "/notification-templates",
        icon: Bell,
        permissions: ["notifications.manage"],
        ready: false,
      },
    ],
  },
  {
    key: "facilities",
    items: [
      { key: "facilities", href: "/facilities", icon: Boxes, permissions: ["facility.manage"], ready: false },
      { key: "maintenancePlan", href: "/maintenance-plan", icon: ListChecks, permissions: ["facility.manage"], ready: false },
      { key: "incidents", href: "/incidents", icon: Siren, permissions: ["facility.manage"], ready: false },
    ],
  },
  {
    key: "rentals",
    items: [
      { key: "mandates", href: "/rentals/mandates", icon: FileText, permissions: ["rental.view", "rental.manage"], ready: false },
      { key: "tenants", href: "/rentals/tenants", icon: Users, permissions: ["rental.manage"], ready: false },
      { key: "leases", href: "/rentals/leases", icon: Layers, permissions: ["rental.view", "rental.manage"], ready: false },
      { key: "rentCollection", href: "/rentals/rent", icon: Wallet, permissions: ["rental.view", "rental.manage"], ready: false },
      { key: "statements", href: "/rentals/statements", icon: Receipt, permissions: ["rental.view", "rental.manage"], ready: false },
    ],
  },
  {
    key: "data",
    items: [{ key: "exports", href: "/data", icon: Download, permissions: ["reports.view", "sales.docs"], ready: false }],
  },
  {
    key: "administration",
    items: [
      { key: "roles", href: "/admin/roles", icon: KeyRound, permissions: ["admin.roles"], ready: false },
      { key: "users", href: "/admin/users", icon: Users, permissions: ["admin.users"], ready: false },
      { key: "audit", href: "/admin/audit", icon: ScrollText, permissions: ["audit.view"], ready: false },
      { key: "integrations", href: "/admin/integrations", icon: Plug, permissions: ["integrations.manage"], ready: false },
    ],
  },
];

/** Groups and items the user may see; a group appears only when it has at least one item. */
export function visibleNav(can: (p: readonly Permission[]) => boolean): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.ready && (item.permissions === null || can(item.permissions))),
  })).filter((group) => group.items.length > 0);
}

