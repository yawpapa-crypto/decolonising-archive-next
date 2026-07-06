// Nested under app/(admin)/admin/layout.tsx which already provides AdminAppShell.
// Do not add a second sidebar here or backup routes will render two shells.
export default function AdminBackupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
