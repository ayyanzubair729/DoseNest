import api from "./api";

const authApi = {
  async register({ name, email, password }) {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data.data.user;
  },

  async login({ email, password }) {
    const { data } = await api.post("/auth/login", { email, password });
    return data.data.user;
  },

  // Returns { user, session } — the backend restores the session and shares
  // non-secret session config (idle timeout) from the same request.
  async me() {
    const { data } = await api.get("/auth/me");
    return data.data;
  },

  async logout() {
    await api.post("/auth/logout");
  },
};

export default authApi;
