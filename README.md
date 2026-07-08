# 🚀 AI SQL Assistant (SaaS)

AI SQL Assistant is a **production-ready SaaS application** that allows users to query relational databases using **natural language**.  
It converts user prompts into optimized SQL queries using AI, executes them securely, and returns meaningful results.

This project is built to demonstrate **real-world full-stack engineering**, including authentication, payments, database design, and cloud deployment.

🌐 **Live Demo**  
https://sql-assistant-c410.onrender.com

---

## 📸 Screenshots

![Dashboard](/dashboard.png)
![Playground](/playground.png)
![Query Interface](/query.png)

---

## ✨ Key Features

- 🔐 JWT-based Authentication (Login / Register)
- 🤖 Natural Language → SQL using AI
- 📊 Query execution on PostgreSQL
- 💳 Stripe subscription (Free & Pro plans)
- 🔔 Stripe Webhooks for secure payment verification
- 🧠 Role & subscription-based access control
- ☁️ Cloud-deployed (Frontend + Backend + DB)
- 🛠 Production-ready error handling & logging

---

## 🏗️ Tech Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

### Backend
- FastAPI (Python)
- REST APIs
- JWT Authentication
- Stripe API & Webhooks

### Database
- PostgreSQL
- SQLAlchemy ORM

### Cloud & DevOps
- Render (Frontend, Backend, PostgreSQL)
- GitHub Actions (CI/CD)
- Environment-based configuration

---

## 🧠 System Architecture

Client (Next.js)
|

FastAPI Backend
|

PostgreSQL Database
|

Stripe Webhooks (Subscription Updates)


---

## 🔐 Authentication Flow

1. User registers or logs in
2. Backend validates credentials
3. JWT token is issued
4. Token is attached to protected requests
5. Backend enforces access control

---

## 💳 Stripe Subscription Flow

1. User selects Pro plan
2. Stripe Checkout session is created
3. Payment is completed on Stripe
4. Stripe sends webhook event
5. Backend verifies event signature
6. User account is upgraded to **Pro**

> Webhooks ensure payments cannot be spoofed or faked.

---

## 🧪 Testing

- Unit Testing (backend utilities)
- Integration Testing (auth & API flows)
- API testing via FastAPI TestClient
- Ready for frontend tests using Jest / React Testing Library

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL
- Git

---

### 📥 Clone the Repository

```bash
git clone https://github.com/zaydhassan/Saas-AI-SQL-Assistant.git
cd Saas-AI-SQL-Assistant

🔧 Backend Setup

cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

Create a .env file:

DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET_KEY=your_secret_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:3000

Run backend:

uvicorn main:app --reload

🎨 Frontend Setup

cd frontend
npm install
npm run dev

Create .env.local:

NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
