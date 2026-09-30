import os
import sys
from fastapi.testclient import TestClient

# Ensure main is importable
sys.path.insert(0, os.path.dirname(__file__))
from main import app

client = TestClient(app)

def test_home_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert "ProfileLens" in res.json().get("name", "")

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json().get("status") == "ok"
    print("[OK] Home and Health check passed")

def test_get_octocat():
    res = client.get("/api/github/octocat")
    assert res.status_code == 200, f"Failed: {res.status_code} - {res.text}"
    data = res.json()
    assert "github" in data
    github = data["github"]
    assert github["username"].lower() == "octocat"
    assert "avatar_url" in github
    assert "followers" in github
    assert "repositories" in github
    # Verify token is NEVER returned
    assert "token" not in str(data).lower()
    print("[OK] GET /api/github/octocat passed (Username: {}, Followers: {}, Repos: {})".format(
        github["username"], github["followers"], len(github.get("repositories", []))
    ))

def test_search_endpoint():
    res = client.get("/api/search?email=alex@example.com&github_username=octocat")
    assert res.status_code == 200
    data = res.json()
    assert data.get("email") == "alex@example.com"
    assert data["github"]["username"].lower() == "octocat"
    print("[OK] GET /api/search passed")

def test_invalid_username():
    res = client.get("/api/github/invalid username with spaces")
    assert res.status_code == 400
    assert "Invalid GitHub username" in res.json().get("detail", "")
    print("[OK] Invalid username validation passed")

def test_nonexistent_user():
    res = client.get("/api/github/nonexistent-user-1234567890-abcdef")
    assert res.status_code == 404
    assert "not found" in res.json().get("detail", "").lower()
    print("[OK] 404 handling passed")

if __name__ == "__main__":
    print("Running ProfileLens Backend Tests...")
    test_home_and_health()
    test_get_octocat()
    test_search_endpoint()
    test_invalid_username()
    test_nonexistent_user()
    print("\nALL BACKEND TESTS PASSED SUCCESSFULLY! :)")
