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
                            // 1. Get the raw text from the document body only (avoiding nav/sidebar)
                            const container = document.querySelector('.vp-doc');
                            if (!container) return;

                            let docContent = container.innerText;

                            // 2. Clean up major whitespace/newlines to save space in URL
                            docContent = docContent.replace(/\s+/g, ' ').trim();

                            // 3. Truncate to a safe limit for URLs (approx 1500 chars)
                            // This ensures the encoded URL stays under most browser/server limits (~2k-4k total)
                            const truncated = docContent.slice(0, 1500);

                            const title = page.value.title || 'this topic';
                            const prompt = `I am studying ${title} for SSC Exams. Based on these notes: "${truncated}...", please generate a 10-question SSC CGL level MCQ quiz with explanations.`;

                            const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;

                            // 4. Open in a new tab
                            window.open(url, '_blank');
                        }
                    }, '✨ Practice with AI')
                ])
            }
        })
    }
}
