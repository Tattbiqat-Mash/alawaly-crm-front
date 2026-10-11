import { OwnerShell } from "@/components/layout/owner-shell";

export default function OwnerPortalLayout({ children }: LayoutProps<"/[locale]">) {
  return <OwnerShell>{children}</OwnerShell>;
}
