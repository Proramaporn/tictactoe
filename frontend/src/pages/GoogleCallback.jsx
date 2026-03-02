import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { googleCallback } from '../api/client';

export default function GoogleCallback() {
    const { loginUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const calledRef = useRef(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        if (code && !calledRef.current) {
            calledRef.current = true;
            (async () => {
                try {
                    const res = await googleCallback(code);
                    loginUser(res.data.token, res.data.user);
                    navigate('/game');
                } catch (err) {
                    console.error('Google Auth Failed:', err);
                    navigate('/login?error=google_auth_failed');
                }
            })();
        } else if (!code) {
            navigate('/login');
        }
    }, [location, loginUser, navigate]);

    return (
        <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Authenticating with Google…</h1>
                <p style={{ color: 'var(--text-muted)' }}>Please wait a moment while we sign you in.</p>
            </div>
        </div>
    );
}
