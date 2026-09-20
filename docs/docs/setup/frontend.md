# Frontend Setup

Follow these steps to configure the React frontend.

## 1. Install Dependencies
```bash
cd frontend
npm install
```

## 2. Configuration
Create a `.env` file in the `frontend/` directory with your backend URL and Google Client ID:
```env title="frontend/.env"
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 3. Running the Frontend
You can run the frontend manually:
```bash
npm run dev
```
*Alternatively, use the convenient startup scripts (`run.bat` or `run.sh`) located in the project root to launch both the frontend and backend simultaneously.*

The app will be accessible at **[http://localhost:5173](http://localhost:5173)**.

---

## Next Step
→ [Docker Setup](docker.md)
