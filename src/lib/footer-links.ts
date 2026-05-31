export type FooterLink = {
  href: string;
  label: string;
  title?: string;
  external?: boolean;
};

export type FooterLinkGroup = {
  title: string;
  links: FooterLink[];
};

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Platform",
    links: [
      { href: "/library", label: "Library" },
      { href: "/sources", label: "Sources" },
      { href: "/changelog", label: "Changelog" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Workbench",
    links: [
      { href: "/my/workbench", label: "My Workbench" },
      { href: "/my/workbench/notes", label: "Notes" },
      { href: "/my/workbench/reading-lists", label: "Reading Lists" },
      {
        href: "/library",
        label: "Archive Guide beta",
        title: "Archive Guide beta is available after searching the Library",
      },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/community", label: "Reading Commons" },
      { href: "/community-guidelines", label: "Community Guidelines" },
      { href: "/sources/request", label: "Suggest a Source" },
      { href: "/takedown", label: "Report a Concern" },
    ],
  },
  {
    title: "Trust & Care",
    links: [
      { href: "/cultural-care", label: "Cultural Care" },
      { href: "/takedown", label: "Takedown / Corrections" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Support this work" },
      { href: "/partners", label: "Partner with us" },
      { href: "/feedback", label: "Contact / Feedback" },
    ],
  },
];

export const FOOTER_BOTTOM_LINKS: FooterLink[] = [
  { href: "/copyright", label: "Copyright" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
