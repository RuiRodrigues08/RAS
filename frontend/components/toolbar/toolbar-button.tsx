import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  useAddProjectTool,
  useDeleteProjectTool,
  usePreviewProjectResult,
  useUpdateProjectTool,
} from "@/lib/mutations/projects";
import { ProjectTool, ProjectToolResponse } from "@/lib/projects";
import { useGetSocket } from "@/lib/queries/projects";
import {
  useCurrentImage,
  usePreview,
  useProjectInfo,
} from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { LoaderCircle, Sparkle, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface ToolbarButtonProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  isDefault?: boolean;
  isPremium?: boolean;
  tool: Omit<ProjectTool, "position">;
  children?: React.ReactNode;
  noParams?: boolean;
  onDefault?: () => void;
  helpDescription?: string;
  helpMediaSrc?: string;
  helpFirst?: boolean;
}

export function ToolbarButton({
  open = false,
  setOpen = () => {},
  icon: Icon,
  label,
  disabled = false,
  isDefault = false,
  isPremium = false,
  tool,
  children,
  noParams = false,
  onDefault = () => {},
  helpDescription,
  helpMediaSrc,
  helpFirst = false,
}: ToolbarButtonProps) {
  const router = useRouter();
  const session = useSession();
  const project = useProjectInfo();
  const preview = usePreview();
  const variant =
    project.tools.find((t) => t.procedure === tool.procedure) !== undefined
      ? "default"
      : "outline";
  const socket = useGetSocket(session.token);

  const currentImage = useCurrentImage();
  const addTool = useAddProjectTool(
    session.user._id,
    project._id,
    session.token,
  );
  const updateTool = useUpdateProjectTool(
    session.user._id,
    project._id,
    session.token,
  );
  const deleteTool = useDeleteProjectTool(
    session.user._id,
    project._id,
    session.token,
  );
  const previewEdits = usePreviewProjectResult();

  const [prevTool, setPrevTool] = useState<ProjectToolResponse | undefined>(
    undefined,
  );
  const [waiting, setWaiting] = useState<boolean>(false);
  const [timedout, setTimedout] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  function handleDeleteTool(previewAfter?: boolean) {
    if (prevTool) {
      deleteTool.mutate(
        {
          uid: session.user._id,
          pid: project._id,
          toolId: prevTool._id,
          token: session.token,
        },
        {
          onSuccess: () => {
            if (previewAfter) {
              handlePreview();
            }
          },
          onError: (error) => {
            toast({
              title: "Ups! An error occurred.",
              description: error.message,
              variant: "destructive",
            });
          },
        },
      );
    }
  }

  function handlePreview() {
    previewEdits.mutate(
      {
        uid: session.user._id,
        pid: project._id,
        imageId: currentImage?._id ?? "",
        token: session.token,
      },
      {
        onSuccess: () => {
          setWaiting(true);
          preview.setWaiting(tool.procedure);
          setTimeout(
            () => setTimedout(true),
            10000 * (project.tools.length + 1),
          );
        },
        onError: (error) => {
          toast({
            title: "Ups! An error occurred.",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleAddTool(preview?: boolean) {
    if (prevTool) {
      updateTool.mutate(
        {
          uid: session.user._id,
          pid: project._id,
          toolId: prevTool._id,
          toolParams: tool.params,
          token: session.token,
        },
        {
          onSuccess: () => {
            if (preview) handlePreview();
          },
          onError: (error) => {
            toast({
              title: "Ups! An error occurred.",
              description: error.message,
              variant: "destructive",
            });
          },
        },
      );
    } else {
      addTool.mutate(
        {
          uid: session.user._id,
          pid: project._id,
          tool: {
            ...tool,
            position: project.tools.length,
          },
          token: session.token,
        },
        {
          onSuccess: () => {
            if (preview) handlePreview();
          },
          onError: (error) => {
            toast({
              title: "Ups! An error occurred.",
              description: error.message,
              variant: "destructive",
            });
          },
        },
      );
    }
    setOpen(false);
  }

  function handleClick() {
    if (helpFirst && (helpDescription || helpMediaSrc)) {
      setHelpOpen(true);
      return;
    }
    if (isPremium) {
      if (session.user.type === "anonymous") {
        router.push("/login");
        return;
      }
      if (noParams) {
        if (prevTool) handleDeleteTool();
        else handleAddTool(true);
      }
      return;
    }
    if (noParams) {
      if (prevTool) handleDeleteTool();
      else handleAddTool(true);
    }
  }

  useEffect(() => {
    if (timedout) {
      if (waiting) {
        setWaiting(false);
        preview.setWaiting("");
        toast({
          title: "Ups! An error occurred.",
          description: "The preview took too long to load.",
          variant: "destructive",
        });
      }
      setTimedout(false);
    }
  }, [timedout, waiting, preview]);

  useEffect(() => {
    let active = true;

    if (active && socket.data) {
      socket.data.on("preview-ready", () => {
        if (active) {
          setWaiting(false);
          preview.setWaiting("");
        }
      });
    }

    return () => {
      active = false;
      if (socket.data) {
        socket.data.off("preview-ready");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.data]);

  useEffect(() => {
    const prevTool = project.tools.find((t) => t.procedure === tool.procedure);
    setPrevTool(prevTool);
  }, [project.tools, tool.procedure]);

  const TButton = () => (
    <Tooltip>
      <TooltipTrigger asChild>
      <Button
        variant={variant}
        className={`size-8 relative ${isPremium && variant === "default" && "bg-indigo-500 hover:bg-indigo-400"}`}
        disabled={
          disabled ||
          (preview.waiting !== tool.procedure && preview.waiting !== "")
        }
        onClick={handleClick}
      >
        {waiting ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <>
            {isPremium ? (
                <div
                  className={
                    isPremium && variant === "default"
                      ? "text-white"
                      : "text-indigo-500"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <Sparkle className="h-3 w-3 absolute -top-1 -right-1" />
                  <span className="sr-only">{label}</span>
                </div>
            ) : (
              <>
                <Icon className="h-3.5 w-3.5" />
                <span className="sr-only">{label}</span>
              </>
            )}
          </>
          )}
      </Button>
          </TooltipTrigger>
      <TooltipContent
        className={`ml-2 ${isPremium ? "bg-indigo-500" : "bg-white border border-gray-200 text-black"}`}
        side="right"
      >
        <span>{label}</span>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        {!((isPremium && session.user.type === "anonymous") || noParams) ? (
          <DropdownMenuTrigger
            asChild
            disabled={
              disabled ||
              (preview.waiting !== tool.procedure && preview.waiting !== "")
            }
          >
            <div>
              <TButton />
            </div>
          </DropdownMenuTrigger>
        ) : (
          <div>
            <TButton />
          </div>
        )}
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
          side="right"
          align="end"
          sideOffset={4}
        >
          <div className="flex items-center justify-between px-1 pb-0 pt-1">
            <DropdownMenuLabel className="p-0 text-sm">{label}</DropdownMenuLabel>
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md border border-gray-200 bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200"
                  aria-label={`${label} help`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHelpOpen(true);
                  }}
                >
                  <span className="text-sm font-semibold leading-none">i</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader className="space-y-2">
                  <DialogTitle>{`How does ${label} works`}</DialogTitle>
                  <DialogDescription>
                    {helpDescription ?? "Help content coming soon."}
                  </DialogDescription>
                </DialogHeader>
                {helpMediaSrc ? (
                  <div className="overflow-hidden rounded-md border bg-muted/30">
                    <img
                      key={helpMediaSrc}
                      src={helpMediaSrc}
                      alt={`${label} help`}
                      className="h-auto w-full object-contain"
                      style={{
                        imageRendering: "auto",
                      }}
                    />
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
          <DropdownMenuSeparator className="mt-1" />
          <div className="p-1">{children}</div>
          <DropdownMenuSeparator />
          <div className="flex w-full gap-1 items-center">
            <Button
              variant={"outline"}
              className="h-6 text-xs"
              onClick={() => {
                handleDeleteTool();
                onDefault();
              }}
              disabled={isDefault}
            >
              Default
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAddTool(true)}
              className="h-6 text-xs"
              disabled={isDefault}
            >
              Preview
            </Button>
            <Button
              onClick={() => handleAddTool()}
              disabled={isDefault}
              className="h-6 text-xs w-full"
            >
              Save
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle>{`How does ${label} works`}</DialogTitle>
            <DialogDescription>
              {helpDescription ?? "Help content coming soon."}
            </DialogDescription>
          </DialogHeader>
          {helpMediaSrc ? (
            <div className="overflow-hidden rounded-md border bg-muted/30">
              <img
                key={helpMediaSrc}
                src={helpMediaSrc}
                alt={`${label} help`}
                className="h-auto w-full object-contain"
                style={{
                  imageRendering: "auto",
                }}
              />
            </div>
          ) : null}
          {helpFirst ? (
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setHelpOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleDeleteTool(true);
                  setHelpOpen(false);
                }}
                disabled={!prevTool}
              >
                Default
              </Button>
              <Button
                onClick={() => {
                  handleAddTool(true);
                  setHelpOpen(false);
                }}
                className="flex-1"
              >
                Apply
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
