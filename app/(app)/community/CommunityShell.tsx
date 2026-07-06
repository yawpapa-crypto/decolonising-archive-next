import type { ReactNode } from "react";
import type { CommunityFeedView, CommunitySpace } from "@/src/lib/community-reading-commons";
import CommunityNav from "./CommunityNav";

type CommunityShellProps = {
  children: ReactNode;
  sidebar?: ReactNode;
  spaces: CommunitySpace[];
  mySpaces: CommunitySpace[];
  activeSpaceSlug?: string | null;
  activeView?: CommunityFeedView | null;
  signedIn: boolean;
};

export default function CommunityShell({
  children,
  sidebar,
  spaces,
  mySpaces,
  activeSpaceSlug,
  activeView,
  signedIn,
}: CommunityShellProps) {
  return (
    <div className="community-hub">
      <CommunityNav
        spaces={spaces}
        mySpaces={mySpaces}
        activeSpaceSlug={activeSpaceSlug}
        activeView={activeView}
        signedIn={signedIn}
      />
      <div className="community-hub-main">{children}</div>
      {sidebar ? <aside className="community-sidebar community-hub-sidebar">{sidebar}</aside> : null}
    </div>
  );
}
