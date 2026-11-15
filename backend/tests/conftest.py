from __future__ import annotations
import os, tempfile
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/storage"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"
os.environ["ALLOW_DEMO_DATA"] = "true"
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.models import User


@pytest.fixture(scope="session")
def client():
    db = SessionLocal()
    for e, r in [("officer@t.io", "officer"), ("admin@t.io", "admin"), ("officer2@t.io", "officer")]:
        db.add(User(email=e, name=e.split("@")[0], role=r, password_hash=hash_password("Passw0rd!x")))
    db.commit(); db.close()
    return TestClient(app)


def login(c, email, pw="Passw0rd!x"):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def farmer(client):
    r = client.post("/api/auth/register", json={"name": "Ravi Kumar", "email": "ravi@t.io", "password": "Passw0rd!x", "consent": True})
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def other_farmer(client):
    r = client.post("/api/auth/register", json={"name": "Other", "email": "other@t.io", "password": "Passw0rd!x", "consent": True})
    return {"Authorization": f"Bearer {r.json()['token']}"}
