"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackActivity } from "@/src/lib/analytics/client";
import { KOFI_SUPPORT_LABEL, KOFI_SUPPORT_URL } from "@/src/lib/support-links";

type SupportLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> & {
  area: string;
  children: ReactNode;
};

export default function SupportLink({
  area,
  children,
  onClick,
  "aria-label": ariaLabel = KOFI_SUPPORT_LABEL,
  ...props
}: SupportLinkProps) {
  return (
    <a
      {...props}
      href={KOFI_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={(event) => {
        trackActivity({
          eventType: "support_link_clicked",
          area,
          action: "open_kofi",
          targetType: "external_support_link",
          targetId: "ko-fi",
          metadata: { targetUrl: KOFI_SUPPORT_URL },
        });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
