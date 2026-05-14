import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export async function fetchProjects() {
  const { data } = await api.get("/projects");
  return data;
}

export async function fetchProject(id) {
  const { data } = await api.get(`/projects/${id}`);
  return data;
}

export async function fetchHistory(id) {
  const { data } = await api.get(`/projects/${id}/history`);
  return data;
}

export async function submitCapa(id, payload) {
  const { data } = await api.post(`/projects/${id}/capa`, payload);
  return data;
}

export async function syncProject(id) {
  const { data } = await api.post(`/projects/${id}/sync`);
  return data;
}

export function pdfUrl(id) {
  return `/api/export/${id}/pdf`;
}
