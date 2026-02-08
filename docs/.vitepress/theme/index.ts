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
                if (page.value.isIndex) return null

                return h('div', { class: 'doc-actions' }, [
                    h('button', {
                        class: 'print-button',
                        onClick: () => { window.print() }
                    }, '🖨️ Print this Page'),
                    h('button', {
                        class: 'ai-button',
                        onClick: () => {
                            const docContent = document.querySelector('.vp-doc')?.innerText || '';
                            // Truncate to avoid URL length limits while keeping significant content
                            const truncated = docContent.substring(0, 5000);
                            const title = page.value.title || 'this topic';
                            const prompt = `I am studying ${title} for SSC Exams. Here are my notes:\n\n${truncated}\n\nPlease generate a 10-question practice quiz with multiple-choice options and detailed explanations based on these specific notes for SSC CGL level. Focus on the core concepts mentioned.`;

                            const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
                            window.open(url, '_blank');
                        }
                    }, '✨ Practice with AI')
                ])
            }
        })
    }
}
