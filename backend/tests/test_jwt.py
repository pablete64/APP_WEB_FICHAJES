import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config.settings import Settings, settings
from pydantic import ValidationError
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.auth.security import create_access_token

def test_settings_validation_rejects_missing_secret():
    with pytest.raises(ValidationError) as exc_info:
        # Pydantic 2 Settings will throw if required field is not defined:
        # Pydantic validates input dictionary over fallback.
        Settings(SECRET_KEY="")
    
    assert "SECRET_KEY cannot be empty" in str(exc_info.value)

def test_settings_validation_rejects_insecure_secret():
    with pytest.raises(ValidationError) as exc_info:
        Settings(SECRET_KEY="short-secret")
        
    assert "SECRET_KEY is too short or insecure" in str(exc_info.value)

def test_settings_validation_rejects_default_placeholder():
    with pytest.raises(ValidationError) as exc_info:
        Settings(SECRET_KEY="some-random-prefix-super-secret-key-change-it")
        
    assert "SECRET_KEY is too short or insecure" in str(exc_info.value)

def test_tampered_token():
    client = TestClient(app)
    # Generate a valid token
    valid_token = create_access_token("test_user")
    # Tamper the signature (change the last character)
    tampered_token = valid_token[:-1] + ("a" if valid_token[-1] != "a" else "b")
    
    headers = {"Authorization": f"Bearer {tampered_token}"}
    response = client.get("/users/", headers=headers)
    assert response.status_code == 401
    assert response.json().get("detail") == "Could not validate credentials"

def test_expired_token():
    client = TestClient(app)
    # Create an expired token manually
    expire = datetime.now(timezone.utc) - timedelta(minutes=10)
    to_encode = {"exp": expire, "sub": "test_user"}
    expired_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    headers = {"Authorization": f"Bearer {expired_token}"}
    # Any secured route
    response = client.get("/users/", headers=headers)
    assert response.status_code == 401
