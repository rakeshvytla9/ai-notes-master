<script setup>
import { ref, onMounted } from 'vue'
import { auth, db } from '../lib/firebase'
import { doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

const note = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(() => {
    // MathJax support
    const renderMath = () => {
        if (window.MathJax) {
            window.MathJax.typesetPromise && window.MathJax.typesetPromise()
        }
    }

    // Check if auth is initialized (it might be null if config is missing)
    if (!auth) {
        // Handle Guest/Local Note check immediately
        const params = new URLSearchParams(window.location.search)
        const noteId = params.get('id')
        if (noteId && noteId.startsWith('local-')) {
             checkLocalNote(noteId, renderMath)
        } else {
            error.value = "Firebase not configured and not a local note."
            loading.value = false
        }
        return
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const params = new URLSearchParams(window.location.search)
            const noteId = params.get('id')
            
            if (noteId) {
                if (noteId.startsWith('local-')) {
                    checkLocalNote(noteId, renderMath)
                    loading.value = false
                    return
                }

                try {
                    const docRef = doc(db, 'users', user.uid, 'notes', noteId)
                    const docSnap = await getDoc(docRef)
                    
                    if (docSnap.exists()) {
                        note.value = { 
                            id: docSnap.id, 
                            ...docSnap.data(),
                            renderedContent: md.render(docSnap.data().content || '') 
                        }
                        setTimeout(renderMath, 100)
                    } else {
                        error.value = "Note not found."
                    }
                } catch (e) {
                    console.error("Error fetching note:", e)
                    error.value = "Error loading note."
                }
            } else {
                error.value = "No note ID specified."
            }
        } else {
            // Not logged in or Guest
            const params = new URLSearchParams(window.location.search)
            const noteId = params.get('id')
            if (noteId && noteId.startsWith('local-')) {
                 checkLocalNote(noteId, renderMath)
            } else {
                error.value = "You must be logged in to view cloud notes."
            }
        }
        loading.value = false
    })
})

const checkLocalNote = (noteId, renderMath) => {
     let found = null;
     // Fallback keys for local storage
     const keys = ['elearn-dashboard-data-v2', 'guest_user_notes', 'guest_notes'];
     
     for(const key of keys) {
         try {
             const raw = localStorage.getItem(key);
             if (!raw) continue;
             
             const data = JSON.parse(raw);
             
             // diverse structures handled here
             if(Array.isArray(data)) {
                 found = data.find(n => n.id === noteId);
             } else if (data.userNotes && Array.isArray(data.userNotes)) {
                 found = data.userNotes.find(n => n.id === noteId);
             }
             
             if(found) break;
         } catch(e) {
             console.error('Error parsing local storage key:', key, e);
         }
     }
     
     if (found) {
         note.value = {
             ...found,
             renderedContent: md.render(found.content || '')
         }
         setTimeout(renderMath, 100)
     } else {
         error.value = "Local note not found."
     }
}
</script>

<template>
  <div class="note-viewer-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading note...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h3>⚠️ {{ error }}</h3>
      <a href="/dashboard.html" class="back-link">Return to Dashboard</a>
    </div>

    <div v-else class="note-content">
      <div class="note-header">
        <h1>{{ note.title }}</h1>
        <div class="meta">
          <span class="badge">{{ note.folder || 'General' }}</span>
          <span class="date">Updated: {{ new Date(note.updatedAt).toLocaleDateString() }}</span>
        </div>
      </div>
      
      <div class="vp-doc" v-html="note.renderedContent"></div>
    </div>
  </div>
</template>

<style scoped>
.note-viewer-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
}

.loading-state, .error-state {
    text-align: center;
    padding: 100px 0;
    color: var(--vp-c-text-2);
}

.spinner {
    border: 4px solid var(--vp-c-bg-soft);
    border-top: 4px solid var(--vp-c-brand);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.note-header {
    margin-bottom: 40px;
    border-bottom: 1px solid var(--vp-c-divider);
    padding-bottom: 20px;
}

.note-header h1 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 15px;
    line-height: 1.3;
    color: var(--vp-c-text-1);
}

.meta {
    display: flex;
    gap: 15px;
    align-items: center;
    font-size: 0.9rem;
    color: var(--vp-c-text-2);
}

.badge {
    background: var(--vp-c-brand-soft);
    color: var(--vp-c-brand);
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.back-link {
    display: inline-block;
    margin-top: 15px;
    color: var(--vp-c-brand);
    text-decoration: none;
    font-weight: 500;
}
</style>
