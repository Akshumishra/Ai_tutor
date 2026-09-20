# Deployment

This page covers deploying AI Tutor to production — **GitHub Pages** for the documentation site, and **Docker** for the application.

---

## Documentation — GitHub Pages

The docs site is deployed via a GitHub Actions workflow that runs `mkdocs build` and pushes to the `gh-pages` branch.

### GitHub Actions Workflow

**File:** `.github/workflows/docs.yml`

This workflow runs automatically on every push to `main`.

### Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Set **Source** to: `Deploy from a branch`
3. Branch: `gh-pages` | Folder: `/ (root)`
4. Click **Save**

After the first successful workflow run, your docs will be live at:
```
https://<your-username>.github.io/Ai_tutor/
```

### Build Docs Locally

```bash
pip install mkdocs-material mkdocs-mermaid2-plugin

cd docs
mkdocs serve        # Preview at http://127.0.0.1:8000
mkdocs build        # Output to docs/site/
```

---

## Application — Docker

### Backend Dockerfile

Located at `backend/Dockerfile`. The image:

1. Uses `python:3.11-slim`
2. Installs dependencies from `requirments.txt`
3. Exposes port `8000`
4. Runs `uvicorn src.backend.main:app --host 0.0.0.0 --port 8000`

```bash
cd backend
docker build -t aitutor-backend .
docker run -d -p 8000:8000 --env-file .env aitutor-backend
```

### Frontend Dockerfile

Located at `frontend/Dockerfile`. The image:

1. Builds with `node:18-alpine`
2. Runs `npm run build`
3. Serves with **nginx**

```bash
cd frontend
docker build -t aitutor-frontend .
docker run -d -p 80:80 aitutor-frontend
```

---

## Production Checklist

### Environment

- [ ] `OPENAI_API_KEY` set with adequate quota
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `REDIS_URL` points to production Redis
- [ ] `TAVILY_API_KEY` set
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` set
- [ ] `SMTP_*` configured for production email sending
- [ ] `ALLOWED_ORIGINS` set to your frontend URL (not `*`)

### Database

- [ ] Run `alembic upgrade head` against production database
- [ ] Set up automated backups

### Security

- [ ] Use HTTPS in production (TLS termination via nginx / reverse proxy)
- [ ] Set `LOG_LEVEL=WARNING` to reduce verbosity
- [ ] Rotate `OPENAI_API_KEY` regularly
- [ ] Ensure `client_secret_*.json` is in `.gitignore` and never committed

### Frontend

- [ ] Set `VITE_API_URL` to the production backend URL during the Docker build
- [ ] Add the production frontend URL to Google OAuth authorized origins

---

## Azure Container Apps (Optional)

Both Dockerfiles are designed for **Azure Container Apps** (referenced in the CORS config):

```python
allow_origin_regex=r"https://.*\.azurecontainerapps\.io"
```

To deploy on Azure:

1. Push images to Azure Container Registry (ACR)
2. Create Container Apps for backend and frontend
3. Set environment variables in Container App configuration
4. Point the frontend `VITE_API_URL` to the backend Container App URL

---

## Monitoring

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Simple liveness check — returns `{"status": "healthy"}` |

For production monitoring, integrate with your preferred APM tool (Datadog, New Relic, Azure Monitor, etc.) using the standard uvicorn/FastAPI instrumentation.
