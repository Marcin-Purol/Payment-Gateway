import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.VUE_APP_API_URL || "http://localhost:3000/api",
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    delete config.headers.Authorization;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const excludedPaths = [
      "/merchant/login",
      "/merchant/register",
      "/merchant/refresh",
      "/merchant/profile",
    ];
    const isExcludedPath = excludedPaths.some((path) =>
      originalRequest.url.includes(path)
    );

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !isExcludedPath
    ) {
      originalRequest._retry = true;

      try {
        await apiClient.post("/merchant/refresh");
        return apiClient(originalRequest);
      } catch (refreshError) {
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
