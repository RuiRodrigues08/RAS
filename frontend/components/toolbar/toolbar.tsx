import { useClearProjectTools } from "@/lib/mutations/projects";
import { useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { Eraser } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
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

export function Toolbar() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const authParam = searchParams.get("auth");
  const project = useProjectInfo();
  const session = useSession();
  const [open, setOpen] = useState<boolean>(false);

  // Disable if grid view OR if auth=view (read-only)
  const disabled = view === "grid" || project.permission === "VIEWER";

  const clearTools = useClearProjectTools(
    session?.user?._id ?? "",
    project._id,
    session?.token ?? ""
  );

  return (
    <div className="flex h-full w-14 flex-col justify-between items-center border-r bg-background p-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-500">Tools</span>
        <BrightnessTool disabled={disabled} />
        <ContrastTool disabled={disabled} />
        <SaturationTool disabled={disabled} />
        <BinarizationTool disabled={disabled} />
        <RotateTool disabled={disabled} />
        <CropTool disabled={disabled} />
        <ResizeTool disabled={disabled} />
        <BorderTool disabled={disabled} />
        <WatermarkTool disabled={disabled} />
        <BgRemovalAITool disabled={disabled} />
        <CropAITool disabled={disabled} />
        <ObjectAITool disabled={disabled} />
        <PeopleAITool disabled={disabled} />
        <TextAITool disabled={disabled} />
        <UpgradeAITool disabled={disabled} />
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
              disabled={!session}
              onClick={() => {
                if (!session) return;
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
