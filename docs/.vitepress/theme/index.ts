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
                        title: 'Highlight some text first to quiz on specific parts!',
                        onClick: () => {
                            // 1. Try to get selected text first (most targeted)
                            let selectedText = window.getSelection()?.toString().trim();
                            let context = '';
                            let sourceDescription = '';

                            if (selectedText && selectedText.length > 10) {
                                // If the user highlighted something, use that!
                                context = selectedText;
                                sourceDescription = 'the selected notes below';
                            } else {
                                // Fallback: Get the main document content
                                const container = document.querySelector('.vp-doc');
                                context = container ? container.innerText.replace(/\s+/g, ' ').trim() : '';
                                sourceDescription = 'my study notes';
                            }

                            // 2. Truncate to a level that is safe for URLs (~2000 chars)
                            const safeContext = context.slice(0, 2000);

                            const title = page.value.title || 'this topic';
                            const prompt = `I am studying ${title} for SSC Exams. Please use ${sourceDescription} to generate a 10-question SSC CGL level MCQ quiz with explanations.\n\nNOTES:\n${safeContext}`;

                            const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;

                            // 3. Open in a new tab
                            window.open(url, '_blank');
                        }
                    }, '✨ Practice with AI')
                ])
            }
        })
    }
}
