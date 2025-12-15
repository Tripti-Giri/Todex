document.addEventListener("DOMContentLoaded", function() { 
    // DOM Elements
    const taskInput = document.getElementById("taskInput");
    const taskCategory = document.getElementById("taskCategory");
    const taskPriority = document.getElementById("taskPriority");
    const dueDate = document.getElementById("dueDate");
    const addTaskBtn = document.getElementById("addTaskBtn"); 
    const taskList = document.getElementById("taskList"); 
    const searchInput = document.getElementById("searchInput"); 
    const darkModeToggle = document.getElementById("darkModeToggle"); 
    const filterButtons = document.querySelectorAll(".filter-button");
    const body = document.body;
    const editModal = document.getElementById("editModal");
    const editTaskInput = document.getElementById("editTaskInput");
    const editTaskCategory = document.getElementById("editTaskCategory");
    const editTaskPriority = document.getElementById("editTaskPriority");
    const editDueDate = document.getElementById("editDueDate");
    const closeEditModal = document.getElementById("closeEditModal");
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    
    // Stats elements
    const totalTasksEl = document.getElementById("totalTasks");
    const completedTasksEl = document.getElementById("completedTasks");
    const highPriorityTasksEl = document.getElementById("highPriorityTasks");
    const dueSoonTasksEl = document.getElementById("dueSoonTasks");
    const completionRateEl = document.getElementById("completionRate");

    // State variables
    let currentFilter = "all";
    let currentEditingTask = null;
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    
    // Initialize the app
    function init() {
        loadDarkMode();
        renderTasks();
        updateStats();
        
        // Set today as minimum date for due dates
        const today = new Date().toISOString().split('T')[0];
        dueDate.min = today;
        editDueDate.min = today;
    }
    
    // Toggle dark mode
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
    
    // Task operations
    function addTask() { 
        const taskText = taskInput.value.trim(); 
        if (taskText === "") { 
            alert("Task cannot be empty!"); 
            return; 
        }
        
        const task = {
            id: Date.now().toString(),
            text: taskText,
            category: taskCategory.value,
            priority: taskPriority.value,
            dueDate: dueDate.value,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(task);
        saveTasks();
        renderTasks();
        updateStats();
        
        // Reset form
        taskInput.value = "";
        taskCategory.value = "Work";
        taskPriority.value = "High";
        dueDate.value = "";
        
        // Focus back on input for quick task entry
        taskInput.focus();
    } 
    
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderTasks();
        updateStats();
    }
    
    function toggleTaskCompletion(taskId) {
        const task = tasks.find(task => task.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    function openEditModal(taskId) {
        const task = tasks.find(task => task.id === taskId);
        if (task) {
            currentEditingTask = task;
            editTaskInput.value = task.text;
            editTaskCategory.value = task.category;
            editTaskPriority.value = task.priority;
            editDueDate.value = task.dueDate;
            editModal.style.display = "flex";
        }
    }
    
    function saveEditedTask() {
        if (!currentEditingTask) return;
        
        currentEditingTask.text = editTaskInput.value.trim();
        currentEditingTask.category = editTaskCategory.value;
        currentEditingTask.priority = editTaskPriority.value;
        currentEditingTask.dueDate = editDueDate.value;
        
        saveTasks();
        renderTasks();
        updateStats();
        closeModal();
    }
    
    function closeModal() {
        editModal.style.display = "none";
        currentEditingTask = null;
    }
    
    // Filter, search and render
    function filterTasks(filter) {
        currentFilter = filter;
        renderTasks();
    }
    
    function renderTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        let filteredTasks = tasks;
        
        // Apply search filter
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(searchTerm) ||
                task.category.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply category filter
        if (currentFilter === "completed") {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (currentFilter === "active") {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }
        
        // Sort tasks: first by completion status, then by priority
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        // Clear task list
        taskList.innerHTML = "";
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div class="no-tasks">No tasks match your criteria.</div>';
            return;
        }
        
        // Render tasks
        filteredTasks.forEach(task => {
            const li = document.createElement("li");
            li.setAttribute("data-id", task.id);
            
            // Add classes for styling
            li.className = task.category.toLowerCase();
            li.classList.add(`priority-${task.priority.toLowerCase()}`);
            if (task.completed) li.classList.add("completed");
            
            // Format due date
            let dueDateText = "No due date";
            if (task.dueDate) {
                const dateObj = new Date(task.dueDate);
                dueDateText = dateObj.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                });
            }
            
            // Create task HTML
            li.innerHTML = `
                <div class="task-info">
                    <div class="task-text">${task.text}</div>
                    <div class="task-meta">
                        <div class="task-category">
                            <i class="fas fa-tag"></i> ${task.category}
                        </div>
                        <div class="task-priority">
                            <i class="fas fa-flag"></i> ${task.priority}
                        </div>
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
            
            // Add event listeners
            li.querySelector(".complete-btn").addEventListener("click", function(e) {
                e.stopPropagation();
                toggleTaskCompletion(task.id);
            });
            
            li.querySelector(".edit-btn").addEventListener("click", function(e) {
                e.stopPropagation();
                openEditModal(task.id);
            });
            
            li.querySelector(".delete-btn").addEventListener("click", function(e) {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this task?")) {
                    deleteTask(task.id);
                }
            });
            
            li.addEventListener("click", function() {
                toggleTaskCompletion(task.id);
            });
            
            taskList.appendChild(li);
        });
    }
    
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const highPriority = tasks.filter(task => task.priority === "High" && !task.completed).length;
        
        // Count tasks due in the next 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const dueSoon = tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate <= threeDaysFromNow && dueDate >= new Date();
        }).length;
        
        // Update DOM
        totalTasksEl.textContent = total;
        completedTasksEl.textContent = completed;
        highPriorityTasksEl.textContent = highPriority;
        dueSoonTasksEl.textContent = dueSoon;
        
        // Update completion rate progress bar
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        completionRateEl.style.width = `${completionRate}%`;
    }
    
    function saveTasks() {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }
    
    // Event listeners
    addTaskBtn.addEventListener("click", addTask);
    
    taskInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") addTask();
    });
    
    searchInput.addEventListener("input", function() {
        renderTasks();
    });
    
    filterButtons.forEach(button => {
        button.addEventListener("click", function() {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            filterTasks(this.dataset.filter);
        });
    });
    
    closeEditModal.addEventListener("click", closeModal);
    saveTaskBtn.addEventListener("click", saveEditedTask);
    
    // Close modal if clicked outside
    window.addEventListener("click", function(e) {
        if (e.target === editModal) {
            closeModal();
        }
    });
    
    // Initialize app
    init();
});