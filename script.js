document.addEventListener("DOMContentLoaded", function () {

    // ── CONFIG ─────────────────────────────────────────────
    const API_URL = "http://13.203.221.18:5001/api/todos";

    // ── DOM Elements ───────────────────────────────────────
    const taskInput       = document.getElementById("taskInput");
    const taskCategory    = document.getElementById("taskCategory");
    const taskPriority    = document.getElementById("taskPriority");
    const dueDate         = document.getElementById("dueDate");
    const addTaskBtn      = document.getElementById("addTaskBtn");
    const taskList        = document.getElementById("taskList");
    const searchInput     = document.getElementById("searchInput");
    const darkModeToggle  = document.getElementById("darkModeToggle");
    const filterButtons   = document.querySelectorAll(".filter-button");
    const body            = document.body;
    const editModal       = document.getElementById("editModal");
    const editTaskInput   = document.getElementById("editTaskInput");
    const editTaskCategory = document.getElementById("editTaskCategory");
    const editTaskPriority = document.getElementById("editTaskPriority");
    const editDueDate     = document.getElementById("editDueDate");
    const closeEditModal  = document.getElementById("closeEditModal");
    const saveTaskBtn     = document.getElementById("saveTaskBtn");

    // Stats elements
    const totalTasksEl      = document.getElementById("totalTasks");
    const completedTasksEl  = document.getElementById("completedTasks");
    const highPriorityTasksEl = document.getElementById("highPriorityTasks");
    const dueSoonTasksEl    = document.getElementById("dueSoonTasks");
    const completionRateEl  = document.getElementById("completionRate");

    // State
    let currentFilter      = "all";
    let currentEditingTask = null;
    let tasks              = [];   // now loaded from API, not localStorage

    // ── INIT ───────────────────────────────────────────────
    async function init() {
        loadDarkMode();
        await loadTasks();   // fetch from backend

        const today = new Date().toISOString().split('T')[0];
        dueDate.min    = today;
        editDueDate.min = today;
    }

    // ── DARK MODE (keep using localStorage — it's UI preference, not data) ──
    function loadDarkMode() {
        if (localStorage.getItem("dark-mode") === "enabled") {
            body.classList.add("dark-mode");
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    darkModeToggle.addEventListener("click", function () {
        body.classList.toggle("dark-mode");
        const isDarkMode = body.classList.contains("dark-mode");
        localStorage.setItem("dark-mode", isDarkMode ? "enabled" : "disabled");
        darkModeToggle.innerHTML = isDarkMode ?
            '<i class="fas fa-sun"></i>' :
            '<i class="fas fa-moon"></i>';
    });

    // ── API CALLS ──────────────────────────────────────────

    // Load all todos from backend
    async function loadTasks() {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();

            // Map backend fields to frontend fields
            tasks = data.map(t => ({
                id:        t.id.toString(),
                text:      t.title,           // backend uses 'title', frontend uses 'text'
                category:  t.category,
                priority:  capitalize(t.priority),  // backend: 'high' → frontend: 'High'
                dueDate:   t.due_date || "",
                completed: t.completed
            }));

            renderTasks();
            updateStats();
        } catch (err) {
            console.error("Failed to load tasks:", err);
            taskList.innerHTML = '<div class="no-tasks">Could not connect to server.</div>';
        }
    }

    // Add new todo
    async function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === "") {
            alert("Task cannot be empty!");
            return;
        }

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title:    taskText,
                    category: taskCategory.value,
                    priority: taskPriority.value.toLowerCase(),  // frontend: 'High' → backend: 'high'
                    due_date: dueDate.value || null
                })
            });

            if (res.ok) {
                taskInput.value    = "";
                taskCategory.value = "Work";
                taskPriority.value = "High";
                dueDate.value      = "";
                taskInput.focus();
                await loadTasks();   // refresh list from backend
            }
        } catch (err) {
            console.error("Failed to add task:", err);
        }
    }

    // Delete todo
    async function deleteTask(taskId) {
        try {
            await fetch(`${API_URL}/${taskId}`, { method: "DELETE" });
            await loadTasks();
        } catch (err) {
            console.error("Failed to delete task:", err);
        }
    }

    // Toggle complete
    async function toggleTaskCompletion(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            await fetch(`${API_URL}/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: !task.completed })
            });
            await loadTasks();
        } catch (err) {
            console.error("Failed to toggle task:", err);
        }
    }

    // Save edited todo
    async function saveEditedTask() {
        if (!currentEditingTask) return;

        try {
            await fetch(`${API_URL}/${currentEditingTask.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title:    editTaskInput.value.trim(),
                    category: editTaskCategory.value,
                    priority: editTaskPriority.value.toLowerCase(),
                    due_date: editDueDate.value || null
                })
            });
            await loadTasks();
            closeModal();
        } catch (err) {
            console.error("Failed to save task:", err);
        }
    }

    // ── HELPERS ────────────────────────────────────────────
    function capitalize(str) {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function openEditModal(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            currentEditingTask  = task;
            editTaskInput.value    = task.text;
            editTaskCategory.value = task.category;
            editTaskPriority.value = task.priority;
            editDueDate.value      = task.dueDate;
            editModal.style.display = "flex";
        }
    }

    function closeModal() {
        editModal.style.display = "none";
        currentEditingTask = null;
    }

    // ── RENDER ─────────────────────────────────────────────
    function filterTasks(filter) {
        currentFilter = filter;
        renderTasks();
    }

    function renderTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        let filteredTasks = tasks;

        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task =>
                task.text.toLowerCase().includes(searchTerm) ||
                task.category.toLowerCase().includes(searchTerm)
            );
        }

        if (currentFilter === "completed") {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (currentFilter === "active") {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }

        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        taskList.innerHTML = "";

        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div class="no-tasks">No tasks match your criteria.</div>';
            return;
        }

        filteredTasks.forEach(task => {
            const li = document.createElement("li");
            li.setAttribute("data-id", task.id);
            li.className = task.category.toLowerCase();
            li.classList.add(`priority-${task.priority.toLowerCase()}`);
            if (task.completed) li.classList.add("completed");

            let dueDateText = "No due date";
            if (task.dueDate) {
                const dateObj = new Date(task.dueDate);
                dueDateText = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            }

            li.innerHTML = `
                <div class="task-info">
                    <div class="task-text">${task.text}</div>
                    <div class="task-meta">
                        <div class="task-category"><i class="fas fa-tag"></i> ${task.category}</div>
                        <div class="task-priority"><i class="fas fa-flag"></i> ${task.priority}</div>
                        ${task.dueDate ? `
                        <div class="task-due-date">
                            <i class="fas fa-calendar-alt"></i> ${dueDateText}
                        </div>` : ''}
                    </div>
                </div>
                <div class="task-buttons">
                    <button class="task-btn complete-btn" title="Mark as ${task.completed ? 'incomplete' : 'complete'}">
                        <i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                    </button>
                    <button class="task-btn edit-btn" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-btn delete-btn" title="Delete task">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            li.querySelector(".complete-btn").addEventListener("click", function (e) {
                e.stopPropagation();
                toggleTaskCompletion(task.id);
            });

            li.querySelector(".edit-btn").addEventListener("click", function (e) {
                e.stopPropagation();
                openEditModal(task.id);
            });

            li.querySelector(".delete-btn").addEventListener("click", function (e) {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this task?")) {
                    deleteTask(task.id);
                }
            });

            li.addEventListener("click", function () {
                toggleTaskCompletion(task.id);
            });

            taskList.appendChild(li);
        });
    }

    function updateStats() {
        const total     = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const highPriority = tasks.filter(t => t.priority === "High" && !t.completed).length;

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const dueSoon = tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const d = new Date(task.dueDate);
            return d <= threeDaysFromNow && d >= new Date();
        }).length;

        totalTasksEl.textContent      = total;
        completedTasksEl.textContent  = completed;
        highPriorityTasksEl.textContent = highPriority;
        dueSoonTasksEl.textContent    = dueSoon;

        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        completionRateEl.style.width  = `${completionRate}%`;
    }

    // ── EVENT LISTENERS ────────────────────────────────────
    addTaskBtn.addEventListener("click", addTask);

    taskInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") addTask();
    });

    searchInput.addEventListener("input", renderTasks);

    filterButtons.forEach(button => {
        button.addEventListener("click", function () {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            filterTasks(this.dataset.filter);
        });
    });

    closeEditModal.addEventListener("click", closeModal);
    saveTaskBtn.addEventListener("click", saveEditedTask);

    window.addEventListener("click", function (e) {
        if (e.target === editModal) closeModal();
    });

    init();
});