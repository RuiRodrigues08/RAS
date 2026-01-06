import { useQuery } from "@tanstack/react-query";
import {
  fetchProjects,
  fetchProject,
  fetchSharedProject,
  getProjectImages,
  ProjectImage,
  fetchProjectResults,
} from "../projects";
import { io } from "socket.io-client";
import { api } from "../axios";

export const useGetProjects = (uid: string, token: string) => {
  return useQuery({
    queryKey: ["projects", uid, token],
    queryFn: () => fetchProjects(uid, token),
  });
};

export const useGetProject = (uid: string, pid: string, token: string) => {
  return useQuery({
    queryKey: ["project", uid, pid, token],
    queryFn: () => fetchProject(uid, pid, token),
  });
};

export const useGetSharedProject = (tokenproj: string, pid: string,token?:string) => {
  return useQuery({
    queryKey: ["sharedProject", tokenproj, token],
    queryFn: () => fetchSharedProject(tokenproj, pid, token),
  });
};

export const useGetProjectImages = (
  uid: string,
  pid: string,
  token: string,
  initialData?: ProjectImage[],
) => {
  return useQuery({
    queryKey: ["projectImages", uid, pid, token],
    queryFn: () => getProjectImages(uid, pid, token),
    initialData: initialData,
  });
};

export const useGetSocket = (token: string) => {
  return useQuery({
    queryKey: ["socket", token],
    queryFn: () =>
      io("http://localhost:8080", {
        auth: {
          token: token,
        },
      }),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useGetProjectResults = (
  uid: string,
  pid: string,
  token: string,
) => {
  return useQuery({
    queryKey: ["projectResults", uid, pid, token],
    queryFn: () => fetchProjectResults(uid, pid, token),
  });
};


export const fetchProjectUsers = async (uid: string, pid: string, token: string) => {
  const response = await api.get(`/projects/${uid}/${pid}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};


export const useGetProjectUsers = (uid: string, pid: string, token: string) => {
  return useQuery({
    queryKey: ["projectUsers", uid, pid, token],
    queryFn: () => fetchProjectUsers(uid, pid, token),
  });
};
