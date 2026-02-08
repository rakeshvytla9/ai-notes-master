// docs/.vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import './style.css'
import { h, onMounted, watch } from 'vue'
import { useData, useRouter } from 'vitepress'

export default {
    extends: DefaultTheme,
    Layout() {
        const { page } = useData()
        const router = useRouter()

        // Function to inject checkboxes into headers
        const injectCheckboxes = () => {
            // Find all content headers (h2, h3)
            const headers = document.querySelectorAll('.vp-doc h2, .vp-doc h3')
            headers.forEach((header, index) => {
                if (header.querySelector('.section-checkbox')) return

                const checkbox = document.createElement('input')
                checkbox.type = 'checkbox'
                checkbox.className = 'section-checkbox'
                checkbox.id = `section-cb-${index}`
                // Default to checked so "Practice with AI" works intuitively for everything if not changed
                checkbox.checked = true

                const label = document.createElement('label')
                label.htmlFor = checkbox.id
                label.className = 'section-checkbox-label'
                label.innerText = ' [Select for AI]'

                header.prepend(checkbox)
                header.appendChild(label)
            })
        }

        onMounted(injectCheckboxes)
        // Re-inject when navigating between pages
        watch(() => router.route.path, () => {
            setTimeout(injectCheckboxes, 100)
        })

        return h(DefaultTheme.Layout, null, {
            'doc-before': () => {
                if (page.value.isIndex) return null

                return h('div', { class: 'doc-actions' }, [
                    h('button', {
                        class: 'print-button',
                        onClick: () => { window.print() }
                    }, '🖨️ Print this Page'),
                    h('button', {
                        class: 'ai-button',
                        onClick: () => {
                            // 1. Get all checked checkboxes
                            const checkboxes = document.querySelectorAll('.section-checkbox:checked')
                            let context = ''

                            if (checkboxes.length > 0) {
                                // Gather content between selected headers
                                checkboxes.forEach(cb => {
                                    const header = cb.parentElement
                                    if (!header) return

                                    context += `\n### ${header.innerText}\n`

                                    // Simple logic: get siblings until next header of same or higher level
                                    let sibling = header.nextElementSibling
                                    while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
                                        context += sibling.innerText + ' '
                                        sibling = sibling.nextElementSibling
                                    }
                                })
                            } else {
                                // Fallback to highlighted text or top of doc
                                const selection = window.getSelection()?.toString()
                                context = (selection && selection.length > 10)
                                    ? selection
                                    : (document.querySelector('.vp-doc')?.innerText.slice(0, 2000) || '')
                            }

                            const cleanContext = context.replace(/\s+/g, ' ').trim().slice(0, 2000)
                            const title = page.value.title || 'this topic'

                            const prompt = `I am studying ${title} for SSC Exams. Based on these notes: "${cleanContext}", please generate a 10-question SSC CGL level MCQ quiz with explanations.`

                            // Redirect to Gemini (web UI requires manual paste of prompt often, but q param works for simple ones)
                            // ChatGPT is safer for complex prompts so we use it as the target but mention Gemini
                            const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
                            window.open(url, '_blank')
                        }
                    }, '✨ Practice with AI')
                ])
            }
        })
    }
}
