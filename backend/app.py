from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, Todo
from dotenv import load_dotenv
from datetime import date, datetime
import os

load_dotenv()

def create_app(test_config=None):
    app = Flask(__name__)
    CORS(app)

    if test_config:
        app.config["SQLALCHEMY_DATABASE_URI"] = test_config.get("SQLALCHEMY_DATABASE_URI")
        app.config["TESTING"] = True
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)                

    with app.app_context():
        db.create_all()             

    @app.route("/api/todos", methods=["GET"])
    def get_todos():
        query = Todo.query

        priority  = request.args.get("priority")
        completed = request.args.get("completed")

        if priority:
            query = query.filter_by(priority=priority)

        if completed is not None:
            is_completed = completed.lower() == "true"
            query = query.filter_by(completed=is_completed)

        todos = query.all()
        return jsonify([t.to_dict() for t in todos]), 200

    @app.route("/api/todos", methods=["POST"])
    def create_todo():
        data = request.get_json()

        if not data or not data.get("title"):
            return jsonify({"error": "Title is required"}), 400

        due_date_str = data.get("due_date")
        due_date = None
        if due_date_str:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()

        new_todo = Todo(
            title     = data["title"],
            priority  = data.get("priority", "medium"),
            category  = data.get("category", "General"),
            due_date  = due_date,
            completed = False
        )

        db.session.add(new_todo)
        db.session.commit()
        return jsonify(new_todo.to_dict()), 201

    @app.route("/api/todos/<int:todo_id>", methods=["PUT"])
    def update_todo(todo_id):
        todo = Todo.query.get(todo_id)

        if not todo:
            return jsonify({"error": "Todo not found"}), 404

        data = request.get_json()
        todo.title     = data.get("title",     todo.title)
        todo.category  = data.get("category",  todo.category)
        todo.priority  = data.get("priority",  todo.priority)
        todo.due_date  = data.get("due_date",  todo.due_date)
        todo.completed = data.get("completed", todo.completed)

        db.session.commit()
        return jsonify(todo.to_dict()), 200

    @app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
    def delete_todo(todo_id):
        todo = Todo.query.get(todo_id)

        if not todo:
            return jsonify({"error": "Todo not found"}), 404

        db.session.delete(todo)
        db.session.commit()
        return jsonify({"message": f"Todo {todo_id} deleted"}), 200

    @app.route("/api/todos/stats", methods=["GET"])
    def get_stats():
        today = date.today()

        total     = Todo.query.count()
        completed = Todo.query.filter_by(completed=True).count()
        pending   = Todo.query.filter_by(completed=False).count()
        due_soon  = Todo.query.filter(
            Todo.completed == False,
            Todo.due_date <= today
        ).count()

        return jsonify({
            "total":     total,
            "completed": completed,
            "pending":   pending,
            "due_soon":  due_soon
        }), 200

    return app                       


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)