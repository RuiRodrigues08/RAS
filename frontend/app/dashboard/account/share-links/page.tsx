"use client";

import Loading from "@/components/loading";
import { ShareLinkCard } from "@/components/shared-link-card";
import { useGetSharedLinks } from "@/lib/queries/projects";
import { useSession } from "@/providers/session-provider";
import { Separator } from "@radix-ui/react-separator";
import { Link2Off } from "lucide-react";

export default function Links() {
  const session = useSession();
  const links = useGetSharedLinks(session.user._id, session.token);

  if (links.isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (links.error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
        <p>Error loading links - {links.error.message}</p>
      </div>
    );
  }

  if (!links.data || links.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="rounded-full bg-muted p-6">
          <Link2Off className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">No active shared links</h3>
          <p className="text-sm text-muted-foreground">
            Share your projects to see the management links here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm max-w-[80%] sm:max-w-[100%] sm:text-base text-muted-foreground">
            Manage access and permissions for your shared projects.
          </p>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium text-nowrap">
          {links.data.length} Active{" "}
          {links.data.length === 1 ? "Link" : "Links"}
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Project & Date</div>
            <div className="col-span-4">Link</div>
            <div className="col-span-3">Permission</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <Separator className="mb-4 mt-2" />
        </div>
        <div className="flex-col space-y-5">
          {links.data.map((item: any) => (
            <ShareLinkCard key={item.link._id} data={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
