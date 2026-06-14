import api from './api';

export const authService = {
  mapUserProfile(user) {
    if (!user || !user.profile) return user;

    return {
      ...user,
      jurusan: user.profile.major ?? user.jurusan,
      semester: user.profile.semester ?? user.semester,
      bahasa: user.profile.language_preference === 'en' ? 'English' : 'Indonesia',
      learning_style: user.profile.learning_style ?? user.learning_style,
    };
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      password_confirmation: password,
    });
    return data.data || data;
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    const token = data.data?.token || data.token;
    if (token) {
        localStorage.setItem('leva_token', token);
    }
    return data.data?.user || data.user;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('leva_token');
  },

  async me() {
    const { data } = await api.get('/auth/me');
    const user = data.data?.user || data.user || data;
    return this.mapUserProfile(user);
  },
};
