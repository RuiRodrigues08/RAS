import { useEffect, useRef, useState } from 'react';
import { useGetSocket } from '@/lib/projects';
import { useToast } from './use-toast';
import { useQueryClient } from "@tanstack/react-query";

export const useRealTimeProject = (
  projectId: string,
  token: string,
  onProjectUpdate?: (data: any) => void
) => {
  const { data: socket } = useGetSocket(token);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState<{id: string, name: string, email?: string}[]>([]);
  
  // 1. Fix Loop: Use Ref for callback to avoid re-triggering useEffect on every render
  const onUpdateRef = useRef(onProjectUpdate);
  useEffect(() => {
    onUpdateRef.current = onProjectUpdate;
  }, [onProjectUpdate]);

  const updateLocalCache = (action: string, content: any) => {
      if (action === 'update-project-name') {
          queryClient.setQueriesData({ queryKey: ['project'] }, (old: any) => {
             if (!old || old._id !== projectId) return old;
             return { ...old, name: content.name };
          });
          queryClient.setQueriesData({ queryKey: ['sharedProject'] }, (old: any) => {
             if (!old || old._id !== projectId) return old;
             return { ...old, name: content.name };
          });
      } else if (action === 'update-tool') {
          const updateTools = (old: any) => {
              if (!old || old._id !== projectId) return old;
              const newTools = old.tools.map((t: any) => {
                // Match by ID or procedure name
                if ((t._id && t._id === content.toolId) || t.procedure === content.toolId) {
                    return { ...t, params: content.params };
                }
                return t;
              });
              return { ...old, tools: newTools };
          };

          queryClient.setQueriesData({ queryKey: ['project'] }, updateTools);
          queryClient.setQueriesData({ queryKey: ['sharedProject'] }, updateTools);
      } else if (action === 'add-tool') {
          const addTool = (old: any) => {
              if (!old || old._id !== projectId) return old;
              // Check if tool already exists to avoid duplication (e.g. if we get our own broadcast back)
              const exists = old.tools.find((t: any) => t.procedure === content.tool.procedure);
              if (exists) return old;
              
              return { ...old, tools: [...old.tools, content.tool] };
          };

          queryClient.setQueriesData({ queryKey: ['project'] }, addTool);
          queryClient.setQueriesData({ queryKey: ['sharedProject'] }, addTool);
      } else if (action === 'remove-tool') {
          const removeTool = (old: any) => {
              if (!old || old._id !== projectId) return old;
              const newTools = old.tools.filter((t: any) => 
                !((t._id && t._id === content.toolId) || t.procedure === content.toolId)
              );
              return { ...old, tools: newTools };
          };
          queryClient.setQueriesData({ queryKey: ['project'] }, removeTool);
          queryClient.setQueriesData({ queryKey: ['sharedProject'] }, removeTool);
      } else if (action === 'clear-tools') {
          const clearTools = (old: any) => {
              if (!old || old._id !== projectId) return old;
              return { ...old, tools: [] };
          };
          queryClient.setQueriesData({ queryKey: ['project'] }, clearTools);
          queryClient.setQueriesData({ queryKey: ['sharedProject'] }, clearTools);
      } else if (action === 'add-image' || action === 'remove-image') {
          // Invalidate to refetch project (and images) - force refetch
          queryClient.invalidateQueries({ queryKey: ['project'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['sharedProject'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['projectImages'], refetchType: 'all' });
      }
  };

  useEffect(() => {
    if (!socket) return;
    if (!projectId) return;

    // Join the project room
    // console.log("Joining room", projectId);
    socket.emit('join-project', projectId);

    const handleUpdate = (data: any) => {
      console.log('Real-time update received:', data);
      
      updateLocalCache(data.action, data.content);

      // Call the component specific callback if it exists
      if (onUpdateRef.current) {
        onUpdateRef.current(data);
      }
      
      const user = data.userName || "Um colaborador";
      let description = `Ação: ${data.action}`;

      switch (data.action) {
          case 'add-tool':
              description = `${user} adicionou a ferramenta: ${data.content.tool.procedure}`;
              break;
          case 'update-tool':
              // Try to be descriptive if possible
              description = `${user} alterou os parâmetros de uma ferramenta`;
              break;
          case 'remove-tool':
              description = `${user} removeu uma ferramenta`;
              break;
          case 'clear-tools':
              description = `${user} limpou todas as ferramentas`;
              break;
          case 'update-project-name':
              description = `${user} alterou o nome do projeto para "${data.content.name}"`;
              break;
          case 'add-image':
              description = `${user} adicionou novas imagens`;
              break;
          case 'remove-image':
              description = `${user} removeu uma imagem`;
              break;
      }

      toast({
          title: "Atualização",
          description: description,
      });
    };

    const handleUserJoined = (data: { userId: string, userName?: string }) => {
        setActiveUsers(prev => {
            if (prev.find(u => u.id === data.userId)) return prev;
            return [...prev, { id: data.userId, name: data.userName || "Guest" }];
        });
        toast({
            title: "Colaboração",
            description: `${data.userName || "Um utilizador"} entrou na sala.`,
            duration: 3000,
        });
    };

    const handleUserLeft = (data: { userId: string, userName?: string }) => {
        setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
        /* Optional: Toast for leaving
        toast({
            title: "Colaboração",
            description: `${data.userName || "Um utilizador"} saiu da sala.`,
        });
        */
    };

    const handleActiveUsers = (data: { users: {id: string, name: string}[] }) => {
        setActiveUsers(data.users);
    };

    socket.on('project-updated', handleUpdate);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('active-users', handleActiveUsers);

    return () => {
      // console.log("Leaving room", projectId);
      socket.emit('leave-project', projectId);
      socket.off('project-updated', handleUpdate);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('active-users', handleActiveUsers);
    };
  }, [socket, projectId, toast, queryClient]); // Removed onProjectUpdate from dependencies

  const sendUpdate = (action: string, content: any) => {
    // 1. Update Local Cache Immediately (Optimistic / Local verification)
    updateLocalCache(action, content);

    // 2. Send to Server
    if (socket) {
      socket.emit('edit-project', {
        projectId,
        action,
        content,
      });
    }
  };

  return { sendUpdate, socket, activeUsers };
};
