"use client";

import { useState } from "react";
import { Share2, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCreateShareLink } from "@/lib/mutations/projects";
import { useSession } from "@/providers/session-provider";

interface ShareProjectDialogProps {
  projectId: string;
  userId: string;
  currentPath: string;
}

export function ShareProjectDialog({ projectId, userId, currentPath }: ShareProjectDialogProps) {
  const { toast } = useToast();
  const session = useSession();
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const createShareLink = useCreateShareLink();

  const handleGenerateLink = async () => {
    if (!session?.token) {
      toast({ title: "You must be logged in to share projects", variant: "destructive" });
      return;
    }

    try {
      const permission = sharePermission === "edit" ? "EDITOR" : "VIEWER";
      const result = await createShareLink.mutateAsync({
        uid: userId,
        pid: projectId,
        permission,
        token: session.token,
      });

      const shareUrl = `${window.location.origin}/projects/share/${result.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard!" });
    } catch (error) {
      toast({ title: "Failed to create share link", variant: "destructive" });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="px-3" title="Partilhar">
          <Share2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-white text-white border-zinc-800 p-0">
        <DialogHeader className="border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4">
          <DialogTitle className="text-base sm:text-lg font-semibold">Share project</DialogTitle>
        </DialogHeader>

        <div className="pb-4 sm:pb-6 pt-3">
         
          <div className="px-4 sm:px-6 pb-4 sm:pb-8 border-b border-zinc-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Escolha que tipo de permissão deseja atribuir ao link gerado
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-base text-white hover:text-zinc-300 transition-colors font-medium">
                    {sharePermission === "edit" ? "Editar" : "Visualizar"}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700 text-white min-w-[140px]">
                  <DropdownMenuItem
                    onClick={() => setSharePermission("edit")}
                    className="hover:bg-zinc-700 cursor-pointer"
                  >
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSharePermission("view")}
                    className="hover:bg-zinc-700 cursor-pointer"
                  >
                    Visualizar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={handleGenerateLink}
                disabled={createShareLink.isPending}
                className="gap-2 h-9 sm:h-11 px-4 sm:px-6 bg-zinc-700 hover:bg-zinc-600 text-white border-0 text-sm sm:text-base"
              >
                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                {createShareLink.isPending ? "Gerando..." : "Copiar link"}
              </Button>
            </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
