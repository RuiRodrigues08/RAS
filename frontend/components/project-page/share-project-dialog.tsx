"use client";

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
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Copy, Share2 } from "lucide-react";
import { useState } from "react";

interface ShareProjectDialogProps {
  projectId: string;
  userId: string;
  currentPath: string;
}

export function ShareProjectDialog({
  projectId,
  userId,
  currentPath,
}: ShareProjectDialogProps) {
  const { toast } = useToast();
  const session = useSession();
  const [sharePermission, setSharePermission] = useState<"view" | "edit">(
    "view"
  );
  const createShareLink = useCreateShareLink();
  const queryClient = useQueryClient();

  const handleGenerateLink = async () => {
    if (!session?.token) {
      toast({
        title: "You must be logged in to share projects",
        variant: "destructive",
      });
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

      queryClient.invalidateQueries({
        queryKey: ["sharedLinks", session.user._id, session.token],
      });

      const shareUrl = `${window.location.origin}${result.url}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard!", duration: 2000 });
    } catch (error) {
      toast({
        title: "Failed to create share link",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="px-3" title="Partilhar">
          <Share2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-white border-zinc-800 p-0">
        <DialogHeader className="border-b border-blue-200 px-4 sm:px-6 py-3 sm:py-4">
          <DialogTitle className="text-base sm:text-lg text-blue-700 font-semibold">
            Share project
          </DialogTitle>
        </DialogHeader>

        <div className="pb-4 sm:pb-6 pt-3">
          <div className="px-4 sm:px-6 pb-4 sm:pb-8 border-b border-blue-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 w-full sm:w-auto">
                <p className="text-sm sm:text-base text-black-300 leading-relaxed">
                  Escolha que tipo de permissão deseja atribuir ao link gerado
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 text-base text-zinc hover:text-black transition-colors font-medium">
                      {sharePermission === "edit" ? "Editar" : "Visualizar"}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-white border-blue-700 text-zinc min-w-[140px]"
                  >
                    <DropdownMenuItem
                    className=""
                      onClick={() => setSharePermission("edit")}
                      
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSharePermission("view")}
                      
                    >
                      Visualizar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={handleGenerateLink}
                  disabled={createShareLink.isPending}
                  className="gap-2 h-9 sm:h-11 px-4 sm:px-6 bg-primary text-white border border-blue hover:bg-white hover:text-primary transition-all duration-200 text-sm sm:text-base"
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
