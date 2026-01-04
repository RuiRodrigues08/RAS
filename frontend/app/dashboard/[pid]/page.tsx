"use client";

import { Download, LoaderCircle, OctagonAlert, Play, Share2, Link as LinkIcon, Check, ChevronDown, Copy } from "lucide-react";
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

  // --- ESTADOS ---
  const [currentImage, setCurrentImage] = useState<ProjectImage | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingSteps, setProcessingSteps] = useState<number>(1);
  const [waitingForPreview, setWaitingForPreview] = useState<string>("");
  
  // Estados para RF51 e RF52 (Partilha)
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopied, setIsCopied] = useState(false); // Novo: Para animação de cópia
  
  // Mock de usuários com acesso (você pode substituir por dados reais da API)
  const [sharedUsers, setSharedUsers] = useState([
    { id: 1, name: "Flavio Costa", permission: "owner" as const },
    { id: 2, name: "Rosa Silva", permission: "edit" as const },
    { id: 3, name: "Constança Gonçalves", permission: "view" as const },
    { id: 4, name: "Rodrigo Gonçalves", permission: "edit" as const },
  ]);

  // Verifica permissão atual (RF45)
  // Nota: Precisas de garantir que o hook useProjectPermission está a funcionar, 
  // senão usa: const isReadOnly = searchParams.get("auth") === "view";
  const isReadOnly = searchParams.get("auth") === "view"; 

  const totalProcessingSteps = (project.data?.tools.length ?? 0) * (project.data?.imgs.length ?? 0);
  const projectResults = useGetProjectResults(session.user._id, pid, session.token);
  const qc = useQueryClient();

  // --- LÓGICA DE PARTILHA (RF52) ---
  const handleGenerateLink = () => {
    // Gera o link apontando para o Nginx (localhost:8080)
    const url = `${window.location.origin}${path}?auth=${sharePermission}`;
    setGeneratedLink(url);
    navigator.clipboard.writeText(url);
    
    // Feedback visual
    setIsCopied(true);
    toast({ title: "Link copied to clipboard!" });
    
    // Reseta o ícone após 2 segundos
    setTimeout(() => setIsCopied(false), 2000);
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
                    // RF45: Bloqueia o botão Apply se for apenas leitura
                    disabled={project.data.tools.length <= 0 || waitingForPreview !== "" || isReadOnly}
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

              {/* Share Dialog (RF51 e RF52) */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="px-3" title="Partilhar">
                    <Share2 className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-[#1a1a1a] text-white border-zinc-700">
                  <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-lg font-semibold">Share project</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    {/* RF51: Seleção de Permissão */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-sm text-zinc-400">Escolha que tipo de permissão deseja atribuir ao link gerado</span>
                      <button
                        onClick={() => setSharePermission(sharePermission === "view" ? "edit" : "view")}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Editar
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    {/* RF52: Botão de Copiar Link */}
                    <Button 
                      onClick={handleGenerateLink} 
                      variant="outline"
                      className="w-full justify-start gap-2 bg-transparent border-zinc-700 hover:bg-zinc-800 text-white"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar link
                    </Button>

                    {/* Lista de Pessoas com Acesso */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Pessoas com acesso</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sharedUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 hover:bg-zinc-900/50 rounded-lg transition-colors"
                          >
                            <span className="text-sm font-medium">{user.name}</span>
                            <div className="relative group">
                              <button className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
                                {user.permission === "owner" ? "Owner" : 
                                 user.permission === "edit" ? "Editar" : "Visualizar"}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              {user.permission !== "owner" && (
                                <div className="absolute right-0 mt-1 w-40 bg-zinc-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                  <div className="py-1">
                                    <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700">
                                      Editar
                                    </button>
                                    <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700">
                                      Visualizar
                                    </button>
                                    <button className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-700">
                                      Remover acesso
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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