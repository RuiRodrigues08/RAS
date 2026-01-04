"use client";

import { Download, LoaderCircle, OctagonAlert, Play, Share2, Link as LinkIcon, Check, ChevronDown, Copy } from "lucide-react";
import { ProjectImageList } from "@/components/project-page/project-image-list";
import { ViewToggle } from "@/components/project-page/view-toggle";
import { AddImagesDialog } from "@/components/project-page/add-images-dialog";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/toolbar/toolbar";
import {
  useGetProject,
  useGetSharedProject,
  useGetProjectResults,
  useGetSocket,
} from "@/lib/queries/projects";
import Loading from "@/components/loading";
import { ProjectProvider, useProjectPermission } from "@/providers/project-provider";
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

export default function Project({
  params,
}: {
  params: Promise<{ pid: string }>;
}) {
  const resolvedParams = use(params);
  const session = useSession();
  const { pid } = resolvedParams;
  const searchParams = useSearchParams();
  const isSharedProject = searchParams.get("auth") !== null;
  

  const ownProject = useGetProject(
    session?.user?._id ?? "", 
    pid, 
    session?.token ?? ""
  );
  const sharedProject = useGetSharedProject(pid, session?.token);
  const project = isSharedProject ? sharedProject : ownProject;
  const downloadProjectImages = useDownloadProject();
  const processProject = useProcessProject();
  const downloadProjectResults = useDownloadProjectResults();
  const { toast } = useToast();
  const socket = useGetSocket(session?.token ?? "");
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";
  const router = useRouter();
  const path = usePathname();
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  const [currentImage, setCurrentImage] = useState<ProjectImage | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingSteps, setProcessingSteps] = useState<number>(1);
  const [waitingForPreview, setWaitingForPreview] = useState<string>("");
  
  
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopied, setIsCopied] = useState(false); 
  
  // TROCAR DEPOIS PARA OS USERS
  const [sharedUsers, setSharedUsers] = useState([
    { id: 1, name: "Flavio Costa", permission: "owner" as const },
    { id: 2, name: "Rosa Silva", permission: "edit" as const },
    { id: 3, name: "Constança Gonçalves", permission: "view" as const },
    { id: 4, name: "Rodrigo Gonçalves", permission: "edit" as const },
  ]);


  const isReadOnly = searchParams.get("auth") === "view"; 

  const totalProcessingSteps = (project.data?.tools.length ?? 0) * (project.data?.imgs.length ?? 0);
  const projectResults = useGetProjectResults(
    session?.user?._id ?? "", 
    pid, 
    session?.token ?? ""
  );
  const qc = useQueryClient();

 
  const handleGenerateLink = () => {
    const url = `${window.location.origin}${path}?auth=${sharePermission}`;
    setGeneratedLink(url);
    navigator.clipboard.writeText(url);
    
    // Feedback visual
    setIsCopied(true);
    toast({ title: "Link copied to clipboard!" });
    
    
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleChangePermission = (userId: number, newPermission: "edit" | "view") => {
    setSharedUsers(users => 
      users.map(user => 
        user.id === userId ? { ...user, permission: newPermission } : user
      )
    );
    toast({ title: "Permissão atualizada" });
  };

  const handleRemoveAccess = (userId: number) => {
    setSharedUsers(users => users.filter(user => user.id !== userId));
    toast({ title: "Acesso removido" });
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
  }, [pid, processingSteps, qc, router, session?.token, session?.user?._id, socket.data, totalProcessingSteps, sidebar, isMobile, projectResults]);

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
                    // RF45: Bloqueia o botão Apply se for apenas leitura OU sem sessão (requer backend)
                    disabled={project.data.tools.length <= 0 || waitingForPreview !== "" || isReadOnly || !session}
                    className="inline-flex"
                    onClick={() => {
                      if (!session) {
                        toast({ title: "Autenticação necessária", description: "Faça login para processar o projeto.", variant: "destructive" });
                        return;
                      }
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
                  {/* AddImagesDialog só mostra se não for read-only (pode ser edit sem sessão) */}
                  {!isReadOnly && <AddImagesDialog />}
                </>
              )}

              <Button
                variant="outline"
                className="px-3"
                disabled={!session}
                onClick={() => {
                  if (!session) {
                    toast({ title: "Autenticação necessária", description: "Faça login para fazer download.", variant: "destructive" });
                    return;
                  }
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

              
              {session && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="px-3" title="Partilhar">
                      <Share2 className="size-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-[#16151C] text-white border-zinc-800 p-0">
                    <DialogHeader className="border-b border-zinc-800 px-6 py-4">
                      <DialogTitle className="text-lg font-semibold">Share project</DialogTitle>
                  </DialogHeader>
                  
                  <div className="px-6 pb-6 pt-3">
                    {/* Botão Copiar Link */}
                    <div className="flex flex-col gap-3 pb-8 border-b border-zinc-800">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        Copie o link para compartilhar este projeto
                      </p>
                      
                      <Button 
                        onClick={handleGenerateLink}
                        className="gap-2 h-11 px-6 bg-zinc-700 hover:bg-zinc-600 text-white border-0 w-fit"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </Button>
                    </div>

                    {/* Lista de Pessoas com Acesso */}
                    <div className="pt-8">
                      <h3 className="text-base font-semibold mb-4">Pessoas com acesso</h3>
                      <div className="space-y-0 max-h-[300px] overflow-y-auto pr-2">
                        {sharedUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between py-3 hover:bg-zinc-900/30 rounded-lg px-2 -mx-2 transition-colors"
                          >
                            <span className="text-base font-medium">{user.name}</span>
                            
                            <span className="text-base text-zinc-400 font-medium">
                              {user.permission === "owner" 
                                ? "Owner" 
                                : user.permission === "edit" 
                                ? "Editar" 
                                : "Visualizar"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              )}

              <div className="hidden xl:flex items-center gap-2">
                <ViewToggle />
                <ModeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="h-full overflow-x-hidden flex">
          {/* RF45: Toolbar já deve ter a lógica interna de opacidade, mas aqui também garantimos que renderiza */}
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