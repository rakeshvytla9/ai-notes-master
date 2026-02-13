<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { auth, db, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// --- Constants ---
const STORAGE_KEY = 'elearn-dashboard-data-v2'

// --- State ---
const activeTab = ref('home')
const selectedCourse = ref(null) 
const selectedLecture = ref(null) 
const searchQuery = ref('')
const isMobileMenuOpen = ref(false)
const isRightPanelOpen = ref(false)

// YouTube API & Import State
const importedCourses = ref([])
const showImportModal = ref(false)
const newPlaylistId = ref('')
const importError = ref('')
const isImporting = ref(false)
const user = ref(null)
const isSyncing = ref(false)
const lastSyncTime = ref(null)

// --- Personal Notes State ---
const activeNoteTab = ref('public') // 'public' | 'private'
const userNotes = ref([])
const isNoteModalOpen = ref(false)
const currentNote = ref({ id: null, title: '', content: '' })
const isSavingNote = ref(false)
let syncTimeout = null

// Daily Planner State
const dailySchedule = ref([])
const newSlotTime = ref('')
const newSlotTask = ref('')
const newSlotCourseId = ref('') // Optional course linkage

// Syllabus Calculator State
const targetDate = ref('')
const targetMetric = ref('videos') // 'videos' | 'hours'
const dailyTarget = ref(0)
const completionForecast = ref('')
const timeToTarget = ref({ days: 0, hours: 0, mins: 0, secs: 0 });
const countdownInterval = ref(null);

// Developer Analytics Mock Data (Phase 27)
const leetcodeStats = ref({
    solved: 482,
    total: 3105,
    easy: 185,
    med: 247,
    hard: 50,
    streak: 15,
    ranking: 'Top 5%'
});

const githubStats = ref({
    commits: 1240,
    repos: 12,
    contributions: 312,
    topLanguage: 'TypeScript',
    trend: [12, 15, 8, 20, 18, 25, 30] // Mock weekly commit data
});

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

// --- Logic Helpers (Hoisted for Safety) ---
const getCompletedCount = (course) => (course && course.lectures) ? course.lectures.filter(l => l.completed).length : 0
const getProgressPercent = (course) => {
    if (!course || !course.lectures || course.lectures.length === 0) return 0
    return Math.round((getCompletedCount(course) / course.lectures.length) * 100)
}
const extractPlaylistId = (input) => {
    if (!input) return null
    if (input.includes('list=')) {
        const urlParams = new URLSearchParams(input.split('?')[1])
        return urlParams.get('list')
    }
    return input.trim()
}

const parseISO8601Duration = (duration) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1]) || 0
    const minutes = parseInt(match[2]) || 0
    const seconds = parseInt(match[3]) || 0
    return hours * 3600 + minutes * 60 + seconds
}

const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

// --- Persistence ---
onMounted(() => {
  try {
      // Load Manual API Key
      const savedKey = localStorage.getItem('user_youtube_api_key')
      if (savedKey) manualApiKey.value = savedKey
    
      const currentKey = getApiKey()
      console.log('[Dashboard] API Key Status:', currentKey ? 'Present' : 'Missing')
    
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        
        // Load imported courses safely
        if (data.importedCourses && Array.isArray(data.importedCourses)) {
            importedCourses.value = data.importedCourses
            courses.value = [...importedCourses.value]
        }
    
        // Sync completion status safely
        if (Array.isArray(data.courses)) {
            courses.value.forEach(c => {
                const savedC = data.courses.find(sc => sc.id === c.id)
                if (savedC && savedC.lectures && Array.isArray(savedC.lectures)) {
                    c.lectures.forEach(l => {
                        const savedL = savedC.lectures.find(sl => sl.id === l.id)
                        if (savedL) l.completed = !!savedL.completed
                    })
                }
            })
        }
        
        if (Array.isArray(data.studyHistory)) studyHistory.value = data.studyHistory
        if (Array.isArray(data.dailySchedule)) dailySchedule.value = data.dailySchedule
        if (data.targetDate) targetDate.value = data.targetDate
        if (data.targetMetric) targetMetric.value = data.targetMetric
        
        // Trigger silent duration repair
        syncMissingDurations()

        // Start countdown ticker
        startCountdown()
      }
  } catch (err) {
      console.error('[Dashboard] Error in onMounted:', err)
  }

  // --- Firebase Auth ---
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (u) {
        console.log('[Firebase] User logged in:', u.displayName)
        await fetchFromCloud()
        // Auto-backup if local data exists but cloud was empty/new
        if (courses.value.length > 0) {
            syncToCloud()
        }
    } else {
        console.log('[Firebase] No user logged in')
    }
  })
})

const signInWithGoogle = async () => {
    if (!auth) {
        alert("Firebase is not configured. Please add your API keys in Settings.")
        return
    }
    try {
        const result = await signInWithPopup(auth, googleProvider)
        user.value = result.user
        fetchFromCloud()
    } catch (error) {
        console.error("Auth Error:", error)
        alert("Login failed: " + error.message)
    }
}

const signOut = async () => {
    if (!auth) return
    try {
        await firebaseSignOut(auth)
        user.value = null
        courses.value = [] // clear private data on logout
    } catch (error) {
        console.error("SignOut Error:", error)
    }
}

// --- Cloud Sync Tier ---
const syncToCloud = async () => {
    if (!user.value || isSyncing.value || !db) return
    
    isSyncing.value = true
    try {
        await setDoc(doc(db, 'users', user.value.uid), {
            courses: courses.value,
            studyHistory: studyHistory.value,
            dailySchedule: dailySchedule.value,
            targetDate: targetDate.value,
            youtubeApiKey: manualApiKey.value || null,
            lastSynced: new Date().toISOString()
        }, { merge: true })
        
        lastSyncTime.value = new Date().toLocaleTimeString()
    } finally {
        isSyncing.value = false
    }
}

// --- Personal Notes Logic ---
let notesUnsubscribe = null

const fetchNotes = () => {
    if (!user.value || !db) return
    
    // Unsubscribe previous listener if exists
    if (notesUnsubscribe) notesUnsubscribe()
    
    const notesRef = collection(db, 'users', user.value.uid, 'notes')
    const q = query(notesRef, orderBy('updatedAt', 'desc'))
    
    notesUnsubscribe = onSnapshot(q, (snapshot) => {
        userNotes.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    }, (error) => {
        console.error("Error fetching notes:", error)
    })
}

const openNoteModal = (note = null) => {
    if (note) {
        currentNote.value = { ...note } // Clone to avoid direct mutation
    } else {
        currentNote.value = { id: null, title: '', content: '' }
    }
    isNoteModalOpen.value = true
}

const saveNote = async () => {
    if (!user.value || !currentNote.value.title.trim()) return
    isSavingNote.value = true
    
    try {
        const noteData = {
            title: currentNote.value.title,
            content: currentNote.value.content,
            updatedAt: serverTimestamp()
        }
        
        if (currentNote.value.id) {
            // Update existing
            await setDoc(doc(db, 'users', user.value.uid, 'notes', currentNote.value.id), noteData, { merge: true })
        } else {
            // Create new
            noteData.createdAt = serverTimestamp()
            await addDoc(collection(db, 'users', user.value.uid, 'notes'), noteData)
        }
        isNoteModalOpen.value = false
    } catch (e) {
        console.error("Error saving note:", e)
        alert("Failed to save note: " + e.message)
    } finally {
        isSavingNote.value = false
    }
}

const deleteNote = async (noteId) => {
    if (!confirm("Are you sure you want to delete this note?")) return
    try {
        await deleteDoc(doc(db, 'users', user.value.uid, 'notes', noteId))
    } catch (e) {
        console.error("Error deleting note:", e)
    }
}

// Watch user state to Init/Cleanup Notes listener
watch(user, (newUser) => {
    if (newUser) {
        fetchNotes()
    } else {
        if (notesUnsubscribe) notesUnsubscribe()
        userNotes.value = []
    }
})

const fetchFromCloud = async () => {
    if (!user.value || !db) return

    isSyncing.value = true
    try {
        const docSnap = await getDoc(doc(db, 'users', user.value.uid))
        if (docSnap.exists()) {
            const data = docSnap.data()
            if (data.courses) {
                // Merge cloud courses with local, preferring cloud progress
                const cloudCourses = data.courses
                courses.value = courses.value.map(localC => {
                    const cloudC = cloudCourses.find(cc => cc.id === localC.id)
                    return cloudC ? cloudC : localC
                })
                
                // Add any new courses from cloud
                cloudCourses.forEach(cloudC => {
                    if (!courses.value.find(c => c.id === cloudC.id)) {
                        courses.value.push(cloudC)
                    }
                })
            }
            if (data.studyHistory) studyHistory.value = data.studyHistory
            if (data.dailySchedule) dailySchedule.value = data.dailySchedule
            if (data.targetDate) targetDate.value = data.targetDate
            if (data.youtubeApiKey) {
                manualApiKey.value = data.youtubeApiKey
                localStorage.setItem('user_youtube_api_key', data.youtubeApiKey)
            }
        }
    } catch (e) {
        console.error('Fetch failed:', e)
    } finally {
        isSyncing.value = false
    }
}

// --- Daily Planner Logic ---
const addSlot = () => {
    if (!newSlotTime.value || !newSlotTask.value) return
    
    // Auto-detect if task matches a course name if no course selected
    let courseId = newSlotCourseId.value
    if (!courseId) {
        const match = courses.value.find(c => newSlotTask.value.toLowerCase().includes(c.name.toLowerCase()))
        if (match) courseId = match.id
    }

    dailySchedule.value.push({
        id: Date.now(),
        time: newSlotTime.value,
        task: newSlotTask.value,
        courseId: courseId,
        completed: false
    })
    newSlotTime.value = ''
    newSlotTask.value = ''
    newSlotCourseId.value = ''
    // Sort by time
    dailySchedule.value.sort((a,b) => a.time.localeCompare(b.time))
}

const removeSlot = (id) => {
    dailySchedule.value = dailySchedule.value.filter(s => s.id !== id)
}

const toggleSlot = (id) => {
    const slot = dailySchedule.value.find(s => s.id === id)
    if (slot) slot.completed = !slot.completed
}

// --- Syllabus Calculator Logic ---
const calculateDailyTarget = () => {
    if (!targetDate.value || courses.value.length === 0) {
        dailyTarget.value = 0
        return
    }

    const today = new Date()
    const target = new Date(targetDate.value)
    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
        dailyTarget.value = 0
        return
    }

    let remainingWork = 0
    
    if (targetMetric.value === 'videos') {
        const totalLectures = courses.value.reduce((acc, c) => acc + (c.lectures?.length || 0), 0)
        const completedLectures = courses.value.reduce((acc, c) => acc + getCompletedCount(c), 0)
        remainingWork = totalLectures - completedLectures
    } else {
        // Use durationSeconds if available, else fallback to 45 mins
        remainingWork = courses.value.reduce((acc, c) => {
            const unfinished = c.lectures ? c.lectures.filter(l => !l.completed) : []
            const seconds = unfinished.reduce((sum, l) => sum + (l.durationSeconds || 45 * 60), 0)
            return acc + (seconds / 3600)
        }, 0)
    }

    dailyTarget.value = parseFloat((remainingWork / diffDays).toFixed(1))
}

const setTargetGoal = () => {
    calculateDailyTarget()
    alert("Target updated! Focus on your daily " + targetMetric.value + " to stay on track.")
    syncToCloud()
}

const paceStatus = computed(() => {
    if (!targetDate.value || dailyTarget.value === 0) return { label: 'Set Goal', class: 'neutral' }
    const todayCount = studyHistory.value.find(h => h.date === new Date().toDateString())?.count || 0
    if (todayCount >= dailyTarget.value) return { label: 'On Track', class: 'track' }
    return { label: 'Behind', class: 'behind' }
})

const averageDailyPace = computed(() => {
    if (studyHistory.value.length === 0) return 0
    const last7Days = studyHistory.value.slice(-7)
    const total = last7Days.reduce((acc, h) => acc + h.count, 0)
    return parseFloat((total / Math.min(7, last7Days.length)).toFixed(1))
})

const estimatedCompletionDate = computed(() => {
    const pace = averageDailyPace.value
    if (pace <= 0) return 'Unknown (No study data)'
    
    let totalRemainingSeconds = 0
    courses.value.forEach(c => {
        const unfinished = c.lectures ? c.lectures.filter(l => !l.completed) : []
        totalRemainingSeconds += unfinished.reduce((sum, l) => sum + (l.durationSeconds || 45 * 60), 0)
    })
    
    let remainingWork = 0
    if (targetMetric.value === 'videos') {
        const totalLec = courses.value.reduce((acc, c) => acc + (c.lectures?.length || 0), 0)
        const compLec = courses.value.reduce((acc, c) => acc + getCompletedCount(c), 0)
        remainingWork = totalLec - compLec
    } else {
        remainingWork = totalRemainingSeconds / 3600
    }

    if (remainingWork <= 0) return 'Complete!'
    
    const daysNeeded = Math.ceil(remainingWork / pace)
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysNeeded)
    return completionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
})

const startCountdown = () => {
    if (countdownInterval.value) clearInterval(countdownInterval.value)
    countdownInterval.value = setInterval(() => {
        if (!targetDate.value) return
        const now = new Date().getTime()
        const target = new Date(targetDate.value).getTime()
        const diff = target - now
        
        if (diff <= 0) {
            timeToTarget.value = { days: 0, hours: 0, mins: 0, secs: 0 }
            return
        }
        
        timeToTarget.value = {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            secs: Math.floor((diff % (1000 * 60)) / 1000)
        }
    }, 1000)
}

// Watch for changes and sync to cloud
// Watch for changes and sync to cloud
watch([courses, studyHistory, importedCourses, dailySchedule, targetDate, targetMetric], () => {
  const data = {
    courses: courses.value,
    importedCourses: importedCourses.value,
    studyHistory: studyHistory.value,
    dailySchedule: dailySchedule.value,
    targetDate: targetDate.value,
    targetMetric: targetMetric.value, // Save metric preference
    lastUpdated: new Date().toISOString()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  
  if (user.value) {
      // Debounced cloud sync
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = setTimeout(syncToCloud, 3000)
  }
  
  calculateDailyTarget()
}, { deep: true })

// --- YouTube API Importer ---
// Helper extractPlaylistId moved to top

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
                const videoIds = itemsData.items.map(item => item.snippet.resourceId.videoId)
                
                // Fetch durations in batches
                const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${activeKey}`
                const videosRes = await fetch(videosUrl)
                const videosData = await videosRes.json()
                
                const batch = itemsData.items.map((item) => {
                    const videoInfo = videosData.items.find(v => v.id === item.snippet.resourceId.videoId)
                    const durationSec = videoInfo ? parseISO8601Duration(videoInfo.contentDetails.duration) : 0
                    return {
                        id: item.snippet.resourceId.videoId,
                        title: item.snippet.title,
                        duration: videoInfo ? formatDuration(durationSec) : 'Lecture',
                        durationSeconds: durationSec,
                        completed: false
                    }
                })
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

async function syncMissingDurations() {
    const activeKey = getApiKey()
    if (!activeKey || activeKey === 'undefined') return

    for (const course of courses.value) {
        let missingIds = course.lectures
            .filter(l => !l.durationSeconds)
            .map(l => l.id)
            
        if (missingIds.length === 0) continue

        console.log(`[Sync] Found ${missingIds.length} missing durations for ${course.name}`)
        
        // Fetch in batches of 50
        for (let i = 0; i < missingIds.length; i += 50) {
            const batch = missingIds.slice(i, i + 50)
            try {
                const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(',')}&key=${activeKey}`
                const videosRes = await fetch(videosUrl)
                const videosData = await videosRes.json()
                
                if (videosData.items) {
                    videosData.items.forEach(videoInfo => {
                        const lecture = course.lectures.find(l => l.id === videoInfo.id)
                        if (lecture) {
                            const durationSec = parseISO8601Duration(videoInfo.contentDetails.duration)
                            lecture.durationSeconds = durationSec
                            lecture.duration = formatDuration(durationSec)
                        }
                    })
                }
            } catch (err) {
                console.error('[Sync] Batch fetch failed:', err)
            }
        }
    }
    // Save back to local storage
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (data) {
        data.courses = courses.value
        data.importedCourses = courses.value
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
}

function removeCourse(courseId) {
    if (!confirm("Remove this course? Your progress will be lost.")) return
    importedCourses.value = importedCourses.value.filter(c => c.id !== courseId)
    courses.value = [...importedCourses.value]
}

// --- Logic ---
// Helpers moved to top

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
    for (let i = 69; i >= 0; i--) {
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
    if (count < 2) return 'rgba(255, 215, 0, 0.2)'
    if (count < 5) return 'rgba(255, 215, 0, 0.5)'
    return '#ffd700'
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
    // Dynamically extract unique categories
    const allCategories = new Set(courses.value.map(c => c.category || 'Uncategorized'))
    const subjects = Array.from(allCategories)

    // Palette for dynamic coloring
    const palette = ['#3e8fb0', '#d66a6a', '#a3be8c', '#b48ead', '#ebcb8b', '#88c0d0']

    return subjects.map((sub, index) => {
        const subCourses = courses.value.filter(c => c.category === sub)
        const total = subCourses.reduce((acc, c) => acc + (c.lectures?.length || 0), 0)
        const completed = subCourses.reduce((acc, c) => acc + getCompletedCount(c), 0)
        
        return {
            name: sub,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
            color: palette[index % palette.length]
        }
    })
})

const totalStudyTime = computed(() => {
    let totalSeconds = 0
    courses.value.forEach(course => {
        course.lectures.forEach(lecture => {
            if (lecture.completed) {
                totalSeconds += lecture.durationSeconds || (45 * 60) // Fallback to 45 mins
            }
        })
    })
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    return `${h}h ${m}m`
})

const timeRemaining = computed(() => {
    let remainingSeconds = 0
    courses.value.forEach(course => {
        course.lectures.forEach(lecture => {
            if (!lecture.completed) {
                remainingSeconds += lecture.durationSeconds || (45 * 60) // Fallback to 45 mins
            }
        })
    })
    const h = Math.floor(remainingSeconds / 3600)
    const m = Math.floor((remainingSeconds % 3600) / 60)
    return `${h}h ${m}m`
})

const closeCourse = () => {
    selectedCourse.value = null
    selectedLecture.value = null
}

const streak = computed(() => {
    return studyHistory.value.filter(h => h.count > 0).length
})

const quickTaskText = ref('')
const quickAdd = () => {
    if (!quickTaskText.value.trim()) return
    const now = new Date()
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    dailySchedule.value.push({
        id: Date.now(),
        time: timeStr,
        task: quickTaskText.value,
        completed: false
    })
    quickTaskText.value = ''
}

const scrollToCalculator = () => {
    const el = document.getElementById('syllabus-calculator')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
}

</script>

<template>
  <div class="elearn-layout">
    
    <!-- 1. Left Sidebar -->
    <aside class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
        <div class="logo">
            <div class="logo-icon">AI</div>
            <span>AI Notes Master</span>
            <button class="close-sidebar-btn" @click="isMobileMenuOpen = false">×</button>
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
            <div class="nav-item" :class="{ active: activeTab === 'planner' }" @click="activeTab = 'planner'">
                <span class="icon">📅</span> Planner
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
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ffd700" stroke-width="3" :style="{ strokeDasharray: `${courses.length > 0 ? getProgressPercent(courses[0]) : 0}, 100` }"/>
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
                <div class="avatar">
                    <img v-if="user && user.photoURL" :src="user.photoURL" alt="Profile" style="width: 100%; height: 100%; border-radius: 12px;">
                    <span v-else>{{ user ? user.displayName?.charAt(0) : 'RM' }}</span>
                </div>
                <div class="user-info">
                    <span class="name">{{ user ? user.displayName : 'Guest Mode' }}</span>
                    <span class="status">{{ user ? 'Cloud Sync Active' : 'Offline Mode' }}</span>
                </div>
            </div>
            <div v-if="user" class="sync-status-mini">
                <span :class="{ 'syncing': isSyncing }">☁️ {{ isSyncing ? 'Syncing...' : (lastSyncTime ? 'Last synced: ' + lastSyncTime : 'Synced') }}</span>
            </div>
        </div>
    </aside>

    <!-- 2. Main Content Area -->
    <main class="main-content" :class="{ 'detail-mode': selectedCourse, 'home-content': activeTab === 'home' }">
        <header class="top-header" :class="{ 'home-header': activeTab === 'home' }">
            <button class="mobile-menu-btn" @click="isMobileMenuOpen = !isMobileMenuOpen">
                ☰
            </button>
            <div class="greeting" v-if="activeTab !== 'home'">
                <h1 v-if="activeTab === 'courses'">My Syllabus</h1>
                <h1 v-else-if="activeTab === 'revision'">Revision Queue</h1>
                <h1 v-else>{{ activeTab.toUpperCase() }}</h1>
            </div>
            
            <div class="header-tools" v-if="activeTab !== 'home'">
                <div class="search-bar">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search topics..." v-model="searchQuery">
                </div>
                <div class="streak-badge">🔥 {{ streak }} Day Streak</div>
            </div>
        </header>

        <!-- HOME TAB -->
        <div v-if="activeTab === 'home'" class="tab-content home-tab">
            <div v-if="courses && courses.length > 0" class="home-filled-state">
                <div class="home-content-layout">
                    <div class="home-main-col">

                        <!-- Summary Stats Overview (Unified Block) -->
                        <div class="stats-overview">
                            <div class="overview-item">
                                <span class="ov-label">Total Lectures</span>
                                <span class="ov-value">{{ courses.reduce((acc, c) => acc + c.lectures.length, 0) }}</span>
                            </div>
                            <div class="overview-divider"></div>
                            <div class="overview-item">
                                <span class="ov-label">Study Time</span>
                                <span class="ov-value">{{ totalStudyTime }}</span>
                            </div>
                            <div class="overview-divider"></div>
                            <div class="overview-item">
                                <span class="ov-label">Time Remaining</span>
                                <span class="ov-value">{{ timeRemaining }}</span>
                            </div>
                            <div class="overview-divider"></div>
                            <div class="overview-item">
                                <span class="ov-label">Prep Level</span>
                                <span class="ov-value">{{ courses.length > 0 ? Math.round((courses.reduce((acc, c) => acc + getCompletedCount(c), 0) / Math.max(1, courses.reduce((acc, c) => acc + c.lectures.length, 0))) * 100) : 0 }}%</span>
                            </div>
                        </div>

                        <div class="analytics-grid">
                            <!-- Today's Focus (Enhanced with Progress) -->
                            <div class="analysis-card daily-focus">
                                <div class="focus-header">
                                    <h3>Today's Focus</h3>
                                    <div class="focus-progress-mini" v-if="dailySchedule.length > 0">
                                        <div class="f-progress-ring">
                                            <div class="f-progress-fill" :style="{ width: (dailySchedule.filter(s => s.completed).length / dailySchedule.length * 100) + '%' }"></div>
                                        </div>
                                        <span class="f-progress-text">{{ dailySchedule.filter(s => s.completed).length }}/{{ dailySchedule.length }}</span>
                                    </div>
                                </div>
                                <div class="focus-list">
                                    <div v-for="slot in dailySchedule.slice(0, 3)" :key="slot.id" class="focus-item" :class="{ done: slot.completed }">
                                        <div class="focus-check" @click="toggleSlot(slot.id)">{{ slot.completed ? '✅' : '⚪' }}</div>
                                        <div class="focus-text">
                                            <span class="f-time">{{ slot.time }}</span>
                                            <span class="f-task">{{ slot.task }}</span>
                                        </div>
                                        <button class="btn-mini-delete" @click.stop="removeSlot(slot.id)">🗑️</button>
                                    </div>
                                    <div class="quick-add-focus">
                                        <input v-model="quickTaskText" placeholder="Quick task..." @keyup.enter="quickAdd" class="quick-input">
                                        <button class="btn-mini-add" @click="quickAdd">+</button>
                                    </div>
                                    <p v-if="dailySchedule.length > 3" class="more-tasks" @click="activeTab = 'planner'">+ {{ dailySchedule.length - 3 }} more in Planner</p>
                                    <p v-if="dailySchedule.length === 0 && !quickTaskText" class="empty-focus">No tasks planned for today.</p>
                                </div>
                            </div>

                            <!-- Course Progress (Moved up to align with focus) -->
                            <div class="analysis-card course-progress-overview">
                                <h3>Course Progress</h3>
                                <div class="mastery-list">
                                    <div v-for="course in courses" :key="course.id" class="mastery-item" @click="openCourse(course)">
                                        <div class="m-info">
                                            <span>{{ course.icon }} {{ course.name }}</span>
                                            <span>{{ getProgressPercent(course) }}%</span>
                                        </div>
                                        <div class="m-bar-bg">
                                            <div class="m-bar-fill" :style="{ width: getProgressPercent(course) + '%', background: course.color }"></div>
                                        </div>
                                    </div>
                                    <div v-if="courses.length === 0" class="empty-state-mini">
                                        No courses imported yet.
                                    </div>
                                </div>
                            </div>




                            <!-- Syllabus Calculator (Moved to Main Grid - Phase 31) -->
                            <div class="analysis-card syllabus-calc-home compact" id="syllabus-calculator">
                                <h3>🎯 Set Target Goal</h3>
                                
                                <div class="input-group-home small">
                                    <label>Target Date</label>
                                    <input type="date" v-model="targetDate" class="mini-target-input-home">
                                </div>

                                <div v-if="targetDate" class="target-summary-home">
                                    <div class="metric-toggle-wrapper">
                                        <div class="metric-toggle small">
                                        <button :class="{ active: targetMetric === 'videos' }" @click="targetMetric = 'videos'">VID</button>
                                        <button :class="{ active: targetMetric === 'hours' }" @click="targetMetric = 'hours'">HRS</button>
                                    </div>
                                    </div>
                                    <div class="target-stat">
                                        <div class="t-input-wrap">
                                            <input type="number" v-model.number="dailyTarget" class="mini-target-input small">
                                            <span class="t-unit small">{{ targetMetric === 'videos' ? 'Vids' : 'Hrs' }}/D</span>
                                    </div>
                                </div>
                                <button class="btn-primary w-full btn-sm" @click="setTargetGoal" style="background: #ffd700 !important; color: #000 !important;">Save Target</button>
                            </div>
                        </div>

                            <!-- Syllabus Contributions (Moved to Grid Row 2 - Phase 32) -->
                            <div class="analysis-card contribution-card compact-grid">
                                <div class="card-header-dev">
                                    <div class="dev-title">
                                        <span class="dev-icon gold">󰊭</span>
                                        <h3>Consistency</h3>
                                    </div>
                                    <span class="streak-mini">🔥 {{ streak }} Day Streak</span>
                                </div>
                                <div class="github-heatmap-mini compact">
                                    <div v-for="day in heatmapDays" :key="day.date" class="heat-square" 
                                         :style="{ background: getHeatColor(day.count) }"
                                         :title="`${day.date}: ${day.count} lectures`"></div>
                                </div>
                                <div class="dev-footer compact">
                                    <div class="heatmap-legend">
                                        <span>Less</span>
                                        <div class="heat-square level-0"></div>
                                        <div class="heat-square level-2"></div>
                                        <div class="heat-square level-3"></div>
                                        <span>More</span>
                                    </div>
                                    <span class="trend-up">{{ courses.reduce((acc, c) => acc + getCompletedCount(c), 0) }} Lectures</span>
                            </div>
                        </div>

                        </div>
                    </div>

                    <!-- Right Column: Planning & Goals (Restored & Scrollable) -->
                    <div class="home-side-col">
                        <!-- Goal Countdown -->
                        <div v-if="targetDate" class="analysis-card compact countdown-card sidebar-top">
                            <h3>Goal Countdown</h3>
                            <div class="countdown-ticker">
                                <div class="t-unit">
                                    <span class="t-val">{{ timeToTarget.days }}</span>
                                    <span class="t-lab">D</span>
                                </div>
                                <div class="t-sep">:</div>
                                <div class="t-unit">
                                    <span class="t-val">{{ String(timeToTarget.hours).padStart(2, '0') }}</span>
                                    <span class="t-lab">H</span>
                                </div>
                                <div class="t-sep">:</div>
                                <div class="t-unit">
                                    <span class="t-val">{{ String(timeToTarget.mins).padStart(2, '0') }}</span>
                                    <span class="t-lab">M</span>
                                </div>
                                <div class="t-sep">:</div>
                                <div class="t-unit">
                                    <span class="t-val">{{ String(timeToTarget.secs).padStart(2, '0') }}</span>
                                    <span class="t-lab">S</span>
                                </div>
                            </div>
                            <p class="t-hint">Target: {{ new Date(targetDate).toLocaleDateString() }}</p>
                        </div>

                        <!-- Efficiency & Pace -->
                        <div class="analysis-card efficiency-pace">
                            <h3>Efficiency & Pace</h3>
                            <div class="pace-status">
                                <span class="p-icon" :class="paceStatus.class">{{ paceStatus.icon }}</span>
                                {{ paceStatus.label }}
                            </div>
                            <div class="pace-stats">
                                <div class="p-stat">
                                    <span class="p-label">Avg Pace</span>
                                    <span class="p-value">{{ averageDailyPace }} <small>{{ targetMetric === 'videos' ? 'V' : 'H' }}</small></span>
                                </div>
                                <div class="p-stat">
                                    <span class="p-label">Est. End</span>
                                    <span class="p-value highlight">{{ estimatedCompletionDate }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Weekly Trend -->
                        <div class="analysis-card weekly-trend">
                            <h3>Weekly Trend</h3>
                            <div class="bar-chart small-sidebar">
                                <div v-for="day in weeklyTrend" :key="day.date" class="bar-wrapper">
                                    <div class="bar-fill" :style="{ height: Math.min(100, (day.count / 10) * 100) + '%' }" :title="`${day.count} lectures`"></div>
                                    <span class="day-label">{{ day.dayName.charAt(0) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="hero-card empty" @click="activeTab = 'courses'">
                <div class="hero-text">
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


            <!-- (Modal moved to end of template for performance) -->

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
                        <div class="lecture-check" @click.stop="toggleLecture(selectedCourse.id, lecture.id)">
                            <div class="status-icon">{{ lecture.completed ? '✅' : '⬜' }}</div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- AI NOTES TAB -->
        <!-- AI NOTES TAB -->
        <div v-if="activeTab === 'notes'" class="tab-content notes-tab">
            <div class="notes-header-row">
                <div class="notes-toggle">
                    <button :class="{ active: activeNoteTab === 'public' }" @click="activeNoteTab = 'public'">Public Notes</button>
                    <button :class="{ active: activeNoteTab === 'private' }" @click="activeNoteTab = 'private'">My Notebook</button>
                </div>
                <button v-if="activeNoteTab === 'private'" class="btn-primary btn-sm" @click="openNoteModal()">+ New Note</button>
            </div>

            <!-- Public Notes -->
            <div v-if="activeNoteTab === 'public'" class="notes-grid">
                <a v-for="note in siteNotes" :key="note.link" :href="'/ai-notes-master' + note.link" class="note-card-glass">
                    <div class="note-meta">
                        <span class="category">{{ note.category }}</span>
                        <h3>{{ note.title }}</h3>
                    </div>
                    <span class="arrow">↗</span>
                </a>
            </div>

            <!-- Private Notes -->
            <div v-if="activeNoteTab === 'private'" class="private-notes-grid">
                <div v-for="note in userNotes" :key="note.id" class="note-card-private" @click="openNoteModal(note)">
                    <div class="note-content-preview">
                        <h3>{{ note.title }}</h3>
                        <p>{{ note.content.slice(0, 100) }}...</p>
                    </div>
                    <div class="note-actions">
                         <span class="note-date">{{ note.updatedAt ? new Date(note.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now' }}</span>
                        <button class="btn-icon-delete" @click.stop="deleteNote(note.id)">🗑️</button>
                    </div>
                </div>
                <div v-if="userNotes.length === 0" class="empty-state">
                    <span class="icon">📝</span>
                    <h3>Your notebook is empty.</h3>
                    <p>Create your first private note to track your thoughts.</p>
                </div>
            </div>
        </div>

        <!-- REVISION TAB -->
        <div v-if="activeTab === 'revision'" class="tab-content">
            <div class="revision-header">
                <h2>Topics for Review</h2>
            </div>
            <div class="revision-grid">
                <div v-for="course in courses.filter(c => getProgressPercent(c) > 0)" :key="course.id" class="revision-card">
                    <div class="rev-info">
                        <h3>{{ course.name }}</h3>
                        <p>{{ getProgressPercent(course) }}% Complete</p>
                    </div>
                    <button class="btn-primary" @click="openCourse(course)">Continue</button>
                </div>
            </div>
            <div v-if="courses.filter(c => getProgressPercent(c) > 0).length === 0" class="empty-state">
                <span class="icon">🔄</span>
                <h3>No topics scheduled for revision today.</h3>
                <p>Topics you complete will appear here based on your study history.</p>
            </div>
        </div>

        <!-- PLANNER TAB -->
        <div v-if="activeTab === 'planner'" class="tab-content">
            <div class="planner-grid">
                <div class="planner-main">
                    <div class="planner-header">
                        <h2>Daily Study Planner</h2>
                        <p>Optimize your day for maximum learning.</p>
                    </div>

                    <div class="add-slot-box">
                        <div class="slot-inputs">
                            <input type="time" v-model="newSlotTime" class="slot-time-input">
                            <input type="text" v-model="newSlotTask" placeholder="Study Task" class="slot-task-input">
                            <select v-model="newSlotCourseId" class="slot-course-select" v-if="courses.length > 0">
                                <option value="">Select Course (Optional)</option>
                                <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.name }}</option>
                            </select>
                        </div>
                        <button class="btn-primary" @click="addSlot">Add Task</button>
                    </div>

                    <div class="schedule-list">
                        <div v-for="slot in dailySchedule" :key="slot.id" class="schedule-item" :class="{ completed: slot.completed }">
                            <div class="s-time">{{ slot.time }}</div>
                            <div class="s-task">{{ slot.task }}</div>
                            <div class="s-actions">
                                <button class="btn-check" @click="toggleSlot(slot.id)">{{ slot.completed ? 'Undo' : 'Done' }}</button>
                                <button class="btn-delete" @click="removeSlot(slot.id)">🗑️</button>
                            </div>
                        </div>
                        <div v-if="dailySchedule.length === 0" class="empty-planner">
                            <p>Your schedule is empty. Start planning your day!</p>
                        </div>
                    </div>
                </div>

                <div class="planner-sidebar">
                    <div v-if="targetDate" class="utilization-card">
                        <h3>Utilization Boost</h3>
                        <div class="util-val">{{ dailyTarget }}</div>
                        <span class="util-lab">{{ targetMetric === 'videos' ? 'Videos' : 'Hours' }} Targeted Today</span>
                        <div class="util-progress">
                            <div class="util-fill" :style="{ width: dailyTarget > 0 ? Math.min(100, (studyHistory.find(h => h.date === new Date().toDateString())?.count || 0) / dailyTarget * 100) + '%' : '0%' }"></div>
                        </div>
                        <p class="util-status">You've completed {{ studyHistory.find(h => h.date === new Date().toDateString())?.count || 0 }} today.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- SETTINGS TAB -->
        <div v-if="activeTab === 'settings'" class="tab-content">
            <div class="settings-grid">
                <!-- Cloud Sync Card -->
                <div class="settings-card">
                    <h3>☁️ Cloud Synchronization</h3>
                    <p class="settings-desc">Sync your courses, progress, and daily planner across all your devices.</p>
                    
                    <div v-if="!user" class="auth-box">
                        <p>Sign in to enable cross-device sync and backup.</p>
                        <button class="btn-primary" @click="signInWithGoogle">Sign in with Google</button>
                    </div>
                    <div v-else class="auth-box logged-in">
                        <div class="user-badge">
                            <img :src="user.photoURL" class="badge-avatar">
                            <div class="badge-info">
                                <strong>{{ user.displayName }}</strong>
                                <span>{{ user.email }}</span>
                            </div>
                        </div>
                        <div class="sync-actions">
                            <button class="btn-secondary" @click="syncToCloud" :disabled="isSyncing">Manual Sync</button>
                            <button class="btn-danger" @click="signOut">Sign Out</button>
                        </div>
                        <p class="sync-tip">Auto-sync is enabled. Changes are saved every 3s.</p>
                    </div>
                </div>

                <!-- API Key Card -->
                <div class="settings-card">
                    <h3>⚙️ API Configuration</h3>
                    <p class="settings-desc">If the automatic environment variable fails, you can manually enter your API Keys here.</p>
                    
                    <div class="input-group">
                        <label>YouTube Data API v3 Key</label>
                        <div class="api-input-wrapper">
                            <input type="password" v-model="manualApiKey" placeholder="AIza..." class="settings-input">
                            <button class="btn-primary btn-save" @click="saveApiKey">Save</button>
                        </div>
                    </div>

                    <div class="current-status">
                        <span>YT Status: </span>
                        <span :class="hasValidKey ? 'status-ok' : 'status-err'">
                            {{ hasValidKey ? '✅ Ready' : '❌ Missing' }}
                        </span>
                    </div>
                </div>

                <!-- Syllabus Calculator Moved to Home -->
            </div>
        </div>

    </main>

    <!-- Global Modals -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
        <div class="modal-content">
            <h3>Import YouTube Playlist</h3>
            <p>Enter a Playlist ID to automatically fetch all lectures.</p>
            <input v-model="newPlaylistId" placeholder="e.g. PLAeePiDQTajfiMhm7..." class="modal-input" @keyup.enter="importPlaylist">
            
            <div v-if="importError" class="modal-error">{{ importError }}</div>
            
            <div class="modal-actions">
                <button @click="showImportModal = false" class="btn-secondary modal-cancel" :disabled="isImporting">Cancel</button>
                <button @click="importPlaylist" :disabled="isImporting || !newPlaylistId" class="btn-primary modal-submit">
                    <span v-if="isImporting" class="spinner"></span>
                    {{ isImporting ? 'Importing...' : 'Start Import' }}
                </button>
            </div>
        </div>
    </div>

        <!-- Note Editor Modal -->
        <div v-if="isNoteModalOpen" class="modal-overlay" @click.self="isNoteModalOpen = false">
            <div class="modal-content note-modal">
                <div class="modal-header">
                    <h3>{{ currentNote.id ? 'Edit Note' : 'New Note' }}</h3>
                    <button class="close-btn" @click="isNoteModalOpen = false">×</button>
                </div>
                <div class="modal-body">
                    <input v-model="currentNote.title" placeholder="Note Title" class="note-title-input" />
                    <textarea v-model="currentNote.content" placeholder="Write your notes here using Markdown..." class="note-content-input"></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-text" @click="isNoteModalOpen = false">Cancel</button>
                    <button class="btn-primary" @click="saveNote" :disabled="isSavingNote">
                        {{ isSavingNote ? 'Saving...' : 'Save Note' }}
                    </button>
                </div>
            </div>
        </div>

  </div>
</template>

<style>
/* Reset and Font Import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.elearn-layout * { box-sizing: border-box; }

.elearn-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
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
.elearn-layout .logo-icon { width: 32px; height: 32px; background: #ffd700; color: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; }

.elearn-layout .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 15px; margin-bottom: 5px;
    border-radius: 10px; color: #888; cursor: pointer; transition: 0.2s;
}
.elearn-layout .nav-item:hover, .elearn-layout .nav-item.active { background: rgba(255,215,0,0.1); color: #ffd700; }
.elearn-layout .nav-item.active { font-weight: 600; }

.elearn-layout .pomodoro-widget {
    margin-top: 30px; background: #0a0a0e; padding: 20px; border-radius: 15px; text-align: center;
    border: 1px solid rgba(255,255,255,0.03);
}
.elearn-layout .pomodoro-widget h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 10px; }
.elearn-layout .timer-display { font-size: 1.8rem; font-weight: 700; margin-bottom: 15px; font-variant-numeric: tabular-nums; }
.elearn-layout .timer-controls { display: flex; justify-content: center; gap: 10px; }
.elearn-layout .timer-controls button { width: 35px; height: 35px; background: #1a1a23; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: 0.2s; }
.elearn-layout .timer-controls button:hover { background: #ffd700; color: #000; }

.elearn-layout .consistency-widget-sidebar {
    background: transparent; padding: 20px 0; border-radius: 0; text-align: center;
    border: none; margin-top: 10px;
}
.elearn-layout .consistency-label { font-size: 0.7rem; color: #444; margin-top: 10px; line-height: 1.2; }

.elearn-layout .sidebar-footer { margin-top: auto; }
.elearn-layout .user-profile { display: flex; align-items: center; gap: 12px; padding: 15px; background: #0a0a0e; border-radius: 15px; border: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .avatar { width: 40px; height: 40px; background: #d66a6a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.elearn-layout .user-info .name { display: block; font-weight: 600; font-size: 0.9rem; }
.elearn-layout .user-info .status { font-size: 0.75rem; color: #666; }

/* Main Content */
/* Main Content - Ensure Scrollable */
.elearn-layout .main-content { 
    padding: 30px; 
    overflow-y: auto; 
    background: #000000;
    height: 100vh; /* Allow full height */
    box-sizing: border-box;
    display: flex; flex-direction: column;
}

.elearn-layout .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; min-height: 40px; flex-shrink: 0; }
.elearn-layout .top-header.home-header { display: none; }
/* On mobile, we still need the header for the hamburger menu */
@media (max-width: 768px) {
    .elearn-layout .top-header.home-header { height: 60px; visibility: visible; margin-bottom: 20px; }
}
.elearn-layout .greeting h1 { font-size: 1.8rem; margin-bottom: 5px; }
.elearn-layout .header-tools { display: flex; gap: 20px; align-items: center; }
.elearn-layout .streak-badge { background: #0a0a0e; padding: 10px 20px; border-radius: 12px; font-weight: 600; color: #d66a6a; border: 1px solid rgba(255,255,255,0.03); }

/* Main Dashboard Layout (Restored Grid + Scrollable Page) */
.elearn-layout .home-content-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 30px;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
}
/* Revert to single column on small screens */
@media (max-width: 1200px) {
    .elearn-layout .home-content-layout {
        grid-template-columns: 1fr;
    }
}
/* Sidebar Chart Adjustment (Reset) */
.elearn-layout .bar-chart.small-sidebar {
    height: 100px; /* Reduced specific height or allow auto */
    gap: 4px;
}

.elearn-layout .analytics-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
}
/*.elearn-layout .efficiency-pace { grid-column: 1 / -1; } Remove full width constraint */
/*.elearn-layout .weekly-trend { grid-column: 1 / -1; } Remove full width constraint */
.elearn-layout .syllabus-calc-home { height: 100%; display: flex; flex-direction: column; justify-content: center; }
.elearn-layout .countdown-card { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.elearn-layout .countdown-ticker { margin-top: 10px; }

/* Summary Stats Overview (Unified Block) */
.elearn-layout .stats-overview {
    display: grid; grid-template-columns: 1fr 1fr; gap: 15px;
    background: linear-gradient(135deg, #0a0a0f 0%, #1a1a00 100%); /* Gold tint */
    padding: 15px; border-radius: 16px; margin-bottom: 20px;
    border: 1px solid rgba(255,255,255,0.03);
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.elearn-layout .overview-item { 
    display: flex; flex-direction: row; justify-content: space-between; align-items: center; 
    background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 10px;
}
.elearn-layout .ov-label { font-size: 0.75rem; color: #888; }
.elearn-layout .ov-value { font-size: 1.1rem; font-weight: 700; color: #ffd700; }
.elearn-layout .overview-divider { display: none; }

/* Today's Focus Enhancement */
.elearn-layout .daily-focus { display: flex; flex-direction: column; }
.elearn-layout .focus-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.elearn-layout .focus-header h3 { margin-bottom: 0 !important; } /* override analysis-card h3 margin */
.elearn-layout .focus-progress-mini { display: flex; align-items: center; gap: 10px; }
.elearn-layout .f-progress-ring { width: 60px; height: 8px; background: #000; border-radius: 4px; overflow: hidden; position: relative; }
.elearn-layout .f-progress-fill { height: 100%; background: linear-gradient(to right, #ffd700, #fdb931); transition: width 0.5s ease; }
.elearn-layout .f-progress-text { font-size: 0.8rem; font-weight: 600; color: #888; }

.elearn-layout .quick-add-focus { display: flex; gap: 8px; margin-top: 10px; padding: 5px 0; border-top: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .quick-input { 
    background: #000; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; 
    padding: 6px 12px; font-size: 0.8rem; color: #ccc; flex: 1; outline: none;
}
.elearn-layout .quick-input:focus { border-color: #ffd700; }
.elearn-layout .btn-mini-add { 
    width: 28px; height: 28px; background: #ffd700; color: #000; border-radius: 6px; 
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700;
}
.elearn-layout .btn-mini-delete {
    background: transparent; border: none; cursor: pointer; font-size: 0.9rem; opacity: 0.5; transition: 0.2s; padding: 0 5px;
}
.elearn-layout .btn-mini-delete:hover { opacity: 1; transform: scale(1.1); }

.elearn-layout .analysis-card { 
    background: #050505; padding: 15px; border-radius: 16px; 
    border: 1px solid rgba(255, 215, 0, 0.2); /* Golden border */
    box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 15px rgba(255, 215, 0, 0.05); /* Golden glow */
    margin-bottom: 0; /* Let grid gap handle spacing */
    height: 100%; /* Fill grid cell */
}
.elearn-layout .home-side-col .analysis-card { height: auto; margin-bottom: 10px; }

/* Single Column Layout Improvements */
.elearn-layout .countdown-card.full-width {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    padding: 15px 30px;
    margin-bottom: 20px;
}
.elearn-layout .countdown-card.full-width h3 { margin-bottom: 0; }
.elearn-layout .countdown-card.full-width .t-hint { margin-top: 0; font-size: 0.9rem; opacity: 0.7; }
.elearn-layout .countdown-ticker { margin-top: 0; display: flex; gap: 15px; }

.elearn-layout .analysis-card h3 { font-size: 0.85rem; color: #888; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }

/* Syllabus Contributions Styling Refined */
.elearn-layout .contribution-card.main-width { margin-top: 20px; margin-bottom: 0px; }

.elearn-layout .dev-icon.gold { color: #ffd700; }
.elearn-layout .heat-square.level-1 { background: #3c3400; }
.elearn-layout .heat-square.level-2 { background: #7d6b00; }
.elearn-layout .heat-square.level-3 { background: #ffd700; }

/* Dev Analytics Styling (Phase 27) */
.elearn-layout .card-header-dev { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; }
.elearn-layout .dev-title { display: flex; align-items: center; gap: 10px; }
.elearn-layout .dev-title h3 { margin-bottom: 0 !important; }
.elearn-layout .dev-icon { font-size: 1.4rem; }
.elearn-layout .dev-icon.github { color: #2ea043; }
.elearn-layout .dev-icon.leetcode { color: #ffa116; }
.elearn-layout .dev-val { font-weight: 700; font-size: 1.1rem; color: #fff; }
.elearn-layout .dev-stats-mini { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.elearn-layout .streak-mini { font-size: 0.8rem; color: #ffa116; font-weight: 600; }

.elearn-layout .github-heatmap-mini { display: grid; grid-template-columns: repeat(28, 1fr); gap: 4px; margin-bottom: 15px; }
.elearn-layout .heat-square { aspect-ratio: 1; border-radius: 2px; background: #161b22; }
.elearn-layout .analysis-card.full-width { grid-column: 1 / -1; }
.elearn-layout .heatmap-legend { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; color: #666; }
.elearn-layout .heatmap-legend .heat-square { width: 10px; height: 10px; }


.elearn-layout .leetcode-bar-stack { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: #1a1a1a; margin-bottom: 12px; }
.elearn-layout .l-bar.easy { background: #00b8a3; }
.elearn-layout .l-bar.med { background: #ffc01e; }
.elearn-layout .l-bar.hard { background: #ff375f; }
.elearn-layout .leetcode-legend { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; font-weight: 600; }
.elearn-layout .l-item.easy { color: #00b8a3; }
.elearn-layout .l-item.med { color: #ffc01e; }
.elearn-layout .l-item.hard { color: #ff375f; }

.elearn-layout .dev-footer { display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; }
.elearn-layout .trend-up { color: #2ea043; }

.elearn-layout .main-content.home-content { padding-top: 40px; }
.elearn-layout .home-tab { padding-top: 0; margin-top: 0; }

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
    background: rgba(0,0,0,0.85); /* Darker opacity instead of blur for performance */
    display: flex; align-items: center; justify-content: center; z-index: 10000;
}

/* Loading Spinner */
.spinner {
    width: 24px; height: 24px;
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 10px;
    display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.elearn-layout .modal-content {
    background: #050505; padding: 40px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05);
    width: 450px; text-align: center;
}
.elearn-layout .modal-input {
    width: 100%; padding: 15px; background: #0a0a0e; border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px; color: white; margin: 20px 0; font-size: 1rem;
}
.elearn-layout .modal-error { color: #d66a6a; font-size: 0.85rem; margin-bottom: 15px; }

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

.elearn-layout .lecture-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 600px;
    overflow-y: auto;
    padding-right: 10px; /* Space for scrollbar */
}

/* Custom Scrollbar for Video List */
.elearn-layout .lecture-list::-webkit-scrollbar {
    width: 6px;
}
.elearn-layout .lecture-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
}
.elearn-layout .lecture-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}
.elearn-layout .lecture-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

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
.elearn-layout .circle-text .val { font-size: 2rem; font-weight: 800; color: #ffd700; }
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
/* Settings Grid */
.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 30px;
}

.auth-box {
    background: rgba(255,255,255,0.03);
    padding: 20px;
    border-radius: 15px;
    margin-top: 20px;
    text-align: center;
}

.auth-box.logged-in {
    text-align: left;
}

.user-badge {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.badge-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #3e8fb0;
}

.badge-info {
    display: flex;
    flex-direction: column;
}

.badge-info strong {
    font-size: 1.1rem;
    color: #fff;
}

.badge-info span {
    font-size: 0.85rem;
    color: #888;
}

.sync-actions {
    display: flex;
    gap: 15px; /* Increased gap */
    align-items: center; /* Ensure vertical alignment */
    margin-bottom: 20px;
    flex-wrap: wrap; /* Allow wrapping on very small screens */
}

/* Base button styles for sync area */
.btn-secondary {
    background: rgba(62,143,176,0.1);
    color: #3e8fb0;
    border: 1px solid rgba(62,143,176,0.2);
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    height: 42px; /* Fixed height for consistency */
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-secondary:hover:not(:disabled) {
    background: rgba(62,143,176,0.2);
}

.btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-danger {
    background: rgba(214,106,106,0.1);
    color: #d66a6a;
    border: 1px solid rgba(214,106,106,0.2);
    padding: 10px 25px; /* Increased padding */
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    min-width: 120px; /* Ensure enough space */
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-danger:hover {
    background: rgba(214,106,106,0.2);
    border-color: #d66a6a;
}

.search-bar {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    padding: 0 15px;
    border: 1px solid rgba(255,255,255,0.05);
}
.search-icon {
    font-size: 1rem;
    margin-right: 10px;
    display: flex;
    align-items: center;
    color: #3e8fb0;
}

/* Home Refinements */
.pace-empty {
    text-align: center;
    padding: 10px 0;
}
.pace-empty p {
    font-size: 0.9rem;
    color: #444;
    margin-bottom: 10px;
}
.btn-mini-inline {
    background: rgba(62,143,176,0.1);
    color: #3e8fb0;
    border: 1px solid rgba(62,143,176,0.2);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
}

.input-group-home {
    margin-bottom: 20px;
}
.input-group-home label {
    display: block;
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
}
.mini-target-input-home {
    width: 100%;
    background: #0a0a0c !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    color: #fff !important;
    padding: 12px !important;
    border-radius: 12px !important;
}

.target-summary-home {
    background: rgba(255,255,255,0.02);
    padding: 15px;
    border-radius: 15px;
    margin-top: 15px;
}

.empty-state-mini {
    text-align: center;
    color: #444;
    font-size: 0.9rem;
    padding: 20px 0;
}

.course-progress-overview .mastery-item {
    cursor: pointer;
    transition: transform 0.2s;
}
.course-progress-overview .mastery-item:hover {
    transform: translateX(5px);
}

/* Home Layout Optimization */
.home-content-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
    align-items: start;
}

.home-side-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.analysis-card.compact {
    padding: 20px;
}

.analysis-card.compact h3 {
    font-size: 0.8rem;
    margin-bottom: 15px;
}

.pace-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pace-main {
    display: flex;
    align-items: baseline;
    gap: 5px;
}

.pace-val {
    font-size: 1.8rem;
    font-weight: 800;
    color: #3e8fb0;
}

.pace-lab {
    font-size: 0.8rem;
    color: #666;
}

/* Small UI Elements */
.small { font-size: 0.75rem !important; }
.btn-sm { padding: 8px 15px !important; font-size: 0.8rem !important; }
.pace-desc.small { margin-top: 10px; color: #444; }

.target-summary-home {
    padding: 12px;
    margin-top: 10px;
}

.metric-toggle.small button {
    padding: 4px 10px;
    font-size: 0.7rem;
}

.mini-target-input.small {
    width: 50px;
    font-size: 0.9rem;
    padding: 3px 6px !important;
}

.sidebar-hero {
    margin: 0;
    min-height: auto;
    padding: 20px;
}

.sidebar-hero h2 {
    font-size: 1rem;
    margin: 10px 0;
}

@media (max-width: 1100px) {
    .home-content-layout {
        grid-template-columns: 1fr;
    }
    .home-side-col {
        order: -1;
    }
}

.modal-actions {
    display: flex !important;
    gap: 15px !important;
    justify-content: center !important;
    align-items: center !important;
    margin-top: 30px !important;
    flex-direction: row !important;
}
.modal-cancel, .modal-submit {
    height: 44px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 25px !important;
    margin: 0 !important;
}
.modal-cancel {
    background: rgba(255,255,255,0.05) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #888 !important;
    flex: 1;
    min-width: 120px;
}
.modal-submit {
    flex: 1;
    min-width: 120px;
}

.metric-toggle-wrapper {
    overflow-x: auto;
    padding-bottom: 5px;
    margin-bottom: 20px;
    width: 100%;
    -webkit-overflow-scrolling: touch;
}
.metric-toggle {
    display: flex;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    padding: 4px;
    width: max-content;
    min-width: 100%;
}
.metric-toggle button {
    flex: 1;
    white-space: nowrap;
}

.t-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
}
.mini-target-input {
    width: 60px;
    background: rgba(255,255,255,0.08) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #ffd700 !important;
    border-radius: 8px !important;
    padding: 4px 8px !important;
    text-align: center;
    font-weight: 700;
    font-size: 1rem;
}
.w-full { width: 100%; }

.sync-tip {
    font-size: 0.8rem;
    color: #555;
    font-style: italic;
}

.sync-status-mini {
    margin-top: 15px;
    font-size: 0.75rem;
    color: #666;
    padding-left: 10px;
}

.syncing {
    color: #ffd700;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

/* Pace Widget */
.pace-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 15px 0;
}

.pace-main {
    display: flex;
    flex-direction: column;
}

.pace-val {
    font-size: 2.5rem;
    font-weight: 800;
    color: #ffd700;
}

.pace-lab {
    font-size: 0.8rem;
    color: #888;
}

.pace-status-badge {
    padding: 8px 15px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
}

.pace-desc {
    font-size: 0.8rem;
    color: #555;
}

/* Daily Focus */
.focus-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 15px;
}

.focus-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: rgba(255,255,255,0.02);
    border-radius: 12px;
    transition: all 0.2s;
}

.focus-item.done {
    opacity: 0.5;
}

.focus-check {
    cursor: pointer;
    font-size: 1.2rem;
}

.focus-text {
    display: flex;
    flex-direction: column;
}

.f-time {
    font-size: 0.7rem;
    color: #888;
}

.f-task {
    font-size: 0.9rem;
    font-weight: 500;
}

.more-tasks {
    font-size: 0.8rem;
    color: #ffd700;
    cursor: pointer;
    text-align: center;
    margin-top: 5px;
}

/* Planner Tab */
.planner-grid {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 40px;
}

.add-slot-box {
    display: flex;
    flex-direction: column;
    gap: 15px;
    background: rgba(255,255,255,0.03);
    padding: 25px;
    border-radius: 20px;
    margin-bottom: 30px;
}

.slot-inputs {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.slot-time-input {
    background: #111;
    border: 1px solid #222;
    color: #fff;
    padding: 12px;
    border-radius: 10px;
    outline: none;
}

.slot-task-input {
    flex: 1;
    background: #111;
    border: 1px solid #222;
    color: #fff;
    padding: 12px;
    border-radius: 10px;
    outline: none;
}

.schedule-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.schedule-item {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: rgba(255,255,255,0.02);
    border-radius: 15px;
    border: 1px solid rgba(255,255,255,0.03);
}

.schedule-item.completed {
    background: rgba(255,215,0,0.05);
    border-color: rgba(255,215,0,0.1);
}

.s-time {
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffd700;
    width: 60px;
}

.s-task {
    flex: 1;
    font-size: 1.05rem;
}

.schedule-item.completed .s-task {
    text-decoration: line-through;
    color: #888;
}

.s-actions {
    display: flex;
    gap: 10px;
}

.btn-check {
    background: rgba(255,215,0,0.1);
    color: #ffd700;
    border: none;
    padding: 8px 15px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.85rem;
}

.btn-delete {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
}

.utilization-card {
    background: linear-gradient(135deg, #111 0%, #050505 100%);
    padding: 30px;
    border-radius: 25px;
    border: 1px solid rgba(255,255,255,0.05);
    text-align: center;
}

.util-val {
    font-size: 4rem;
    font-weight: 800;
    color: #ffd700;
    line-height: 1;
}

.util-lab {
    font-size: 0.9rem;
    color: #888;
    display: block;
    margin-bottom: 20px;
}

.util-progress {
    height: 8px;
    background: #222;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 15px;
}

.util-fill {
    height: 100%;
    background: #ffd700;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.util-status {
    font-size: 0.85rem;
    color: #666;
}

.target-summary {
    margin-top: 20px;
    padding: 15px;
    background: rgba(255,215,0,0.05);
    border-radius: 12px;
}

.target-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.t-lab { font-size: 0.9rem; color: #888; }
.t-val { font-size: 1rem; font-weight: 600; color: #ffd700; }

.btn-mini-delete {
    background: rgba(214,106,106,0.1);
    color: #d66a6a;
    border: none;
    padding: 8px 15px;
    border-radius: 10px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-mini-delete:hover {
    background: #d66a6a;
    color: #fff;
}

.slot-course-select {
    background: #111;
    border: 1px solid #222;
    color: #fff;
    padding: 12px;
    border-radius: 10px;
    outline: none;
    max-width: 200px;
}

.metric-toggle {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    background: #0a0a0e;
    padding: 5px;
    border-radius: 10px;
    justify-content: center;
}

.metric-toggle button {
    flex: 1;
    padding: 8px;
    background: transparent;
    border: none;
    color: #666;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
}

.metric-toggle button.active {
    background: #ffd700;
    color: #000;
}

/* --- Mobile Optimization --- */
@media (max-width: 1024px) {
    .elearn-layout {
        grid-template-columns: 80px 1fr 0px; /* Hide right panel on tablet, compact sidebar */
    }
    .elearn-layout .sidebar {
        padding: 20px 10px;
    }
    .elearn-layout .logo span, 
    .elearn-layout .nav-item span {
        display: none;
    }
    .elearn-layout .nav-item {
        justify-content: center;
        padding: 15px 5px;
    }
    .elearn-layout .right-panel {
        display: none; /* Hide right panel for now */
    }
}

@media (max-width: 768px) {
    .elearn-layout {
        display: block;
        position: relative;
        height: auto;
        overflow-y: auto;
    }

    /* Mobile Sidebar Drawer */
    .elearn-layout .sidebar {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        width: 280px;
        z-index: 10000;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 30px 20px;
    }

    .elearn-layout .sidebar.mobile-open {
        transform: translateX(0);
    }

    .close-sidebar-btn {
        display: block;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        margin-left: auto;
        cursor: pointer;
    }

    .elearn-layout .logo span, 
    .elearn-layout .nav-item span {
        display: inline; /* Restore text for drawer */
    }
    
    .elearn-layout .nav-item {
        justify-content: flex-start;
        padding: 12px 15px;
    }

    .elearn-layout .main-content {
        padding: 20px;
        width: 100%;
    }

    .elearn-layout .right-panel {
        display: none; /* Keep hidden or add toggle */
    }

    /* Grid Stacking */
    .elearn-layout .stats-row {
        grid-template-columns: 1fr;
        gap: 15px;
    }

    .elearn-layout .analytics-grid,
    .planner-grid,
    .settings-grid {
        grid-template-columns: 1fr;
        display: flex;
        flex-direction: column;
    }
    
    .planner-sidebar {
        order: -1; /* Show stats on top */
    }

    /* Header adjustments */
    .mobile-menu-btn {
        display: block;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 5px;
        margin-right: 15px;
    }
    
    .top-header {
        justify-content: flex-start;
    }
    
    .header-tools {
        margin-left: auto;
    }

    /* Typography adjustments */
    .elearn-layout .greeting h1 {
        font-size: 1.4rem;
    }
    
    .elearn-layout .stat-card .value {
        font-size: 1.5rem;
    }
}

/* Default hidden elements */
.mobile-menu-btn, .close-sidebar-btn {
    display: none;
}
/* Efficiency & Pace Card */
.elearn-layout .efficiency-pace { display: flex; flex-direction: column; gap: 20px; }
.elearn-layout .card-header-pace { display: flex; justify-content: space-between; align-items: center; }
.elearn-layout .card-header-pace h3 { margin-bottom: 0 !important; }
.elearn-layout .pace-stats { display: flex; gap: 20px; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.elearn-layout .p-stat { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.elearn-layout .p-label { font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 1px; }
.elearn-layout .p-value { font-size: 1.2rem; font-weight: 700; color: #ffd700; }
.elearn-layout .p-value.highlight { color: #a3be8c; }
.elearn-layout .p-value small { font-size: 0.8rem; font-weight: 400; color: #444; }

.elearn-layout .pace-comparison { margin-top: 10px; }
.elearn-layout .c-line { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; margin-bottom: 8px; }
.elearn-layout .c-line strong { color: #ffd700; }
.elearn-layout .pace-bar-wrap { width: 100%; height: 6px; background: #000; border-radius: 3px; position: relative; overflow: hidden; margin-bottom: 10px; }
.elearn-layout .p-bar.actual { height: 100%; background: #ffd700; border-radius: 3px; transition: width 0.5s ease; }
.elearn-layout .p-bar.target-line { position: absolute; top: 0; left: 0; height: 100%; pointer-events: none; }
.elearn-layout .pace-hint { font-size: 0.75rem; color: #666; font-style: italic; }
.elearn-layout .bar-chart.small-sidebar {
    height: 120px;
    gap: 3px;
}
.elearn-layout .bar-chart.small-sidebar .bar-wrapper {
    flex: 1;
}

/* Sidebar Top Countdown (Phase 32) */
.elearn-layout .countdown-card.sidebar-top {
    margin-bottom: 20px;
    background: linear-gradient(135deg, #0f1219 0%, #050505 100%);
    border: 1px solid rgba(255, 215, 0, 0.3);
}
.elearn-layout .countdown-card.sidebar-top h3 { color: #ffd700; margin-bottom: 10px; }
.elearn-layout .countdown-card.sidebar-top .countdown-ticker { display: flex; gap: 8px; justify-content: center; }
.elearn-layout .countdown-card.sidebar-top .t-val { font-size: 1.4rem; font-weight: 700; color: #fff; }
.elearn-layout .countdown-card.sidebar-top .t-lab { font-size: 0.6rem; color: #888; text-transform: uppercase; }
.elearn-layout .countdown-card.sidebar-top .t-sep { font-size: 1.2rem; color: #666; padding-top: 2px; }

/* Compact Grid Heatmap (Phase 32) */
.elearn-layout .contribution-card.compact-grid {
    margin-top: 0; height: 100%; display: flex; flex-direction: column; justify-content: space-between;
}
.elearn-layout .github-heatmap-mini.compact {
    grid-template-columns: repeat(14, 1fr); gap: 3px; margin-bottom: 10px;
}
.elearn-layout .dev-footer.compact {
    font-size: 0.7rem; align-items: flex-end;
}

/* Countdown Clock Widget */
.elearn-layout .countdown-card { text-align: center; }
.elearn-layout .countdown-ticker { 
    display: flex; justify-content: center; align-items: center; 
    gap: 15px; margin: 20px 0; padding: 20px;
    background: #000; border-radius: 15px; border: 1px solid rgba(255,255,255,0.03);
}
.elearn-layout .t-unit { display: flex; flex-direction: column; gap: 2px; min-width: 40px; }
.elearn-layout .t-val { font-size: 1.5rem; font-weight: 800; color: #d66a6a; font-family: monospace; }
.elearn-layout .t-lab { font-size: 0.6rem; color: #444; text-transform: uppercase; letter-spacing: 1px; }
.elearn-layout .t-sep { font-size: 1.2rem; font-weight: 800; color: #222; margin-bottom: 15px; }
.elearn-layout .t-hint { font-size: 0.75rem; color: #666; margin-top: 10px; }

/* Status Badges */
.elearn-layout .pace-status-badge { 
    padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
}
.elearn-layout .pace-status-badge.track { background: rgba(163, 190, 140, 0.1); color: #a3be8c; }
.elearn-layout .pace-status-badge.behind { background: rgba(214, 106, 106, 0.1); color: #d66a6a; }
.elearn-layout .pace-status-badge.neutral { background: rgba(255, 255, 255, 0.05); color: #888; }
/* --- Personal Notes CSS --- */
.notes-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.notes-toggle {
    display: flex;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
}

.notes-toggle button {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.notes-toggle button.active {
    background: rgba(255, 255, 255, 0.1);
    color: #ffd700;
    font-weight: 600;
}

.private-notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.note-card-private {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 180px;
}

.note-card-private:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 215, 0, 0.3);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
}

.note-content-preview h3 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.note-content-preview p {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.note-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.note-date {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.btn-icon-delete {
    background: transparent;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
}

.btn-icon-delete:hover {
    opacity: 1;
}

/* Modal CSS */
.note-modal {
    max-width: 800px;
    width: 90%;
    height: 80vh;
    display: flex;
    flex-direction: column;
}

.note-modal .modal-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    overflow: hidden;
}

.note-title-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 1.5rem;
    font-weight: 700;
    padding: 10px 0;
    width: 100%;
}

.note-title-input:focus {
    outline: none;
    border-color: #ffd700;
}

.note-content-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #e0e0e0;
    font-family: inherit;
    font-size: 1rem;
    padding: 15px;
    resize: none;
    line-height: 1.6;
}

.note-content-input:focus {
    outline: none;
    border-color: rgba(255, 215, 0, 0.3);
}

@media (max-width: 768px) {
    .notes-header-row {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
    }
    
    .notes-toggle {
        justify-content: center;
    }
}
</style>
