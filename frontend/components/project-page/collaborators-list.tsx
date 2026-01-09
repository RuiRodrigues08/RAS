"use client";

import { useGetProjectUsers } from "@/lib/queries/projects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CollaboratorsListProps {
  projectId: string;
  token: string;
  activeUsers: { id: string; name: string; email?: string }[];
}

export function CollaboratorsList({ projectId, token, activeUsers }: CollaboratorsListProps) {
  // Fetch all registered users associated with the project (optional now, since socket provides names)
  /*
  const { data: projectUsers } = useGetProjectUsers(
    "", // filler for uid
    projectId,
    token
  );
  */
  
  return (
    <div className="flex -space-x-2 overflow-hidden items-center">
      {activeUsers.map((user) => {
        const isOnline = true; // By definition in this list

        // Determine Name and Avatar
        const name = user.name || "Convidado";
        const initial = (name && name.length > 0) ? name[0].toUpperCase() : "U";

        return (
          <TooltipProvider key={user.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "relative inline-block border-2 border-background rounded-full transition-transform hover:-translate-y-1 cursor-default",
                  isOnline ? "ring-2 ring-green-500 ring-offset-2 ring-offset-background" : ""
                )}>
                  <Avatar className="h-6 w-6 rounded-full">
                     {/* Show Avatar or Fallback with Initial */}
                    <AvatarFallback className="rounded-full text-[10px] uppercase bg-sidebar-accent text-sidebar-accent-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      {activeUsers.length === 0 && (
         <span className="text-xs text-muted-foreground ml-2"></span>
      )}
    </div>
  );
}
