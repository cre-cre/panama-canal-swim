// Get DOM elements
const taskInput = document.querySelector('.task-input');
const addTaskButton = document.querySelector('.add-task-btn');
const taskList = document.querySelector('.task-list');
const filterOption = document.querySelector('.filter-tasks');

// Event Listeners
document.addEventListener('DOMContentLoaded', getTasks);
addTaskButton.addEventListener('click', addTask);
taskList.addEventListener('click', deleteCheck);
filterOption.addEventListener('change', filterTasks);

// Functions
function addTask(event) {
    event.preventDefault();
    
    // Check if input is empty
    if (taskInput.value.trim() === '') {
        alert('Please enter a task');
        return;
    }

    // Create task div
    const taskDiv = document.createElement('div');
    taskDiv.classList.add('task');

    // Create li
    const newTask = document.createElement('li');
    newTask.innerText = taskInput.value;
    newTask.classList.add('task-item');
    taskDiv.appendChild(newTask);

    // Add task to local storage
    saveLocalTasks(taskInput.value);

    // Create Completed Button
    const completedButton = document.createElement('button');
    completedButton.innerHTML = '<i class="fas fa-check"></i>';
    completedButton.classList.add('complete-btn');
    taskDiv.appendChild(completedButton);

    // Create Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.classList.add('delete-btn');
    taskDiv.appendChild(deleteButton);

    // Append to list
    taskList.appendChild(taskDiv);

    // Clear input value
    taskInput.value = '';
}

function deleteCheck(e) {
    const item = e.target;
    
    // Delete task
    if (item.classList[0] === 'delete-btn') {
        const task = item.parentElement;
        task.classList.add('fall');
        removeLocalTasks(task);
        task.addEventListener('transitionend', () => {
            task.remove();
        });
    }

    // Check mark
    if (item.classList[0] === 'complete-btn') {
        const task = item.parentElement;
        task.classList.toggle('completed');
    }
}

function filterTasks(e) {
    const tasks = taskList.childNodes;
    tasks.forEach(function(task) {
        if (task.nodeType === 1) { // Check if it's an element node
            switch (e.target.value) {
                case "all":
                    task.style.display = "flex";
                    break;
                case "completed":
                    if (task.classList.contains("completed")) {
                        task.style.display = "flex";
                    } else {
                        task.style.display = "none";
                    }
                    break;
                case "uncompleted":
                    if (!task.classList.contains("completed")) {
                        task.style.display = "flex";
                    } else {
                        task.style.display = "none";
                    }
                    break;
            }
        }
    });
}

function saveLocalTasks(task) {
    let tasks;
    if (localStorage.getItem('tasks') === null) {
        tasks = [];
    } else {
        tasks = JSON.parse(localStorage.getItem('tasks'));
    }
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function getTasks() {
    let tasks;
    if (localStorage.getItem('tasks') === null) {
        tasks = [];
    } else {
        tasks = JSON.parse(localStorage.getItem('tasks'));
    }
    tasks.forEach(function(task) {
        // Create task div
        const taskDiv = document.createElement('div');
        taskDiv.classList.add('task');

        // Create li
        const newTask = document.createElement('li');
        newTask.innerText = task;
        newTask.classList.add('task-item');
        taskDiv.appendChild(newTask);

        // Create Completed Button
        const completedButton = document.createElement('button');
        completedButton.innerHTML = '<i class="fas fa-check"></i>';
        completedButton.classList.add('complete-btn');
        taskDiv.appendChild(completedButton);

        // Create Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.classList.add('delete-btn');
        taskDiv.appendChild(deleteButton);

        // Append to list
        taskList.appendChild(taskDiv);
    });
}

function removeLocalTasks(task) {
    let tasks;
    if (localStorage.getItem('tasks') === null) {
        tasks = [];
    } else {
        tasks = JSON.parse(localStorage.getItem('tasks'));
    }
    const taskIndex = task.children[0].innerText;
    tasks.splice(tasks.indexOf(taskIndex), 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
}
