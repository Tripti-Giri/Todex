from flask import Flask , jsonify , request 
from flask_cors import CORS

app = Flask(__name__)
CORS(app)     # allows frontend (5500) tp call backend (5000)

# temporary in-memory db - python list
todos = [
  {
    "id" : 1,
    "title" : "Buy groceries",
    "category" : "Personal",
    "priority" : "medium", 
    "due_date" : "2026-05-10",
    "completed" : False
  },
  {
    "id" : 2,
    "title" : "Add backend to todex",
    "category" : "Work",
    "priority" : "high", 
    "due_date" : "2026-05-08",
    "completed" : False
  } 
]

next_id = 3

# route 1 - GET/api/todos -- returns all todos 
@app.route("/api/todos", methods =["GET"])
def get_todos() :
  result = todos

  # read query params from URL if provided
  priority = request.args.get("priority")
  completed = request.args.get("completed")

  if priority:
    result = [task_ for task_ in result  if task_["priority"] == priority]

  if completed is not None:
    is_completed = completed.lower() == "true"
    result = [task_ for task_ in result  if task_["completed"] == is_completed]

  return jsonify(result) , 200

# ROUTE 2 - POST/api/todos -- create a new todo
@app.route("/api/todos" , methods = ["POST"])
def create_todo():
  global next_id

  data = request.get_json()

  if not data or not data.get("title"):
    return jsonify({"error" : "Title is required"}), 400
  
  new_todo = {
    "id" :next_id,
    "title" : data["title"],
    "priority" : data.get("priority", "medium"),
    "categorty": data.get("category" , "General"),
    "due_date" :data.get("due_date" , None),
    "completed": False
  }

  todos.append(new_todo)
  next_id +=1

  return jsonify(new_todo) , 201

# ROUTE 3 — PUT /api/todos/<id>  -- updates an existing todo (edit title, change priority or mark complete) -- <id> is a URL parameter (e.g. PUT/api/todos/3)
@app.route("/api/todos/<int:todo_id>", methods=["PUT"])
def update_todo(todo_id):

  todo = next((t for t in todos if t["id"] == todo_id), None)

  if not todo:
    return jsonify({"error" : "Todo not found"}), 404 # type: ignore
  
  data = request.get_json()

  todo["title"] = data.get("title", todo["title"])
  todo["category"] = data.get("category", todo["category"])
  todo["priority"] = data.get("priority", todo["priority"])
  todo["due_date"] = data.get("due_date", todo["due_date"])
  todo["completed"] = data.get("completed", todo["completed"])

  return jsonify(todo) , 200 # type: ignore

# ROUTE 4 — DELETE /api/todos/<id> -- deletes a todo by id
@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
  global todos

  todo = next((t for t in todos if t["id"] == todo_id), None)

  if not todo:
    return jsonify({"error": "Todo not found"}), 404

  odos = [t for t in todos if t["id"] != todo_id]  # remove it

  return jsonify({"message": f"Todo {todo_id} deleted"}), 200

# ROUTE 5 - GET/api/todos/stats
# returns count of task overview dashboard - total task , completed , pending , due soon
@app.route("/api/todos/stats" , methods = ["GET"])
def get_stats():
  from datetime import date

  today = date.today().isoformat()  # -> 2026-05-30

  total = len(todos)
  completed = sum(1 for t in todos if t["completed"])
  pending = total - completed
  #  due_soon = incomplete with due_date <=today
  due_soon = sum(
    1 for t in todos
    if not t["completed"] and t["due_date"] and t["due_date"] <= today 
  )

  return jsonify({
    "total" : total,
    "completed" : completed, 
    "pending" : pending, 
    "due_soon" : due_soon
  }), 200

# run the app -- debug == True -> auto-reloads on file save , shows error in browser
if __name__ == '__main__':
  app.run(host = "0.0.0.0" , port = 5000, debug = True)

