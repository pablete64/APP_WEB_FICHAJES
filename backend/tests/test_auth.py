def test_login_ok(client, normal_user):
    response = client.post(
        "/auth/login",
        data={"username": normal_user.employee_code, "password": "user123"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"
    assert json_data["user"]["employee_code"] == "user01"
    assert json_data["user"]["is_super_admin"] is False
    assert json_data["user"]["time_entry_mode"] == "HOURS"

def test_login_fail(client, normal_user):
    response = client.post(
        "/auth/login",
        data={"username": normal_user.employee_code, "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_token_required(client):
    response = client.get("/users/")
    assert response.status_code == 401

def test_require_admin(user_client):
    # This route uses require_admin dependency. 
    # An ordinary user_client should receive a 403 Forbidden.
    response = user_client.get("/users/")
    assert response.status_code == 403
