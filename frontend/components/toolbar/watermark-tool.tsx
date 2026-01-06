import { ToolbarButton } from "./toolbar-button";
import { Signature } from "lucide-react";

export default function WatermarkTool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "watermark",
        params: {},
      }}
      disabled={disabled}
      icon={Signature}
      label="Watermark"
      helpDescription="This tool allows you to add a watermark to your image."
      helpMediaSrc="/gifs/Gif-Marca-de-agua.gif"
      noParams
      helpFirst
    />
  );
}
