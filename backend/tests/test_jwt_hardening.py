import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config.settings import settings
from fastapi import HTTPException

# Test direct verification
def test_jwt_expired_token():
    to_encode = {
        "sub": "test",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        "iss": "timeflow-api",
        "aud": "timeflow-client"
    }
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    with pytest.raises(Exception): # JWTError or ExpiredSignatureError
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], issuer="timeflow-api", audience="timeflow-client")

def test_jwt_invalid_issuer():
    to_encode = {
        "sub": "test",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "iss": "attacker",
        "aud": "timeflow-client"
    }
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    with pytest.raises(Exception):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], issuer="timeflow-api", audience="timeflow-client")

def test_jwt_invalid_audience():
    to_encode = {
        "sub": "test",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "iss": "timeflow-api",
        "aud": "attacker"
    }
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    with pytest.raises(Exception):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], issuer="timeflow-api", audience="timeflow-client")

def test_jwt_tampered_signature():
    to_encode = {
        "sub": "test",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "iss": "timeflow-api",
        "aud": "timeflow-client"
    }
    token = jwt.encode(to_encode, "wrong_secret", algorithm=settings.JWT_ALGORITHM)
    
    with pytest.raises(Exception):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], issuer="timeflow-api", audience="timeflow-client")
