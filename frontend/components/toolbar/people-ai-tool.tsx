import { ToolbarButton } from "./toolbar-button";
import { Users } from "lucide-react";

export default function PeopleAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "people_ai",
        params: {},
      }}
      disabled={disabled}
      icon={Users}
      label="AI People Detection"
      isPremium
      noParams
      helpFirst
      helpDescription="This tool uses an AI model to detect and highlight people in your image."
      helpMediaSrc="/gifs/Gif-pessoas.gif"
    />
  );
}
