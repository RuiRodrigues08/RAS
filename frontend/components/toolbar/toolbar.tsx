import { useSearchParams } from "next/navigation";
import BrightnessTool from "./brightness-tool";
import ContrastTool from "./contrast-tool";
import CropTool from "./crop-tool";
import ResizeTool from "./resize-tool";
import RotateTool from "./rotate-tool";
import SaturationTool from "./saturation-tool";
import BorderTool from "./border-tool";
import BinarizationTool from "./binarization-tool";
import WatermarkTool from "./watermark-tool";
import CropAITool from "./ai-crop-tool";
import BgRemovalAITool from "./ai-bg-removal";
import ObjectAITool from "./object-ai-tool";
import PeopleAITool from "./people-ai-tool";
import TextAITool from "./text-ai-tool";
import UpgradeAITool from "./upgrade-ai-tool";
import { useClearProjectTools } from "@/lib/mutations/projects";
import { useSession } from "@/providers/session-provider";
import { useProjectInfo } from "@/providers/project-provider";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Eraser } from "lucide-react";
import { useState, useEffect, ComponentType } from "react";

type ToolConfig = {
  id: string;
  component: ComponentType<{ disabled: boolean }>;
};

const DEFAULT_TOOLS: ToolConfig[] = [
  { id: "brightness", component: BrightnessTool },
  { id: "contrast", component: ContrastTool },
  { id: "saturation", component: SaturationTool },
  { id: "binarization", component: BinarizationTool },
  { id: "rotate", component: RotateTool },
  { id: "crop", component: CropTool },
  { id: "resize", component: ResizeTool },
  { id: "border", component: BorderTool },
  { id: "watermark", component: WatermarkTool },
  { id: "bg_removal", component: BgRemovalAITool },
  { id: "crop_ai", component: CropAITool },
  { id: "object_ai", component: ObjectAITool },
  { id: "people_ai", component: PeopleAITool },
  { id: "text_ai", component: TextAITool },
  { id: "upgrade_ai", component: UpgradeAITool },
];

export function Toolbar() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const disabled = view === "grid";
  const project = useProjectInfo();
  const session = useSession();

  const [open, setOpen] = useState<boolean>(false);
  const [tools, setTools] = useState<ToolConfig[]>(DEFAULT_TOOLS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  const clearTools = useClearProjectTools(
    session.user._id,
    project._id,
    session.token,
  );

  // Load saved order from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("toolbar-order");
    if (saved) {
      try {
        const savedIds = JSON.parse(saved) as string[];
        const reordered = savedIds
          .map((id) => DEFAULT_TOOLS.find((t) => t.id === id))
          .filter((t): t is ToolConfig => t !== undefined);
        
        // Add any new tools that weren't in saved order
        const existingIds = new Set(reordered.map(t => t.id));
        const newTools = DEFAULT_TOOLS.filter(t => !existingIds.has(t.id));
        
        setTools([...reordered, ...newTools]);
      } catch (e) {
        console.error("Failed to load toolbar order", e);
      }
    }
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDraggedOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex === null || draggedOverIndex === null) {
      setDraggedIndex(null);
      setDraggedOverIndex(null);
      return;
    }

    if (draggedIndex === draggedOverIndex) {
      setDraggedIndex(null);
      setDraggedOverIndex(null);
      return;
    }

    const newTools = [...tools];
    const [removed] = newTools.splice(draggedIndex, 1);
    
    // Adjust target index if dragging downwards
    const targetIndex = draggedIndex < draggedOverIndex ? draggedOverIndex - 1 : draggedOverIndex;
    newTools.splice(targetIndex, 0, removed);

    setTools(newTools);
    
    // Save to localStorage
    localStorage.setItem("toolbar-order", JSON.stringify(newTools.map(t => t.id)));

    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  return (
    <div className="flex h-full w-14 flex-col justify-between items-center border-r bg-background p-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-500">Tools</span>
        {tools.map((tool, index) => {
          const ToolComponent = tool.component;
          return (
            <div key={tool.id} className="relative">
              {draggedOverIndex === index && draggedIndex !== index && draggedIndex !== null && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary z-10" />
              )}
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`cursor-grab active:cursor-grabbing ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <ToolComponent disabled={disabled} />
              </div>
            </div>
          );
        })}
        {/* Drop zone for last position */}
        <div 
          className="relative h-2"
          onDragEnter={() => handleDragEnter(tools.length)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {draggedOverIndex === tools.length && draggedIndex !== null && draggedIndex !== tools.length && (
            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary z-10" />
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="text-red-400 size-8"
            disabled={project.tools.length === 0}
          >
            <Eraser />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Tools?</DialogTitle>
            <DialogDescription>
              This will remove <b>all</b> edits from the current project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                clearTools.mutate({
                  uid: session.user._id,
                  pid: project._id,
                  toolIds: project.tools.map((t) => t._id),
                  token: session.token,
                });
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
