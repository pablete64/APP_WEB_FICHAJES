def test_reports_projects_aggregation(admin_client, user_client, seed_projects, seed_tasks, normal_user):
    # Simulamos algunas entradas
    project_id = seed_projects[0].id # P-STD
    task_id = seed_tasks[3].id
    admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")
    
    admin_client.post("/time-entries/", json={
        "project_id": project_id,
        "task_id": task_id,
        "date": "2025-06-01",
        "hours": 5.0,
        "overtime_hours": 1.0,
        "user_id": normal_user.id
    })
    
    # Otra entrada el mismo proyecto
    admin_client.post("/time-entries/", json={
        "project_id": project_id,
        "task_id": task_id,
        "date": "2025-06-02",
        "hours": 3.0,
        "overtime_hours": 2.0,
        "user_id": normal_user.id
    })

    # Consultamos
    response = admin_client.get("/reports/projects")
    assert response.status_code == 200
    data = response.json()
    proj = next((p for p in data if p["project_id"] == project_id), None)
    assert proj is not None
    assert proj["total_hours"] == 8.0 # 5 + 3
    assert proj["total_overtime"] == 3.0 # 1 + 2

def test_export_csv_report(admin_client, user_client, seed_projects, seed_tasks, normal_user):
    # Setup some data
    project_id = seed_projects[0].id
    task_id = seed_tasks[3].id
    admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")
    
    admin_client.post("/time-entries/", json={
        "project_id": project_id, "task_id": task_id, "date": "2025-06-15", "hours": 4.0, "user_id": normal_user.id
    })

    # Export
    response = admin_client.get("/reports/export")
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"] or "application/vnd" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]

# --- NUEVOS CASOS DE PRUEBA (FASE 9.5) ---

def test_reports_rbac_user_forbidden(user_client):
    endpoints = ["/projects", "/users", "/tasks", "/daily", "/export"]
    for ep in endpoints:
        response = user_client.get(f"/reports{ep}")
        assert response.status_code == 403

def test_reports_date_filtering(admin_client, user_client, seed_projects, seed_tasks, normal_user):
    project_id = seed_projects[0].id
    task_id = seed_tasks[3].id
    admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")
    
    # Entry 1 (Out of bounds)
    admin_client.post("/time-entries/", json={"project_id": project_id, "task_id": task_id, "date": "2025-01-01", "hours": 2.0, "user_id": normal_user.id})
    # Entry 2 (In bounds)
    admin_client.post("/time-entries/", json={"project_id": project_id, "task_id": task_id, "date": "2025-01-10", "hours": 4.0, "user_id": normal_user.id})
    
    response = admin_client.get(f"/reports/projects?start_date=2025-01-05&end_date=2025-01-15")
    assert response.status_code == 200
    
    data = response.json()
    proj = next((p for p in data if p["project_id"] == project_id), None)
    
    # Debe ser 4.0 porque el de 2.0 queda fuera del filtro (antes del día 5)
    assert proj is not None
    assert proj["total_hours"] == 4.0

def test_reports_other_aggregations_exist(admin_client, user_client, seed_projects, seed_tasks, normal_user):
    project_id = seed_projects[0].id
    task_id = seed_tasks[3].id
    admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")
    
    admin_client.post("/time-entries/", json={"project_id": project_id, "task_id": task_id, "date": "2025-03-01", "hours": 6.0, "user_id": normal_user.id})
    
    # Users
    res_users = admin_client.get("/reports/users")
    assert res_users.status_code == 200
    assert any(u["user_id"] == normal_user.id and u["total_hours"] >= 6.0 for u in res_users.json())
    
    # Tasks
    res_tasks = admin_client.get("/reports/tasks")
    assert res_tasks.status_code == 200
    assert any(t["task_code"] == seed_tasks[3].code for t in res_tasks.json())
    
    # Daily
    res_daily = admin_client.get("/reports/daily")
    assert res_daily.status_code == 200
    assert any("2025-03-01" in d["date"] for d in res_daily.json())

def test_reports_analytics_summary(admin_client, user_client, seed_projects, seed_tasks, normal_user):
    project_id = seed_projects[0].id
    task_id = seed_tasks[3].id
    admin_client.post(f"/projects/{project_id}/assign-user/{normal_user.id}?role=Montadores")
    
    admin_client.post("/time-entries/", json={
        "project_id": project_id, "task_id": task_id, "date": "2025-07-01", "hours": 4.0, "user_id": normal_user.id
    })

    response = admin_client.get("/reports/summary")
    assert response.status_code == 200
    data = response.json()
    assert "heatmap" in data
    assert "daily_summary" in data
    assert any(u["name"] == normal_user.name and u["hours"] >= 4.0 for u in data["user_totals"])
