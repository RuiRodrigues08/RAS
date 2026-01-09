import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useClearProjectTools } from "@/lib/mutations/projects";
import { useRealTimeProject } from "@/hooks/use-real-time-project";
import { useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { Eraser } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
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
import BgRemovalAITool from "./ai-bg-removal";
import CropAITool from "./ai-crop-tool";
import BinarizationTool from "./binarization-tool";
import BorderTool from "./border-tool";
import BrightnessTool from "./brightness-tool";
import ContrastTool from "./contrast-tool";
import CropTool from "./crop-tool";
import ObjectAITool from "./object-ai-tool";
import PeopleAITool from "./people-ai-tool";
import ResizeTool from "./resize-tool";
import RotateTool from "./rotate-tool";
import SaturationTool from "./saturation-tool";
import TextAITool from "./text-ai-tool";
import UpgradeAITool from "./upgrade-ai-tool";
import WatermarkTool from "./watermark-tool";

const TOOL_COMPONENTS: Record<string, React.ElementType> = {
  brightness: BrightnessTool,
  contrast: ContrastTool,
  saturation: SaturationTool,
  binarization: BinarizationTool,
  rotate: RotateTool,
  crop: CropTool,
  resize: ResizeTool,
  border: BorderTool,
  watermark: WatermarkTool,
  bgRemoval: BgRemovalAITool,
  cropAI: CropAITool,
  objectAI: ObjectAITool,
  peopleAI: PeopleAITool,
  textAI: TextAITool,
  upgradeAI: UpgradeAITool,
};

const DEFAULT_ORDER = [
  "brightness",
  "contrast",
  "saturation",
  "binarization",
  "rotate",
  "crop",
  "resize",
  "border",
  "watermark",
  "bgRemoval",
  "cropAI",
  "objectAI",
  "peopleAI",
  "textAI",
  "upgradeAI",
];

function SortableItem(props: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: "8px",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
}

export function Toolbar() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const project = useProjectInfo();
  const session = useSession();
  const [open, setOpen] = useState<boolean>(false);
  const { sendUpdate } = useRealTimeProject(project._id, session?.token || "");
  const [items, setItems] = useState<string[]>(DEFAULT_ORDER);

  useEffect(() => {
    const savedOrder = localStorage.getItem(`tool-order-${session?.user?._id || "guest"}`);
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const merged = [...parsed];
        DEFAULT_ORDER.forEach(t => {
          if (!merged.includes(t)) merged.push(t);
        });
        setItems(merged);
      } catch(e) {
        console.error("Failed to parse tool order", e);
      }
    }
  }, [session?.user?._id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        localStorage.setItem(`tool-order-${session?.user?._id || "guest"}`, JSON.stringify(newItems));
        
        return newItems;
      });
    }
  }

  const disabled = view === "grid" || project.permission === "VIEWER";

  return (
    <div className="flex h-full w-14 flex-col justify-between items-center border-r bg-background p-2">
      <div className="flex flex-col gap-2 w-full items-center overflow-y-auto no-scrollbar pb-2">
        <span className="text-sm text-gray-500 mb-2">Tools</span>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items}
            strategy={verticalListSortingStrategy}
          >
            {items.map((key) => {
              const Component = TOOL_COMPONENTS[key];
              if (!Component) return null;
              return (
                <SortableItem key={key} id={key}>
                  <Component disabled={disabled} />
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>

      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="text-red-400 size-8 mt-2"
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
              disabled={!session}
              onClick={() => {
                if (!session) return;
                sendUpdate('clear-tools', {});
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
