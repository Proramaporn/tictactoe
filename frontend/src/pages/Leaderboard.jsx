import { useEffect, useState, useCallback } from 'react';
import { getLeaderboard } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
    const { user, logout } = useAuth();
    const [size, setSize] = useState(() => parseInt(localStorage.getItem('ttt_pref_size')) || 3);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const handleSizeChange = (s) => {
        setSize(s);
        localStorage.setItem('ttt_pref_size', s);
    };

    const fetchLeaderboard = useCallback(async (boardSize) => {
        setLoading(true);
        setError('');
        try {
            const res = await getLeaderboard(boardSize);
            setPlayers(res.data.leaderboard);
        } catch {
            setError('Failed to load leaderboard. Try again later.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard(size);
    }, [size, fetchLeaderboard]);

    const rankDisplay = (i) => {
        if (i === 0) return '🥇';
        if (i === 1) return '🥈';
        if (i === 2) return '🥉';
        return `#${i + 1}`;
    };

    return (
        <div className="page-wrapper">
            <nav className="navbar">
                <span className="navbar-brand">🎮 TicTacToe</span>
                <div className="navbar-actions">
                    {user && (
                        <>
                            <span className="user-pill">
                                <span className="avatar">{user.username?.[0]?.toUpperCase()}</span>
                                {user.username}
                            </span>
                            <Link to="/game">
                                <button id="go-to-game-btn" className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }}>
                                    ← Play
                                </button>
                            </Link>
                            <button id="logout-lb-btn" className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }} onClick={logout}>
                                Sign Out
                            </button>
                        </>
                    )}
                    {!user && (
                        <Link to="/login">
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }}>Sign In</button>
                        </Link>
                    )}
                </div>
            </nav>

            <div className="main-content">
                <div className="leaderboard-container">
                    <div className="lb-header" style={{ textAlign: 'center' }}>
                        <h1 className="lb-title">🏆 Leaderboard</h1>
                        <p className="lb-subtitle">Top players ranked by board size</p>

                        <div className="tabs" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                            {[3, 5, 7].map(s => (
                                <button
                                    key={s}
                                    className={`btn ${size === s ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ padding: '0.4rem 1.2rem', minWidth: '80px' }}
                                    onClick={() => handleSizeChange(s)}
                                >
                                    {s}x{s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="card loading-state">
                            <div className="loading-spinner" />
                            Loading rankings for {size}x{size}…
                        </div>
                    ) : error ? (
                        <div className="error-banner">{error}</div>
                    ) : players.length === 0 ? (
                        <div className="card empty-state">
                            No {size}x{size} players yet. Be the first to win! 🎯
                        </div>
                    ) : (
                        <div className="lb-table card">
                            <table className="lb-table-inner">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Player</th>
                                        <th>Score</th>
                                        <th>W / L / D</th>
                                        <th>Streak</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((player, i) => (
                                        <tr key={player.id}>
                                            <td className={`rank-cell rank-${i + 1}`}>{rankDisplay(i)}</td>
                                            <td>
                                                <div className="player-name">{player.username}</div>
                                                <div className="player-email">{player.email}</div>
                                            </td>
                                            <td className="score-cell">{player.total_score ?? 0}</td>
                                            <td>
                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{player.total_wins ?? 0}</span>
                                                {' / '}
                                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{player.total_losses ?? 0}</span>
                                                {' / '}
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{player.total_draws ?? 0}</span>
                                            </td>
                                            <td>
                                                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>
                                                    {'🔥'.repeat(player.win_streak ?? 0) || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
