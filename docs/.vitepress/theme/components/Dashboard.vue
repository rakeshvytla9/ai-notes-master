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

<style>
/* Reset and Font Import inside global block to ensure it works in custom layout */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.elearn-layout * {
    box-sizing: border-box;
}

.elearn-layout {
    display: grid;
    grid-template-columns: 240px 1fr 320px;
    gap: 0;
    width: 100%;
    height: 100vh;
    background: #0f0f13; 
    color: #ffffff;
    font-family: 'Inter', -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, oxygen, ubuntu, cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    overflow: hidden;
    position: fixed; /* Take over the whole screen */
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 9999;
}

/* Button & Link Resets */
.elearn-layout button { cursor: pointer; border: none; outline: none; background: none; color: inherit; font-family: inherit; }
.elearn-layout h1, .elearn-layout h2, .elearn-layout h3, .elearn-layout h4, .elearn-layout p { margin: 0; }

/* 1. Sidebar */
.elearn-layout .sidebar {
    background: #15151b;
    padding: 30px 20px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(255,255,255,0.05);
}

.elearn-layout .logo {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 50px; font-size: 1.3rem; font-weight: 700; color: white;
}
.elearn-layout .logo-icon {
    width: 32px; height: 32px; background: #3e8fb0; color: white;
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
}

.elearn-layout .nav-menu { flex: 1; }
.elearn-layout .nav-item {
    display: flex; align-items: center; gap: 15px;
    padding: 12px 15px; margin-bottom: 8px; border-radius: 12px;
    color: #888; font-weight: 500; font-size: 0.95rem; cursor: pointer;
    transition: 0.2s;
}
.elearn-layout .nav-item:hover, .elearn-layout .nav-item.active {
    background: rgba(62, 143, 176, 0.15); color: #3e8fb0;
}
.elearn-layout .nav-item.active { background: #3e8fb0; color: white; }

.elearn-layout .sidebar-footer { margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); }

/* 2. Main Content */
.elearn-layout .main-content {
    padding: 40px;
    overflow-y: auto;
    background: #0f0f13;
}

.elearn-layout .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
.elearn-layout .greeting h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
.elearn-layout .greeting p { color: #888; font-size: 1rem; }

.elearn-layout .header-tools { display: flex; gap: 20px; align-items: center; }
.elearn-layout .search-bar {
    background: #1f1f27; padding: 12px 20px; border-radius: 14px;
    display: flex; align-items: center; gap: 12px; min-width: 250px;
}
.elearn-layout .search-bar input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 0.9rem; }
.elearn-layout .icon-btn {
    width: 45px; height: 45px; background: #1f1f27; border-radius: 14px;
    position: relative; display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; transition: 0.2s;
}
.elearn-layout .icon-btn:hover { background: #2a2a35; }
.elearn-layout .badge {
    position: absolute; top: 10px; right: 10px;
    width: 8px; height: 8px; background: #d66a6a; border-radius: 50%;
}

.elearn-layout .hero-card {
    background: linear-gradient(135deg, #d66a6a 0%, #a04040 100%);
    border-radius: 30px; padding: 40px; display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 40px; position: relative; overflow: hidden;
    box-shadow: 0 20px 40px rgba(214, 106, 106, 0.2);
}
.elearn-layout .hero-text { z-index: 2; }
.elearn-layout .hero-text .tag { 
    background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; 
    font-size: 0.8rem; font-weight: 600; margin-bottom: 20px; display: inline-block; 
}
.elearn-layout .hero-text h2 { font-size: 2.2rem; margin-bottom: 12px; font-weight: 700; }
.elearn-layout .hero-stats { display: flex; gap: 20px; margin-bottom: 25px; opacity: 0.9; font-size: 0.95rem; }

.elearn-layout .btn-primary {
    background: white; color: #d66a6a; padding: 14px 30px; border-radius: 15px;
    font-weight: 700; font-size: 1rem; box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.elearn-layout .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.elearn-layout .section-header h3 { font-size: 1.4rem; font-weight: 600; }

.elearn-layout .course-slider {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 25px; padding-bottom: 20px;
}
.elearn-layout .course-card-glass {
    background: #1f1f27; padding: 25px; border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.05); transition: 0.3s;
}
.elearn-layout .course-card-glass:hover { transform: translateY(-5px); background: #25252f; border-color: rgba(255,255,255,0.1); }
.elearn-layout .card-icon {
    width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem; margin-bottom: 15px;
}
.elearn-layout .course-card-glass h4 { margin-bottom: 5px; font-size: 1.1rem; }
.elearn-layout .course-card-glass p { color: #888; font-size: 0.9rem; margin-bottom: 20px; }

.elearn-layout .progress-bar-bg { width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
.elearn-layout .fill { height: 100%; transition: width 0.5s ease; }
.elearn-layout .percent { font-size: 0.85rem; color: #888; display: block; margin-top: 8px; text-align: right; }

/* 3. Right Panel */
.elearn-layout .right-panel {
    background: #15151b; padding: 40px 25px; border-left: 1px solid rgba(255,255,255,0.05);
    display: flex; flex-direction: column; gap: 30px;
}

.elearn-layout .widget { background: #1f1f27; border-radius: 28px; padding: 30px; }
.elearn-layout .widget h3 { margin-bottom: 20px; font-size: 1.2rem; font-weight: 600; }

.elearn-layout .chart-stat p { color: #888; margin-top: 5px; }

.elearn-layout .chart-labels {
    display: flex;
    justify-content: space-between;
    padding: 0 5px;
    margin-top: 10px;
}
.elearn-layout .chart-labels span {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    flex: 1;
    text-align: center;
}

.elearn-layout .list-item { 
    display: flex; align-items: center; gap: 15px; padding: 12px; border-radius: 18px; transition: 0.2s;
}
.elearn-layout .list-item:hover { background: #25252f; }
.elearn-layout .item-icon {
    width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
}
.elearn-layout .item-info { flex: 1; }
.elearn-layout .item-info h4 { font-size: 0.95rem; margin-bottom: 2px; }
.elearn-layout .item-info p { font-size: 0.8rem; color: #666; }

/* Responsive adjustments */
@media (max-width: 1400px) {
    .elearn-layout { grid-template-columns: 240px 1fr 280px; }
}
@media (max-width: 1200px) {
    .elearn-layout { grid-template-columns: 80px 1fr 0px; }
    .elearn-layout .right-panel { display: none; }
    .elearn-layout .logo-text, .elearn-layout .nav-item span:not(.icon) { display: none; }
    .elearn-layout .nav-item { justify-content: center; padding: 15px; }
    .elearn-layout .nav-item .icon { margin: 0; font-size: 1.4rem; }
}
@media (max-width: 800px) {
    .elearn-layout { grid-template-columns: 1fr; overflow-y: auto; height: auto; position: relative; }
    .elearn-layout .sidebar { display: none; }
    .elearn-layout .main-content { padding: 25px; }
}
</style>
