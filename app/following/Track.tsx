"use client";
import { useEffect } from "react";
import { aredEvent } from "@/lib/events/client";
import type { AredEvent } from "@/lib/events/vocabulary";

/** Records one ARED event when the page is opened. Renders nothing. */
export default function Track({ type, target }: { type: AredEvent; target: string }) {
  useEffect(() => { aredEvent(type, target); }, [type, target]);
  return null;
}
