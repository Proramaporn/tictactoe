# 🎮 Tic-Tac-Toe Game

A full-stack web application for playing Tic-Tac-Toe against an AI opponent with user authentication, multi-board sizes, and a leaderboard system.

## 📋 Features

- **🔐 User Authentication**
  - Email/password registration and login
  - Google OAuth 2.0 integration
  - Secure JWT-based session management

- **🎯 Gameplay**
  - Play against an intelligent bot using alpha-beta pruning algorithm
  - Support for 3x3, 5x5, and 7x7 board sizes
  - Real-time game state management
  - Fallibility feature (15% chance bot makes mistakes)

- **📊 Scoring System**
  - Size-specific score tracking
  - Win/loss/draw statistics
  - Win streak tracking with bonus rewards
  - Leaderboard rankings per board size

- **🎨 User Interface**
  - Dark-themed, modern responsive design
  - Real-time toast notifications
  - Loading states and error handling
  - Mobile-friendly layout

## 🏗️ Project Structure

```
tictactoe/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── server.js          # Express app setup
│   │   ├── db/
│   │   │   └── database.js    # SQLite database & schema
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js        # Auth endpoints
│   │   │   ├── game.js        # Game endpoints
│   │   │   └── scores.js      # Score/leaderboard endpoints
│   │   └── services/
│   │       ├── botAI.js       # Bot AI logic
│   │       └── scoring.js     # Score calculation
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # Router setup
│   │   ├── index.css          # Global styles
│   │   ├── api/
│   │   │   └── client.js      # Axios API client
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state
│   │   └── pages/
│   │       ├── Login.jsx      # Auth page
│   │       ├── Game.jsx       # Game page
│   │       ├── Leaderboard.jsx # Leaderboard page
│   │       └── GoogleCallback.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Docker & Docker Compose (optional)
- Google OAuth credentials (for OAuth login)

### Local Development

1. **Clone and setup backend:**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The API will run on `http://localhost:3001`

2. **Setup frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Environment Variables

**Backend (.env):**
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

## 🐳 Docker Deployment

### Using Docker Compose

```bash
docker-compose up --build
```

This will start:
- **Backend API** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`
- **SQLite Database** (persisted in volume)

Update the `.env` file and set `GOOGLE_REDIRECT_URI` for production:
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

### Docker Compose Services

- **backend**: Node.js API server
- **frontend**: React development/build server
- **Volumes**: Database persistence, package caching

## 📚 API Documentation

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login with email/password |
| GET | `/api/auth/me` | ✅ | Get current user info |
| GET | `/api/auth/google/url` | ❌ | Get Google OAuth URL |
| POST | `/api/auth/google/callback` | ❌ | Handle Google OAuth callback |

### Game

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/game/new` | ✅ | Start new game (size: 3, 5, or 7) |
| POST | `/api/game/move` | ✅ | Make move, get bot response |
| GET | `/api/game/current` | ✅ | Get current game state |

### Scores

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/scores/me?size=3` | ✅ | Get user's score for board size |
| GET | `/api/scores/leaderboard?size=3` | ❌ | Get leaderboard for board size |

## 🎮 Game Rules

- **3x3 board**: Get 3 in a row/column/diagonal to win
- **5x5 board**: Get 4 in a row/column/diagonal to win
- **7x7 board**: Get 4 in a row/column/diagonal to win
- **Scoring**:
  - Win: +1 point
  - Loss: -1 point
  - Draw: 0 points
  - 3-win streak: +1 bonus point

## 🤖 Bot AI

The bot uses an **alpha-beta pruning** algorithm with:
- Full minimax evaluation for 3x3 boards
- Depth-limited search for larger boards
- Heuristic board evaluation
- 15% "fallibility" factor (intentional mistakes for gameplay balance)

## 🔧 Commands

### Backend

```bash
npm start          # Production: run server
npm run dev        # Development: run with nodemon
```

### Frontend

```bash
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## 📦 Dependencies

### Backend
- **express**: Web framework
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **google-auth-library**: Google OAuth
- **cors**: CORS middleware
- **dotenv**: Environment variables

### Frontend
- **react**: UI framework
- **react-router-dom**: Client-side routing
- **axios**: HTTP client
- **vite**: Build tool

## 🗄️ Database

SQLite database (`game.db`) with three main tables:

- **users**: User accounts with OAuth support
- **scores**: Size-specific score tracking per user
- **games**: Game history with board state and moves

Auto-migration handles schema updates on startup.

## 🚨 Error Handling

- Automatic 401 logout on token expiration
- Detailed error messages for validation failures
- Graceful fallback for network errors
- Toast notifications for user feedback

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints for tablet and desktop
- Touch-friendly UI controls
- Adaptive board sizing

## 🔒 Security

- Password hashing with bcryptjs (12 salt rounds)
- JWT tokens with expiration
- CORS origin whitelisting
- SQL parameter binding (prepared statements)
- Input validation on all endpoints

## 🐛 Troubleshooting

**Port already in use**:
```bash
# Change port in .env for backend or vite.config.js for frontend
```

**Database locked**:
```bash
# Remove game.db-shm and game.db-wal files
rm backend/game.db-shm backend/game.db-wal
```

**Google OAuth redirect URI mismatch**:
```bash
# Update GOOGLE_REDIRECT_URI in .env to match your domain
```

## 📄 License

MIT

## 👥 Author

Created as a modern Tic-Tac-Toe game with AI opponent and competitive leaderboard features.

---

**Questions or issues?** Check the code structure in each module for detailed inline documentation.
