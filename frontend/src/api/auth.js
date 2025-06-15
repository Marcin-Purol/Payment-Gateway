import apiClient from "./axios";

export const authService = {
  async logout() {
    try {
      await apiClient.post("/merchant/logout");
    } catch (error) {
      // Ignore logout
    } finally {
      window.location.href = "/login";
    }
  },

  async checkAuth() {
    try {
      const response = await apiClient.get("/merchant/profile");
      return response.data;
    } catch (error) {
      return null;
    }
  },
  async refreshToken() {
    const response = await apiClient.post("/merchant/refresh");
    return response.data;
  },
};
