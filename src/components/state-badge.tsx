import { cn } from "@/lib/cn";
import type { Database } from "@/types/database";

type DropState = Database["public"]["Enums"]["drop_state"];
type OrderState = Database["public"]["Enums"]["order_state"];

const dropStateConfig: Record<DropState, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-neutral-3 text-neutral-11" },
  orders_open: { label: "Orders open", className: "bg-accent-3 text-accent-11" },
  orders_closed: { label: "Orders closed", className: "bg-warning-3 text-warning-11" },
  pickup_open: { label: "Pickup open", className: "bg-accent-3 text-accent-11" },
  pickup_closed: { label: "Pickup closed", className: "bg-neutral-3 text-neutral-11" },
  archived: { label: "Archived", className: "bg-neutral-2 text-neutral-9" },
};

const orderStateConfig: Record<OrderState, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-accent-3 text-accent-11" },
  ready: { label: "Ready", className: "bg-warning-3 text-warning-11" },
  picked_up: { label: "Picked up", className: "bg-neutral-3 text-neutral-11" },
  no_show: { label: "No show", className: "bg-error-3 text-error-11" },
};

export function DropStateBadge({ state }: { state: DropState }) {
  const config = dropStateConfig[state];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-size-1 font-medium", config.className)}>
      {config.label}
    </span>
  );
}

export function OrderStateBadge({ state }: { state: OrderState }) {
  const config = orderStateConfig[state];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-size-1 font-medium", config.className)}>
      {config.label}
    </span>
  );
}
