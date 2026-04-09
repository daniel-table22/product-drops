"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CalendarDays,
  ShoppingBag,
  Users,
  Package,
  Store,
  Settings,
  ExternalLink,
  Bell,
  HelpCircle,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const mainNav: NavItem = { label: "Dashboard", href: "/dashboard", icon: LayoutGrid };

const programItems: NavItem[] = [
  { label: "Drops",     href: "/dashboard/drops",     icon: CalendarDays },
  { label: "Orders",    href: "/dashboard/orders",    icon: ShoppingBag },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Products",  href: "/dashboard/products",  icon: Package },
  { label: "Store",     href: "/dashboard/store",     icon: Store },
  { label: "Settings",  href: "/dashboard/settings",  icon: Settings },
];

type ActiveDrop = { id: string; name: string; slug: string };

function NavButton({
  href,
  icon: Icon,
  label,
  active,
  external,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  external?: boolean;
}) {
  const className = [
    "flex items-center gap-2 px-2 py-2 rounded-md w-full text-sm transition-colors",
    active
      ? "bg-neutral-3 text-neutral-12 font-medium"
      : "text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12",
  ].join(" ");

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon size={16} className="shrink-0 opacity-70" />
        <span className="flex-1 truncate">{label}</span>
        <ExternalLink size={14} className="shrink-0 opacity-40" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <Icon size={16} className="shrink-0 opacity-70" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-2">
      <p className="text-xs font-semibold text-neutral-11 tracking-wide uppercase">{children}</p>
    </div>
  );
}

export function Sidenav({
  partnerSlug,
  activeDrops,
}: {
  partnerSlug: string;
  activeDrops: ActiveDrop[];
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-neutral-2 border-r border-neutral-6 flex flex-col px-3 py-6">

      {/* Logo */}
      <div className="mb-6 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Logo" className="h-6 w-auto" />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto">

        {/* No-header group: Dashboard */}
        <div>
          <NavButton
            href={mainNav.href}
            icon={mainNav.icon}
            label={mainNav.label}
            active={isActive(mainNav.href)}
          />
        </div>

        {/* Program */}
        <div>
          <SectionHeading>Program</SectionHeading>
          <div className="flex flex-col">
            {programItems.map((item) => (
              <NavButton
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(item.href)}
              />
            ))}
          </div>
        </div>

        {/* Links */}
        {partnerSlug && (
          <div>
            <SectionHeading>Links</SectionHeading>
            <div className="flex flex-col">
              <NavButton
                href={`/s/${partnerSlug}`}
                icon={Store}
                label="Storefront"
                external
              />
              {activeDrops.map((drop) => (
                <NavButton
                  key={drop.id}
                  href={`/s/${partnerSlug}/d/${drop.slug}`}
                  icon={CalendarDays}
                  label={drop.name}
                  external
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-6 pt-2 flex flex-col mt-4">
        <NavButton href="/dashboard/settings#notifications" icon={Bell} label="Notifications" />
        <NavButton href="mailto:help@productdrops.com" icon={HelpCircle} label="Help & support" external />
      </div>
    </aside>
  );
}
