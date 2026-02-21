<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  path: String,
  isOpen: Boolean
})

const emit = defineEmits(['close', 'save'])

const content = ref('')
const loading = ref(true)

const fetchSource = async () => {
  if (!props.isOpen || !props.path) return
  loading.value = true
  try {
    const res = await fetch(`/__api/read-file?path=${encodeURIComponent(props.path)}`)
    const data = await res.json()
    content.value = data.content || ''
  } catch (e) {
    console.error('Error reading file:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) fetchSource()
})

onMounted(fetchSource)

const handleSave = async () => {
  try {
    const res = await fetch('/__api/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: props.path,
        content: content.value
      })
    })
    if (res.ok) {
        emit('save')
        emit('close')
        window.location.reload()
    }
  } catch (e) {
    console.error('Error saving file:', e)
    alert('Failed to save changes.')
  }
}
</script>

<template>
  <div v-if="isOpen" class="edit-modal-overlay" @click.self="emit('close')">
    <div class="edit-modal">
      <div class="edit-header">
        <div class="edit-title-group">
            <span class="edit-icon">✏️</span>
            <h3>Editing: {{ path }}</h3>
        </div>
        <button @click="emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="edit-body">
        <textarea v-if="!loading" v-model="content" class="edit-textarea" spellcheck="false" placeholder="Write your notes here..."></textarea>
        <div v-else class="loading-spinner">
            <div class="spinner"></div>
            <span>Fetching source...</span>
        </div>
      </div>
      <div class="edit-footer">
        <button @click="emit('close')" class="btn-cancel">Cancel</button>
        <button @click="handleSave" class="btn-save">💾 Save Document</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(10px);
}
.edit-modal {
  background: #111116;
  width: 95%;
  max-width: 1200px;
  height: 85vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 215, 0, 0.2);
  box-shadow: 0 30px 60px rgba(0,0,0,0.8), 0 0 20px rgba(255, 215, 0, 0.05);
  overflow: hidden;
}
.edit-header {
  padding: 18px 24px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.edit-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
}
.edit-title-group h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #ffd700;
    font-weight: 600;
}
.close-btn {
    background: transparent;
    border: none;
    color: #666;
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s;
}
.close-btn:hover {
    color: #fff;
}
.edit-body {
  flex: 1;
  padding: 20px;
  background: #0a0a0e;
  display: flex;
  flex-direction: column;
}
.edit-textarea {
  flex: 1;
  width: 100%;
  background: transparent;
  color: #e0e0e0;
  border: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: none;
  outline: none;
}
.edit-footer {
  padding: 16px 24px;
  background: rgba(255,255,255,0.02);
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn-save {
  background: #ffd700;
  color: #000;
  padding: 10px 28px;
  border-radius: 10px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-save:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}
.btn-cancel {
  background: rgba(255,255,255,0.05);
  color: #ccc;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
}
.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 15px;
    color: #666;
}
.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 215, 0, 0.1);
    border-top-color: #ffd700;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
