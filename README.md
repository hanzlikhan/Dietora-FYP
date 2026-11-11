# 🥗 DIETORA — AI-Powered Diet Planning System

> Final Year Project (FYP) • Government College University Faisalabad (GCUF)
> AI-powered nutrition and meal planning platform for healthy, affordable, disease-aware eating.

DIETORA is a full-stack web application that helps users generate personalized 7-day meal plans based on their health profile, food allergies, budget, and chronic condition needs. The system combines a React frontend, Express + MongoDB backend, and AI-powered nutrition assistance with Groq integration for faster chatbot responses.

## Highlights

- Personalized 7-day meal plans for diabetes, hypertension, and cardiac conditions
- AI-assisted nutrition chatbot for user queries
- Budget-aware and affordability-based food suggestions
- Grocery list generation from selected meal plans
- Educational health content tailored for Pakistani users
- Admin dashboard for food and user management
- Responsive UI for desktop and mobile
- Secure authentication and role-based access control

---

## 🧩 What this project includes

### Frontend
- React + Vite + Tailwind CSS
- Redux Toolkit for state management
- Recharts for progress and analytics
- Role-based protected routes
- Dynamic dashboard, meal planner, education, chatbot, and admin experience

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication and secure route guards
- Health profile validation and BMI/BMR/TDEE calculations
- Meal generation logic and grocery workflows
- AI chatbot integration using Groq

### AI / Nutrition Features
- Disease-safe filtering based on user health conditions
- Budget optimization and smarter food selections
- Personalized calorie targeting by goal and activity level
- Grocery generation from plan data
- Chatbot with health and nutrition responses and store/location intent support

---

## 🏗️ Repository structure

```text
Dietora-FYP/
├── README.md
├── GROQ_MIGRATION_COMPLETE.md
├── running commanda
├── docs/
│   └── screenshots/
│       └── README.md
├── dietora-backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seeders/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── README.md
├── dietora-frontend/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── docs/
    ├── API_Reference.md
    └── SRS_Traceability_Matrix.md
```

---

## ⚙️ Tech stack

### Backend
- Node.js 18+
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Zod
- Helmet
- express-rate-limit
- Groq SDK

### Frontend
- React 18
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router
- Axios
- Recharts
- react-hot-toast

---

## ✨ Main features

### User features
- Register/login with JWT authentication
- Health profile creation and update
- BMI, BMR, and TDEE calculations
- Diet recommendations by goal: weight loss, maintenance, or gain
- Disease-aware food filtering for chronic conditions
- Budget-based meal planning
- Grocery list generation and purchase tracking
- Progress analytics and dashboard insights
- Educational nutrition content
- Feedback and review system

### Admin features
- Food item management
- User overview and management
- Basic analytics and monitoring
- Secure admin access only

### AI assistant
- Chatbot for nutrition and diet guidance
- Groq-powered response generation
- Prompt-based health-aware conversations
- Optional intent routing and location-related query handling

---

## 🚀 Quick start

### 1) Clone the repository

```bash
git clone https://github.com/hanzlikhan/Dietora-FYP.git
cd Dietora-FYP
```

### 2) Setup backend

```bash
cd dietora-backend
npm install
```

Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

Then set the required environment variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dietora
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@dietora.pk
ADMIN_PASSWORD=Admin@12345
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=mixtral-8x7b-32768
```

Optional but recommended values:

```env
CLIENT_URL=http://localhost:5173
```

### 3) Seed the database

```bash
npm run seed
npm run seed:admin
```

### 4) Start backend

```bash
npm run dev
```

Backend will run at:
- http://localhost:5000
- Health check: http://localhost:5000/health

### 5) Setup frontend

Open a new terminal:

```bash
cd dietora-frontend
npm install
npm run dev
```

Frontend will run at:
- http://localhost:5173

---

## 🔐 Default admin credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dietora.pk | Admin@12345 |

> Change admin credentials before production deployment.

---

## 🧠 How meal generation works

The system follows a practical nutrition planning flow:

1. Read the user profile and health constraints
2. Fetch available foods from MongoDB
3. Filter allergens and disease-sensitive items
4. Group foods by meal category
5. Optimize for calorie target and budget
6. Generate 7-day meal plans with variety
7. Compute weekly summaries and grocery outputs

This keeps the process fast, affordable, and suitable for practical decision-making in a FYP setting.

---

## 📦 Key scripts

### Backend

```bash
npm run dev     # start development server with nodemon
npm run start   # start production server
npm run seed    # seed Pakistani foods into MongoDB
npm run seed:admin   # create default admin user
```

### Frontend

```bash
npm run dev     # Vite dev server
npm run build   # production build
npm run preview # local preview of production build
```

---

## 🧪 Deployment notes

### Frontend deployment
- Deploy `dietora-frontend` to Vercel or Netlify
- Set `VITE_API_BASE_URL` to your backend URL

### Backend deployment
- Deploy `dietora-backend` to Railway, Render, or VPS
- Add all environment variables from `.env`
- Use MongoDB Atlas or a managed MongoDB service for production

---

## 📚 Documentation

This repo includes several documentation resources:

- `GROQ_MIGRATION_COMPLETE.md` — AI migration notes and implementation summary
- `docs/API_Reference.md` — API documentation
- `docs/SRS_Traceability_Matrix.md` — project traceability matrix
- `docs/screenshots/README.md` — screenshot capture workflow
- `dietora-backend/README.md` — backend-specific setup and API guide

---

## 🧾 Project status

This repository is a complete full-stack FYP project with:
- working backend API
- functional frontend application
- database seeding
- admin workflow
- AI nutrition assistance
- Groq migration already completed

---

## 📜 License

This project is developed for academic use as a Final Year Project. Please check with the author/institution before reusing it in commercial or public production contexts.

---

Built with care for healthier, smarter, and more affordable nutrition decisions in Pakistan. 🇵🇰
