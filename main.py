from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import requests
import os
import re
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

app = FastAPI(
    title="ProfileLens API",
    description="Backend API for discovering GitHub profiles",
    version="1.0.0"
)

# =========================
# CORS Configuration
# =========================
# Support local development, Vercel deployments, and custom production domains
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Allow custom origins from environment variable (comma separated)
custom_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins = list(default_origins)
if custom_origins:
    for origin in custom_origins.split(","):
        trimmed = origin.strip()
        if trimmed and trimmed not in allowed_origins:
            allowed_origins.append(trimmed)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Matches any Vercel deployment preview or production domain
    allow_origin_regex=r"^https?://.*\.vercel\.app/?.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_github_headers() -> dict:
    """Build request headers for GitHub API, securely using GITHUB_TOKEN if available."""
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ProfileLens-App",
    }
    token = os.getenv("GITHUB_TOKEN")
    if token and token.strip() and token.strip() != "your_github_token_here":
        headers["Authorization"] = f"Bearer {token.strip()}"
    return headers


def fetch_github_user_data(username: str) -> dict:
    """
    Fetch GitHub user profile and recent repositories with robust validation
    and user-friendly error handling.
    """
    cleaned_username = username.strip() if username else ""
    if not cleaned_username:
        raise HTTPException(
            status_code=400,
            detail="GitHub username cannot be empty."
        )

    # Validate username according to GitHub username rules
    if not re.match(r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$", cleaned_username):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub username format."
        )

    headers = get_github_headers()

    # 1. Fetch user profile
    try:
        response = requests.get(
            f"https://api.github.com/users/{cleaned_username}",
            headers=headers,
            timeout=10
        )
    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to GitHub. Please check your network or try again later."
        )

    # Handle rate limiting (GitHub returns 403 or 429 when rate limit is exceeded)
    if response.status_code in (403, 429):
        resp_json = {}
        try:
            resp_json = response.json()
        except Exception:
            pass
        msg = str(resp_json.get("message", "")).lower()
        if "rate limit" in msg or response.headers.get("X-RateLimit-Remaining") == "0":
            raise HTTPException(
                status_code=429,
                detail="GitHub API rate limit reached. Please try again later."
            )
        raise HTTPException(
            status_code=403,
            detail="Access to GitHub API was restricted. Please try again later."
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="GitHub profile not found."
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Failed to fetch profile from GitHub."
        )

    user = response.json()

    # 2. Fetch public repositories (top 6 sorted by recent updates)
    repositories = []
    try:
        repos_response = requests.get(
            f"https://api.github.com/users/{cleaned_username}/repos",
            headers=headers,
            params={
                "sort": "updated",
                "per_page": 6
            },
            timeout=10
        )
        if repos_response.status_code == 200:
            repos_data = repos_response.json()
            if isinstance(repos_data, list):
                for repo in repos_data:
                    repositories.append({
                        "name": repo.get("name"),
                        "description": repo.get("description"),
                        "html_url": repo.get("html_url"),
                        "language": repo.get("language"),
                        "stars": repo.get("stargazers_count", 0),
                        "forks": repo.get("forks_count", 0),
                        "updated_at": repo.get("updated_at")
                    })
    except requests.exceptions.RequestException:
        # Repositories fetch failure should not break the whole profile display
        repositories = []

    return {
        "username": user.get("login"),
        "name": user.get("name") or user.get("login"),
        "bio": user.get("bio"),
        "avatar_url": user.get("avatar_url"),
        "location": user.get("location"),
        "company": user.get("company"),
        "blog": user.get("blog"),
        "public_repositories": user.get("public_repos", 0),
        "followers": user.get("followers", 0),
        "following": user.get("following", 0),
        "profile": user.get("html_url"),
        "created_at": user.get("created_at"),
        "twitter_username": user.get("twitter_username"),
        "repositories": repositories
    }


# =========================
# API Endpoints
# =========================

@app.get("/")
def home():
    return {
        "name": "ProfileLens API",
        "status": "online",
        "message": "Welcome to ProfileLens! Use /api/github/{username} or /api/search to discover profiles."
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/github/{username}")
@app.get("/github/{username}")
def get_github_profile(username: str):
    """Fetch GitHub profile by username."""
    profile_data = fetch_github_user_data(username)
    return {
        "github": profile_data
    }


@app.get("/api/search")
@app.get("/search")
def search_profile(
    github_username: str = Query(..., description="GitHub username to search"),
    email: Optional[str] = Query(None, description="Optional user email address")
):
    """
    Search GitHub profile with optional email.
    Maintains compatibility with existing frontend expectations.
    """
    profile_data = fetch_github_user_data(github_username)
    return {
        "email": email or "",
        "github": profile_data
    }