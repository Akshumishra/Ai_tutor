# Docker Setup

You can run the entire AI Tutor stack (Database, Redis, Backend, and Frontend) seamlessly using Docker.

## 1. Prerequisites
Ensure you have Docker and Docker Compose installed. You should also have your `.env` files configured in both the `backend/` and `frontend/` directories as per the manual setup instructions.

## 2. Start Everything
From the project root (where `docker-compose.yml` is located), simply run:

```bash
docker compose up --build -d
```

## 3. Access the Application
Once the containers are running, you can access:

- **Frontend App**: [http://localhost](http://localhost)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Running Containers Individually
If you prefer not to use Compose, you can build and run the images directly:

```bash
# Backend
docker build -t aitutor-backend ./backend
docker run -d -p 8000:8000 --env-file ./backend/.env aitutor-backend

# Frontend
docker build -t aitutor-frontend ./frontend
docker run -d -p 80:80 aitutor-frontend
```

---

## Next Step
→ [Database Schema](../database/schema.md)
