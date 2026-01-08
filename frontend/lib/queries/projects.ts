import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { api } from "../axios";
import {
  fetchProject,
  fetchProjectResults,
  fetchProjects,
  fetchSharedLinks,
  fetchSharedProject,
} from "../projects";

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

export const useGetSharedProject = (
  tokenproj: string,
  pid: string,
  token?: string
) => {
  return useQuery({
    queryKey: ["sharedProject", pid, tokenproj, token],
    queryFn: () => fetchSharedProject(tokenproj, pid, token),
  });
};

export const useGetSharedLinks = (uid: string, token: string) => {
  return useQuery({
    queryKey: ["sharedLinks", uid, token],
    queryFn: () => fetchSharedLinks(uid, token),
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
  token: string
) => {
  return useQuery({
    queryKey: ["projectResults", uid, pid, token],
    queryFn: () => fetchProjectResults(uid, pid, token),
  });
};

export const fetchProjectUsers = async (
  uid: string,
  pid: string,
  token: string
) => {
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
