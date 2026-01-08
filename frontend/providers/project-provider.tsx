"use client";

import { ProjectImage, SingleProject } from "@/lib/projects";
import { createContext, useContext } from "react";

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
  // O backend envia "VIEWER" ou "EDITOR" no campo `permission` para projetos partilhados.
  // Removido fallback via URL; se não existir `permission` do backend assumimos que
  // o utilizador é o proprietário e permitimos edição (`edit`).
  let permission: "view" | "edit";
  if ((project as any).permission) {
    permission = (project as any).permission === "EDITOR" ? "edit" : "view";
  } else {
    permission = "edit";
  }

  return (
    <ProjectContext.Provider
      value={{ project, currentImage, preview, permission }}
    >
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
    throw new Error(
      "useProjectPermission() must be used within a ProjectProvider"
    );
  }
  return context.permission;
}
