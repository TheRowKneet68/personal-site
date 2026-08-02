import type { ReactNode } from "react";
import { cn } from "../utils/format";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("container-rk", className)}>{children}</div>;
}
