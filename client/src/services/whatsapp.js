import api from "./api";

const whatsappApi = {
  async status() {
    const { data } = await api.get("/notifications/whatsapp/status");
    return data.data.status;
  },

  async updateSettings({ phoneNumber, whatsappRemindersEnabled }) {
    const { data } = await api.put("/notifications/whatsapp/settings", {
      phoneNumber,
      whatsappRemindersEnabled,
    });
    return data.data.user;
  },

  async sendTest() {
    const { data } = await api.post("/notifications/whatsapp/test");
    return data.data.delivery;
  },
};

export default whatsappApi;
