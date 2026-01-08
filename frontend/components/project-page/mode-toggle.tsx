"use client";

import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function ModeToggle() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";
  const tokenProject = searchParams.get("token") ?? "";
  const router = useRouter();

  return (
    <div className="flex items-center gap-0.5 p-0.5 border rounded-lg">
      <Button
        variant={mode === "edit" ? "default" : "secondary"}
        size="icon"
        onClick={() =>
          router.push(`?token=${tokenProject}&mode=edit&view=${view}`)
        }
        aria-label="Edit mode"
        aria-pressed={view === "grid"}
        className="size-8"
        title="Edit mode"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant={mode === "results" ? "default" : "secondary"}
        size="icon"
        onClick={() =>
          router.push(`?token=${tokenProject}&mode=results&view=${view}`)
        }
        aria-label="Results mode"
        aria-pressed={view === "carousel"}
        className="size-8"
        title="Results mode"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}
