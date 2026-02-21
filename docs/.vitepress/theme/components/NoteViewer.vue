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
  <div class="note-viewer-page">
    <!-- Breadcrumb / Header -->
    <div class="note-breadcrumb">
       <a href="/dashboard.html" class="back-btn">← Dashboard</a>
       <span class="sep">/</span>
       <span class="folder-name">{{ note?.folder || 'Notes' }}</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Opening notebook...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h3>⚠️ {{ error }}</h3>
      <a href="/dashboard.html" class="back-link">Return to Dashboard</a>
    </div>

    <div v-else class="note-container">
      <header class="note-header">
        <h1 class="note-title">{{ note.title }}</h1>
        <div class="note-meta">
          <span class="badge">{{ note.folder }}</span>
          <span class="dot">•</span>
          <span class="date">{{ note.updatedAt && note.updatedAt.seconds ? new Date(note.updatedAt.seconds * 1000).toLocaleDateString() : (note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : 'Just now') }}</span>
        </div>
      </header>
      
      <!-- Immersive Content Area -->
      <div class="vp-doc note-body">
        <div v-html="note.renderedContent"></div>
      </div>

      <footer class="note-footer">
          <button class="btn-print" @click="window.print()">Print Note</button>
      </footer>
    </div>
  </div>
</template>

<style>
/* Global styles for NoteViewer to match VitePress */
.note-viewer-page {
    max-width: 900px;
    margin: 40px auto;
    padding: 0 40px;
}

.note-breadcrumb {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 30px;
    font-size: 0.9rem;
    color: var(--vp-c-text-2);
}

.note-breadcrumb .back-btn {
    color: var(--vp-c-brand);
    text-decoration: none;
    font-weight: 500;
}

.note-breadcrumb .sep {
    opacity: 0.3;
}

.note-header {
    margin-bottom: 40px;
}

.note-title {
    font-size: 2.8rem;
    font-weight: 800;
    margin-bottom: 15px;
    letter-spacing: -0.02em;
    color: var(--vp-c-text-1);
}

.note-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    color: var(--vp-c-text-2);
}

.note-meta .badge {
    background: var(--vp-c-brand-soft);
    color: var(--vp-c-brand);
    padding: 2px 10px;
    border-radius: 12px;
    font-weight: 600;
}

.note-body {
    background: transparent;
    line-height: 1.7;
}

.note-footer {
    margin-top: 60px;
    padding-top: 20px;
    border-top: 1px solid var(--vp-c-divider);
    display: flex;
    justify-content: flex-end;
}

.btn-print {
    background: var(--vp-c-brand);
    color: #000;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
}

.loading-state, .error-state {
    text-align: center;
    padding: 100px 0;
}

@media (max-width: 768px) {
    .note-viewer-page {
        padding: 20px;
        margin: 20px auto;
    }
    .note-title {
        font-size: 2rem;
    }
}
</style>
