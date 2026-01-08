"use client";

import DashboardSidebar from "@/components/dashboard-sidebar/dashboard-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname, useSearchParams } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  
  // Hide sidebar only for view-only shared projects (auth=view)
  // Show sidebar for auth=edit (allows using tools) and normal users
  const hideSidebar = authParam === "view";
  
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-screen">
        {!hideSidebar && <DashboardSidebar />}
        <main className="w-full h-screen max-w-full overflow-hidden relative">
          {path === "/dashboard" && !hideSidebar && (
            <SidebarTrigger
              variant="outline"
              className="h-9 w-10 absolute top-4 left-4 lg:hidden"
            />
          )}
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
