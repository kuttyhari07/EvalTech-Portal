# EvalTech — Premium MERN Examination SaaS Platform

EvalTech is an enterprise-grade, multi-tenant online examination management SaaS built with the modern MERN stack, TypeScript, Tailwind CSS, shadcn/ui design primitives, Recharts analytics, Razorpay subscription billing, AI-assisted question generation, and real-time student exam execution.

Designed for individual teachers, coaching academies, K-12 schools, universities, and corporate training organizations.

---

## 🌟 Key Highlights & System Features

### 1. Distinct Student Capacity Engine
- Flexible subscription tiers: **Free** (10 students), **Plus** (50 students), **Pro** (100 students), and **Organization** (250+ students).
- Calculates capacity based on **distinct active students** across all classes in the workspace, preventing duplicate records from consuming quota multiple times.
- Organizations share a centralized distinct student quota across all their staff instructors.
- Concurrency-safe quota enforcement at the database aggregation layer.

### 2. Multi-Tenant Role-Based Access Control (4 Roles)
- **Super Admin**: Platform-wide metrics, tenant management, subscription tier control, revenue reports, security audit logs.
- **Organization Admin**: School profile, staff invitations, class oversight, shared capacity utilization, billing.
- **Staff / Teacher**: Independent classes, manual & CSV student rosters, question banks, exam builder, auto & subjective grading.
- **Student**: Join exams via unique 6-character access codes or direct links, distraction-minimized exam hall, server-synchronized countdown timers, incremental answer autosave.

### 3. Human-in-the-Loop AI Question Generator
- Generate curriculum-aligned questions for any topic, difficulty, or question type.
- Strict Zod schema validation protects against malformed AI output.
- Dedicated teacher review modal ensures no question is published without human verification.

### 4. Robust Examination Hall & Auto-Scoring
- Supports 7 question formats: Single-Choice (MCQ), Multi-Select with partial credit, True/False, Fill in the Blanks, Short Answer, Long Answer, Code Snippets.
- Authoritative server timer prevents browser-clock tampering.
- Sub-second incremental autosave persists progress after refresh or network drops.
- Negative marking penalties with configurable point deductions.
- Anti-tamper monitoring: records tab switches, window minimization, and blur events.
- Immediate or manual result release modes with automated email dispatch.

### 5. Programming Exams & Sandboxed Compiler
- Dedicated **`PROGRAMMING`** question type supporting C, C++, Java, and Python.
- Multi-tier test-case management: sample, visible, and strictly protected hidden test cases.
- **Dual Execution Engine**:
  - `local_sandbox`: Zero-config local isolated runner with temporary directory sandbox and strict environment variable cleansing (blocks Mongo URI/JWT/Razorpay leakage).
  - `judge0`: Production-ready Judge0 API integration for isolated multi-language code evaluation.
- Two distinct student workflows: **Run Code** (practice against visible test cases without scoring) vs. **Submit Solution** (durable evaluated grading against all visible & hidden tests).
- Automated grading engine with output normalization (CRLF/LF, whitespace, numeric tolerance) and all-or-nothing or weighted scoring.
- Browser-based **Monaco Code Editor** with syntax highlighting, dark/light themes, language selection, starter code reset, and debounced draft code autosaving.
- **Safe Exam Browser (SEB)** verification middleware across attempt creation, code execution, answer autosave, and exam finalization.
- Professional HTML exam result notification emails with programming scores and secure result links.

### 6. Razorpay Subscription Billing
- Monthly and yearly billing cycles.
- Backend SHA-256 HMAC cryptographic signature verification.
- Idempotent webhook event processing (`payment.captured`, `order.paid`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide Icons, Recharts, Canvas Confetti |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose ODM, Zod, JWT, Cookie-Parser, Helmet |
| **Compiler & Sandbox** | Local Isolated Sandbox Process Runner / Judge0 API Client / Piston |
| **Database** | MongoDB Atlas / Document Store |
| **Integrations** | Razorpay (Subscriptions & Webhooks), Nodemailer (Transactional Emails), Gemini/OpenAI (AI Question Generator), Safe Exam Browser (SEB) |
| **Testing** | Jest, ts-jest, Supertest, In-memory MongoDB |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v22/v24)
- **npm** v9+
- A running **MongoDB** instance or **MongoDB Atlas** connection string

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/evaltech-portal.git
cd EvalTech-Portal

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

**Backend (`server/.env`):**
### 4. Run Automated Test Suite
```bash
cd server
npm test
```
*Executes unit and integration tests for the capacity calculation engine and evaluation scoring logic with 100% pass rate.*

### 5. Start Development Servers
From the root directory:
```bash
# In Terminal 1 - Backend:
cd server
npm run dev

# In Terminal 2 - Frontend:
cd client
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Default Seeded Accounts

When started for the first time, the platform automatically initializes default subscription plans and the Super Admin account:

| Role | Email | Password | Portal Path |
|---|---|---|---|
| **Super Admin** | `admin@evaltech.io` | `Admin@EvalTech2025!` | `/admin` |
| **Staff / Teacher** | Register via `/register` (Select Individual Staff) | (your password) | `/staff` |
| **Organization Admin** | Register via `/register` (Select Organization) | (your password) | `/org` |
| **Student** | Access via `/exam/join` or `/exam/:code` | (Exam Code) | `/exam/:code` |

---

## 🌐 Production Deployment Guide

### Frontend Deployment (Vercel)
1. Link the `client` directory to a new Vercel project.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://evaltech-api.onrender.com/api`)
5. Configure `vercel.json` rewrites for single-page application routing:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Backend Deployment (Render / Railway)
1. Deploy the `server` directory as a Node Web Service.
2. Build Command: `npm install && npm run build`
3. Start Command: `node dist/server.js`
4. Configure Environment Variables matching `server/.env.example`.
5. Point Razorpay Webhook URL to `https://your-backend.com/api/webhooks/razorpay` with `payment.captured` and `order.paid` events.

---

## 🔒 Security Architecture
- **HTTP-Only Cookies**: JWT tokens stored in strict SameSite HTTP-only cookies to prevent XSS exfiltration.
- **Role & Tenant Isolation**: Middleware enforces organization and user ownership on every database query.
- **Protected Answer Keys**: Student-facing endpoints never transmit correct answer options, keys, or explanations until official results are released.
- **Idempotent Submission Tokens**: Submissions use unique cryptographic attempt tokens to prevent duplicate result creation.
