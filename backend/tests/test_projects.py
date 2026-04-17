def test_create_project_ok(admin_client):
    payload = {
        "name": "New Proyect 01",
        "code": "PRJ-01",
        "distance_from_workshop": 10.5,
        "start_date": "2025-06-01",
        "type": "standard",
        "assigned_user_ids": []
    }
    response = admin_client.post("/projects/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "PRJ-01"

def test_create_project_duplicate(admin_client, seed_projects):
    payload = {
        "name": "Duplicate Code",
        "code": "P-STD", # Seeded already
        "distance_from_workshop": 10.5,
        "start_date": "2025-06-01",
        "type": "standard",
        "assigned_user_ids": []
    }
    response = admin_client.post("/projects/", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "Project code already exists"

def test_assign_user_ok(admin_client, seed_projects, normal_user):
    project_id = seed_projects[0].id
    response = admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")
    assert response.status_code == 204

def test_get_my_projects(user_client, admin_client, seed_projects, normal_user):
    # Asignamos al usuario al primer proyecto
    project_id = seed_projects[0].id
    admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")

    # Chequeamos
    response = user_client.get("/projects/me")
    assert response.status_code == 200
    data = response.json()
    # Debería devolver los asignados (P-STD) + "non-productive" que es global
    codes = [p["code"] for p in data]
    assert "P-STD" in codes
    assert "000" in codes
    assert "P-OFF" not in codes
