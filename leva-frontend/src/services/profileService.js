import api from './api';

export const profileService = {
  async create(payload) {
    const { data } = await api.post('/profile', payload);
    return data.data?.user || data;
  },

  async get() {
    const { data } = await api.get('/profile');
    return data.data?.profile || data;
  },

  async update(payload) {
    const { data } = await api.put('/profile', payload);
    return data.data?.profile || data;
  },
};
