"use client";

import { ProjectImage, SingleProject } from "@/lib/projects";
import { createContext, useContext } from "react";
import { useSearchParams } from "next/navigation"; // 1. Import necessário

interface ProjectContextData {
  project: SingleProject;
  currentImage: ProjectImage | null;
  permission: "view" | "edit"; // 2. Nova propriedade no contexto
  preview: {
    waiting: string;
    setWaiting: (waiting: string) => void;
  };
}

const ProjectContext = createContext<ProjectContextData | undefined>(undefined);

export function ProjectProvider({
  children,
  project,
  currentImage,
  preview,
}: {
  children: React.ReactNode;
  project: SingleProject;
  currentImage: ProjectImage | null;
  preview: {
    waiting: string;
    setWaiting: (waiting: string) => void;
  };
}) {
  // 3. Lógica para detetar a permissão via URL (RF45)
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  
  // Se a URL tiver ?auth=view, a permissão é "view". Caso contrário, é "edit".
  const permission = authParam === "view" ? "view" : "edit";

  return (
    // Passamos a 'permission' para baixo na árvore de componentes
    <ProjectContext.Provider value={{ project, currentImage, preview, permission }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectInfo() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectInfo() must be used within a ProjectProvider");
  }
  return context.project;
}

export function useCurrentImage() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useCurrentImage() must be used within a ProjectProvider");
  }
  return context.currentImage;
}

export function usePreview() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("usePreview() must be used within a ProjectProvider");
  }
  return context.preview;
}

// 4. O novo Hook que faltava
export function useProjectPermission() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectPermission() must be used within a ProjectProvider");
  }
  return context.permission;
}