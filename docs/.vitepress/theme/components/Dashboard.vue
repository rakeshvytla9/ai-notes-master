<script setup>
import { ref, onMounted, computed, watch } from 'vue'

// --- State ---
const courses = ref([
  { 
    id: 'maths', 
    name: 'Maths Foundation', 
    instructor: 'Rahul Teotia Sir', 
    total: 300, 
    current: 0, 
    speed: 3.8, 
    noteTime: 15, // mins per hour of content
    color: '#3e8fb0' 
  },
  { 
    id: 'reasoning', 
    name: 'Reasoning Foundation', 
    instructor: 'Shobhit Bhardwaj Sir', 
    total: 110, 
    current: 0, 
    speed: 3.0, 
    noteTime: 15,
    color: '#907aa9' 
  },
  { 
    id: 'english', 
    name: 'English Foundation', 
    instructor: 'Sanjeev Thakur Sir', 
    total: 150, 
    current: 0, 
    speed: 2.0, 
    noteTime: 15,
    color: '#d66a6a' // Muted Red
  }
])

const dailyTarget = ref(12)
const completedToday = ref(0)
const lastStudyDate = ref(new Date().toDateString())

// --- Persistence ---
const STORAGE_KEY = 'elearn-dashboard-data'

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const data = JSON.parse(saved)
    courses.value = data.courses
    // Reset daily counter if new day
    if (data.lastStudyDate !== new Date().toDateString()) {
      completedToday.value = 0
      lastStudyDate.value = new Date().toDateString()
    } else {
      completedToday.value = data.completedToday || 0
      lastStudyDate.value = data.lastStudyDate
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

const decrement = (course) => {
  if (course.current > 0) {
    course.current--
    if (completedToday.value > 0) completedToday.value--
  }
}

// Calculate time required for one lecture (60 mins raw)
const getTimeForLecture = (course) => {
  // 60 mins content / speed + note taking time
  const watchTime = 60 / course.speed
  return Math.round(watchTime + course.noteTime)
}

const totalTimeToday = computed(() => {
  // Assuming equal split of the 12 lectures across 3 subjects for simplicity in estimation,
  // or just average correctly if user picks them. 
  // For a planner, let's assume 4 of each for 12 total.
  let totalMins = 0
  courses.value.forEach(c => {
    totalMins += (dailyTarget.value / 3) * getTimeForLecture(c) 
  })
  const hours = Math.floor(totalMins / 60)
  const mins = Math.round(totalMins % 60)
  return `${hours}h ${mins}m`
})

const progressPercent = (course) => {
  return Math.round((course.current / course.total) * 100)
}

const dailyProgressPercent = computed(() => {
  return Math.min(Math.round((completedToday.value / dailyTarget.value) * 100), 100)
})

</script>

<template>
  <div class="dashboard-container">
    <div class="header-section">
      <h1>🚀 Study Dashboard</h1>
      <p class="subtitle">Track your 12-lecture daily goal</p>
    </div>

    <!-- Daily Progress -->
    <div class="daily-card">
      <div class="daily-header">
        <div>
          <h2>Daily Goal</h2>
          <span class="date">{{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}</span>
        </div>
        <div class="daily-stat">
          <span class="big-number">{{ completedToday }}</span>
          <span class="total">/ {{ dailyTarget }}</span>
        </div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: dailyProgressPercent + '%', backgroundColor: dailyProgressPercent >= 100 ? '#4ade80' : '#3e8fb0' }"></div>
      </div>
      <p class="est-time">⏱️ Est. Study Time: <strong>{{ totalTimeToday }}</strong> (at your speeds)</p>
    </div>

    <!-- Course Cards -->
    <div class="courses-grid">
      <div v-for="course in courses" :key="course.id" class="course-card" :style="{ borderTop: `4px solid ${course.color}` }">
        <div class="course-header">
          <h3>{{ course.name }}</h3>
          <p class="instructor">{{ course.instructor }}</p>
        </div>
        
        <div class="course-stats">
          <div class="stat-row">
            <span>Progress</span>
            <span>{{ course.current }} / {{ course.total }}</span>
          </div>
          <div class="progress-bar-bg small">
             <div class="progress-bar-fill" :style="{ width: progressPercent(course) + '%', backgroundColor: course.color }"></div>
          </div>
          <div class="stat-row speed-row">
            <span>Speed: {{ course.speed }}x</span>
            <span>~{{ getTimeForLecture(course) }}m / lec</span>
          </div>
        </div>

        <div class="actions">
          <button @click="decrement(course)" class="btn-icon" title="Undo">-</button>
          <button @click="increment(course)" class="btn-action" :style="{ backgroundColor: course.color }">
            Mark Watched (+1)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 20px 0;
  max-width: 100%;
}

.header-section {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 5px;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 1.1rem;
}

/* Glassmorphism Cards */
.daily-card, .course-card {
  background: rgba(30, 30, 30, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.daily-card:hover, .course-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.2);
}

.daily-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.date {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.daily-stat {
  font-weight: 800;
  color: #fff;
}

.big-number {
  font-size: 2.5rem;
  color: #3e8fb0;
}

.total {
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
}

.progress-bar-bg {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-bar-bg.small {
  height: 6px;
  margin: 10px 0;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.est-time {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  text-align: right;
  margin: 0;
}

/* Course Grid */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.course-header h3 {
  margin: 0;
  font-size: 1.4rem;
}

.instructor {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 5px 0 15px 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 5px;
}

.speed-row {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 5px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-action {
  flex: 1;
  border: none;
  padding: 10px;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s;
}

.btn-action:hover {
  filter: brightness(1.2);
}

.btn-icon {
  width: 40px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: var(--vp-c-text-1);
  border-radius: 10px;
  cursor: pointer;
}

.btn-icon:hover {
  background: rgba(255,255,255,0.05);
}
</style>
