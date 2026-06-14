import api from './api';

export const bookmarkService = {
  async getBookmarks(params = {}) {
    const { data } = await api.get('/bookmarks', { params });
    return data.data || data;
  },

  async list(params = {}) {
    return this.getBookmarks(params);
  },

  async saveBookmark(toolId, note = null) {
    const payload = { tool_id: toolId };
    if (note) {
      payload.note = note;
    }

    const { data } = await api.post('/bookmarks', payload);
    return data.data || data;
  },

  async create(toolId, note = null) {
    return this.saveBookmark(toolId, note);
  },

  async deleteBookmark(toolId) {
    const { data } = await api.delete(`/bookmarks/${toolId}`);
    return data;
  },

  async getTags() {
    const { data } = await api.get('/bookmarks/tags');
    return data.data?.tags || data.tags || data;
  },
};
