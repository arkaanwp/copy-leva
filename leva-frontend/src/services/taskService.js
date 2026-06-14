import api from './api';

export const taskService = {
  async submit(text, file = null) {
    const formData = new FormData();
    if (file) {
      formData.append('pdf_file', file);
    }
    if (text) {
      formData.append('text', text);
    }

    const { data } = await api.post('/tasks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data.data || data;
  },

  async getTasks(params = {}) {
    const { data } = await api.get('/tasks', { params });
    return data.data || data;
  },

  async list(params = {}) {
    return this.getTasks(params);
  },

  async getTaskDetail(taskId) {
    const { data } = await api.get(`/tasks/${taskId}`);
    return data.data?.task || data.task || data;
  },

  async get(taskId) {
    return this.getTaskDetail(taskId);
  },

  async getTaskStatus(taskId) {
    const { data } = await api.get(`/tasks/${taskId}/status`);
    return data.data || data;
  },

  async updateSubTask(taskId, subTaskId, status) {
    const { data } = await api.patch(`/tasks/${taskId}/sub-tasks/${subTaskId}`, { status });
    return data.data?.sub_task || data.sub_task || data;
  },

  async deleteTask(taskId) {
    const { data } = await api.delete(`/tasks/${taskId}`);
    return data;
  },

  pollStatus(taskId, onComplete, onError, intervalMs = 2000, timeoutMs = 60000) {
    const startTime = Date.now();

    const checkStatus = async () => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        onError(new Error('Tugas masih diproses terlalu lama. Pastikan queue backend berjalan.'));
        return;
      }

      try {
        const { data } = await api.get(`/tasks/${taskId}/status`);
        const statusData = data.data || data;

        if (statusData.status === 'completed') {
          clearInterval(interval);
          const detailData = await this.getTaskDetail(taskId);
          onComplete(detailData);
          return;
        }

        if (statusData.status === 'failed') {
          clearInterval(interval);
          onError(new Error(statusData.error_message ?? 'Gagal memproses tugas. Coba lagi.'));
        }
      } catch (error) {
        clearInterval(interval);
        onError(error);
      }
    };

    const interval = setInterval(checkStatus, intervalMs);
    // Jalankan satu kali di awal agar tidak menunggu interval pertama
    checkStatus();

    return () => clearInterval(interval);
  },
};
