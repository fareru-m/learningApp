// DOM Elements
const menuItems = document.querySelectorAll('.menu-item');
const tabContents = document.querySelectorAll('.tab-content');
const sessionCards = document.querySelectorAll('.session-card');
const musicPlayerToggle = document.querySelector('.music-player-toggle');
const musicPlayerSidebar = document.querySelector('.music-player-sidebar');
const closeMusicPlayer = document.querySelector('.close-music-player');
const pomodoroModal = document.querySelector('.pomodoro-modal');
const closePomodoro = document.querySelector('.close-pomodoro');

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Current application state
let currentState = {
    session: null,
    currentTab: 'home',
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    examMode: false,
    history: []
};

// Progress tracking
const PROGRESS_KEY = 'learningProgress';

function saveProgress(mode, score, category = null) {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const timestamp = new Date().toISOString();
    
    if (!progress[mode]) {
        progress[mode] = [];
    }
    
    progress[mode].push({
        timestamp,
        score,
        category
    });
    
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function getProgressData() {
    const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    console.log('Loaded progress data:', data);
    return data;
}

function getModeProgress(mode) {
    const progress = getProgressData();
    return progress[mode] || [];
}

// Call this function when a quiz is completed
function onQuizComplete(mode, score, category = null) {
    saveProgress(mode, score, category);
    renderProgressChart();
}

function renderProgressChart() {
    const progressData = getProgressData();
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (window.progressChart) {
        window.progressChart.destroy();
    }

    const modes = Object.keys(progressData);
    if (modes.length === 0) {
        document.getElementById('progressContainer').innerHTML = '<p>まだ進捗データがありません。クイズを解いて進捗を記録しましょう！</p>';
        return;
    }

    const colors = {
        'quick': 'rgba(99, 102, 241, 0.8)',
        'simulation': 'rgba(236, 72, 153, 0.8)',
        'category': 'rgba(16, 185, 129, 0.8)'
    };

    const modeNames = {
        'quick': 'クイッククイズ',
        'simulation': '試験シミュレーション',
        'category': 'カテゴリ別練習'
    };

    const datasets = [];
    
    modes.forEach(mode => {
        const modeData = progressData[mode];
        const sortedData = [...modeData].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        datasets.push({
            label: modeNames[mode] || mode,
            data: sortedData.map(item => ({
                x: item.timestamp,
                y: item.score,
                category: item.category
            })),
            borderColor: colors[mode] || getRandomColor(),
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: colors[mode] || getRandomColor(),
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
            fill: false
        });
    });

    window.progressChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'yyyy/MM/dd HH:mm',
                        displayFormats: {
                            day: 'MM/dd',
                            hour: 'MM/dd HH:00'
                        }
                    },
                    title: {
                        display: true,
                        text: '日付',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'スコア (%)',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary'),
                        callback: value => `${value}%`
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += `${Math.round(context.parsed.y)}%`;
                                if (context.raw.category) {
                                    label += ` (${context.raw.category})`;
                                }
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    }
                }
            }
        }
    });
}

function getRandomColor() {
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const views = document.querySelectorAll('.view');

    // --- Initialization ---
    async function init() {
        try {
            const response = await fetch(`${API_BASE_URL}/questions`);
            if (!response.ok) throw new Error('Network response was not ok');
            currentState.questions = await response.json();

            setupEventListeners();
            loadHistory();
            showTab('home'); // Start at the home tab

        } catch (error) {
            console.error('Failed to load questions:', error);
            document.body.innerHTML = '<div class="text-center p-8">Error loading questions. Please check the console.</div>';
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Sidebar menu navigation
        menuItems.forEach(item => {
            item.addEventListener('click', handleNavClick);
        });

        // Session selection cards
        sessionCards.forEach(card => {
            card.addEventListener('click', handleSessionSelect);
        });

        // Music player controls
        musicPlayerToggle.addEventListener('click', () => toggleMusicPlayer(true));
        closeMusicPlayer.addEventListener('click', () => toggleMusicPlayer(false));

        // Pomodoro modal controls
        closePomodoro.addEventListener('click', () => togglePomodoroModal(false));

        // Open pomodoro from practice mode
        document.addEventListener('click', (e) => {
            if (e.target.matches('.open-pomodoro')) {
                togglePomodoroModal(true);
            }
        });

        // Wire quiz controls (next / end)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'next-btn') {
                e.preventDefault();
                if (!currentState.questions || currentState.questions.length === 0) return;
                if (currentState.currentQuestionIndex < currentState.questions.length - 1) {
                    currentState.currentQuestionIndex += 1;
                    renderQuestion(currentState.currentQuestionIndex);
                } else {
                    // finished
                    alert('すべての問題に到達しました。結果画面は未実装です。');
                }
            }

            if (e.target && e.target.id === 'end-btn') {
                // hide nav and return to home/dashboard
                const qNav = document.getElementById('question-nav');
                if (qNav) qNav.classList.add('hidden');
                // show home/dashboard
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                const dashboard = document.getElementById('dashboard-view');
                if (dashboard) dashboard.classList.add('active');
            }
        });
    }

    // --- View Management ---
    function showTab(tabId) {
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        menuItems.forEach(item => {
            if (item.dataset.tab !== 'pomodoro') { // Pomodoro is a modal, not a tab
                item.classList.toggle('active', item.dataset.tab === tabId);
            }
        });

        if (tabId === 'practice') {
            loadPracticeMode();
        } else if (tabId === 'exam') {
            loadExamMode();
        }
    }

    // --- Quiz Logic ---
    function loadPracticeMode() {
        const practiceTab = document.getElementById('practice');

        // Show loading state
        practiceTab.innerHTML = `
            <div class="loading">
                <h2>${currentState.session === 'A' ? '科目A' : '科目B'} - 練習モード</h2>
                <div class="loading-spinner"></div>
                <p>問題を読み込んでいます...</p>
            </div>
        `;

        try {
            // In a real app, this would fetch from your API
            // const response = await fetch(`${API_BASE_URL}/questions?session=${currentState.session}`);
            // const data = await response.json();

            // For now, use mock data
            const data = currentState.questions;

            currentState.questions = data;
            currentState.currentQuestionIndex = 0;
            currentState.userAnswers = {};

            // Render the first question
            renderQuestion(0);

            // Add pomodoro button
            const pomodoroButton = document.createElement('button');
            pomodoroButton.className = 'pomodoro-button';
            pomodoroButton.innerHTML = '<i class="fas fa-clock"></i> ポモドーロタイマー';
            pomodoroButton.addEventListener('click', () => togglePomodoroModal(true));

            practiceTab.insertBefore(pomodoroButton, practiceTab.firstChild);

        } catch (error) {
            console.error('Error loading questions:', error);
            practiceTab.innerHTML = `
                <div class="error">
                    <h2>エラーが発生しました</h2>
                    <p>問題の読み込み中にエラーが発生しました。後でもう一度お試しください。</p>
                    <button onclick="window.location.reload()">再読み込み</button>
                </div>
            `;
        }
    }

    function loadExamMode() {
        const examTab = document.getElementById('exam');

        // For now, just show a message
        examTab.innerHTML = `
            <div class="exam-info">
                <h2>模擬試験モード</h2>
                <p>この機能は現在準備中です。後日ご利用いただけます。</p>
                <button onclick="showTab('practice')">練習モードに戻る</button>
            </div>
        `;
    }

    // --- Functions ---

    // Start a simulation: load questions and show quiz view with nav
    async function startSimulation(subMode) {
        try {
            // For now, reuse currentState.questions or load from local JSON if present
            // If your app uses remote API, replace with fetch to correct endpoint
            let questions = currentState.questions || [];
            if (!questions || questions.length === 0) {
                // fallback: try loading a local file 'kakomon_questionsA.json'
                try {
                    let file = './kakomon_questionsA.json';
                    if (subMode === 'final') {
                        file = './kakomon_questionsS.json';
                    }
                    const res = await fetch(file);
                    const parsed = await res.json();
                    // Attempt to flatten into an array of questions if structure differs
                    if (Array.isArray(parsed)) questions = parsed;
                    else if (parsed.exam_data) {
                        // pick first exam set as fallback
                        questions = parsed.exam_data[0]?.questions || [];
                    }
                } catch (e) {
                    console.warn('No local kakomon_questionsA.json found or failed to load:', e);
                }
            }
    
            if (!questions || questions.length === 0) {
                alert('試験用の問題が見つかりませんでした。');
                return;
            }
    
            currentState.questions = questions;
            currentState.currentQuestionIndex = 0;
            currentState.examMode = true;
    
            // Ensure quiz view is visible and nav populated
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('quiz-view').classList.add('active');
            const qNav = document.getElementById('question-nav');
            if (qNav) qNav.classList.remove('hidden');
    
            populateQuestionNav(questions.length);
            renderQuestion(0);
    
        } catch (err) {
            console.error('startSimulation error', err);
            alert('シミュレーションの開始に失敗しました。コンソールを確認してください。');
        }
    }
    
    window.startSimulation = startSimulation;
    
    function populateQuestionNav(questionCount) {
        const navContainer = document.getElementById('question-nav-buttons');
        if (!navContainer) return;
        navContainer.innerHTML = '';
        if (!questionCount || questionCount <= 0) {
            console.warn('populateQuestionNav called with empty count');
            return;
        }
        for (let i = 0; i < questionCount; i++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = i + 1;
            button.dataset.index = i;
            button.className = 'w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium bg-transparent';
            button.addEventListener('click', () => jumpToQuestion(i));
            navContainer.appendChild(button);
        }
        // highlight first
        highlightNavButton(0);
    }
    
    function jumpToQuestion(index) {
        if (index < 0 || index >= currentState.questions.length) return;
        currentState.currentQuestionIndex = index;
        renderQuestion(index);
        highlightNavButton(index);
    }
    
    function highlightNavButton(index) {
        const navButtons = document.querySelectorAll('#question-nav-buttons button');
        navButtons.forEach(btn => {
            btn.classList.remove('bg-blue-500','text-white','ring-2','ring-blue-300');
        });
        const active = document.querySelector(`#question-nav-buttons button[data-index='${index}']`);
        if (active) active.classList.add('bg-blue-500','text-white','ring-2','ring-blue-300');
    }

    function renderQuestion(index) {
        const q = currentState.questions[index];
        if (!q) {
            console.warn('renderQuestion: question not found at index', index);
            return;
        }
        // set question text (convert literal "\\n" to real newlines for display)
        const questionEl = document.getElementById('question');
        if (questionEl) {
            const qText = (q.question || q.text || '（問題が見つかりません）').replace(/\\n/g, '\n');
            questionEl.textContent = qText;
        }

        // progress info
        const progressInfoEl = document.getElementById('progress-info');
        if (progressInfoEl) progressInfoEl.textContent = `問題 ${index + 1} / ${currentState.questions.length}`;

        // options
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.innerHTML = '';

        const isImagePath = (val) => /\.(png|jpe?g|gif|webp|svg)$/i.test(String(val || ''));

        if (Array.isArray(q.options)) {
            q.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn w-full p-4 border rounded-lg text-left transition-colors';
                const content = String(opt).replace(/\\n/g, '\n');
                if (isImagePath(content)) {
                    btn.innerHTML = `<div class="option-content"><span class="option-label"></span><img src="${content}" alt="option image"></div>`;
                } else {
                    btn.textContent = content;
                }
                btn.addEventListener('click', () => {
                    currentState.userAnswers[index] = opt;
                    btn.classList.add('selected');
                });
                optionsContainer.appendChild(btn);
            });
        } else if (q.options && typeof q.options === 'object') {
            Object.entries(q.options).forEach(([key, value]) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn w-full p-4 border rounded-lg text-left transition-colors flex items-center';
                const valText = String(value).replace(/\\n/g, '\n');
                if (isImagePath(valText)) {
                    btn.innerHTML = `<div class="option-content"><span class="option-label">${key}</span><img src="${valText}" alt="option ${key}"></div>`;
                } else {
                    btn.textContent = `${key}. ${valText}`;
                }
                btn.addEventListener('click', () => {
                    currentState.userAnswers[index] = key;
                    btn.classList.add('selected');
                });
                optionsContainer.appendChild(btn);
            });
        }

        // update highlight on nav
            // Show or hide the left question navigation depending on whether we're in an exam/simulation
            const qNav = document.getElementById('question-nav');
            const navButtons = document.getElementById('question-nav-buttons');
            const headerEl = document.getElementById('question-nav-header');
            if (qNav) {
                if (currentState.examMode) {
                    qNav.classList.remove('hidden');
                    if (headerEl) headerEl.classList.remove('hidden');
                    // Only highlight if nav buttons are already present (startQuiz should have populated)
                    if (navButtons && navButtons.children.length > 0) {
                        highlightNavButton(index);
                    }
                    qNav.removeAttribute('aria-hidden');
                    if (headerEl) headerEl.removeAttribute('aria-hidden');
                } else {
                    qNav.classList.add('hidden');
                    if (headerEl) headerEl.classList.add('hidden');
                    if (navButtons) navButtons.innerHTML = '';
                    qNav.setAttribute('aria-hidden', 'true');
                    if (headerEl) headerEl.setAttribute('aria-hidden', 'true');
                }
            }
    }

    /**
     * Handles clicks on the main navigation items.
     * @param {Event} e The click event.
     */
    function handleNavClick(e) {
        const tabId = e.currentTarget.dataset.tab;
        if (!tabId) return;

        if (tabId === 'pomodoro') {
            togglePomodoroModal(true);
        } else {
            showTab(tabId);
        }
    }

    /**
     * Handles the selection of a study session (Kamoku A/B).
     * @param {Event} e The click event.
     */
    function handleSessionSelect(e) {
        currentState.session = e.currentTarget.dataset.session;

        // Update UI to reflect selection
        sessionCards.forEach(card => card.classList.remove('selected'));
        e.currentTarget.classList.add('selected');

        console.log(`Session selected: ${currentState.session}`);

        // For now, automatically switch to the practice tab
        // Later, this will trigger loading the correct questions
        showTab('practice');
    }

    /**
     * Shows a specific tab and hides others.
     * @param {string} tabId The ID of the tab to show.
     */
    function showTab(tabId) {
        if (currentState.currentTab === tabId) return;
        currentState.currentTab = tabId;

        // Update tab content visibility
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        // Update active state in the menu
        menuItems.forEach(item => {
            if (item.dataset.tab !== 'pomodoro') { // Pomodoro is a modal, not a tab
                item.classList.toggle('active', item.dataset.tab === tabId);
            }
        });
    }

    /**
     * Toggles the visibility of the music player sidebar.
     * @param {boolean} show True to show, false to hide.
     */
    function toggleMusicPlayer(show) {
        musicPlayerSidebar.classList.toggle('open', show);
    }

    /**
     * Toggles the visibility of the Pomodoro timer modal.
     * @param {boolean} show True to show, false to hide.
     */
    function togglePomodoroModal(show) {
        pomodoroModal.classList.toggle('hidden', !show);
    }

    // --- Start the App ---
    init();

    // Add progress view to navigation
    const progressNavItem = document.createElement('div');
    progressNavItem.className = 'menu-item';
    progressNavItem.innerHTML = '<i class="fas fa-chart-line"></i> 進捗状況';
    progressNavItem.onclick = () => showProgressView();
    document.querySelector('.menu').appendChild(progressNavItem);

    // Add progress view
    const progressView = document.createElement('div');
    progressView.id = 'progress-view';
    progressView.className = 'view';
    progressView.innerHTML = `
        <div class="p-6">
            <h2 class="text-2xl font-bold mb-6">学習進捗</h2>
            <div class="mb-4">
                <button onclick="renderProgressChart('all')" class="px-4 py-2 mr-2 bg-blue-500 text-white rounded">すべて</button>
                <button onclick="renderProgressChart('quick')" class="px-4 py-2 mr-2 bg-purple-500 text-white rounded">クイッククイズ</button>
                <button onclick="renderProgressChart('simulation')" class="px-4 py-2 mr-2 bg-pink-500 text-white rounded">試験シミュレーション</button>
                <button onclick="renderProgressChart('category')" class="px-4 py-2 bg-green-500 text-white rounded">カテゴリ別練習</button>
            </div>
            <div id="progressContainer" class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div class="chart-container">
                    <canvas id="progressChart"></canvas>
                </div>
            </div>
        </div>
    `;
    document.getElementById('app').appendChild(progressView);

    function showProgressView() {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('progress-view').classList.add('active');
        renderProgressChart();
    }

    function showResults() {
        // Calculate score
        const score = Math.round((correctCount / questions.length) * 100);
        
        // Save progress
        const currentMode = currentState.quizMode || 'quick'; // Default to quick if not set
        onQuizComplete(currentMode, score, currentState.category || null);
    }
});
