def test_list_users_admin_ok(admin_client, normal_user):
    response = admin_client.get("/users/")
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2 # Includes admin and normal_user seeded in conftest
    assert any(u["employee_code"] == "user01" for u in users)

def test_create_user_ok(admin_client):
    payload = {
        "employee_code": "new001",
        "name": "New User",
        "password": "password123",
        "is_admin": False
    }
    response = admin_client.post("/users/", json=payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    data = response.json()
    assert data["employee_code"] == "new001"
    assert "password" not in data
    assert "password_hash" not in data

def test_create_user_duplicate_code(admin_client, normal_user):
    payload = {
        "employee_code": normal_user.employee_code,  # ya existe
        "name": "Fake Name",
        "password": "password123"
    }
    response = admin_client.post("/users/", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "Employee code already exists"
