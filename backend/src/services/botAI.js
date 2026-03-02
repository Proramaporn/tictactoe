/**
 * Enhanced Bot AI for Tic-Tac-Toe
 * Supports multiple board sizes (3, 5, 7)
 * Uses Minimax for 3x3 and Alpha-Beta for larger boards
 * Includes a "fallibility" factor so it occasionally makes mistakes
 */

function checkWinner(board, size, winCondition = size === 3 ? 3 : 4) {
    const grid = [];
    for (let i = 0; i < size; i++) {
        grid.push(board.slice(i * size, (i + 1) * size));
    }

    // Rows
    for (let r = 0; r < size; r++) {
        for (let c = 0; c <= size - winCondition; c++) {
            const segment = grid[r].slice(c, c + winCondition);
            if (segment[0] && segment.every(cell => cell === segment[0])) return segment[0];
        }
    }

    // Columns
    for (let c = 0; c < size; c++) {
        for (let r = 0; r <= size - winCondition; r++) {
            let match = true;
            const first = grid[r][c];
            if (!first) continue;
            for (let k = 1; k < winCondition; k++) {
                if (grid[r + k][c] !== first) {
                    match = false;
                    break;
                }
            }
            if (match) return first;
        }
    }

    // Diagonals (top-left to bottom-right)
    for (let r = 0; r <= size - winCondition; r++) {
        for (let c = 0; c <= size - winCondition; c++) {
            let match = true;
            const first = grid[r][c];
            if (!first) continue;
            for (let k = 1; k < winCondition; k++) {
                if (grid[r + k][c + k] !== first) {
                    match = false;
                    break;
                }
            }
            if (match) return first;
        }
    }

    // Diagonals (top-right to bottom-left)
    for (let r = 0; r <= size - winCondition; r++) {
        for (let c = winCondition - 1; c < size; c++) {
            let match = true;
            const first = grid[r][c];
            if (!first) continue;
            for (let k = 1; k < winCondition; k++) {
                if (grid[r + k][c - k] !== first) {
                    match = false;
                    break;
                }
            }
            if (match) return first;
        }
    }

    return null;
}

function evaluateHeuristic(board, size, winCondition) {
    // Simple heuristic: count potential winning lines
    // For larger boards, we look for chains of length 2, 3, 4
    const winner = checkWinner(board, size, winCondition);
    if (winner === 'O') return 10000;
    if (winner === 'X') return -10000;
    return 0; // Shallow heuristic
}

function alphaBeta(board, size, winCondition, depth, alpha, beta, isMaximizing) {
    const winner = checkWinner(board, size, winCondition);
    if (winner === 'O') return 1000 - depth;
    if (winner === 'X') return depth - 1000;
    if (depth >= (size === 3 ? 9 : size === 5 ? 4 : 3) || board.every(c => c !== '')) {
        return evaluateHeuristic(board, size, winCondition);
    }

    const moves = [];
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') moves.push(i);
    }

    if (isMaximizing) {
        let best = -Infinity;
        for (const move of moves) {
            board[move] = 'O';
            const val = alphaBeta(board, size, winCondition, depth + 1, alpha, beta, false);
            board[move] = '';
            best = Math.max(best, val);
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const move of moves) {
            board[move] = 'X';
            const val = alphaBeta(board, size, winCondition, depth + 1, alpha, beta, true);
            board[move] = '';
            best = Math.min(best, val);
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function getBotMove(board, size) {
    const winCondition = size === 3 ? 3 : 4;

    // Fallibility: 15% chance to make a completely random move
    if (Math.random() < 0.15) {
        const empty = board.map((c, i) => (c === '' ? i : -1)).filter(i => i !== -1);
        if (empty.length > 0) {
            return empty[Math.floor(Math.random() * empty.length)];
        }
    }

    let bestScore = -Infinity;
    let move = -1;
    const moves = [];
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') moves.push(i);
    }

    // Heuristic for very large boards: only check moves near existing marks
    // to save computation time
    let filteredMoves = moves;
    if (size >= 7) {
        filteredMoves = moves.filter(idx => {
            const r = Math.floor(idx / size);
            const c = idx % size;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                        if (board[nr * size + nc] !== '') return true;
                    }
                }
            }
            return false;
        });
        if (filteredMoves.length === 0) filteredMoves = [Math.floor(board.length / 2)];
    }

    for (const i of filteredMoves) {
        board[i] = 'O';
        const score = alphaBeta(board, size, winCondition, 0, -Infinity, Infinity, false);
        board[i] = '';
        if (score > bestScore) {
            bestScore = score;
            move = i;
        }
    }
    return move === -1 ? moves[0] : move;
}

function evaluateBoard(board, size) {
    const winCondition = size === 3 ? 3 : 4;
    const winner = checkWinner(board, size, winCondition);
    if (winner) return { ended: true, winner, isDraw: false };
    if (board.every(cell => cell !== '')) return { ended: true, winner: null, isDraw: true };
    return { ended: false, winner: null, isDraw: false };
}

module.exports = { getBotMove, evaluateBoard };
