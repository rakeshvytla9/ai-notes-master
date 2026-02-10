<script setup>
import { ref, onMounted, computed, watch } from 'vue'

// --- Constants ---
const STORAGE_KEY = 'elearn-dashboard-data-v2'

// --- State ---
const activeTab = ref('home')
const selectedCourse = ref(null) 
const selectedLecture = ref(null) 
const searchQuery = ref('')

// YouTube API & Import State
// YouTube API & Import State
// const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY // Removed constant, now dynamic
const showImportModal = ref(false)
const newPlaylistId = ref('')
const isImporting = ref(false)
const importError = ref('')
const importedCourses = ref([])

// Settings State
const manualApiKey = ref('')
const apiKeySaved = ref(false)

const getApiKey = () => {
    return manualApiKey.value || import.meta.env.VITE_YOUTUBE_API_KEY
}

const hasValidKey = computed(() => !!getApiKey() && getApiKey() !== 'undefined')

const saveApiKey = () => {
    if (manualApiKey.value.trim()) {
        localStorage.setItem('user_youtube_api_key', manualApiKey.value.trim())
        apiKeySaved.value = true
        setTimeout(() => apiKeySaved.value = false, 3000)
    }
}

// Pomodoro State
const isFocusMode = ref(false)
const pomodoroTime = ref(25 * 60)
const pomodoroTotal = ref(25 * 60)
const pomodoroTimer = ref(null)

// --- Courses State ---
const courses = ref([])

// --- Dynamic Notes Discovery ---
const modules = import.meta.glob('../../../*/*.md')
const discoveredNotes = Object.keys(modules)
  .filter(path => {
    const parts = path.split('/')
    const subject = parts[parts.length - 2]
    const filename = parts[parts.length - 1]
    return ['maths', 'reasoning', 'english', 'ga'].includes(subject) && filename !== 'index.md'
  })
  .map(path => {
    const parts = path.split('/')
    const subject = parts[parts.length - 2]
    const filename = parts[parts.length - 1].replace('.md', '')
    
    // Format category for display
    const categoryMap = {
      'maths': 'Maths',
      'reasoning': 'Reasoning',
      'english': 'English',
      'ga': 'GA'
    }
    
    return {
      title: filename.replace(/%20/g, ' '),
      category: categoryMap[subject] || subject.toUpperCase(),
      link: `/${subject}/${filename}`
    }
  })

const siteNotes = ref(discoveredNotes)

// Study History (Heatmap)
const studyHistory = ref([]) 

// --- Persistence ---
onMounted(() => {
  // Load Manual API Key
  const savedKey = localStorage.getItem('user_youtube_api_key')
  if (savedKey) manualApiKey.value = savedKey

  const currentKey = getApiKey()

  console.log('[Dashboard] API Key Status:', currentKey ? 'Present' : 'Missing')
  // console.log('[Dashboard] Env Keys:', Object.keys(import.meta.env)) // Cleanup logs

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const data = JSON.parse(saved)
    
    // Load imported courses
    if (data.importedCourses) {
        importedCourses.value = data.importedCourses
        courses.value = [...importedCourses.value]
    }

    // Sync completion status
    courses.value.forEach(c => {
        const savedC = data.courses?.find(sc => sc.id === c.id)
        if (savedC && savedC.lectures) {
            c.lectures.forEach(l => {
                const savedL = savedC.lectures.find(sl => sl.id === l.id)
                if (savedL) l.completed = savedL.completed
            })
        }
    })
    studyHistory.value = data.studyHistory || []
  }
})

watch([courses, studyHistory, importedCourses], () => {
  const data = {
    courses: courses.value,
    importedCourses: importedCourses.value,
    studyHistory: studyHistory.value,
    lastUpdated: new Date().toISOString()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}, { deep: true })

// --- YouTube API Importer ---
function extractPlaylistId(input) {
    if (!input) return null
    // Handle full URL
    if (input.includes('list=')) {
        const urlParams = new URLSearchParams(input.split('?')[1])
        return urlParams.get('list')
    }
    // Assume it's a raw ID
    return input.trim()
}

async function importPlaylist() {
    const activeKey = getApiKey()
    if (!activeKey || activeKey === 'undefined') {
        importError.value = "YouTube API Key is missing. Go to Settings tab to configure it manually."
        return
    }

    const playlistId = extractPlaylistId(newPlaylistId.value)
    if (!playlistId) {
        importError.value = "Please enter a valid Playlist ID or URL."
        return
    }
    
    isImporting.value = true
    importError.value = ''
    
    try {
        // 1. Fetch Playlist Metadata (Title)
        const metaUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${activeKey}`
        const metaRes = await fetch(metaUrl)
        const metaData = await metaRes.json()
        
        if (!metaData.items || metaData.items.length === 0) {
            throw new Error("Playlist not found. Make sure it's public and the ID is correct.")
        }
        
        const playlistTitle = metaData.items[0].snippet.title
        const channelTitle = metaData.items[0].snippet.channelTitle
        
        // 2. Fetch all Videos (supporting pagination for hundreds of lectures)
        let allLectures = []
        let nextPageToken = ''
        
        do {
            const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${activeKey}&pageToken=${nextPageToken}`
            const itemsRes = await fetch(itemsUrl)
            const itemsData = await itemsRes.json()
            
            if (itemsData.items) {
                const batch = itemsData.items.map((item, idx) => ({
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    completed: false
                }))
                allLectures = [...allLectures, ...batch]
            }
            nextPageToken = itemsData.nextPageToken || ''
        } while (nextPageToken)

        // 3. Create Course Object
        const newCourse = {
            id: `custom-${Date.now()}`,
            name: playlistTitle,
            category: 'Imported',
            instructor: channelTitle,
            color: '#a3be8c',
            icon: '📺',
            lectures: allLectures
        }

        importedCourses.value.push(newCourse)
        courses.value = [...importedCourses.value]
        
        // Reset
        showImportModal.value = false
        newPlaylistId.value = ''
        alert(`Successfully imported ${allLectures.length} lectures!`)
        
    } catch (err) {
        importError.value = err.message
    } finally {
        isImporting.value = false
    }
}

function removeCourse(courseId) {
    if (!confirm("Remove this course? Your progress will be lost.")) return
    importedCourses.value = importedCourses.value.filter(c => c.id !== courseId)
    courses.value = [...importedCourses.value]
}

// --- Logic ---
const getCompletedCount = (course) => (course && course.lectures) ? course.lectures.filter(l => l.completed).length : 0
const getProgressPercent = (course) => {
    if (!course || !course.lectures || course.lectures.length === 0) return 0
    return Math.round((getCompletedCount(course) / course.lectures.length) * 100)
}

const toggleLecture = (courseId, lectureId) => {
    const course = courses.value.find(c => c.id === courseId)
    const lecture = course.lectures.find(l => l.id === lectureId)
    lecture.completed = !lecture.completed
    
    // Update Heatmap
    const today = new Date().toDateString()
    const historyItem = studyHistory.value.find(h => h.date === today)
    if (historyItem) {
        historyItem.count = lecture.completed ? historyItem.count + 1 : historyItem.count - 1
        if (historyItem.count < 0) historyItem.count = 0
    } else if (lecture.completed) {
        studyHistory.value.push({ date: today, count: 1 })
    }
}

const selectLecture = (lecture) => {
    selectedLecture.value = lecture
}

// Pomodoro Logic
const startTimer = () => {
    if (pomodoroTimer.value) return
    pomodoroTimer.value = setInterval(() => {
        if (pomodoroTime.value > 0) {
            pomodoroTime.value--
        } else {
            clearInterval(pomodoroTimer.value)
            pomodoroTimer.value = null
            alert("Focus session complete! Take a break.")
        }
    }, 1000)
}

const pauseTimer = () => {
    clearInterval(pomodoroTimer.value)
    pomodoroTimer.value = null
}

const resetTimer = () => {
    pauseTimer()
    pomodoroTime.value = 25 * 60
}

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

// Heatmap Grid Logic
const heatmapDays = computed(() => {
    const days = []
    const now = new Date()
    for (let i = 27; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        const dateStr = d.toDateString()
        const match = studyHistory.value.find(h => h.date === dateStr)
        days.push({
            date: dateStr,
            count: match ? match.count : 0
        })
    }
    return days
})

const getHeatColor = (count) => {
    if (count === 0) return 'rgba(255,255,255,0.03)'
    if (count < 2) return '#3e8fb033'
    if (count < 5) return '#3e8fb077'
    return '#3e8fb0'
}

// Navigation
const openCourse = (course) => {
    selectedCourse.value = course
    selectedLecture.value = course.lectures[0] // Auto-play first lecture
    activeTab.value = 'courses'
}

// --- Enhanced Analytics Logic ---
const weeklyTrend = computed(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const count = studyHistory.value.find(h => h.date === dateStr)?.count || 0
        days.push({ 
            date: dateStr, 
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            count 
        })
    }
    return days
})

const subjectStats = computed(() => {
    const subjects = ['Maths', 'Reasoning', 'English', 'GA']
    return subjects.map(sub => {
        const subCourses = courses.value.filter(c => c.category === sub || (c.category === 'Imported' && c.name.toLowerCase().includes(sub.toLowerCase())))
        const total = subCourses.reduce((acc, c) => acc + c.lectures.length, 0)
        const completed = subCourses.reduce((acc, c) => acc + getCompletedCount(c), 0)
        return {
            name: sub,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
            color: sub === 'Maths' ? '#3e8fb0' : sub === 'Reasoning' ? '#d66a6a' : sub === 'English' ? '#a3be8c' : '#b48ead'
        }
    })
})

const totalStudyTime = computed(() => {
    const totalLectures = courses.value.reduce((acc, c) => acc + getCompletedCount(c), 0)
    const minutes = totalLectures * 45 // Estimating 45 mins per lecture
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
})

const closeCourse = () => {
    selectedCourse.value = null
    selectedLecture.value = null
}

const streak = computed(() => {
    return studyHistory.value.filter(h => h.count > 0).length
})

</script>

<template>
  <div class="elearn-layout">
    
    <!-- 1. Sidebar -->
    <aside class="sidebar">
        <div class="logo">
            <span class="logo-icon">A</span>
            <span class="logo-text">AI Notes</span>
        </div>

        <nav class="nav-menu">
            <div class="nav-item" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'; closeCourse()">
                <span class="icon">🏠</span> Home
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'courses' }" @click="activeTab = 'courses'">
                <span class="icon">📚</span> My Courses
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'revision' }" @click="activeTab = 'revision'">
                <span class="icon">🔄</span> Revision
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">
                <span class="icon">📝</span> AI Notes
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
                <span class="icon">⚙️</span> Settings
            </div>
        </nav>

        <!-- Pomodoro Widget -->
        <div class="pomodoro-widget" style="margin-bottom: 20px;">
            <h4>Focus Mode</h4>
            <div class="timer-display">{{ formatTime(pomodoroTime) }}</div>
            <div class="timer-controls">
                <button v-if="!pomodoroTimer" @click="startTimer">▶</button>
                <button v-else @click="pauseTimer">⏸</button>
                <button @click="resetTimer">↺</button>
            </div>
        </div>

        <!-- Consistency Widget (Moved from Right) -->
        <div class="consistency-widget-sidebar">
            <div class="consistency-circle">
                <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#222" stroke-width="3"/>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3e8fb0" stroke-width="3" :style="{ strokeDasharray: `${courses.length > 0 ? getProgressPercent(courses[0]) : 0}, 100` }"/>
                </svg>
                <div class="circle-text">
                    <span class="val">{{ streak }}</span>
                    <span class="lab">Streak</span>
                </div>
            </div>
            <p class="consistency-label">Daily consistency pushes results left!</p>
        </div>

        <div class="sidebar-footer">
            <div class="user-profile">
                <div class="avatar">RM</div>
                <div class="user-info">
                    <span class="name">Rakesh Mohan</span>
                    <span class="status">Study Mode</span>
                </div>
            </div>
        </div>
    </aside>

    <!-- 2. Main Content -->
    <main class="main-content" :class="{ 'detail-mode': selectedCourse }">
        
        <!-- Header -->
        <header class="top-header">
            <div class="greeting">
                <h1 v-if="activeTab === 'home'">How's the Prep, Rakesh?</h1>
                <h1 v-else-if="activeTab === 'courses'">My Syllabus</h1>
                <h1 v-else-if="activeTab === 'revision'">Revision Queue</h1>
                <h1 v-else>{{ activeTab.toUpperCase() }}</h1>
            </div>
            
            <div class="header-tools">
                <div class="search-bar">
                    <span>🔍</span>
                    <input type="text" placeholder="Search topics..." v-model="searchQuery">
                </div>
                <div class="streak-badge">🔥 {{ streak }} Day Streak</div>
            </div>
        </header>

        <!-- HOME TAB -->
        <div v-if="activeTab === 'home'" class="tab-content home-tab">
            <!-- Summary Stats -->
            <div class="stats-row">
                <div class="stat-card">
                    <span class="label">Total Lectures</span>
                    <span class="value">{{ courses.reduce((acc, c) => acc + c.lectures.length, 0) }}</span>
                </div>
                <div class="stat-card">
                    <span class="label">Total Study Time</span>
                    <span class="value">{{ totalStudyTime }}</span>
                </div>
                <div class="stat-card">
                    <span class="label">Prep Level</span>
                    <span class="value">{{ courses.length > 0 ? Math.round((courses.reduce((acc, c) => acc + getCompletedCount(c), 0) / Math.max(1, courses.reduce((acc, c) => acc + c.lectures.length, 0))) * 100) : 0 }}%</span>
                </div>
            </div>

            <div class="analytics-grid">
                <!-- Weekly Trend Bar Chart -->
                <div class="analysis-card weekly-trend">
                    <h3>Weekly Completion Trend</h3>
                    <div class="bar-chart">
                        <div v-for="day in weeklyTrend" :key="day.date" class="bar-wrapper">
                            <div class="bar-fill" :style="{ height: Math.min(100, (day.count / 10) * 100) + '%' }" :title="`${day.count} lectures`"></div>
                            <span class="day-label">{{ day.dayName }}</span>
                        </div>
                    </div>
                </div>

                <!-- Subject Mastery -->
                <div class="analysis-card subject-mastery">
                    <h3>Subject Mastery</h3>
                    <div class="mastery-list">
                        <div v-for="stat in subjectStats" :key="stat.name" class="mastery-item">
                            <div class="m-info">
                                <span>{{ stat.name }}</span>
                                <span>{{ stat.percent }}%</span>
                            </div>
                            <div class="m-bar-bg">
                                <div class="m-bar-fill" :style="{ width: stat.percent + '%', background: stat.color }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Heatmap Section -->
            <div class="heat-section">
                <h3>Study Intensity (Last 28 Days)</h3>
                <div class="heat-grid">
                    <div v-for="day in heatmapDays" :key="day.date" 
                         class="heat-cell" 
                         :style="{ background: getHeatColor(day.count) }"
                         :title="`${day.date}: ${day.count} lectures`"
                    ></div>
                </div>
            </div>

            <!-- Hero: Continue Learning -->
            <div v-if="courses && courses.length > 0" class="hero-card study" @click="openCourse(courses[0])">
                <div class="hero-text">
                    <span class="tag">Next Up</span>
                    <h2>{{ courses[0].name }}</h2>
                    <p>Continue from Lecture #{{ getCompletedCount(courses[0]) + 1 }}</p>
                    <button class="btn-primary" @click.stop="openCourse(courses[0])">Jump In →</button>
                </div>
                <div class="hero-illustration">
                    <div class="circle-graphic"></div>
                </div>
            </div>
            <div v-else class="hero-card empty" @click="activeTab = 'courses'">
                <div class="hero-text">
                    <span class="tag">Getting Started</span>
                    <h2>Build Your Syllabus</h2>
                    <p>Import your first YouTube playlist to start tracking your progress.</p>
                    <button class="btn-primary">Add Your First Course →</button>
                </div>
            </div>
        </div>

        <!-- COURSES TAB -->
        <div v-if="activeTab === 'courses'" class="tab-content courses-tab">
            
            <!-- List View -->
            <div v-if="!selectedCourse" class="course-grid">
                <!-- Add New Course Button -->
                <div class="course-card-glass wide add-course" @click="showImportModal = true">
                    <div class="card-side-icon" style="background: rgba(255,255,255,0.05);">➕</div>
                    <div class="card-main">
                        <div class="card-meta">
                            <h4>Add New Course</h4>
                            <span class="instructor">Import from YouTube Playlist</span>
                        </div>
                    </div>
                </div>

                <div v-for="course in courses" :key="course.id" class="course-card-glass wide" @click="openCourse(course)">
                    <div class="card-side-icon" :style="{background: course.color}">{{ course.icon }}</div>
                    <div class="card-main">
                        <div class="card-meta">
                            <h4>{{ course.name }}</h4>
                            <span class="instructor">{{ course.instructor }}</span>
                        </div>
                        <div class="progress-section" v-if="course.lectures">
                            <div class="progress-bar-bg">
                                <div class="fill" :style="{width: getProgressPercent(course) + '%', background: course.color}"></div>
                            </div>
                            <span class="percent">{{ getProgressPercent(course) }}% Complete</span>
                        </div>
                    </div>
                    <div class="card-actions" v-if="course.lectures">
                        <span class="count">{{ getCompletedCount(course) }}/{{ (course.lectures || []).length }}</span>
                        <button v-if="course.id && String(course.id).startsWith('custom')" @click.stop="removeCourse(course.id)" class="btn-mini-delete">🗑️</button>
                        <button class="btn-mini">→</button>
                    </div>
                </div>
            </div>

            <!-- Import Modal -->
            <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
                <div class="modal-content">
                    <h3>Import YouTube Playlist</h3>
                    <p>Enter a Playlist ID to automatically fetch all lectures.</p>
                    <input v-model="newPlaylistId" placeholder="e.g. PLAeePiDQTajfiMhm7..." class="modal-input">
                    <div v-if="importError" class="modal-error">{{ importError }}</div>
                    <div class="modal-actions">
                        <button @click="showImportModal = false" class="btn-secondary">Cancel</button>
                        <button @click="importPlaylist" :disabled="isImporting" class="btn-primary">
                            {{ isImporting ? 'Importing...' : 'Start Import' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Detail View (Video Player + Stack) -->
            <div v-else-if="selectedCourse" class="course-detail">
                <button class="back-link" @click="closeCourse">← Back to Courses</button>
                <div class="course-header" :style="{ color: selectedCourse.color }">
                    <span class="icon">{{ selectedCourse.icon }}</span>
                    <h2>{{ selectedCourse.name }}</h2>
                </div>

                <div class="video-player-section" v-if="selectedLecture">
                    <div class="video-frame">
                        <iframe 
                            :src="'https://www.youtube.com/embed/' + selectedLecture.id" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                    <div class="video-info">
                        <h2>{{ selectedLecture.title }}</h2>
                        <p>{{ selectedCourse.name }} • {{ selectedCourse.instructor }}</p>
                        <button @click="toggleLecture(selectedCourse.id, selectedLecture.id)" class="btn-primary">
                            {{ selectedLecture.completed ? '✅ Completed' : 'Mark as Watched' }}
                        </button>
                    </div>
                </div>

                <div class="video-stack" v-if="selectedCourse.lectures">
                    <h3>Course Syllabus</h3>
                    <div class="lecture-list">
                        <div v-for="(lecture, index) in selectedCourse.lectures" :key="lecture.id" 
                         class="lecture-row" 
                         :class="{ completed: lecture.completed, active: selectedLecture?.id === lecture.id }"
                         @click="selectLecture(lecture)">
                        <div class="lecture-index">{{ index + 1 }}</div>
                        <div class="lecture-info">
                            <h4>{{ lecture.title }}</h4>
                            <span class="duration">Lecture • SSC Prep</span>
                        </div>
                        <div class="lecture-check">
                            <div class="status-icon">{{ lecture.completed ? '✅' : '⬜' }}</div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- AI NOTES TAB -->
        <div v-if="activeTab === 'notes'" class="tab-content notes-tab">
            <div class="notes-grid">
                <a v-for="note in siteNotes" :key="note.link" :href="'/ai-notes-master' + note.link" class="note-card-glass">
                    <div class="note-meta">
                        <span class="category">{{ note.category }}</span>
                        <h3>{{ note.title }}</h3>
                    </div>
                    <span class="arrow">↗</span>
                </a>
            </div>
        </div>

        <!-- REVISION TAB -->
        <div v-if="activeTab === 'revision'" class="tab-content empty-state">
            <span class="icon">🔄</span>
            <h3>No topics scheduled for revision today.</h3>
            <p>Topics you complete will appear here based on your study history.</p>
        </div>

        <!-- SETTINGS TAB -->
        <div v-if="activeTab === 'settings'" class="tab-content">
            <div class="settings-card">
                <h3>⚙️ API Configuration</h3>
                <p class="settings-desc">If the automatic environment variable fails, you can manually enter your YouTube API Key here.</p>
                
                <div class="input-group">
                    <label>YouTube Data API v3 Key</label>
                    <div class="api-input-wrapper">
                        <input type="password" v-model="manualApiKey" placeholder="Enter your AIza... key here" class="settings-input">
                        <button class="btn-primary btn-save" @click="saveApiKey">Save Key</button>
                    </div>
                    <p v-if="apiKeySaved" class="success-msg">✅ Key saved successfully!</p>
                </div>

                <div class="current-status">
                    <span>Current Status: </span>
                    <span :class="hasValidKey ? 'status-ok' : 'status-err'">
                        {{ hasValidKey ? '✅ Ready to Import' : '❌ Key Missing' }}
                    </span>
                </div>
            </div>
        </div>

    </main>

    <!-- 3. Right Sidebar (Analytics & Focus) -->
    <aside class="right-panel">
        
        <div class="widget quick-actions" v-if="courses && courses.length > 0">
            <h3>Quick Actions</h3>
            <div class="action-grid">
                <button class="action-btn" @click="activeTab = 'revision'">📚 Review Formulae</button>
                <button class="action-btn" @click="activeTab = 'notes'">🧠 AI Notes Hub</button>
            <button class="action-btn" @click="activeTab = 'home'">📊 View Progress</button>
        </div>
    </div>

        <!-- Course Summary Mini -->
        <div class="widget mini-courses">
            <h3>Completion Stats</h3>
            <div class="mini-card" v-for="course in courses" :key="course.id">
                <div class="mini-header">
                    <span>{{ course.icon }} {{ course.name }}</span>
                    <span>{{ getProgressPercent(course) }}%</span>
                </div>
                <div class="mini-bar">
                    <div class="fill" :style="{ width: getProgressPercent(course) + '%', background: course.color }"></div>
                </div>
            </div>
        </div>


    </aside>

  </div>
</template>

<style>
/* Reset and Font Import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.elearn-layout * { box-sizing: border-box; }

.elearn-layout {
    display: grid;
    grid-template-columns: 240px 1fr 300px;
    gap: 0;
    width: 100%; height: 100vh;
    background: #000000; color: #ffffff;
    font-family: 'Inter', sans-serif;
    overflow: hidden;
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 9999;
}

/* Sidebar */
.elearn-layout .sidebar {
    background: #050505; padding: 30px 20px;
    display: flex; flex-direction: column;
    border-right: 1px solid rgba(255,255,255,0.03);
}
.elearn-layout .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; font-weight: 700; font-size: 1.2rem; }
.elearn-layout .logo-icon { width: 32px; height: 32px; background: #3e8fb0; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; }

.elearn-layout .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 15px; margin-bottom: 5px;
    border-radius: 10px; color: #888; cursor: pointer; transition: 0.2s;
}
.elearn-layout .nav-item:hover, .elearn-layout .nav-item.active { background: rgba(62,143,176,0.1); color: #3e8fb0; }
.elearn-layout .nav-item.active { font-weight: 600; }

.elearn-layout .pomodoro-widget {
    margin-top: 30px; background: #0a0a0e; padding: 20px; border-radius: 15px; text-align: center;
    border: 1px solid rgba(255,255,255,0.03);
}
.elearn-layout .pomodoro-widget h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 10px; }
.elearn-layout .timer-display { font-size: 1.8rem; font-weight: 700; margin-bottom: 15px; font-variant-numeric: tabular-nums; }
.elearn-layout .timer-controls { display: flex; justify-content: center; gap: 10px; }
.elearn-layout .timer-controls button { width: 35px; height: 35px; background: #1a1a23; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: 0.2s; }
.elearn-layout .timer-controls button:hover { background: #3e8fb0; color: white; }

.elearn-layout .consistency-widget-sidebar {
    background: #0a0a0e; padding: 20px; border-radius: 15px; text-align: center;
    border: 1px solid rgba(255,255,255,0.03); margin-top: 10px;
}
.elearn-layout .consistency-label { font-size: 0.7rem; color: #444; margin-top: 10px; line-height: 1.2; }

.elearn-layout .sidebar-footer { margin-top: auto; }
.elearn-layout .user-profile { display: flex; align-items: center; gap: 12px; padding: 15px; background: #0a0a0e; border-radius: 15px; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .avatar { width: 40px; height: 40px; background: #d66a6a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.elearn-layout .user-info .name { display: block; font-weight: 600; font-size: 0.9rem; }
.elearn-layout .user-info .status { font-size: 0.75rem; color: #666; }

/* Main Content */
.elearn-layout .main-content { padding: 40px; overflow-y: auto; background: #000000; }
.elearn-layout .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
.elearn-layout .greeting h1 { font-size: 1.8rem; margin-bottom: 5px; }
.elearn-layout .header-tools { display: flex; gap: 20px; align-items: center; }
.elearn-layout .streak-badge { background: #0a0a0e; padding: 10px 20px; border-radius: 12px; font-weight: 600; color: #d66a6a; border: 1px solid rgba(255,255,255,0.03); }

.elearn-layout .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
.elearn-layout .stat-card { background: #050505; padding: 20px; border-radius: 20px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .stat-card .label { font-size: 0.85rem; color: #666; margin-bottom: 10px; }
.elearn-layout .stat-card .value { font-size: 1.8rem; font-weight: 700; }

.elearn-layout .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
.elearn-layout .analysis-card { background: #050505; padding: 25px; border-radius: 25px; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .analysis-card h3 { font-size: 0.9rem; color: #666; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }

/* Weekly Trend Bar Chart */
.elearn-layout .bar-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 150px; padding: 0 10px; }
.elearn-layout .bar-wrapper { display: flex; flex-direction: column; align-items: center; gap: 10px; flex: 1; }
.elearn-layout .bar-fill { width: 12px; background: linear-gradient(to top, #3e8fb0, #a3be8c); border-radius: 6px; transition: height 1s ease; cursor: pointer; }
.elearn-layout .bar-fill:hover { filter: brightness(1.2); transform: scaleX(1.1); }
.elearn-layout .day-label { font-size: 0.7rem; color: #444; }

/* Subject Mastery */
.elearn-layout .mastery-list { display: flex; flex-direction: column; gap: 15px; }
.elearn-layout .mastery-item { display: flex; flex-direction: column; gap: 8px; }
.elearn-layout .m-info { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; }
.elearn-layout .m-bar-bg { width: 100%; height: 6px; background: #000; border-radius: 3px; overflow: hidden; }
.elearn-layout .m-bar-fill { height: 100%; transition: width 1s ease; }

.elearn-layout .heat-section { background: #050505; padding: 25px; border-radius: 25px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .heat-grid { display: flex; gap: 4px; margin-top: 15px; flex-wrap: wrap; }
.elearn-layout .heat-cell { width: 14px; height: 14px; border-radius: 3px; cursor: help; transition: 0.2s; }
.elearn-layout .heat-cell:hover { transform: scale(1.2); outline: 1px solid white; }

.elearn-layout .hero-card.study { background: linear-gradient(135deg, #3e8fb044 0%, #050505 100%); cursor: pointer; border: 1px solid rgba(62,143,176,0.2); }
.elearn-layout .hero-card { border-radius: 30px; padding: 40px; position: relative; display: flex; margin-bottom: 40px; min-height: 280px; height: auto; }
.elearn-layout .hero-text { flex: 1; z-index: 2; display: flex; flex-direction: column; justify-content: center; }
.elearn-layout .tag { background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; margin-bottom: 10px; align-self: flex-start; }
.elearn-layout .hero-text h2 { font-size: 1.8rem; margin-bottom: 10px; line-height: 1.2; }
.elearn-layout .btn-primary { background: white; color: #3e8fb0; padding: 12px 25px; border-radius: 12px; font-weight: 700; margin-top: 20px; border: none; cursor: pointer; }

/* Notes Tab */
.elearn-layout .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.elearn-layout .note-card-glass { 
    background: #050505; padding: 25px; border-radius: 20px; text-decoration: none; color: white; border: 1px solid rgba(255,255,255,0.03);
    display: flex; justify-content: space-between; align-items: center; transition: 0.2s;
}
.elearn-layout .note-card-glass:hover { transform: translateY(-3px); border-color: #3e8fb0; background: #0a0a0e; }
.elearn-layout .note-card-glass .category { font-size: 0.75rem; color: #3e8fb0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.elearn-layout .note-card-glass h3 { margin-top: 8px; font-size: 1.1rem; }
.elearn-layout .note-card-glass .arrow { font-size: 1.5rem; color: #444; }

/* Course View */
.elearn-layout .course-grid { display: flex; flex-direction: column; gap: 15px; }
.elearn-layout .course-card-glass.wide { 
    display: flex; align-items: center; background: #050505; padding: 20px; border-radius: 20px; cursor: pointer; border: 1px solid rgba(255,255,255,0.03); transition: 0.2s; gap: 20px;
}
.elearn-layout .course-card-glass.wide:hover { border-color: rgba(62, 143, 176, 0.3); background: #0a0a0e; }
.elearn-layout .card-side-icon { width: 50px; height: 50px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.elearn-layout .card-main { flex: 1; display: flex; align-items: center; gap: 40px; }
.elearn-layout .card-meta { min-width: 200px; }
.elearn-layout .instructor { font-size: 0.8rem; color: #666; }
.elearn-layout .progress-section { flex: 1; }
.elearn-layout .progress-bar-bg { width: 100%; height: 6px; background: #000; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.elearn-layout .fill { height: 100%; transition: 0.5s ease; }
.elearn-layout .percent { font-size: 0.8rem; color: #666; }
.elearn-layout .card-actions { display: flex; align-items: center; gap: 20px; }
.elearn-layout .card-actions .count { font-weight: 600; color: #888; }
.elearn-layout .btn-mini { width: 35px; height: 35px; background: #1a1a23; border-radius: 10px; font-size: 1.2rem; border: none; color: white; cursor: pointer; }
.elearn-layout .btn-mini-delete { width: 35px; height: 35px; background: rgba(214, 106, 106, 0.1); border-radius: 10px; font-size: 1rem; border: none; cursor: pointer; transition: 0.2s; }
.elearn-layout .btn-mini-delete:hover { background: #d66a6a; }

/* Modal Styles */
.elearn-layout .modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center; z-index: 10000;
}
.elearn-layout .modal-content {
    background: #050505; padding: 40px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05);
    width: 450px; text-align: center;
}
.elearn-layout .modal-input {
    width: 100%; padding: 15px; background: #0a0a0e; border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px; color: white; margin: 20px 0; font-size: 1rem;
}
.elearn-layout .modal-actions { display: flex; gap: 15px; justify-content: center; }
.elearn-layout .modal-error { color: #d66a6a; font-size: 0.85rem; margin-bottom: 15px; }
.elearn-layout .btn-secondary { background: rgba(255,255,255,0.05); border: none; color: white; padding: 12px 25px; border-radius: 12px; cursor: pointer; font-weight: 600; }

/* Settings Tab */
.elearn-layout .settings-card { background: #050505; padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.03); max-width: 600px; }
.elearn-layout .settings-desc { color: #888; font-size: 0.9rem; margin-bottom: 25px; line-height: 1.5; }
.elearn-layout .input-group label { display: block; font-size: 0.85rem; color: #666; margin-bottom: 8px; font-weight: 600; }
.elearn-layout .api-input-wrapper { display: flex; gap: 10px; margin-bottom: 10px; }
.elearn-layout .settings-input { flex: 1; background: #0a0a0e; border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; color: white; font-family: monospace; }
.elearn-layout .btn-save { margin-top: 0; padding: 0 25px; }
.elearn-layout .success-msg { color: #a3be8c; font-size: 0.85rem; margin-top: 5px; }
.elearn-layout .current-status { margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem; }
.elearn-layout .status-ok { color: #a3be8c; font-weight: 600; }
.elearn-layout .status-err { color: #d66a6a; font-weight: 600; }

/* Detail View */
.elearn-layout .back-link { margin-bottom: 20px; color: #666; font-size: 0.9rem; background: none; border: none; cursor: pointer; }
.elearn-layout .video-player-section { background: #050505; padding: 25px; border-radius: 30px; margin-bottom: 40px; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .video-frame { position: relative; width: 100%; padding-top: 56.25%; background: #000; border-radius: 20px; overflow: hidden; margin-bottom: 20px; }
.elearn-layout .video-frame iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.elearn-layout .video-info { display: flex; justify-content: space-between; align-items: flex-end; }
.elearn-layout .video-info h2 { font-size: 1.4rem; margin-bottom: 5px; }
.elearn-layout .video-info p { color: #666; margin: 0; }

.elearn-layout .video-stack { display: flex; flex-direction: column; gap: 10px; }
.elearn-layout .video-stack h3 { margin-bottom: 10px; font-size: 1rem; color: #888; }
.elearn-layout .lecture-row { display: flex; align-items: center; padding: 15px 25px; background: #050505; border-radius: 15px; gap: 20px; transition: 0.2s; cursor: pointer; border: 1px solid transparent; }
.elearn-layout .lecture-row:hover { background: #0a0a0e; border-color: rgba(62,143,176,0.1); }
.elearn-layout .lecture-row.active { background: rgba(62,143,176,0.05); border-color: #3e8fb0; }
.elearn-layout .lecture-row.completed { opacity: 0.8; }
.elearn-layout .lecture-index { width: 30px; font-weight: 700; color: #444; }
.elearn-layout .lecture-info { flex: 1; }
.elearn-layout .lecture-info h4 { margin-bottom: 4px; font-size: 1rem; }
.elearn-layout .duration { font-size: 0.8rem; color: #444; }
.elearn-layout .status-icon { font-size: 1.2rem; }

/* Right Panel */
.elearn-layout .right-panel { 
    background: #050505; padding: 40px 25px; border-left: 1px solid rgba(255,255,255,0.03); 
    display: flex; flex-direction: column; gap: 30px; overflow-y: auto; height: 100%;
}
.elearn-layout .widget { background: #0a0a0e; padding: 25px; border-radius: 25px; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .widget h3 { margin-bottom: 20px; font-size: 1rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }

.elearn-layout .action-btn { width: 100%; text-align: left; padding: 12px 15px; background: #121218; border-radius: 12px; margin-bottom: 10px; font-weight: 600; font-size: 0.9rem; transition: 0.2s; border: none; color: white; cursor: pointer; }
.elearn-layout .action-btn:hover { background: #3e8fb0; }

.elearn-layout .mini-card { margin-bottom: 20px; }
.elearn-layout .mini-header { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 10px; color: #888; }
.elearn-layout .mini-bar { width: 100%; height: 4px; background: #000; border-radius: 2px; }

.elearn-layout .consistency-circle { position: relative; width: 120px; height: 120px; margin: 0 auto; }
.elearn-layout .circle-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; display: flex; flex-direction: column; }
.elearn-layout .circle-text .val { font-size: 2rem; font-weight: 800; color: #3e8fb0; }
.elearn-layout .circle-text .lab { font-size: 0.7rem; color: #666; text-transform: uppercase; }

.elearn-layout .empty-state { text-align: center; padding: 100px 40px; color: #444; }
.elearn-layout .empty-state .icon { font-size: 4rem; display: block; margin-bottom: 20px; opacity: 0.3; }

/* Transitions */
.tab-content { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1000px) {
    .elearn-layout { grid-template-columns: 80px 1fr; }
    .right-panel { display: none; }
    .sidebar .logo-text, .sidebar span:not(.icon) { display: none; }
    .nav-item { justify-content: center; padding: 15px; }
    .pomodoro-widget { display: none; }
}
</style>
