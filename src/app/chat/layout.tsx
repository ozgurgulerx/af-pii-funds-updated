import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-surface-canvas">
      <Header />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
