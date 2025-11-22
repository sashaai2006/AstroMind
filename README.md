# Gangai 🌊

AI-Powered Autonomous Software Development Platform.

## Architecture

- **Orchestrator**: LangGraph (Python)
- **Graph DB**: Memgraph
- **Storage**: MinIO
- **Frontend**: Next.js 14

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Run Infrastructure & Backend
```bash
# Start Memgraph, MinIO, and Backend
docker-compose up --build
```

### Run Frontend (Local)
```bash
cd apps/web
npm install
npm run dev
```

## Structure
- `apps/backend`: FastAPI + LangGraph brain.
- `apps/web`: Next.js dashboard.

