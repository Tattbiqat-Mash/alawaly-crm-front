import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  return <AdminShell>{children}</AdminShell>;
}
