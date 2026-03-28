from jose import jwt
import uuid
from datetime import datetime, timedelta, timezone

encoded = jwt.encode({"sub": "test", "iss": "timeflow-api", "aud": "timeflow-client", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "secret", algorithm="HS256")

try:
    decoded = jwt.decode(encoded, "secret", algorithms=["HS256"], issuer="timeflow-api", audience="timeflow-client")
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
