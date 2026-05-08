from flask_sqlalchemy import SQLAlchemy
from datetime import datetime,timezone

db = SQLAlchemy()

class Todo(db.Model):
  __tablename__ = "todos"

  id = db.Column(db.Integer, primary_key = True)
  title = db.Column(db.String(255), nullable = False)
  category = db.Column(db.String(100) , default = "General")
  priority = db.Column(db.String(100) , default = "medium")
  due_date = db.Column(db.Date , nullable = True)
  completed = db.Column(db.Boolean , default = False)
  created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

  def to_dict(self):
    return {
      "id" : self.id,
      "title" : self.title,
      "priority" : self.priority,
      "category" : self.category,
      "due_date" : self.due_date,
      "completed" : self.completed,
      "created_at" : self.created_at.isoformat()
    }

