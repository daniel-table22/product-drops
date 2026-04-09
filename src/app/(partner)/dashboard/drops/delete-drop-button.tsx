"use client";

import { Button } from "@/components/ui/button";
import { deleteDrop } from "./actions";

export function DeleteDropButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteDrop.bind(null, id)}>
      <Button
        size="sm"
        variant="ghost"
        type="submit"
        className="text-neutral-10 hover:text-error-11"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"?`)) e.preventDefault();
        }}
      >
        Delete
      </Button>
    </form>
  );
}
