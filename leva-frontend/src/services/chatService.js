import api from './api';

export const chatService = {
  async sendMessage(message, contextTaskId = null) {
    const payload = { message };
    if (contextTaskId) {
      payload.context_task_id = contextTaskId;
    }

    const { data } = await api.post('/chat', payload);
    return data.data || data;
  },

  async send(message, contextTaskId = null) {
    return this.sendMessage(message, contextTaskId);
  },

  async getHistory(params = {}) {
    const { data } = await api.get('/chat/history', { params });
    return data.data || data;
  },

  async clearHistory() {
    const { data } = await api.delete('/chat/history');
    return data;
  },
};
