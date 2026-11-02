import axios from "axios";

// Uses the Vite dev proxy (/api -> backend). Set VITE_API_URL for production builds.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const errMsg = (err) =>
  err.response?.data?.message ||
  "Cannot reach the server. Is the backend running?";

export default api;
