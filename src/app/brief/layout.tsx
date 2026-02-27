export default function BriefLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
