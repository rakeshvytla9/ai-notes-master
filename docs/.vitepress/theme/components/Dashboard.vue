<script setup>
import { ref, onMounted, computed, watch } from 'vue'

// --- State ---
const courses = ref([
  { 
    id: 'maths', 
    name: 'Maths Foundation', 
    category: 'Mathematics',
    instructor: 'Rahul Teotia Sir', 
    total: 300, 
    current: 0, 
    speed: 3.8, 
    noteTime: 15, 
    color: '#3e8fb0',
    icon: '📐',
    image: 'https://cdn-icons-png.flaticon.com/512/3771/3771278.png'
  },
  { 
    id: 'reasoning', 
    name: 'Reasoning Foundation', 
    category: 'Logic & Reasoning',
    instructor: 'Shobhit Bhardwaj Sir', 
    total: 110, 
    current: 0, 
    speed: 3.0, 
    noteTime: 15,
    color: '#d66a6a',
    icon: '🧩',
    image: 'https://cdn-icons-png.flaticon.com/512/8148/8148942.png' 
  },
  { 
    id: 'english', 
    name: 'English Foundation', 
    category: 'Language',
    instructor: 'Sanjeev Thakur Sir', 
    total: 150, 
    current: 0, 
    speed: 2.0, 
    noteTime: 15,
    color: '#907aa9',
    icon: '📖',
    image: 'https://cdn-icons-png.flaticon.com/512/3976/3976625.png'
  }
])

const dailyTarget = ref(12)
const completedToday = ref(0)
const activeTab = ref('home')
const searchQuery = ref('')

// --- Persistence ---
const STORAGE_KEY = 'elearn-dashboard-data'

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const data = JSON.parse(saved)
    courses.value = data.courses.map(c => ({...courses.value.find(def => def.id === c.id), ...c}))
    
    // Reset daily if new day
    if (data.lastStudyDate !== new Date().toDateString()) {
      completedToday.value = 0
    } else {
      completedToday.value = data.completedToday || 0
    }
  }
})

watch([courses, completedToday], () => {
  const data = {
    courses: courses.value,
    completedToday: completedToday.value,
    lastStudyDate: new Date().toDateString()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}, { deep: true })

// --- Logic ---
const increment = (course) => {
  if (course.current < course.total) {
    course.current++
    completedToday.value++
  }
}

const progressPercent = (course) => Math.round((course.current / course.total) * 100)

const points = computed(() => {
    // Generate a fake 'Learning Point' curve based on progress
    // In a real app, this would be historical data
    return [30, 45, 35, 55, 45, 65, 60, 75, 70, 90, 85, 100].map((y, i) => `${i * 30},${100 - y}`).join(' ')
})

const printDashboard = () => {
    window.print()
}

</script>

<template>
  <div class="elearn-layout">
    
    <!-- 1. Sidebar -->
    <aside class="sidebar">
        <div class="logo">
            <span class="logo-icon">E</span>
            <span class="logo-text">Elearn</span>
        </div>

        <nav class="nav-menu">
            <div class="nav-item" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">
                <span class="icon">🏠</span> Home
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'courses' }" @click="activeTab = 'courses'">
                <span class="icon">📚</span> My Courses
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'favorite' }" @click="activeTab = 'favorite'">
                <span class="icon">❤️</span> Favorite
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">
                <span class="icon">📝</span> Notes
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
                <span class="icon">⚙️</span> Settings
            </div>
        </nav>

        <div class="sidebar-footer">
            <div class="user-profile">
                <div class="avatar">RM</div>
                <div class="user-info">
                    <span class="name">Rakesh M.</span>
                    <span class="status">Student</span>
                </div>
            </div>
        </div>
    </aside>

    <!-- 2. Main Content -->
    <main class="main-content">
        <!-- Header -->
        <header class="top-header">
            <div class="greeting">
                <h1>Hi Rakesh,</h1>
                <p>What will you learn today?</p>
            </div>
            
            <div class="header-tools">
                <div class="search-bar">
                    <span>🔍</span>
                    <input type="text" placeholder="Search..." v-model="searchQuery">
                </div>
                <button class="icon-btn notification">🔔<span class="badge">2</span></button>
                <button class="icon-btn print-btn" @click="printDashboard" title="Download/Print Dashboard">🖨️</button>
            </div>
        </header>

        <!-- Hero Card -->
        <div class="hero-card">
            <div class="hero-text">
                <span class="tag">In Progress</span>
                <h2>Continue Learning: SSC Maths</h2>
                <p>Lecture #{{ courses[0].current + 1}}: Number System & Divisibility</p>
                <div class="hero-stats">
                    <span>⏱️ {{ courses[0].speed }}x Speed</span>
                    <span>🔥 {{ courses[0].current }} / {{ courses[0].total }} Completed</span>
                </div>
                <button class="btn-primary" @click="increment(courses[0])">Mark Watched (+1)</button>
            </div>
            <div class="hero-illustration">
                <!-- Abstract Circle/Graphic -->
                <div class="circle-graphic"></div>
                <div class="floating-icon">Pre</div>
            </div>
        </div>

        <!-- Your Learning Path (Horizontal Scroll) -->
        <div class="section-header">
            <h3>Your Learning Path</h3>
            <div class="arrows">
                <button class="arrow-btn">←</button>
                <button class="arrow-btn">→</button>
            </div>
        </div>

        <div class="course-slider">
            <div v-for="course in courses" :key="course.id" class="course-card-glass">
                <div class="card-icon" :style="{background: course.color}">{{ course.icon }}</div>
                <h4>{{ course.name }}</h4>
                <p>{{ course.total }} Lectures</p>
                
                <div class="progress-wrap">
                    <div class="progress-bar-bg">
                        <div class="fill" :style="{width: progressPercent(course) + '%', background: course.color}"></div>
                    </div>
                    <span class="percent">{{ progressPercent(course) }}%</span>
                </div>

                <div class="card-footer">
                    <div class="students">
                        <div class="avatars">
                            <span class="av">A</span>
                            <span class="av">B</span>
                        </div>
                        <small>+{{ Math.floor(Math.random() * 50) }} Students</small>
                    </div>
                    <button class="btn-mini" @click="increment(course)">+</button>
                </div>
            </div>
        </div>
    </main>

    <!-- 3. Right Sidebar (Widgets) -->
    <aside class="right-panel">
        
        <!-- Learning Point Chart -->
        <div class="widget chart-widget">
            <div class="widget-header">
                <h3>Learning Point</h3>
                <span class="more">...</span>
            </div>
            <div class="chart-container">
                <svg viewBox="0 0 350 120" class="line-chart">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="#3e8fb0" stop-opacity="0.5"/>
                            <stop offset="100%" stop-color="#3e8fb0" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    <path :d="`M0,120 ` + points + ` L350,120 Z`" fill="url(#chartGradient)" />
                    <polyline :points="points" fill="none" stroke="#3e8fb0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="chart-labels">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>
            </div>
            <div class="chart-stat">
                <h3>{{ completedToday }} / {{ dailyTarget }}</h3>
                <p>Lectures Today</p>
            </div>
        </div>

        <!-- Course in Progress -->
        <div class="widget list-widget">
            <h3>Courses in Progress</h3>
            <div class="list-item" v-for="course in courses" :key="course.id + 'list'">
                <div class="item-icon" :style="{border: `2px solid ${course.color}`}">{{ course.icon }}</div>
                <div class="item-info">
                    <h4>{{ course.name }}</h4>
                    <p>{{ course.category }}</p>
                </div>
                <button class="chevron-btn" @click="increment(course)">></button>
            </div>
        </div>

    </aside>

  </div>
</template>

<style scoped>
/* --- Layout Grid --- */
.elearn-layout {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 300px; /* minmax(0, 1fr) prevents main content from blowing out the grid */
    gap: 0;
    width: 100%;
    min-height: 100vh;
    background: #0f0f13; 
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    overflow-x: hidden; /* Prevent page scroll */
}

/* ... existing common styles ... */

/* --- 2. Main Content --- */
.main-content {
    padding: 30px 40px;
    overflow-y: auto;
    height: 100vh; /* Scroll within the middle column */
    /* Ensure glassmorphism cards don't overlap weirdly */
    position: relative;
    z-index: 1;
}

/* ... existing styles ... */

.course-slider {
    display: flex; gap: 20px;
    padding-bottom: 20px;
    overflow-x: auto;
    /* Hide scrollbar for cleaner look */
    scrollbar-width: none; 
}
.course-slider::-webkit-scrollbar { display: none; }

/* ... existing styles ... */

/* --- Responsive --- */
@media (max-width: 1200px) {
    /* Collapse right panel on medium screens */
    .elearn-layout { grid-template-columns: 80px 1fr 0px; }
    .right-panel { display: none; } 
    .logo-text, .nav-item { display: none; } /* Icon only sidebar */
    .nav-item { justify-content: center; }
    .nav-item .icon { margin: 0; }
    /* Show right panel content at bottom of main if needed, or just hide for now as per "overlap" fix */
}

@media (max-width: 900px) {
    .elearn-layout { grid-template-columns: 1fr; display: flex; flex-direction: column; height: auto; }
    .sidebar { display: none; } 
    .main-content { padding: 20px; width: 100%; height: auto; overflow: visible; }
    .right-panel { 
        display: block; width: 100%; 
        border-left: none; padding: 20px;
        background: #0f0f13;
    }
}

@media print {
    .sidebar, .top-header, .arrows { display: none !important; }
    .elearn-layout { display: block; background: white; color: black; }
    .hero-card, .course-card-glass, .widget { 
        background: white; border: 1px solid #ddd; color: black; box-shadow: none; 
        page-break-inside: avoid;
    }
    .main-content { overflow: visible; }
    .btn-primary, .btn-mini, .chevron-btn { display: none; }
    /* Force text colors for print */
    h1, h2, h3, h4, p, span { color: black !important; -webkit-text-fill-color: black !important; }
}
</style>
