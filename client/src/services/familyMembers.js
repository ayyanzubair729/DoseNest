import api from "./api";

const familyMembersApi = {
  async list() {
    const { data } = await api.get("/family-members");
    return data.data.familyMembers;
  },

  async get(id) {
    const { data } = await api.get(`/family-members/${id}`);
    return data.data.familyMember;
  },

  async create(payload) {
    const { data } = await api.post("/family-members", payload);
    return data.data.familyMember;
  },

  async update(id, payload) {
    const { data } = await api.put(`/family-members/${id}`, payload);
    return data.data.familyMember;
  },

  async remove(id) {
    await api.delete(`/family-members/${id}`);
  },

  async overview() {
    const { data } = await api.get("/family-members/summary");
    return data.data.overview;
  },
};

export default familyMembersApi;
