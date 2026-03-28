import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config.settings import Settings
from pydantic import ValidationError

def test_cors_allowed_origin():
    client = TestClient(app)
    # Origin explicitly added to default ALLOWED_ORIGINS
    headers = {
        "Origin": "http://localhost:8080",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:8080"
    assert response.headers.get("access-control-allow-credentials") == "true"

def test_cors_disallowed_origin():
    client = TestClient(app)
    headers = {
        "Origin": "http://evil.com",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/", headers=headers)
    # When CORS is not allowed, preflight typically doesn't include Access-Control-Allow-Origin headers
    assert response.headers.get("access-control-allow-origin") is None

def test_settings_validation_rejects_wildcard():
    # Test that setting configuration to "*" triggers exception
    with pytest.raises(ValidationError) as exc_info:
        Settings(ALLOWED_ORIGINS="*")
    
    assert "Insecure CORS configuration" in str(exc_info.value)

def test_settings_validation_parses_comma_separated():
    s = Settings(ALLOWED_ORIGINS="http://localhost:8080,http://another.com")
    assert s.ALLOWED_ORIGINS == "http://localhost:8080,http://another.com"
