import api from "./api";

const notificationsApi = {
  async list(params) {
    const { data } = await api.get("/notifications", { params });
    return data.data.notifications;
  },

  async unreadCount() {
    const { data } = await api.get("/notifications/unread-count");
    return data.data.count;
  },

  async markRead(id) {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data.data.notification;
  },

  async markAllRead() {
    const { data } = await api.put("/notifications/read-all");
    return data.data.marked;
  },

  async nextReminder() {
    const { data } = await api.get("/notifications/next");
    return data.data.reminder;
  },
};

export default notificationsApi;
