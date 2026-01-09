"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ImageSubmissionArea from "../image-submission-area";
import { LoaderCircle, Plus, X } from "lucide-react";
import { useAddProjectImages } from "@/lib/mutations/projects";
import { createBlobUrlFromFile } from "@/lib/utils";
import { useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useRealTimeProject } from "@/hooks/use-real-time-project";

export function AddImagesDialog() {
  const searchParams = useSearchParams();
  const tokenProject = searchParams.get("token") ?? ""; 
  
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  
  const { toast } = useToast();
  const { _id: pid } = useProjectInfo();
  const session = useSession();
  const { sendUpdate } = useRealTimeProject(pid, session?.token ?? "");

  const addImages = useAddProjectImages(
    session?.user?._id ?? "",
    pid as string,
    session?.token ?? ""
  );

 
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [selectedFiles]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => setSelectedFiles([]), 300);
    }
  };

  async function onDrop(files: File[]) {
    const newFiles = await Promise.all(
      files.map(async (file) => {
        const url = await createBlobUrlFromFile(file);
        return { file, preview: url };
      })
    );
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }

  function handleRemoveFile(indexToRemove: number) {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  const handleAdd = () => {
    const filesToSend = selectedFiles.map((item) => item.file);

    addImages.mutate(
      {
        uid: session?.user?._id ?? "anonymous", 
        pid: pid as string,
        token: session?.token ?? "", 
        images: filesToSend,
        tokenProject: tokenProject.length > 0 ? tokenProject : undefined,
      },
      {
        onSuccess: () => {
          toast({ 
            title: "Images added successfully.", 
            description: `${filesToSend.length} image(s) uploaded.`
          });
          
          // RNF53 - Broadcast change manually since REST API doesn't
          sendUpdate('add-image', { count: filesToSend.length });

          setSelectedFiles([]);
          setOpen(false);
        },
        onError: (error) => {
          toast({
            title: "Ups! An error occurred.",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="inline-flex" variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add Images
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Images</DialogTitle>
          <DialogDescription>
            Add more images to your project. Drag and drop or click to upload.
          </DialogDescription>
        </DialogHeader>
        
        <ImageSubmissionArea onDrop={onDrop} />

        {/* Área de Preview Visual */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Selected files ({selectedFiles.length}):
            </p>
            <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-1 border rounded-md">
              {selectedFiles.map((item, index) => (
                <div key={index} className="relative group aspect-square border rounded-md overflow-hidden bg-muted">
                  <img 
                    src={item.preview} 
                    alt={`Preview ${index}`} 
                    className="object-cover w-full h-full" 
                  />
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            className="inline-flex items-center gap-2"
            disabled={selectedFiles.length === 0 || addImages.isPending} 
            onClick={handleAdd}
          >
            <span>Add Images</span>
            {addImages.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}