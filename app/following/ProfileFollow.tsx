"use client";
import { Btn, useLocalFollows } from "./Suggested";
export default function ProfileFollow({ id }: { id: string }) {
  const local = useLocalFollows();
  return <Btn s={{ key: `s-${id}`, name: id, handle: "", why: "", href: "", thumbs: [], count: "" }} signedIn={false} dark local={local} />;
}
