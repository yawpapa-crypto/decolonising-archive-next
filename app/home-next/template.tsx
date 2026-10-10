import "./ui/cosmos-dialogs.css";
/** Re-mounts on every navigation inside /home-next so each page eases in instead of flashing. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ared-pt">{children}</div>;
}
