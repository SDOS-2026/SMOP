# Speedage Manufacturing Operations Platform (SMOP)

SMOP is a comprehensive full-stack enterprise application designed to streamline manufacturing operations, manage inventory, facilitate sales, and handle purchase orders. It incorporates modern AI capabilities to assist administrative roles in overseeing and optimizing the manufacturing pipeline.

## Features

- **Role-Based Access Control (RBAC):** Secure access to modules based on user roles.
- **AI Copilot:** Intelligent assistant restricted to administrative personnel, featuring chat history persistence, powered by AI (Google Generative AI / OpenAI).
- **Inventory & Materials Management:** Track materials, suppliers, and overall inventory levels.
- **Sales & Purchase Orders:** End-to-end management of sales pipelines and supplier purchase orders.
- **Manufacturing Operations:** Comprehensive visibility and control over manufacturing processes, extending order management visibility to production teams.
- **Business Analytics & Reports:** Dedicated dashboards for actionable insights and high-level reporting.
- **System Audit Logs:** Transparent tracking of system activities, configuration changes, and data mutations.

## Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS & Shadcn UI
- **State Management & Data Fetching:** React Query (`@tanstack/react-query`)
- **Routing:** React Router v6
- **Data Visualization:** Recharts
- **Testing:** Vitest, React Testing Library, and Playwright for E2E.

### Backend
- **Framework:** Node.js with Express and TypeScript
- **Database ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT (JSON Web Tokens) & bcryptjs
- **AI Integration:** Google Generative AI & OpenAI SDKs
- **Testing:** Vitest and Supertest for unit and integration testing.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL (or any Prisma-supported database)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd SMOP
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   
   # Set up your environment variables
   # Create a .env file based on the provided .env.example
   # You will need DATABASE_URL, JWT_SECRET, AI API keys, etc.
   
   # Initialize the database
   npm run prisma:generate
   npm run prisma:migrate
   
   # Start the development server
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   
   # Set up your frontend environment variables (.env)
   # Typically VITE_API_BASE_URL to point to your backend.
   
   # Start the frontend application
   npm run dev
   ```

## Available Scripts

### Backend
- `npm run dev`: Starts the backend server in development mode with live reloading (`tsx watch`).
- `npm run build`: Compiles the TypeScript code to JavaScript.
- `npm run test`: Runs the Vitest test suite (unit and integration tests).
- `npm run prisma:studio`: Opens a web interface to view and edit database records.
- `npm run lint`: Runs ESLint to analyze the code.

### Frontend
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the frontend app for production.
- `npm run preview`: Locally previews the production build.
- `npm run test`: Runs the frontend Vitest suite.
- `npm run lint`: Runs ESLint.

## Project Structure

```
SMOP/
├── backend/
│   ├── prisma/          # Prisma schema, migrations, and seed scripts
│   ├── src/
│   │   ├── modules/     # Feature-based business logic (auth, inventory, sales, copilot, etc.)
│   │   ├── server.ts    # Main entry point and Express app setup
│   │   └── ...
│   ├── tests/           # Unit and integration tests for the backend
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/  # Reusable UI components (including Shadcn UI)
    │   ├── pages/       # Application views (Login, Reports, Copilot, AuditLogs, etc.)
    │   ├── services/    # API client functions
    │   └── ...
    ├── tests/           # Frontend tests
    └── package.json
```

## Testing Strategy
The project is well-tested to ensure stability. 
- The **Backend** features a suite of unit and integration tests (e.g., testing `auth.service`, `purchaseOrders.integration`, etc.) using Vitest.
- The **Frontend** uses Vitest for unit testing and Playwright for broader End-to-End browser testing to verify correct interactions and rendering.

## Production Systems Engineering

SMOP includes explicit reliability and operability controls rather than treating deployment as a build-only concern:

- Atomic, database-backed document sequences prevent duplicate PO, receipt, batch, and order numbers under concurrent traffic.
- Order feasibility, creation, quotation acceptance, and FIFO inventory consumption run as one serializable transaction with bounded conflict retries.
- Separate liveness (`/api/health/live`) and database-aware readiness (`/api/health/ready`) probes support safe orchestration and traffic draining. `/api/health` remains a backwards-compatible liveness endpoint.
- Every request receives an `x-request-id`; completion and error events are emitted as structured JSON with latency and status fields.
- Production starts fail fast when the database URL or a sufficiently strong JWT secret is missing.
- SIGTERM/SIGINT handling stops accepting traffic, drains connections, disconnects Prisma, and enforces a bounded shutdown deadline.
- CI builds and tests both applications from locked dependencies. Backend builds automatically generate the Prisma client.

See [Production Operations](docs/PRODUCTION_OPERATIONS.md) for deployment order, probe configuration, rollback guidance, suggested alerts, and the remaining hardening roadmap.

## Contributing
1. Create a feature branch (`git checkout -b feature/your-feature-name`)
2. Make your changes and write/update tests as necessary.
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature-name`)
5. Open a Pull Request.

