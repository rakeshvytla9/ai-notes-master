// docs/.vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import './style.css'
import { h } from 'vue'
import { useData } from 'vitepress'

export default {
    extends: DefaultTheme,
    Layout() {
        const { page } = useData()

        return h(DefaultTheme.Layout, null, {
            'doc-before': () => {
                // Skip buttons on index pages if desired, but good for topics
                if (page.value.isIndex) return null

                const title = page.value.title || 'this topic'
                const prompt = encodeURIComponent(`I am studying ${title} for SSC Exams. Please generate a 10-question practice quiz with multiple-choice options and detailed explanations based on this topic for SSC CGL level.`)
                const aiUrl = `https://chatgpt.com/?q=${prompt}`

                return h('div', { class: 'doc-actions' }, [
                    h('button', {
                        class: 'print-button',
                        onClick: () => { window.print() }
                    }, '🖨️ Print this Page'),
                    h('a', {
                        class: 'ai-button',
                        href: aiUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }, '✨ Practice with AI')
                ])
            }
        })
    }
}
