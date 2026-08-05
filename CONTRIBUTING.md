# Contributing to Equator Backend (`equator-backend`)

Thank you for helping build the off-chain RFQ matching engine and event indexing infrastructure for **Equator Finance**!

---

## 🛠 Local Setup via Docker

The easiest way to run `equator-backend` locally is with Docker & Docker Compose:

### 1. Prerequisites
* **Docker Desktop:** Version 20.10+
* **Node.js:** Version 20+ (if running outside Docker)

### 2. Quick Start
```bash
# Clone the repository
git clone https://github.com/Equator-Finance/equator-backend.git
cd equator-backend

# Copy environment variables template
cp .env.example .env

# Start all services (Backend API, PostgreSQL, Redis)
docker-compose up --build
```

The backend server will start on `http://localhost:4000` with WebSocket connections enabled on `ws://localhost:4000/rfq`.

---

## 📜 Development Guidelines

### 1. Code Style & Testing
* Write code in clean TypeScript.
* Ensure all database migrations are version-controlled using Prisma or Knex.
* Run tests with `npm test` before submitting a PR.

### 2. Environment Variables
Never commit real credentials, API keys, or private keys to source control. Always use `.env.example` to document new environment variables.
