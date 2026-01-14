// State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentTheme = localStorage.getItem('theme') || 'dark';
let timerInterval = null;
let activeTimerId = null; // Track which task is pending timer setup
let audioCtx = null; // Web Audio API context

// DOM Elements
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const dateInput = document.getElementById('dateInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const itemsLeftComp = document.getElementById('itemsLeft');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const dateDisplay = document.getElementById('dateDisplay');
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

// Modal Elements
const timerModal = document.getElementById('timerModal');
const timerDurationInput = document.getElementById('timerDuration');
const cancelTimerBtn = document.getElementById('cancelTimerBtn');
const startTimerBtn = document.getElementById('startTimerBtn');

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Data Migration: Fix NaN issues by ensuring timeLeft fields exist
    tasks = tasks.map(t => ({
        ...t,
        timeLeft: t.timeLeft || 0,
        timerStartedAt: null // Reset running timers on load to avoid sync issues
    }));
    saveAndRender();

    applyTheme(currentTheme);
    renderDate();
    renderTasks();
});

// Event Listeners
addTaskBtn.addEventListener('click', () => {
    initAudio();
    addTask();
});
themeToggle.addEventListener('click', toggleTheme);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        initAudio();
        addTask();
    }
});

clearCompletedBtn.addEventListener('click', () => {
    initAudio();
    tasks = tasks.filter(task => !task.completed);
    saveAndRender();
});

// Modal Events
cancelTimerBtn.addEventListener('click', closeTimerModal);
startTimerBtn.addEventListener('click', () => {
    initAudio();
    confirmStartTimer();
});

// Functions
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playAlarm() {
    if (!audioCtx) initAudio();

    const now = audioCtx.currentTime;

    // Create oscillator nodes for a pleasant beep sequence
    const createBeep = (startTime, frequency, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = frequency;
        osc.type = 'sine';

        // Envelope
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
    };

    // Play 3 beeps
    createBeep(now, 880, 0.2);       // A5
    createBeep(now + 0.3, 880, 0.2);
    createBeep(now + 0.6, 880, 0.4);
}

function renderDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
}

function addTask() {
    const text = taskInput.value.trim();
    if (text === '') return;

    const newTask = {
        id: Date.now(),
        text: text,
        category: categorySelect.value,
        dueDate: dateInput.value,
        completed: false,
        timeLeft: 0, // Remaining milliseconds
        timerStartedAt: null
    };

    tasks.unshift(newTask);
    saveAndRender();

    // Reset inputs
    taskInput.value = '';
    dateInput.value = '';
    taskInput.focus();
}

function toggleTimer(id) {
    initAudio(); // Ensure audio context is ready on interaction

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const now = Date.now();

    if (task.timerStartedAt) {
        // PAUSE: Calculate remaining time
        const elapsed = now - task.timerStartedAt;
        const newTimeLeft = Math.max(0, task.timeLeft - elapsed);

        tasks = tasks.map(t => t.id === id ? { ...t, timeLeft: newTimeLeft, timerStartedAt: null } : t);
        stopDisplayInterval();
        saveAndRender();
    } else {
        // START/RESUME
        if (task.timeLeft > 0) {
            // Resume existing logic
            // Stop other timers first
            tasks = tasks.map(t => {
                if (t.timerStartedAt) {
                    const elapsed = now - t.timerStartedAt;
                    return { ...t, timeLeft: Math.max(0, t.timeLeft - elapsed), timerStartedAt: null };
                }
                return t;
            });

            // Start this one
            tasks = tasks.map(t => t.id === id ? { ...t, timerStartedAt: now } : t);
            startDisplayInterval();
            saveAndRender();
        } else {
            // New Timer: Open Modal
            activeTimerId = id;
            openTimerModal();
        }
    }
}

function openTimerModal() {
    timerModal.style.display = 'flex';
    timerDurationInput.value = '25'; // Default 25 mins
    timerDurationInput.focus();
}

function closeTimerModal() {
    timerModal.style.display = 'none';
    activeTimerId = null;
}

function confirmStartTimer() {
    if (!activeTimerId) return;

    const minutes = parseInt(timerDurationInput.value);
    if (isNaN(minutes) || minutes < 1) return;

    const durationMs = minutes * 60 * 1000;
    const now = Date.now();

    // Stop other timers
    tasks = tasks.map(t => {
        if (t.timerStartedAt) {
            const elapsed = now - t.timerStartedAt;
            return { ...t, timeLeft: Math.max(0, t.timeLeft - elapsed), timerStartedAt: null };
        }
        return t;
    });

    // Start target timer
    tasks = tasks.map(t =>
        t.id === activeTimerId
            ? { ...t, timeLeft: durationMs, timerStartedAt: now }
            : t
    );

    closeTimerModal();
    startDisplayInterval();
    saveAndRender();
}


function startDisplayInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = Date.now();
        const activeTask = tasks.find(t => t.timerStartedAt);

        if (activeTask) {
            const timeElement = document.getElementById(`timer-${activeTask.id}`);
            if (timeElement) {
                const elapsed = now - activeTask.timerStartedAt;
                const remaining = Math.max(0, activeTask.timeLeft - elapsed);

                timeElement.textContent = formatTime(remaining);

                if (remaining === 0) {
                    // Timer finished
                    toggleTimer(activeTask.id); // Will pause/stop it
                    playAlarm(); // Play robust web audio alarm
                }
            }
        }
    }, 1000);
}

function stopDisplayInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function formatTime(ms) {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed && task.timerStartedAt) {
        toggleTimer(id); // Stop timer first
    }

    tasks = tasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveAndRender();
}

function deleteTask(id) {
    const taskElement = document.querySelector(`li[data-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== id);
            saveAndRender();
        }, 300);
    } else {
        tasks = tasks.filter(task => task.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = date < today;
    const options = { month: 'short', day: 'numeric' };

    return `<span class="due-date ${isOverdue ? 'overdue' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${date.toLocaleDateString(undefined, options)}
    </span>`;
}

function renderTasks() {
    taskList.innerHTML = '';
    const now = Date.now();

    tasks.forEach(task => {
        const isRunning = !!task.timerStartedAt;
        let displayTime = task.timeLeft;

        if (isRunning) {
            const elapsed = now - task.timerStartedAt;
            displayTime = Math.max(0, task.timeLeft - elapsed);
        }

        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${isRunning ? 'active-timer' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div class="checkbox-wrapper">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
                <div class="custom-checkbox"></div>
            </div>
            
            <div class="task-content">
                <span class="task-text">${escapeHtml(task.text)}</span>
            </div>
            
            <div class="task-meta">
                <span class="category-badge cat-${task.category}">${task.category}</span>
                ${formatDateDisplay(task.dueDate)}
            </div>
            
            <div class="timer-container">
                <button class="timer-btn" onclick="toggleTimer(${task.id})" aria-label="${isRunning ? 'Pause Timer' : 'Start Timer'}">
                    ${isRunning
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>'
            }
                </button>
                <span id="timer-${task.id}" class="timer-display">${formatTime(displayTime)}</span>
            </div>

            <button class="delete-btn" onclick="deleteTask(${task.id})" aria-label="Delete task">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;

        taskList.appendChild(li);
    });

    const activeCount = tasks.filter(t => !t.completed).length;
    itemsLeftComp.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global scope functions for inline event handlers
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.toggleTimer = toggleTimer;
