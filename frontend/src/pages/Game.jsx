import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { newGame, makeMove, getGame, getMyScore } from '../api/client';

const WINNING_COMBOS = (size) => {
    const combos = [];
    const grid = [];
    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) row.push(i * size + j);
        grid.push(row);
    }

    const winCondition = (size === 3) ? 3 : 4;

    // Rows
    for (let r = 0; r < size; r++) {
        for (let c = 0; c <= size - winCondition; c++) {
            combos.push(grid[r].slice(c, c + winCondition));
        }
    }
    // Cols
    for (let c = 0; c < size; c++) {
        for (let r = 0; r <= size - winCondition; r++) {
            const col = [];
            for (let k = 0; k < winCondition; k++) col.push(grid[r + k][c]);
            combos.push(col);
        }
    }
    // Diagonals
    for (let r = 0; r <= size - winCondition; r++) {
        for (let c = 0; c <= size - winCondition; c++) {
            const d1 = [];
            const d2 = [];
            for (let k = 0; k < winCondition; k++) {
                d1.push(grid[r + k][c + k]);
                d2.push(grid[r + k][c + winCondition - 1 - k]);
            }
            combos.push(d1);
            combos.push(d2);
        }
    }
    return combos;
};

function getWinningCells(board, size) {
    const combos = WINNING_COMBOS(size);
    for (const combo of combos) {
        const first = board[combo[0]];
        if (first && combo.every(idx => board[idx] === first)) return combo;
    }
    return [];
}

function Toast({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
            ))}
        </div>
    );
}

function ScorePanel({ score, bonusVisible, size }) {
    if (!score) return (
        <div className="side-panel card score-card">
            <div className="score-card-title">{size}x{size} Stats</div>
            <div className="loading-state" style={{ padding: '1.5rem' }}>
                <div className="loading-spinner" />
            </div>
        </div>
    );

    const streak = score.win_streak ?? 0;

    return (
        <div className="side-panel card score-card">
            <div className="score-card-title">{size}x{size} Stats</div>

            <div className="total-score">
                <div className="score-number">{score.total_score ?? 0}</div>
                <div className="score-label">Total Score</div>
            </div>

            <div className="stats-grid">
                <div className="stat-item">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{score.total_wins ?? 0}</div>
                    <div className="stat-label">Wins</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value" style={{ color: 'var(--danger)' }}>{score.total_losses ?? 0}</div>
                    <div className="stat-label">Losses</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{score.total_draws ?? 0}</div>
                    <div className="stat-label">Draws</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>{streak}</div>
                    <div className="stat-label">Streak</div>
                </div>
            </div>

            <div className="streak-bar">
                <div className="streak-label">Win Streak (3 = +1 Bonus 🎁)</div>
                <div className="streak-dots">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`streak-dot ${i < streak ? 'active' : ''}`} />
                    ))}
                </div>
            </div>

            {bonusVisible && (
                <div className="bonus-toast">🎁 Bonus! +1 for {size}x{size} streak!</div>
            )}

            <Link to="/leaderboard">
                <button id="leaderboard-btn" className="btn btn-secondary" style={{ width: '100%' }}>
                    🏆 View Leaderboard
                </button>
            </Link>
        </div>
    );
}

export default function Game() {
    const { user, logout } = useAuth();
    const [size, setSize] = useState(() => parseInt(localStorage.getItem('ttt_pref_size')) || 3);
    const [board, setBoard] = useState(Array(size * size).fill(''));
    const [gameResult, setGameResult] = useState(null);
    const [thinking, setThinking] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [winCells, setWinCells] = useState([]);
    const [score, setScore] = useState(null);
    const [bonusVisible, setBonusVisible] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [loading, setLoading] = useState(true);

    const pushToast = (message, type) => {
        const id = Date.now();
        setToasts(ts => [...ts, { id, message, type }]);
        setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
    };

    const fetchScore = useCallback(async (boardSize) => {
        try {
            const res = await getMyScore(boardSize);
            setScore(res.data.score);
        } catch {
            pushToast('Failed to fetch score', 'loss');
        }
    }, []);

    const startNewGame = useCallback(async (newSize) => {
        try {
            setLoading(true);
            const res = await newGame(newSize);
            const g = res.data.game;
            setSize(g.size);
            localStorage.setItem('ttt_pref_size', g.size);
            setBoard(g.board);
            setGameResult(null);
            setGameOver(false);
            setWinCells([]);
            setBonusVisible(false);
            await fetchScore(g.size);
        } catch {
            pushToast('Failed to start game', 'loss');
        } finally {
            setLoading(false);
        }
    }, [fetchScore]);

    useEffect(() => {
        (async () => {
            try {
                const res = await getGame();
                const prefSize = parseInt(localStorage.getItem('ttt_pref_size')) || 3;
                if (res.data.game) {
                    const g = res.data.game;
                    setSize(g.size);
                    localStorage.setItem('ttt_pref_size', g.size);
                    setBoard(g.board);
                    setGameOver(false);
                    setGameResult(null);
                    setWinCells(getWinningCells(g.board, g.size));
                    await fetchScore(g.size);
                } else {
                    await startNewGame(prefSize);
                }
            } catch {
                const prefSize = parseInt(localStorage.getItem('ttt_pref_size')) || 3;
                await startNewGame(prefSize);
            }
            setLoading(false);
        })();
    }, [startNewGame, fetchScore]);

    const handleCellClick = async (index) => {
        if (board[index] || gameOver || thinking || loading) return;

        setThinking(true);
        const optimisticBoard = [...board];
        optimisticBoard[index] = 'X';
        setBoard(optimisticBoard);

        try {
            const res = await makeMove(index);
            const data = res.data;

            setBoard(data.board);

            if (data.gameOver) {
                setGameOver(true);
                setGameResult(data.result);
                setWinCells(getWinningCells(data.board, size));

                if (data.result === 'win') {
                    pushToast('🎉 You win! +1 point', 'win');
                    if (data.scoreUpdate?.bonus) {
                        setBonusVisible(true);
                        pushToast('🎁 3-win streak bonus! +1 extra!', 'bonus');
                    }
                } else if (data.result === 'loss') {
                    pushToast('😔 You lost. -1 point', 'loss');
                } else {
                    pushToast("🤝 It's a draw!", 'draw');
                }

                await fetchScore(size);
            }
        } catch (err) {
            setBoard(board);
            pushToast(err.response?.data?.error || 'Move failed', 'loss');
        } finally {
            setThinking(false);
        }
    };

    const statusInfo = () => {
        if (loading) return { text: 'Loading game…', cls: 'turn' };
        if (thinking) return { text: '🤖 Bot is thinking…', cls: 'thinking' };
        if (gameResult === 'win') return { text: '🎉 You won!', cls: 'win' };
        if (gameResult === 'loss') return { text: '🤖 Bot wins! Better luck next time.', cls: 'loss' };
        if (gameResult === 'draw') return { text: "🤝 It's a draw!", cls: 'draw' };
        return { text: `✏️ Your turn (${(size === 3) ? '3' : '4'} in a row to win)`, cls: 'turn' };
    };

    const { text: statusText, cls: statusCls } = statusInfo();

    return (
        <div className="page-wrapper">
            <nav className="navbar">
                <span className="navbar-brand">🎮 TicTacToe</span>
                <div className="navbar-actions">
                    <span className="user-pill">
                        <span className="avatar">{user?.username?.[0]?.toUpperCase()}</span>
                        {user?.username}
                    </span>
                    <button id="logout-btn" className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }} onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="main-content">
                <div className="game-container" style={{ maxWidth: size === 10 ? '1100px' : '900px' }}>
                    {/* Game Panel */}
                    <div className="game-panel card">
                        <div className="game-header">
                            <h1 className="game-title">
                                <span style={{ color: 'var(--x-color)' }}>X</span>
                                {' vs '}
                                <span style={{ color: 'var(--o-color)' }}>O</span>
                            </h1>
                            <div className="size-selector" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                {[3, 5, 7].map(s => (
                                    <button
                                        key={s}
                                        className={`btn ${size === s ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ padding: '0.3rem 1rem', fontSize: '0.8rem' }}
                                        onClick={() => { if (size !== s) startNewGame(s); }}
                                        disabled={loading || thinking}
                                    >
                                        {s}x{s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={`status-bar ${statusCls}`} role="status">
                            {statusText}
                        </div>

                        <div
                            className="board"
                            style={{
                                gridTemplateColumns: `repeat(${size}, 1fr)`,
                                maxWidth: size === 7 ? '500px' : size === 5 ? '450px' : '340px'
                            }}
                        >
                            {board.map((cell, i) => (
                                <button
                                    key={i}
                                    id={`cell-${i}`}
                                    className={[
                                        'cell',
                                        cell ? `filled ${cell.toLowerCase()}` : '',
                                        (gameOver || thinking || !cell && loading) ? 'disabled' : '',
                                        winCells.includes(i) ? 'winning' : '',
                                    ].filter(Boolean).join(' ')}
                                    style={{
                                        fontSize: size === 7 ? '1.4rem' : size === 5 ? '1.8rem' : '2.8rem',
                                        borderRadius: size === 7 ? '8px' : '14px'
                                    }}
                                    onClick={() => handleCellClick(i)}
                                    disabled={!!cell || gameOver || thinking || loading}
                                >
                                    {cell}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                id="new-game-btn"
                                className="btn btn-primary"
                                onClick={() => startNewGame(size)}
                                disabled={loading}
                            >
                                {gameOver ? '🔄 Play Again' : '🆕 Reset Game'}
                            </button>
                            <Link to="/leaderboard">
                                <button id="view-lb-btn" className="btn btn-secondary">🏆 Leaderboard</button>
                            </Link>
                        </div>
                    </div>

                    {/* Score Sidebar */}
                    <ScorePanel score={score} bonusVisible={bonusVisible} size={size} />
                </div>
            </div>

            <Toast toasts={toasts} />
        </div>
    );
}
