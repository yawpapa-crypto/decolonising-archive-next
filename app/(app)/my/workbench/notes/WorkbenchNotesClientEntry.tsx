"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import WorkbenchNotesLoading from "./WorkbenchNotesLoading";

const WorkbenchNotesClient = dynamic(() => import("./WorkbenchNotesClient"), {
  loading: () => <WorkbenchNotesLoading />,
  ssr: false,
});

type Props = ComponentProps<typeof WorkbenchNotesClient>;

export default function WorkbenchNotesClientEntry(props: Props) {
  return <WorkbenchNotesClient {...props} />;
}
