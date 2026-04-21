"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutGrid,
  CalendarDays,
  Users,
  Package,
  Store,
  Settings,
  ExternalLink,
  Megaphone,
  LogOut,
  GalleryHorizontal,
  Info,
  X,
  FlaskConical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toggleUiTestMode } from "@/app/(partner)/dashboard/settings/actions";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const mainNav: NavItem = { label: "Dashboard", href: "/dashboard", icon: LayoutGrid };

const programItems: NavItem[] = [
  { label: "Drops",    href: "/dashboard/drops",     icon: CalendarDays },
  { label: "Audience", href: "/dashboard/customers", icon: Users },
  { label: "Items",    href: "/dashboard/products",  icon: Package },
  { label: "Store",    href: "/dashboard/store",     icon: Store },
  { label: "Settings", href: "/dashboard/settings",  icon: Settings },
];

const marketingItems: NavItem[] = [
  { label: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
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

function AdminDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-neutral-6 shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-6">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} className="text-neutral-9" />
            <p className="text-sm font-semibold text-neutral-12">Admin features</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-9 hover:text-neutral-12 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 text-sm">
          <p className="text-neutral-10 text-xs">
            Only visible to <span className="font-mono">@table22.com</span> accounts. Turn on Testing mode in the nav to enable these features.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-11 uppercase tracking-wide">Orders</p>
            <ul className="space-y-1.5 text-neutral-11">
              <li className="flex gap-2"><span className="text-neutral-8 mt-0.5">•</span><span>Seed fake orders — "Autofill partial" and "Autofill full" buttons appear on any drop's Orders tab</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-11 uppercase tracking-wide">Audience</p>
            <ul className="space-y-1.5 text-neutral-11">
              <li className="flex gap-2"><span className="text-neutral-8 mt-0.5">•</span><span>Download a subscriber CSV template with test phone numbers ready to import</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-11 uppercase tracking-wide">Items</p>
            <ul className="space-y-1.5 text-neutral-11">
              <li className="flex gap-2"><span className="text-neutral-8 mt-0.5">•</span><span>Import items from a CSV file into the item library</span></li>
              <li className="flex gap-2"><span className="text-neutral-8 mt-0.5">•</span><span>Download a CSV template pre-filled with sample item names and hosted photo URLs</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-11 uppercase tracking-wide">SMS</p>
            <ul className="space-y-1.5 text-neutral-11">
              <li className="flex gap-2"><span className="text-neutral-8 mt-0.5">•</span><span>Toggle between test mode (SMS suppressed, logged to console) and live in Settings → SMS</span></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidenav({
  partnerSlug,
  logoUrl,
  activeDrops,
  isAdmin,
  uiTestMode,
}: {
  partnerSlug: string;
  logoUrl: string | null;
  activeDrops: ActiveDrop[];
  isAdmin: boolean;
  uiTestMode: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [optimisticTestMode, setOptimisticTestMode] = useState(uiTestMode);
  const [, startTransition] = useTransition();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  function handleToggle() {
    const next = !optimisticTestMode;
    setOptimisticTestMode(next);
    startTransition(async () => {
      await toggleUiTestMode(next);
      router.refresh();
    });
  }

  return (
    <>
      <aside className="w-56 shrink-0 min-h-screen bg-[#f8f8f4] border-r border-neutral-6 flex flex-col px-3 py-6">

        {/* Logo */}
        <div className="mb-6 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[140px] object-contain" />
          ) : (
            <img src="/logo.svg" alt="Logo" className="h-6 w-auto" />
          )}
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

          {/* Marketing */}
          <div>
            <SectionHeading>Marketing</SectionHeading>
            <div className="flex flex-col">
              {marketingItems.map((item) => (
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

        {/* Illustration templates */}
        <Link
          href="/dashboard/illustration-templates"
          className="flex items-center gap-2 px-2 py-2 rounded-md w-full text-sm text-neutral-10 hover:bg-neutral-3 hover:text-neutral-12 transition-colors"
        >
          <GalleryHorizontal size={16} className="shrink-0 opacity-70" />
          <span>Illustration templates</span>
        </Link>

        {/* Admin section */}
        {isAdmin && (
          <div className="border-t border-neutral-6 mt-3 pt-3 space-y-1">
            {/* T22 badge + info */}
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-neutral-3 px-2 py-0.5 text-xs font-medium text-neutral-10">
                  T22 Internal
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-neutral-8 hover:text-neutral-12 transition-colors"
                title="Admin features"
              >
                <Info size={14} />
              </button>
            </div>
            {/* Testing mode toggle */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm text-neutral-11">Testing mode</span>
              <button
                role="switch"
                aria-checked={optimisticTestMode}
                onClick={handleToggle}
                className={[
                  "relative w-8 h-4 rounded-full transition-colors focus:outline-none",
                  optimisticTestMode ? "bg-accent-9" : "bg-neutral-5",
                ].join(" ")}
              >
                <span className={[
                  "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
                  optimisticTestMode ? "translate-x-4" : "translate-x-0",
                ].join(" ")} />
              </button>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-2 px-2 py-2 rounded-md w-full text-sm text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12 transition-colors mt-4"
        >
          <LogOut size={16} className="shrink-0 opacity-70" />
          <span>Log out</span>
        </button>

      </aside>

      {drawerOpen && <AdminDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}
