from datetime import date, timedelta
import pytest
from io import BytesIO

def get_project_by_type(projects, type_name):
    return next((p for p in projects if p.type == type_name), None)

def get_task_by_code(tasks, code):
    return next((t for t in tasks if t.code == code), None)

def test_create_standard_entry_assigned_ok(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")
    
    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0,
        "overtime_hours": 0.0
    }
    response = user_client.post("/time-entries/", json=payload)
    if response.status_code != 201:
        print(response.json())
    assert response.status_code == 201

def test_create_standard_entry_not_assigned_fallback(user_client, seed_projects, seed_tasks):
    project = get_project_by_type(seed_projects, "standard")
    # No lo asignamos
    task = get_task_by_code(seed_tasks, "313")
    
    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0
    }
    response = user_client.post("/time-entries/", json=payload)
    # Según requisitos, un usuario no puede fichar en estándar sin asignación
    assert response.status_code in [400, 403, 404] # Validando la restricción (dependiendo de la implementacion)

def test_create_non_productive_not_assigned_ok(user_client, seed_projects, seed_tasks):
    project = get_project_by_type(seed_projects, "non-productive")
    task = get_task_by_code(seed_tasks, "313")
    
    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0
    }
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 201

def test_create_entry_future_date_fails(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")
    
    future_date = (date.today() + timedelta(days=1)).isoformat()
    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": future_date,
        "hours": 8.0
    }
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 400
    assert "future" in response.json()["detail"].lower()

def test_create_entry_invalid_hours(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")
    
    # Hours > 24
    payload = {
        "project_id": project.id, "task_id": task.id, "date": date.today().isoformat(), "hours": 25.0
    }
    assert user_client.post("/time-entries/", json=payload).status_code == 400

    # Hours <= 0
    payload["hours"] = 0
    assert user_client.post("/time-entries/", json=payload).status_code == 400

def test_task_4xx_requires_fields(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400") # Viaje
    
    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0
    }
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 400
    assert "vehicle" in response.json()["detail"].lower() or "extra fields" in response.json()["detail"].lower()
    
    # Añadiendo los campos extra funciona
    payload["vehicle_type"] = "Coche Empresa"
    payload["distance_origin"] = "Taller"
    payload["meals"] = True
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 201

def test_offer_project_task_rules(user_client, admin_client, admin_user, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "offer")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    admin_client.post(f"/projects/{project.id}/assign-user/{admin_user.id}?role=Management")
    
    task_std = get_task_by_code(seed_tasks, "313")
    task_115 = get_task_by_code(seed_tasks, "115")
    
    payload = {
        "project_id": project.id,
        "date": date.today().isoformat(),
        "hours": 4.0
    }
    # Tarea distinta a 115 debe fallar
    payload["task_id"] = task_std.id
    response = admin_client.post("/time-entries/", json=payload)
    assert response.status_code == 400
    
    # Tarea 115 debe funcionar
    payload["task_id"] = task_115.id
    response = admin_client.post("/time-entries/", json=payload)
    assert response.status_code == 201

# --- NUEVOS CASOS DE PRUEBA (FASE 9.5) ---

def test_create_entry_invalid_project(user_client, seed_tasks):
    payload = {
        "project_id": "fake-uuid",
        "task_id": seed_tasks[3].id,
        "date": date.today().isoformat(),
        "hours": 8.0
    }
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 404

def test_create_entry_invalid_task(user_client, admin_client, seed_projects, normal_user):
    project = seed_projects[0]
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    
    payload = {
        "project_id": project.id,
        "task_id": "fake-uuid",
        "date": date.today().isoformat(),
        "hours": 8.0
    }
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 404

def test_extra_fields_ignored_on_standard_task(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")
    
    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0,
        "vehicle_type": "Tractor",
        "meals": True,
        "distance_origin": "Luna"
    }
    response = user_client.post("/time-entries/", json=payload)
    assert response.status_code == 201
    
    entry_id = response.json()["id"]
    
    me_resp = user_client.get("/time-entries/me")
    assert me_resp.status_code == 200
    created = next(e for e in me_resp.json() if e["id"] == entry_id)
    
    # Se ignoran aunque se envíen
    assert created["vehicle_type"] is None
    assert created["meals"] is None
    assert created["distance_origin"] is None

def test_time_entries_rbac_admin_vs_user(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")
    
    payload = {"project_id": project.id, "task_id": task.id, "date": date.today().isoformat(), "hours": 4.0}
    res = user_client.post("/time-entries/", json=payload)
    assert res.status_code == 201
    entry_id = res.json()["id"]

    assert admin_client.get("/time-entries/").status_code == 200
    assert user_client.get("/time-entries/").status_code == 403

    assert admin_client.get(f"/time-entries/project/{project.id}").status_code == 200
    assert user_client.get(f"/time-entries/project/{project.id}").status_code == 403

    assert user_client.delete(f"/time-entries/{entry_id}").status_code == 403
    assert admin_client.delete(f"/time-entries/{entry_id}").status_code == 204
    
    # Check deletion
    assert len(admin_client.get("/time-entries/").json()) == 0


def test_upload_ticket_photo_accepts_iphone_heif(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400")

    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0,
        "vehicle_type": "coche_personal",
        "distance_origin": "NAVE",
        "meals": True,
    }
    create_response = user_client.post("/time-entries/", json=payload)
    assert create_response.status_code == 201
    entry_id = create_response.json()["id"]

    upload_response = user_client.post(
        f"/time-entries/{entry_id}/upload-ticket",
        files={"file": ("ticket.heif", BytesIO(b"fake-heif-image"), "image/heif")},
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["meal_ticket_photo"].endswith(".heif")


def test_upload_ticket_photo_accepts_valid_extension_with_generic_mime(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400")

    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0,
        "vehicle_type": "coche_personal",
        "distance_origin": "NAVE",
        "meals": True,
    }
    create_response = user_client.post("/time-entries/", json=payload)
    assert create_response.status_code == 201
    entry_id = create_response.json()["id"]

    upload_response = user_client.post(
        f"/time-entries/{entry_id}/upload-ticket",
        files={"file": ("ticket.HEIC", BytesIO(b"fake-heic-image"), "application/octet-stream")},
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["meal_ticket_photo"].lower().endswith(".heic")


def test_upload_ticket_photo_supports_multiple_attachments(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400")

    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0,
        "vehicle_type": "coche_personal",
        "distance_origin": "NAVE",
        "meals": True,
    }
    create_response = user_client.post("/time-entries/", json=payload)
    assert create_response.status_code == 201
    entry_id = create_response.json()["id"]

    first_upload = user_client.post(
        f"/time-entries/{entry_id}/upload-ticket",
        files={"file": ("ticket-1.jpg", BytesIO(b"fake-jpg-image"), "image/jpeg")},
    )
    second_upload = user_client.post(
        f"/time-entries/{entry_id}/upload-ticket",
        files={"file": ("ticket-2.jpg", BytesIO(b"fake-jpg-image-2"), "image/jpeg")},
    )

    assert first_upload.status_code == 200
    assert second_upload.status_code == 200
    assert len(second_upload.json()["ticket_attachments"]) == 2


def test_worker_cannot_create_diet_without_ticket_on_combined_flow(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400")

    response = user_client.post(
        "/time-entries/with-tickets",
        data={
            "project_id": project.id,
            "task_id": task.id,
            "date": date.today().isoformat(),
            "hours": "8.0",
            "vehicle_type": "coche_personal",
            "distance_origin": "NAVE",
            "meals": "true",
        },
    )

    assert response.status_code == 400
    assert "ticket" in response.json()["detail"].lower()


def test_worker_can_create_diet_with_ticket_on_combined_flow(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400")

    response = user_client.post(
        "/time-entries/with-tickets",
        data={
            "project_id": project.id,
            "task_id": task.id,
            "date": date.today().isoformat(),
            "hours": "8.0",
            "vehicle_type": "coche_personal",
            "distance_origin": "NAVE",
            "meals": "true",
            "meal_ticket_amount": "12.50",
        },
        files={"files": ("ticket-1.jpg", BytesIO(b"fake-jpg-image"), "image/jpeg")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["meals"] is True
    assert len(payload["ticket_attachments"]) == 1
    assert payload["meal_ticket_photo"]


def test_delete_ticket_attachment_removes_only_selected_file(user_client, admin_client, seed_projects, seed_tasks, normal_user):
    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "400")

    payload = {
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 8.0,
        "vehicle_type": "coche_personal",
        "distance_origin": "NAVE",
        "meals": True,
    }
    create_response = user_client.post("/time-entries/", json=payload)
    assert create_response.status_code == 201
    entry_id = create_response.json()["id"]

    first_upload = user_client.post(
        f"/time-entries/{entry_id}/upload-ticket",
        files={"file": ("ticket-1.jpg", BytesIO(b"fake-jpg-image"), "image/jpeg")},
    )
    second_upload = user_client.post(
        f"/time-entries/{entry_id}/upload-ticket",
        files={"file": ("ticket-2.jpg", BytesIO(b"fake-jpg-image-2"), "image/jpeg")},
    )
    assert second_upload.status_code == 200

    attachments = second_upload.json()["ticket_attachments"]
    attachment_to_delete = attachments[0]["id"]

    delete_response = user_client.delete(
        f"/time-entries/{entry_id}/ticket-attachments/{attachment_to_delete}"
    )
    assert delete_response.status_code == 200
    assert len(delete_response.json()["ticket_attachments"]) == 1


def test_worker_with_15_minute_mode_can_log_quarter_hours(user_client, admin_client, db_session, seed_projects, seed_tasks, normal_user):
    normal_user.time_entry_mode = "MINUTES_15"
    db_session.add(normal_user)
    db_session.commit()

    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")

    response = user_client.post("/time-entries/", json={
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 0.25,
    })
    assert response.status_code == 201


def test_worker_with_30_minute_mode_cannot_log_15_minute_fraction(user_client, admin_client, db_session, seed_projects, seed_tasks, normal_user):
    normal_user.time_entry_mode = "MINUTES_30"
    db_session.add(normal_user)
    db_session.commit()

    project = get_project_by_type(seed_projects, "standard")
    admin_client.post(f"/projects/{project.id}/assign-user/{normal_user.id}?role=Montadores")
    task = get_task_by_code(seed_tasks, "313")

    response = user_client.post("/time-entries/", json={
        "project_id": project.id,
        "task_id": task.id,
        "date": date.today().isoformat(),
        "hours": 0.25,
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "This user must register time in 30-minute intervals."
