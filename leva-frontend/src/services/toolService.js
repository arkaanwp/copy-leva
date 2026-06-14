import api from './api';

export const toolService = {
  async getTools(params = {}) {
    const { data } = await api.get('/tools', { params });
    return data.data || data;
  },

  async list(params = {}) {
    return this.getTools(params);
  },

  async getToolDetail(id) {
    const { data } = await api.get(`/tools/${id}`);
    return data.data?.tool || data.tool || data;
  },

  async searchTools(q, limit) {
    const { data } = await api.get('/tools/search', {
      params: { q, limit },
    });
    return data.data || data;
  },
};
