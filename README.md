# 🥗 DIETORA — AI-Powered Diet Planning System

> **Final Year Project (FYP) — Government College University Faisalabad (GCUF)**
> Department of Computer Science & Information Technology | 2024–2025

DIETORA is a full-stack web application that generates personalized 7-day Pakistani meal plans based on a user's health conditions (diabetes, hypertension, cardiac), food allergies, and daily budget in PKR — using local Faisalabad market prices and authentic desi foods.

---

## 📸 Pages Overview

| Page | Description |
|------|-------------|
| 🏠 Landing | Hero, features, disease modes, testimonials, CTA |
| ℹ️ About | Project info, tech stack, UAF details |
| ❓ FAQ | 20+ accordion questions across 5 categories |
| 🔐 Login | Split-panel login with form validation |
| 📝 Register | Registration with password strength check |
| 📊 Dashboard | BMI stats, quick actions, latest meal plan preview |
| 👤 Health Profile | BMI meter, goal, activity level, disease flags, budget |
| 🍽️ Meal Planner | 7-day tab view with 4 meal cards/day + nutrition summary |
| 🛒 Grocery List | Auto-generated, grouped by category, mark purchased |
| 💰 Budget Optimizer | Cost vs budget analysis + cheaper meal suggestions |
| 📈 Progress Charts | Recharts line, bar, pie charts for calories & budget |
| 📚 Educational Hub | 6 articles on diabetes, hypertension, cardiac, nutrition |
| 🤖 AI Chatbot | Floating widget with rule-based nutrition Q&A |
| 💬 Feedback | Star rating + category + free-text submission |
| ⚙️ Admin Panel | Food CRUD + user management (admin role only) |

---

## 🏗️ Project Structure

```
FYP/
├── dietora-backend/          # Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── app.js            # Express app setup
│   │   ├── server.js         # Entry point
│   │   ├── config/
│   │   │   └── database.js   # MongoDB connection
│   │   ├── controllers/      # Route handlers (8 controllers)
│   │   ├── middleware/        # auth, error, validation
│   │   ├── models/           # Mongoose schemas (7 models)
│   │   ├── routes/           # Express routers (8 route files)
│   │   ├── seeders/          # Pakistani food data + admin seed
│   │   ├── services/         # Business logic (meal planner, grocery, chatbot)
│   │   ├── utils/            # JWT helpers, response formatters
│   │   └── validators/       # Zod input schemas
│   ├── .env                  # Environment variables (see setup)
│   └── package.json
│
├── dietora-frontend/         # React + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── App.jsx           # Router + protected routes
│   │   ├── main.jsx          # Redux Provider + BrowserRouter
│   │   ├── index.css         # Tailwind + custom classes
│   │   ├── components/
│   │   │   ├── charts/       # Recharts wrappers
│   │   │   ├── layout/       # Navbar, Sidebar, TopBar, Footer
│   │   │   ├── ui/           # Reusable UI primitives
│   │   │   └── ChatbotWidget.jsx
│   │   ├── context/          # ModalContext
│   │   ├── hooks/            # useProfile, useMealPlans, useDebounce
│   │   ├── pages/            # 15 page components
│   │   ├── services/
│   │   │   └── api.js        # Axios instance + interceptors
│   │   ├── store/
│   │   │   ├── store.js      # Redux store
│   │   │   └── slices/       # 6 Redux slices
│   │   └── utils/
│   │       └── helpers.js    # BMI/BMR/TDEE helpers, formatters
│   ├── .env                  # VITE_API_BASE_URL
│   ├── vite.config.js        # Dev proxy + build config
│   └── package.json
│
├── docs/                     # Project documentation
│   ├── API_Reference.md      # All endpoints documented
│   ├── SRS_Traceability_Matrix.md  # SRS → code mapping
│   └── screenshots/          # Page screenshots for report
│
└── README.md                 # This file
```

---

## ⚙️ Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.18 | HTTP framework |
| MongoDB | 6+ | Database |
| Mongoose | 8 | ODM |
| JWT (jsonwebtoken) | 9 | Authentication |
| bcryptjs | 2.4 | Password hashing |
| Zod | 3.22 | Input validation |
| Helmet | 7 | Security headers |
| express-rate-limit | 7 | Rate limiting |
| Morgan | 1.10 | HTTP logging |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 5 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Redux Toolkit | 2.2 | State management |
| React Router v6 | 6.22 | Client-side routing |
| Axios | 1.6 | HTTP client |
| Recharts | 2.12 | Charts |
| react-hot-toast | 2.4 | Toast notifications |

---

## 🚀 Quick Start — Local Development

### Prerequisites
- **Node.js** v18 or higher ([download](https://nodejs.org))
- **MongoDB** — either:
  - Local: [Install MongoDB Community](https://www.mongodb.com/try/download/community) and run `mongod`
  - Cloud: [MongoDB Atlas free tier](https://www.mongodb.com/atlas) (recommended)
- **npm** v9+ (comes with Node.js)
- **Git** (optional)

---

### Step 1 — Setup Backend

```bash
# Navigate to backend folder
cd C:\Users\dell\Desktop\FYP\dietora-backend

# Install dependencies
npm install
```

The `.env` file is already created. If you want to use MongoDB Atlas, edit it:
```bash
# Open .env and set your MongoDB URI
notepad .env
```

Minimum `.env` for local MongoDB (no changes needed if mongod is running):
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dietora
JWT_SECRET=dietora_fyp_uaf_super_secret_jwt_2025_change_this
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@dietora.pk
ADMIN_PASSWORD=Admin@12345
```

```bash
# Seed 35 Pakistani foods into the database
npm run seed

# Create the admin account
npm run seed:admin

# Start backend development server
npm run dev
```

✅ Backend running at: `http://localhost:5000`
✅ Health check: `http://localhost:5000/health`

---

### Step 2 — Setup Frontend

Open a **new terminal window**:

```bash
# Navigate to frontend folder
cd C:\Users\dell\Desktop\FYP\dietora-frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

✅ Frontend running at: `http://localhost:5173`

> **Note**: The Vite dev proxy automatically forwards all `/api/*` requests to `http://localhost:5000` — no CORS issues in development.

---

### Step 3 — Open the App

1. Open your browser → `http://localhost:5173`
2. Click **"Get Started"** or **"Login"**
3. To test admin features: use `admin@dietora.pk` / `Admin@12345`

---

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dietora.pk | Admin@12345 |
| User (demo) | Register any account | Your choice |

> ⚠️ Change the admin password in `.env` before any deployment.

---

## 🌱 Database Seeding

The seeders add:
- **35 authentic Pakistani foods** with Faisalabad market prices (PKR)
- **Safety flags** for diabetes, hypertension, cardiac conditions
- **Allergen tags** (gluten, dairy, eggs, nuts, etc.)
- **Meal type assignments** (breakfast, lunch, dinner, snack)

```bash
# Re-run seeds anytime (clears and re-inserts foods)
npm run seed

# Re-create admin account (skips if already exists)
npm run seed:admin
```

---

## 🧠 AI Meal Generation — How It Works

The meal planner runs a **greedy optimization pipeline** in < 2 seconds:

```
1. fetchConstraints()     → Extract calorie target, budget, diseases, allergies from profile
2. fetchAvailableFoods()  → Query MongoDB for all available food items
3. filterAllergens()      → Remove foods containing user's allergens
4. filterByDiseases()     → Keep only disease-safe foods (AND logic for multiple conditions)
5. groupByMealType()      → Group remaining foods by breakfast/lunch/dinner/snack
6. optimizeBudget()       → Sort by calorie-per-PKR ratio, filter by per-meal budget
7. generate7DayPlan()     → Pick foods with variety tracking across all 7 days
8. calculateSummaries()   → Weekly totals for cost, calories, macros
```

**Why it's fast (< 2 seconds):**
- Pure JavaScript — no external AI API calls
- MongoDB compound indexes on disease flags + category
- Simple greedy selection (no backtracking)
- Runs in-memory once foods are fetched

---

## 🏭 Production Build

### Build Frontend

```bash
cd dietora-frontend
npm run build
# Output: dietora-frontend/dist/
```

The `dist/` folder can be:
- Served by Nginx or Apache
- Deployed to Vercel / Netlify (connect GitHub repo)
- Served by the Express backend (see below)

### Serve Frontend from Express (Optional)

Add this to `dietora-backend/src/app.js` after building the frontend:

```javascript
const path = require('path')
// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../dietora-frontend/dist')))
// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../dietora-frontend/dist/index.html'))
  }
})
```

Then run only the backend: `npm run dev` — it serves both API and frontend.

### Deploy Backend (Example: Railway / Render)

1. Push code to GitHub
2. Connect repo to [Railway](https://railway.app) or [Render](https://render.com)
3. Set environment variables from `.env`
4. Deploy — they detect Node.js automatically

### Deploy Frontend (Example: Vercel)

1. Push `dietora-frontend/` to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Set `VITE_API_BASE_URL` = your deployed backend URL
4. Deploy — Vercel detects Vite automatically

---

## 📊 Features Checklist

### Core Features
- [x] User registration & login with JWT
- [x] Health profile (age, gender, weight, height, activity, goal)
- [x] Auto BMI, BMR (Mifflin-St Jeor), TDEE calculation
- [x] Disease flags: Diabetes / Hypertension / Cardiac
- [x] Allergen exclusions (6 types)
- [x] Daily budget in PKR
- [x] AI 7-day meal plan generation (< 2 seconds)
- [x] Day-by-day meal view with nutrition breakdown
- [x] Auto-generated grocery list from meal plan
- [x] Mark items as purchased with progress tracking
- [x] Budget vs plan analysis with adherence percentage
- [x] Budget optimization with cheaper food alternatives
- [x] Recharts progress: calories, budget, macros, adherence
- [x] 6 educational articles on Pakistani nutrition
- [x] Floating AI chatbot with 15+ nutrition intents
- [x] Feedback submission with star rating
- [x] Admin: food CRUD, user management, analytics
- [x] Dark mode toggle (persists to localStorage)
- [x] Fully responsive (mobile, tablet, desktop)
- [x] Toast notifications on all user actions
- [x] Protected routes with auth guards
- [x] Loading states on all async operations
- [x] Global error handling (frontend + backend)
- [x] Rate limiting (100 req/15min, 20 auth req/15min)

---

## 🗂️ Documentation

| Document | Location |
|----------|---------|
| API Reference | `docs/API_Reference.md` |
| SRS Traceability Matrix | `docs/SRS_Traceability_Matrix.md` |
| Screenshots Guide | `docs/screenshots/README.md` |
| Running Commands | `running commanda` (root) |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot connect to MongoDB` | Run `mongod` locally, or check Atlas URI in `.env` |
| `Port 5000 already in use` | Change `PORT=5001` in `.env` and update frontend `.env` |
| `Token expired` | Login again — JWT expires after 7 days |
| `Not enough food items` | Run `npm run seed` in backend folder |
| `Admin routes return 403` | Login with admin credentials, not a regular user account |
| `Meal plan not generating` | Ensure health profile is saved first (`/profile`) |
| Frontend shows `Network Error` | Make sure backend is running at port 5000 |
| `CORS error` | Vite proxy handles dev CORS — ensure you're on `localhost:5173` |

---

## 👥 Team & Acknowledgements

- **Institution**: University of Agriculture Faisalabad (UAF)
- **Department**: Computer Science & Information Technology
- **Project Type**: Final Year Project (FYP) 2024–2025
- **Target Users**: Pakistani families, especially those with chronic health conditions
- **Scope**: Faisalabad, Punjab, Pakistan

---

## 📜 License

This project is developed as an academic Final Year Project at UAF Faisalabad.
For academic use only. All rights reserved © 2025 DIETORA Team.

---

*Built with ❤️ for healthier Pakistan 🇵🇰*
