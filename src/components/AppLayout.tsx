import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="h-14 flex items-center border-b bg-card px-3 md:px-4 gap-3 shrink-0">
            <SidebarTrigger className="shrink-0 h-10 w-10" />
            <div className="flex-1 min-w-0" />
            <span className="text-sm text-muted-foreground truncate max-w-[140px]">
              {user?.name}
            </span>
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
