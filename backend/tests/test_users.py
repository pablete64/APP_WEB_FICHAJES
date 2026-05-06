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
        "role": "Management",
        "is_admin": False
    }
    response = admin_client.post("/users/", json=payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    data = response.json()
    assert data["employee_code"] == "new001"
    assert data["time_entry_mode"] == "HOURS"
    assert "password" not in data
    assert "password_hash" not in data

def test_create_user_duplicate_code(admin_client, normal_user):
    payload = {
        "employee_code": normal_user.employee_code,  # ya existe
        "name": "Fake Name",
        "password": "password123",
        "role": "Management",
    }
    response = admin_client.post("/users/", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "Employee code already exists"


def test_admin_cannot_create_admin_user(admin_client):
    payload = {
        "employee_code": "admin002",
        "name": "Admin Dos",
        "password": "password123",
        "role": "Management",
        "is_admin": True,
    }
    response = admin_client.post("/users/", json=payload)
    assert response.status_code == 403
    assert response.json()["detail"] == "Solo un super admin puede crear administradores."


def test_super_admin_can_create_admin_user(super_admin_client):
    payload = {
        "employee_code": "admin003",
        "name": "Admin Tres",
        "password": "password123",
        "role": "Management",
        "is_admin": True,
    }
    response = super_admin_client.post("/users/", json=payload)
    assert response.status_code == 200
    assert response.json()["is_admin"] is True
    assert response.json()["is_super_admin"] is False
    assert response.json()["role"] == "MANAGEMENT"
    assert response.json()["time_entry_mode"] == "HOURS"


def test_super_admin_can_create_admin_without_role(super_admin_client):
    payload = {
        "employee_code": "admin006",
        "name": "Admin Seis",
        "password": "password123",
        "role": "",
        "is_admin": True,
    }
    response = super_admin_client.post("/users/", json=payload)
    assert response.status_code == 200
    assert response.json()["is_admin"] is True
    assert response.json()["role"] == "MANAGEMENT"


def test_create_user_can_define_time_entry_mode(super_admin_client):
    payload = {
        "employee_code": "minutes15",
        "name": "Minutos 15",
        "password": "password123",
        "role": "MONTADORES",
        "time_entry_mode": "MINUTES_15",
    }
    response = super_admin_client.post("/users/", json=payload)
    assert response.status_code == 200
    assert response.json()["time_entry_mode"] == "MINUTES_15"


def test_update_user_can_change_time_entry_mode(super_admin_client, normal_user):
    response = super_admin_client.put(
        f"/users/{normal_user.id}",
        json={"time_entry_mode": "MINUTES_30"}
    )
    assert response.status_code == 200
    assert response.json()["time_entry_mode"] == "MINUTES_30"


def test_admin_cannot_promote_user_to_admin(admin_client, normal_user):
    response = admin_client.put(
        f"/users/{normal_user.id}",
        json={"is_admin": True}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Solo un super admin puede cambiar permisos de administrador."


def test_super_admin_can_promote_user_to_admin(super_admin_client, normal_user):
    response = super_admin_client.put(
        f"/users/{normal_user.id}",
        json={"is_admin": True}
    )
    assert response.status_code == 200
    assert response.json()["is_admin"] is True


def test_admin_cannot_delete_admin(admin_client, super_admin_client):
    create_response = super_admin_client.post("/users/", json={
        "employee_code": "admin004",
        "name": "Admin Cuatro",
        "password": "password123",
        "role": "Management",
        "is_admin": True,
    })
    admin_id = create_response.json()["id"]
    response = admin_client.delete(f"/users/{admin_id}")
    assert response.status_code == 403
    assert response.json()["detail"] == "Solo un super admin puede eliminar administradores."


def test_super_admin_can_delete_admin(super_admin_client):
    create_response = super_admin_client.post("/users/", json={
        "employee_code": "admin005",
        "name": "Admin Cinco",
        "password": "password123",
        "role": "Management",
        "is_admin": True,
    })
    admin_id = create_response.json()["id"]
    response = super_admin_client.delete(f"/users/{admin_id}")
    assert response.status_code == 204
