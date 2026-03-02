import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ttt_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('ttt_token');
            localStorage.removeItem('ttt_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ─────────────────────────────────────────────────────
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const getGoogleUrl = () => api.get('/auth/google/url');
export const googleCallback = (code) => api.post('/auth/google/callback', { code });

// ── Game ─────────────────────────────────────────────────────
export const newGame = (size = 3) => api.post('/game/new', { size });
export const makeMove = (cellIndex) => api.post('/game/move', { cellIndex });
export const getGame = () => api.get('/game/current');

// ── Scores ───────────────────────────────────────────────────
export const getMyScore = (size = 3) => api.get(`/scores/me?size=${size}`);
export const getLeaderboard = (size = 3) => api.get(`/scores/leaderboard?size=${size}`);

export default api;
