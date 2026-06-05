# Todex — Full Stack Todo Application

A production-grade todo application built with a Vanilla JS frontend, Flask REST API, PostgreSQL database, Docker Compose, and a fully automated CI/CD pipeline — deployed on AWS with S3 static hosting for the frontend and a Dockerized Flask + PostgreSQL backend on EC2.

**Live Frontend:** `http://todex-bucket.s3-website.ap-south-1.amazonaws.com`
**Live API:** `http://43.204.232.15:5001/api/todos`

> ⚠️ EC2 instance is stopped to avoid AWS charges.
> To run locally, follow the [Running Locally](#running-locally) section below.

---

## Screenshots

### Task Dashboard
![Task dashboard](images/dashboard_1.png)
![Task dashboard](images/dashboard_2.png)
![Task dashboard](images/dashboard3.png)

### GitHub Actions Pipeline — All 3 Jobs Green
![CI/CD Pipeline](images/CICD_pipeline.png)

### EC2 Running Containers
![EC2 Containers](images/ec2-container.png)

### API Response (Postman)
![API Response](images/api_response.png)

---

## Architecture

```
Browser
   │
   ├── Static Assets (HTML/CSS/JS)
   │        ↓
   │   AWS S3 Bucket                ← Static website hosting (ap-south-1)
   │
   └── REST API calls
            ↓
      Flask Backend (Python)        ← Docker Container (port 5001)
            ↓
      PostgreSQL Database           ← Docker Container (port 5432)
            ↓
      AWS EC2 (Ubuntu, t2.micro)   ← Production Server

GitHub Actions Pipeline:
Push to main → pytest → Docker build → DockerHub → EC2 deploy
```

---

## Tech Stack

| Layer              | Technology                               |
|--------------------|------------------------------------------|
| Frontend           | HTML5, CSS3, JavaScript (Vanilla)        |
| Frontend Hosting   | AWS S3 (Static Website Hosting)          |
| Backend            | Python, Flask, Flask-SQLAlchemy          |
| Database           | PostgreSQL 15                            |
| Containerization   | Docker, Docker Compose                   |
| CI/CD              | GitHub Actions                           |
| Cloud              | AWS EC2 (Ubuntu, t2.micro)               |
| Image Registry     | DockerHub                                |
| Testing            | pytest (8 tests)                         |
| Version Control    | Git, GitHub                              |

---

## Features

- Create, read, update, delete todos
- Filter by priority, category, and completion status
- Real-time search
- Task overview dashboard (total, completed, pending, due soon)
- Dark mode (persists via localStorage)
- Data persists across sessions via PostgreSQL
- Fully containerized backend with Docker Compose
- Frontend decoupled from backend — served via S3
- Automated CI/CD pipeline — push to main, app updates automatically

---

## Project Structure

```
Todex/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions CI/CD pipeline
├── backend/
│   ├── app.py               # Flask application factory + all routes
│   ├── models.py            # SQLAlchemy Todo model
│   ├── test_app.py          # pytest test suite (8 tests)
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Flask container definition
├── images/                  # Project screenshots for README
├── docker-compose.yml       # Multi-container orchestration
├── frontend/
│  |──index.html             # Frontend (deployed to S3)
│  ├── script.js             # Frontend API integration
│  ├── styles.js              # Styling                            
└── README.md
```

---

## AWS Deployment
 
### Frontend — S3 Static Website Hosting
 
The frontend (`index.html`, `script.js`, `styles.css`) is deployed to an S3 bucket configured for static website hosting.
 
```
S3 Bucket: todex-bucket (ap-south-1)
Endpoint:  http://todex-bucket.s3-website.ap-south-1.amazonaws.com
```
 
**S3 setup highlights:**
- Bucket policy set to allow public read on all objects
- Static website hosting enabled with `index.html` as the root document
- Frontend files uploaded manually (or via AWS CLI)
- `script.js` points to the EC2 backend URL for API calls
```bash
# Deploy frontend to S3
aws s3 sync . s3://todex-bucket --exclude "*" \
  --include "index.html" --include "script.js" --include "styles.css"
```
 
### Backend — Flask + PostgreSQL on EC2
 
The backend runs as two Docker containers (Flask + PostgreSQL) on an AWS EC2 t2.micro instance, orchestrated with Docker Compose.
 
**EC2 setup highlights:**
- Security Groups open on port `22` (SSH) and `5001` (API)
- Docker and Docker Compose installed on the instance
- PostgreSQL data persisted via Docker named volumes
- Credentials in a `.env` file on EC2 — never committed to GitHub
- DockerHub token and EC2 SSH key stored in GitHub Secrets
---
 
## API Endpoints
 
| Method | Endpoint                    | Description          | Status Code |
|--------|-----------------------------|----------------------|-------------|
| GET    | `/api/todos`                | Get all todos        | 200         |
| GET    | `/api/todos?priority=high`  | Filter by priority   | 200         |
| GET    | `/api/todos?completed=true` | Filter by completion | 200         |
| POST   | `/api/todos`                | Create a todo        | 201         |
| PUT    | `/api/todos/<id>`           | Update a todo        | 200         |
| DELETE | `/api/todos/<id>`           | Delete a todo        | 200         |
| GET    | `/api/todos/stats`          | Get task counts      | 200         |
 
### Example Request
```bash
curl -X POST http://43.204.232.15:5001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Docker", "priority": "high", "category": "Work"}'
```
 
### Example Response
```json
{
    "id": 1,
    "title": "Learn Docker",
    "category": "Work",
    "priority": "high",
    "due_date": null,
    "completed": false,
    "created_at": "2026-05-10T12:00:00"
}
```
 
---
 
## CI/CD Pipeline
 
Every push to `main` triggers an automated 4-job pipeline. The frontend and backend deploy in parallel after tests pass, reducing total pipeline time.
 
```
                    ┌─────────────────┐
                    │   test          │  pytest (8 tests, SQLite in-memory)
                    │   (runs first)  │  blocks everything if any test fails
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐          ┌─────────▼───────┐
     │   build         │          │  deploy-frontend │
     │                 │          │                  │
     │ Docker build    │          │ aws s3 sync      │
     │ Push to DockerHub│         │ ./frontend →     │
     │ (todex-flask:   │          │ S3 bucket        │
     │  latest)        │          │                  │
     └────────┬────────┘          └─────────────────-┘
              │
     ┌────────▼────────┐
     │  deploy-backend │
     │                 │
     │ SSH into EC2    │
     │ docker-compose  │
     │ pull + up -d    │
     └─────────────────┘
```
 
**Key design decision:** `deploy-frontend` depends only on `test` (not `build`), so S3 and EC2 deployments run in parallel — frontend doesn't wait for Docker to finish.
 
![CI/CD Pipeline](images/CICD_pipeline.png)
 
### How Deployment Works
 
**Frontend → S3**
```bash
# GitHub Actions runs:
aws s3 sync ./frontend s3://<bucket-name> --delete --exclude ".git/*"
# --delete removes files from S3 that no longer exist in the repo
```
 
**Backend → EC2**
```bash
# GitHub Actions SSHs into EC2 and runs:
cd ~/todex
docker-compose down       # stop running containers
docker-compose pull       # pull latest image from DockerHub
docker-compose up -d      # restart in background
```
 
---
 
## Data Persistence
 
Data is stored in PostgreSQL running as a Docker container with a named volume.
 
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```
 
| Event                        | Data Survives?                     |
|------------------------------|------------------------------------|
| Flask container restart      | ✅ Yes                             |
| `docker-compose down` → `up` | ✅ Yes                             |
| EC2 reboot                   | ✅ Yes                             |
| `docker-compose down -v`     | ❌ No — volumes explicitly deleted |
 
---
 
## Running Locally
 
### Prerequisites
- Docker Desktop installed
- Git installed
### Steps
 
```bash
# Clone the repo
git clone https://github.com/Tripti-Giri/Todex.git
cd Todex
 
# Create .env file
echo "DATABASE_URL=postgresql://tripti:abcd123@db:5432/todex" > .env
 
# Start all services (Flask + PostgreSQL)
docker-compose up --build
 
# API running at:
# http://localhost:5001/api/todos
 
# Open frontend:
# Open index.html in your browser
```
 
> ⚠️ When running locally, update the API base URL in `script.js` to point to `http://localhost:5001` instead of the EC2 IP.
 
### Run Tests Locally
```bash
cd backend
pip install -r requirements.txt
pytest test_app.py -v
```
 
Expected output:
```
test_get_todos_empty           PASSED
test_create_todo               PASSED
test_create_todo_missing_title PASSED
test_update_todo               PASSED
test_update_todo_not_found     PASSED
test_delete_todo               PASSED
test_delete_todo_not_found     PASSED
test_get_stats                 PASSED
 
8 passed
```
 
---
 
## Development Stages
 
| Stage | Branch | What was built |
|-------|--------|----------------|
| Stage 1 | `add-flask-backend` | Flask REST API with 5 endpoints |
| Stage 2 | `add-postgresql-stage2` | PostgreSQL database with SQLAlchemy ORM |
| Stage 3 | `add-dockerfile-stage3` | Docker + Docker Compose multi-container setup |
| Stage 4 | `add-cicd-stage4` | GitHub Actions CI/CD + AWS EC2 deployment |
| Stage 5 | `add-frontend-hosting` | Frontend decoupled and deployed to AWS S3 |
 
---
 
## Author
 
**Tripti Giri**
- GitHub: [@Tripti-Giri](https://github.com/Tripti-Giri)
- LinkedIn: [tripti-giri](https://www.linkedin.com/in/tripti-giri-43789a281/)