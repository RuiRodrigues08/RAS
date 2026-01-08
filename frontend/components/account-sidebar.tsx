"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/providers/session-provider";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const pages = [
  {
    name: "Account",
    icon: BadgeCheck,
    path: "/account",
  },
  {
    name: "Share Links",
    icon: Share2,
    path: "/account/share-links",
  },
  {
    name: "Billing",
    icon: CreditCard,
    path: "/account/billing",
  },
  {
    name: "Upgrade to Premium",
    icon: Sparkles,
    path: "/account/upgrade",
  },
];

export function AccountSidebar() {
  const path = usePathname();
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get("ref") ?? "/dashboard";

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-primary hover:text-primary hover:bg-primary/10 font-medium"
              onClick={() => router.push(ref)}
            >
              <ArrowLeft size={20} />
              <span>Go Back</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {pages.map((page) => (
                <SidebarMenuItem key={page.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === `/dashboard${page.path}`}
                  >
                    {!(
                      session.user.type === "premium" &&
                      page.path === "/account/upgrade"
                    ) && (
                      <Link href={`/dashboard${page.path}`}>
                        <page.icon />
                        <span>{page.name}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
