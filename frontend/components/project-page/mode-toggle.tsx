"use client";

import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function ModeToggle() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "edit";
  const tokenProject = searchParams.get("token") ?? "";
  
  const router = useRouter();

  // Esta função é a forma correta de manipular a URL sem perder dados
  const handleChangeMode = (newMode: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    
    // Mantém o token se ele existir, caso contrário limpa a URL
    if (tokenProject) {
      params.set("token", tokenProject);
    } else {
      params.delete("token");
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-0.5 p-0.5 border rounded-lg bg-background">
      <Button
        variant={mode === "edit" ? "default" : "secondary"}
        size="icon"
        
        onClick={() => handleChangeMode("edit")}
        className="size-8"
        title="Edit mode"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant={mode === "results" ? "default" : "secondary"}
        size="icon"
        
        onClick={() => handleChangeMode("results")}
        className="size-8"
        title="Results mode"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}