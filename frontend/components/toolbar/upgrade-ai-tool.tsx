import { ToolbarButton } from "./toolbar-button";
import { ArrowBigUpDashIcon } from "lucide-react";

export default function UpgradeAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "upgrade_ai",
        params: {},
      }}
      disabled={disabled}
      icon={ArrowBigUpDashIcon}
      label="AI Upgrade"
      isPremium
      noParams
      helpDescription="This tool uses an AI model to enhance the quality of your image."
      helpMediaSrc="/gifs/Gif-upgrade.gif"
    />
  );
}
