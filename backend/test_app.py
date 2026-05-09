import pytest
from app import create_app, db

@pytest.fixture
def client():
    app = create_app({
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "TESTING": True
    })

    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()


def test_get_todos_empty(client):
    response = client.get("/api/todos")
    assert response.status_code == 200
    assert response.get_json() == []


def test_create_todo(client):
    response = client.post("/api/todos", json={
        "title": "Test todo",
        "priority": "high",
        "category": "Work"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "Test todo"
    assert data["completed"] == False


def test_create_todo_missing_title(client):
    response = client.post("/api/todos", json={"priority": "high"})
    assert response.status_code == 400


def test_update_todo(client):
    create = client.post("/api/todos", json={"title": "Old title"})
    todo_id = create.get_json()["id"]

    response = client.put(f"/api/todos/{todo_id}", json={
        "title": "New title",
        "completed": True
    })
    assert response.status_code == 200
    assert response.get_json()["title"] == "New title"
    assert response.get_json()["completed"] == True


def test_update_todo_not_found(client):
    response = client.put("/api/todos/999", json={"title": "Ghost"})
    assert response.status_code == 404


def test_delete_todo(client):
    create = client.post("/api/todos", json={"title": "To delete"})
    todo_id = create.get_json()["id"]

    response = client.delete(f"/api/todos/{todo_id}")
    assert response.status_code == 200

    get = client.get("/api/todos")
    assert len(get.get_json()) == 0


def test_delete_todo_not_found(client):
    response = client.delete("/api/todos/999")
    assert response.status_code == 404


def test_get_stats(client):
    client.post("/api/todos", json={"title": "Todo 1"})
    r2 = client.post("/api/todos", json={"title": "Todo 2"})
    todo_id = r2.get_json()["id"]
    client.put(f"/api/todos/{todo_id}", json={"completed": True})

    response = client.get("/api/todos/stats")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 2
    assert data["completed"] == 1
    assert data["pending"] == 1