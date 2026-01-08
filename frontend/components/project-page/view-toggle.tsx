"use client";

import { Button } from "@/components/ui/button";
import { GalleryHorizontal, LayoutGrid } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function ViewToggle() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";
  const tokenProject = searchParams.get("token") ?? "";
  const router = useRouter();

  return (
    <div className="flex items-center gap-0.5 p-0.5 border rounded-lg">
      <Button
        variant={view === "grid" ? "default" : "secondary"}
        size="icon"
        onClick={() =>
          router.push(`?token=${tokenProject}&mode=${mode}&view=grid`)
        }
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className="size-8"
        title="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === "carousel" ? "default" : "secondary"}
        size="icon"
        onClick={() =>
          router.push(`?token=${tokenProject}&mode=${mode}&view=carousel`)
        }
        aria-label="Carousel view"
        aria-pressed={view === "carousel"}
        className="size-8"
        title="Carousel view"
      >
        <GalleryHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}