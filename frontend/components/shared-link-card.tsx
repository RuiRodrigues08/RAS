"use client";

import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Shield,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useEditShareLink } from "@/lib/mutations/projects";
import type { Project } from "@/lib/projects";
import { useSession } from "@/providers/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useRevokeShareLink } from "@/lib/mutations/projects";

interface ShareLinkProps {
  data: {
    link: {
      _id: string;
      token: string;
      permission: "VIEWER" | "EDITOR";
      createdAt: string;
      projectId: string;
    };
    project: Project;
  };
}

export function ShareLinkCard({ data }: ShareLinkProps) {
  const { link, project } = data;
  const [isCopied, setIsCopied] = useState(false);
  const queryClient = useQueryClient();
  const edit = useEditShareLink();
  const { token, user } = useSession();
  const revoke = useRevokeShareLink();

  const formattedDate = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(link.createdAt));

  const shareUrl = `${window.location.origin}/dashboard/${project._id}?token=${link.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast({ title: "Link copied to clipboard!", duration: 2000 });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePermissionChange = (value: string) => {
    if (value === link.permission) {
      return;
    }

    edit.mutate(
      {
        tokenProj: link.token,
        token: token,
        permission: value as "VIEWER" | "EDITOR",
        uid: user._id,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            refetchType: "all",
            queryKey: ["sharedLinks", user._id, token],
          });
          queryClient.invalidateQueries({
            refetchType: "all",
            queryKey: ["sharedProject", link.token, token],
          });
          toast({
            title: "Permission changed successfully!",
            duration: 2000,
          });
        },
        onError: () => {
          toast({
            title: "Failed to change permission",
            variant: "destructive",
            duration: 2000,
          });
        },
      }
    );
  };

  const handleRevoke = () => {
    revoke.mutate(
      {
        tokenProj: link.token,
        token: token,
        uid: user._id,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["sharedLinks", user._id, token],
          });
          queryClient.invalidateQueries({
            queryKey: ["sharedProject"],
          });
          toast({
            title: "Permission changed successfully!",
            duration: 2000,
          });
        },
        onError: () => {
          toast({
            title: "Failed to change permission",
            variant: "destructive",
            duration: 2000,
          });
        },
      }
    );
    console.log(`Revoking link ${link._id}`);
  };

  return (
    <Card className="group grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center overflow-hidden rounded-2xl border-border/50 bg-background transition-all border-zinc-200 hover:border-primary/50 hover:shadow-md">
      <div className="md:col-span-3 space-y-1">
        <div className="font-semibold text-foreground flex items-center gap-2">
          <span className="truncate">{project.name}</span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {formattedDate}
        </p>
      </div>

      <div className="md:col-span-4">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1.5 px-3 max-w-full md:max-w-[300px]">
          <code className="flex-1 truncate text-xs font-mono text-muted-foreground">
            {link.token}
          </code>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 hover:bg-background shrink-0"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="md:col-span-3 flex items-center gap-2">
        <Select
          defaultValue={link.permission}
          onValueChange={(value: string) => handlePermissionChange(value)}
        >
          <SelectTrigger className="w-full md:w-[130px] h-9 text-xs border-dashed data-[state=open]:border-solid">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VIEWER">Viewer</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-1 grid grid-cols-2 gap-3 w-full md:hidden mt-2 pt-2 border-t border-border/40">
        <Button variant="default" className="w-full" asChild>
          <Link href={`/dashboard/${link.projectId}`}>
            <ExternalLink className="mr-2 h-4 w-4" /> Open
          </Link>
        </Button>

        <Button variant="destructive" className="w-full" onClick={handleRevoke}>
          <Trash2 className="mr-2 h-4 w-4" /> Revoke
        </Button>
      </div>

      <div className="md:col-span-2 hidden md:flex items-center justify-end gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 w-10 text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full p-0"
                asChild
              >
                <Link href={`/dashboard/${link.projectId}`}>
                  <ExternalLink className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-blue-600 text-white">
              Open Project
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full p-0"
                onClick={handleRevoke}
              >
                <Trash2 className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-destructive text-destructive-foreground">
              Revoke Access
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
}
