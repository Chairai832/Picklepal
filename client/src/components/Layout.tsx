import { DesktopNav } from "./DesktopNav";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {isAuthenticated && <DesktopNav />}
      <main className="pb-20 md:pb-8 pt-0 md:pt-20 min-h-screen">
        {children}
      </main>
      {isAuthenticated && <BottomNav />}
    </div>
  );
}
