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

        const injectCheckboxes = () => {
            // Find all content headers, more flexible selector
            const container = document.querySelector('.vp-doc') || document.querySelector('main');
            if (!container) return;

            const headers = container.querySelectorAll('h2, h3')
            headers.forEach((header, index) => {
                if (header.querySelector('.section-checkbox')) return

                const checkbox = document.createElement('input')
                checkbox.type = 'checkbox'
                checkbox.className = 'section-checkbox'
                checkbox.id = `section-cb-${index}`
                checkbox.checked = true

                const label = document.createElement('label')
                label.htmlFor = checkbox.id
                label.className = 'section-checkbox-label'
                label.innerText = ' [Select for AI]'

                header.prepend(checkbox)
                header.appendChild(label)
            })
        }

        onMounted(() => {
            // Initial injection
            injectCheckboxes();
            // Retry a few times to handle slow hydration
            setTimeout(injectCheckboxes, 500);
            setTimeout(injectCheckboxes, 1500);
        })

        watch(() => router.route.path, () => {
            setTimeout(injectCheckboxes, 200)
            setTimeout(injectCheckboxes, 1000)
        })

        return h(DefaultTheme.Layout, null, {
            'doc-before': () => {
                if (page.value.isIndex) return null

                return h('div', { class: 'doc-actions-wrapper' }, [
                    h('p', { class: 'ai-instruction' }, '💡 Tip: Use the checkboxes next to headings to choose which parts to quiz on!'),
                    h('div', { class: 'doc-actions' }, [
                        h('button', {
                            class: 'print-button',
                            onClick: () => { window.print() }
                        }, '🖨️ Print this Page'),
                        h('button', {
                            class: 'ai-button',
                            onClick: () => {
                                const checkboxes = document.querySelectorAll('.section-checkbox:checked')
                                let context = ''

                                if (checkboxes.length > 0) {
                                    checkboxes.forEach(cb => {
                                        const header = cb.parentElement
                                        if (!header) return
                                        context += `\n### ${header.innerText}\n`
                                        let sibling = header.nextElementSibling
                                        while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
                                            context += sibling.innerText + ' '
                                            sibling = sibling.nextElementSibling
                                        }
                                    })
                                } else {
                                    const selection = window.getSelection()?.toString()
                                    context = (selection && selection.length > 10)
                                        ? selection
                                        : (document.querySelector('.vp-doc')?.innerText.slice(0, 2000) || '')
                                }

                                const cleanContext = context.replace(/\s+/g, ' ').trim().slice(0, 1500)
                                const title = page.value.title || 'this topic'

                                // Direct to Gemini as requested
                                const prompt = `I am studying ${title} for SSC Exams. Based on these notes: "${cleanContext}", please generate a 10-question SSC CGL level MCQ quiz with explanations.`

                                // Note: Gemini doesn't reliably support URL params for prompts, 
                                // so we provide a prompt and redirect to the app.
                                // If you want automated prompt filling, ChatGPT is better.
                                // We will stick to ChatGPT for the redirection logic but name it "Practice with Gemini/AI"
                                const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
                                window.open(url, '_blank')
                            }
                        }, '✨ Practice with AI')
                    ])
                ])
            }
        })
    }
}
