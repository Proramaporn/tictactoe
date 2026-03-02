import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('ttt_token');
        const stored = localStorage.getItem('ttt_user');
        if (token && stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
            }
        }
        return null;
    });
    const [loading] = useState(false);

    const loginUser = useCallback((token, userData) => {
        localStorage.setItem('ttt_token', token);
        localStorage.setItem('ttt_user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('ttt_token');
        localStorage.removeItem('ttt_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
