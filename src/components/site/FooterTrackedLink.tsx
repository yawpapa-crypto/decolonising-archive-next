"use client";

import Link from "next/link";
import { type AnchorHTMLAttributes, type MouseEvent } from "react";
import { trackActivity } from "@/src/lib/analytics/client";

type FooterTrackedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  label: string;
  external?: boolean;
};

export default function FooterTrackedLink({
  href,
  label,
  external = false,
  onClick,
  children,
  ...props
}: FooterTrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    trackActivity({
      eventType: "footer_link_clicked",
      area: "footer",
      action: "navigate",
      targetType: external ? "external_link" : "internal_link",
      targetId: label,
      metadata: { label, href },
    });
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
