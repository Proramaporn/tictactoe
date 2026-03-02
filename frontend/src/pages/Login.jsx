import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, register, getGoogleUrl } from '../api/client';

export default function Login() {
    const { loginUser } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('error') === 'google_auth_failed') {
            setError('Google authentication failed. Please try again.');
        }
    }, []);

    const handleChange = (e) => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleGoogleLogin = async () => {
        try {
            setSubmitting(true);
            const res = await getGoogleUrl();
            window.location.href = res.data.url;
        } catch {
            setError('Failed to initiate Google login. Please try again.');
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            let res;
            if (mode === 'login') {
                res = await login({ email: form.email, password: form.password });
            } else {
                if (!form.username.trim()) {
                    setError('Username is required');
                    setSubmitting(false);
                    return;
                }
                res = await register({ username: form.username, email: form.email, password: form.password });
            }
            loginUser(res.data.token, res.data.user);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Try again.' + err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="main-content" style={{ alignItems: 'center' }}>
            <div className="auth-container card">
                <div className="auth-header">
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎮</div>
                    <h1 className="auth-title">Tic-Tac-Toe</h1>
                    <p className="auth-subtitle">
                        {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to start playing.'}
                    </p>
                </div>

                {error && <div className="error-banner" role="alert">{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    {mode === 'register' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                className="form-input"
                                placeholder="e.g. coolplayer42"
                                value={form.username}
                                onChange={handleChange}
                                autoComplete="username"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="form-input"
                            placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                            value={form.password}
                            onChange={handleChange}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                        />
                    </div>

                    <button
                        id="auth-submit-btn"
                        type="submit"
                        className="btn btn-primary form-btn"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', margin: 0 }} />
                                Please wait…
                            </span>
                        ) : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        <span>OR</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>

                    <button
                        type="button"
                        className="btn btn-google"
                        onClick={handleGoogleLogin}
                        disabled={submitting}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.956H.957a8.996 8.996 0 0 0 0 8.088l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>
                </form>

                <div className="auth-switch">
                    {mode === 'login' ? (
                        <>Don't have an account?{' '}
                            <button
                                id="switch-to-register"
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', marginLeft: '0.25rem' }}
                                onClick={() => { setMode('register'); setError(''); }}
                            >
                                Sign Up
                            </button>
                        </>
                    ) : (
                        <>Already have an account?{' '}
                            <button
                                id="switch-to-login"
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', marginLeft: '0.25rem' }}
                                onClick={() => { setMode('login'); setError(''); }}
                            >
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
