import { ToolbarButton } from "./toolbar-button";
import { CaseSensitive } from "lucide-react";

export default function TextAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "text_ai",
        params: {},
      }}
      disabled={disabled}
      icon={CaseSensitive}
      label="AI Text Detection"
      isPremium
      noParams
      helpDescription="This tool uses an AI model to detect and highlight text in your image."
      helpMediaSrc="/gifs/Gif-Texto.gif"
    />
  );
}
