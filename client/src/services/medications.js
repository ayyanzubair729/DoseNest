import api from "./api";

const medicationsApi = {
  async list(params) {
    const { data } = await api.get("/medications", { params });
    return data.data.medications;
  },

  async get(id) {
    const { data } = await api.get(`/medications/${id}`);
    return data.data.medication;
  },

  async create(payload) {
    const { data } = await api.post("/medications", payload);
    return data.data.medication;
  },

  async update(id, payload) {
    const { data } = await api.put(`/medications/${id}`, payload);
    return data.data.medication;
  },

  async remove(id) {
    await api.delete(`/medications/${id}`);
  },

  async upcoming(limit = 10) {
    const { data } = await api.get("/medications/upcoming", { params: { limit } });
    return data.data.doses;
  },

  async stats() {
    const { data } = await api.get("/medications/stats");
    return data.data.stats;
  },

  async createSchedule(medicationId, payload) {
    const { data } = await api.post(`/medications/${medicationId}/schedules`, payload);
    return data.data.schedule;
  },

  async deleteSchedule(medicationId, scheduleId) {
    await api.delete(`/medications/${medicationId}/schedules/${scheduleId}`);
  },

  async logs(params) {
    const { data } = await api.get("/medication-logs", { params });
    return data.data.logs;
  },

  async markTaken(logId) {
    const { data } = await api.post(`/medication-logs/${logId}/taken`);
    return data.data.log;
  },

  async markMissed(logId) {
    const { data } = await api.post(`/medication-logs/${logId}/missed`);
    return data.data.log;
  },
};

export default medicationsApi;
