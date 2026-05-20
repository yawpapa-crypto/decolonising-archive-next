"use client";

import { useEffect, useState } from "react";
import type { IntelligenceSectionId } from "../components/IntelligenceSectionNav";
import { INTELLIGENCE_SECTIONS } from "../components/IntelligenceSectionNav";

const SECTION_IDS = INTELLIGENCE_SECTIONS.map((section) => section.id);

export function useIntelligenceSectionSpy(defaultSection: IntelligenceSectionId = "overview") {
  const [active, setActive] = useState<IntelligenceSectionId>(defaultSection);

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(`ri-${id}`)).filter(
      Boolean,
    ) as HTMLElement[];

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          const next = visible[0].target.id.replace(/^ri-/, "") as IntelligenceSectionId;
          setActive(next);
        }
      },
      {
        root: null,
        rootMargin: "-72px 0px -55% 0px",
        threshold: [0.08, 0.2, 0.4],
      },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return active;
}

export function scrollToIntelligenceSection(id: IntelligenceSectionId) {
  const target = document.getElementById(`ri-${id}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
