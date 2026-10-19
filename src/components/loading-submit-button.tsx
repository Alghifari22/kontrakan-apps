"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
};

export default function LoadingSubmitButton({ children, pendingText = "Memproses…", className, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending} className={`${className ?? ""} inline-flex items-center justify-center gap-2 disabled:cursor-wait`}>
      {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      <span>{pending ? pendingText : children}</span>
    </button>
  );
}
