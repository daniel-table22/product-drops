"use client";

import { Button } from "@/components/ui/button";
import { deleteDrop } from "./actions";

export function DeleteDropButton({ id, name, state }: { id: string; name: string; state: string }) {
  const canDelete = state === "scheduled";
  return (
    <form action={deleteDrop.bind(null, id)}>
      <Button
        size="sm"
        variant="ghost"
        type="submit"
        disabled={!canDelete}
        title={!canDelete ? "Only scheduled drops can be deleted" : undefined}
        className="text-neutral-10 hover:text-error-11 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"?`)) e.preventDefault();
        }}
      >
        Delete
      </Button>
    </form>
  );
}
