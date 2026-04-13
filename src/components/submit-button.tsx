"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  pendingText?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "ghost" | "destructive";
  className?: string;
}

export function SubmitButton({ children, pendingText = "Saving…", size = "sm", variant, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={size} variant={variant} disabled={pending} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}
