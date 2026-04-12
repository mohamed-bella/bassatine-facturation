// Print routes are isolated via LayoutShell in the root layout.
// This layout is a simple passthrough.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
