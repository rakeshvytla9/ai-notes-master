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
            // Target 'On this page' (TOC) links
            const tocLinks = document.querySelectorAll('.outline-link');
            tocLinks.forEach((link, index) => {
                if (link.querySelector('.toc-checkbox')) return;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'toc-checkbox';
                checkbox.id = `toc-cb-${index}`;
                checkbox.checked = false; // Unclicked by default
                checkbox.onclick = (e) => e.stopPropagation(); // Don't trigger navigation

                link.prepend(checkbox);
            });

            // Remove legacy checkboxes if they exist (cleanup for smooth transition)
            document.querySelectorAll('.section-checkbox, .section-checkbox-label, .sidebar-checkbox').forEach(el => el.remove());
        }

        onMounted(() => {
            injectCheckboxes();
            setTimeout(injectCheckboxes, 500);
            setTimeout(injectCheckboxes, 1500);
        })

        watch(() => router.route.path, () => {
            setTimeout(injectCheckboxes, 200)
            setTimeout(injectCheckboxes, 1000)
        })

        return h(DefaultTheme.Layout, null, {
            'nav-bar-content-after': () => {
                if (page.value.relativePath === 'index.md') return null

                return h('div', { class: 'header-actions' }, [
                    h('button', {
                        class: 'print-button-mini',
                        title: 'Print this Page',
                        onClick: () => { window.print() }
                    }, '🖨️'),
                    h('button', {
                        class: 'ai-button-mini',
                        title: 'Practice with AI',
                        onClick: () => {
                            const checkboxes = document.querySelectorAll('.toc-checkbox:checked')
                            let context = ''

                            if (checkboxes.length > 0) {
                                checkboxes.forEach(cb => {
                                    const link = cb.parentElement as HTMLAnchorElement
                                    if (!link || !link.hash) return

                                    const headerId = decodeURIComponent(link.hash.substring(1))
                                    const header = document.getElementById(headerId)

                                    if (header) {
                                        context += `\n### ${header.textContent}\n`
                                        let sibling = header.nextElementSibling
                                        while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
                                            context += (sibling as HTMLElement).innerText + ' '
                                            sibling = sibling.nextElementSibling
                                        }
                                    }
                                })
                            } else {
                                const selection = window.getSelection()?.toString()
                                if (selection && selection.length > 10) {
                                    context = selection
                                } else {
                                    alert('⚠️ Please select topics from the "On this page" section or highlight some text first!');
                                    return;
                                }
                            }

                            const cleanContext = context.replace(/\s+/g, ' ').trim().slice(0, 1500)
                            const title = page.value.title || 'this topic'
                            const prompt = `I am studying ${title} for SSC Exams. Based on these notes: "${cleanContext}", please generate a 10-question SSC CGL level MCQ quiz with explanations.`

                            const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
                            window.open(url, '_blank')
                        }
                    }, '✨ AI Quiz')
                ])
            }
        })
    }
}
