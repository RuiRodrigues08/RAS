"use client";

import { Download, LoaderCircle, OctagonAlert, Play, Share2, Link as LinkIcon } from "lucide-react";
import { ProjectImageList } from "@/components/project-page/project-image-list";
import { ViewToggle } from "@/components/project-page/view-toggle";
import { AddImagesDialog } from "@/components/project-page/add-images-dialog";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/toolbar/toolbar";
import {
  useGetProject,
  useGetProjectResults,
  useGetSocket,
} from "@/lib/queries/projects";
import Loading from "@/components/loading";
import { ProjectProvider } from "@/providers/project-provider";
import { use, useEffect, useLayoutEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSession } from "@/providers/session-provider";
import {
  useDownloadProject,
  useDownloadProjectResults,
  useProcessProject,
} from "@/lib/mutations/projects";
import { useToast } from "@/hooks/use-toast";
import { ProjectImage } from "@/lib/projects";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Transition } from "@headlessui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ModeToggle } from "@/components/project-page/mode-toggle";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Project({
  params,
}: {
  params: Promise<{ pid: string }>;
}) {
  const resolvedParams = use(params);
  const session = useSession();
  const { pid } = resolvedParams;
  const project = useGetProject(session.user._id, pid, session.token);
  const downloadProjectImages = useDownloadProject();
  const processProject = useProcessProject();
  const downloadProjectResults = useDownloadProjectResults();
  const { toast } = useToast();
  const socket = useGetSocket(session.token);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";
  const router = useRouter();
  const path = usePathname();
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  // Estados
  const [currentImage, setCurrentImage] = useState<ProjectImage | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingSteps, setProcessingSteps] = useState<number>(1);
  const [waitingForPreview, setWaitingForPreview] = useState<string>("");
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [inviteEmail, setInviteEmail] = useState("");

  const totalProcessingSteps = (project.data?.tools.length ?? 0) * (project.data?.imgs.length ?? 0);
  const projectResults = useGetProjectResults(session.user._id, pid, session.token);
  const qc = useQueryClient();

  // Função para gerar link de partilha
  const handleGenerateLink = () => {
    const url = `${window.location.origin}${path}?auth=${sharePermission}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: `Acesso de ${sharePermission === "view" ? "visualização" : "edição"} copiado para a área de transferência.`,
    });
  };

  useLayoutEffect(() => {
    if (!["edit", "results"].includes(mode) || !["grid", "carousel"].includes(view)) {
      router.replace(path);
    }
  }, [mode, view, path, router, projectResults.data]);

  useEffect(() => {
    function onProcessUpdate() {
      setProcessingSteps((prev) => prev + 1);
      const progress = Math.min(Math.round((processingSteps * 100) / totalProcessingSteps), 100);
      setProcessingProgress(progress);

      if (processingSteps >= totalProcessingSteps) {
        setTimeout(() => {
          projectResults.refetch().then(() => {
            setProcessing(false);
            if (!isMobile) sidebar.setOpen(true);
            setProcessingProgress(0);
            setProcessingSteps(1);
            router.push("?mode=results&view=grid");
          });
        }, 2000);
      }
    }

    let active = true;
    if (active && socket.data) {
      socket.data.on("process-update", () => {
        if (active) onProcessUpdate();
      });
    }

    return () => {
      active = false;
      if (socket.data) socket.data.off("process-update", onProcessUpdate);
    };
  }, [pid, processingSteps, qc, router, session.token, session.user._id, socket.data, totalProcessingSteps, sidebar, isMobile, projectResults]);

  if (project.isError) return (
    <div className="flex size-full justify-center items-center h-screen p-8">
      <Alert variant="destructive" className="w-fit max-w-[40rem]">
        <OctagonAlert className="size-4" />
        <AlertTitle>{project.error.name}</AlertTitle>
        <AlertDescription>{project.error.message}</AlertDescription>
      </Alert>
    </div>
  );

  if (project.isLoading || !project.data || projectResults.isLoading || !projectResults.data) return (
    <div className="flex justify-center items-center h-screen">
      <Loading />
    </div>
  );

  return (
    <ProjectProvider
      project={project.data}
      currentImage={currentImage}
      preview={{ waiting: waitingForPreview, setWaiting: setWaitingForPreview }}
    >
      <div className="flex flex-col h-screen relative">
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-center items-start xl:items-center xl:justify-between border-b border-sidebar-border py-2 px-2 md:px-3 xl:px-4 h-fit gap-2">
          <div className="flex items-center justify-between w-full xl:w-auto gap-2">
            <h1 className="text-lg font-semibold truncate">{project.data.name}</h1>
            <div className="flex items-center gap-2 xl:hidden">
              <ViewToggle />
              <ModeToggle />
            </div>
          </div>

          <div className="flex items-center justify-between w-full xl:w-auto gap-2">
            <SidebarTrigger variant="outline" className="h-9 w-10 lg:hidden" />
            <div className="flex items-center gap-2 flex-wrap justify-end xl:justify-normal w-full xl:w-auto">
              {mode !== "results" && (
                <>
                  <Button
                    disabled={project.data.tools.length <= 0 || waitingForPreview !== ""}
                    className="inline-flex"
                    onClick={() => {
                      processProject.mutate(
                        { uid: session.user._id, pid: project.data!._id, token: session.token },
                        {
                          onSuccess: () => {
                            setProcessing(true);
                            sidebar.setOpen(false);
                          },
                          onError: (error) => toast({ title: "Ups!", description: error.message, variant: "destructive" }),
                        }
                      );
                    }}
                  >
                    <Play /> Apply
                  </Button>
                  <AddImagesDialog />
                </>
              )}

              <Button
                variant="outline"
                className="px-3"
                onClick={() => {
                  (mode === "edit" ? downloadProjectImages : downloadProjectResults).mutate(
                    { uid: session.user._id, pid: project.data!._id, token: session.token, projectName: project.data!.name },
                    { onSuccess: () => toast({ title: "Download concluído." }) }
                  );
                }}
              >
                {(mode === "edit" ? downloadProjectImages : downloadProjectResults).isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Download />
                )}
              </Button>

              {/* Share Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="px-3">
                    <Share2 className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-[#1e1e1e] text-white border-zinc-800">
                  <DialogHeader>
                    <div className="flex justify-between items-center">
                      <DialogTitle className="text-sm font-normal">Share project</DialogTitle>
                      <Button variant="ghost" size="sm" onClick={handleGenerateLink} className="text-blue-400 hover:text-blue-300">
                        <LinkIcon className="h-3 w-3 mr-2" /> Copy link
                      </Button>
                    </div>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Add emails to invite..."
                        className="bg-zinc-900 border-zinc-700 text-sm text-white"
                      />
                      <Button className="bg-white text-black hover:bg-zinc-200">Invite</Button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-400 font-medium">Who has access</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold uppercase">
                            {session.user.name?.[0] || "U"}
                          </div>
                          <div>
                            <p className="font-medium">{session.user.name} (you)</p>
                            <p className="text-xs text-zinc-500">{session.user.email}</p>
                          </div>
                        </div>
                        <span className="text-zinc-500 text-xs">owner</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                        <span className="text-xs text-zinc-400">Link permission:</span>
                        <select
                          value={sharePermission}
                          onChange={(e) => setSharePermission(e.target.value as "view" | "edit")}
                          className="bg-transparent text-xs text-blue-400 outline-none cursor-pointer"
                        >
                          <option value="view">can view</option>
                          <option value="edit">can edit</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="hidden xl:flex items-center gap-2">
                <ViewToggle />
                <ModeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="h-full overflow-x-hidden flex">
          {mode !== "results" && <Toolbar />}
          <ProjectImageList setCurrentImageId={setCurrentImage} results={projectResults.data} />
        </div>
      </div>

      {/* Processing Overlay */}
      <Transition
        show={processing}
        enter="transition-opacity ease-in duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-out duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="absolute top-0 left-0 h-screen w-screen bg-black/70 z-50 flex justify-center items-center">
          <Card className="p-4 flex flex-col justify-center items-center gap-4">
            <div className="flex gap-2 items-center text-lg font-semibold">
              <h1>Processing</h1>
              <LoaderCircle className="size-[1em] animate-spin" />
            </div>
            <Progress value={processingProgress} className="w-96" />
          </Card>
        </div>
      </Transition>
    </ProjectProvider>
  );
}