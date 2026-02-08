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
            const tocLinks = document.querySelectorAll('.outline-link');
            if (tocLinks.length === 0) return;

            tocLinks.forEach((link, index) => {
                const parent = link.parentElement;
                if (!parent || parent.querySelector('.toc-checkbox')) return;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'toc-checkbox';
                checkbox.id = `toc-cb-${index}`;
                checkbox.checked = false;
                // No stopPropagation needed here since it's not inside the link anymore
                // But it's good practice anyway
                checkbox.onclick = (e) => e.stopPropagation();

                parent.prepend(checkbox);
            });

            document.querySelectorAll('.section-checkbox, .section-checkbox-label, .sidebar-checkbox').forEach(el => el.remove());
        }

        onMounted(() => {
            injectCheckboxes();

            // Watch for TOC changes (common in VitePress as you scroll or navigate)
            const observer = new MutationObserver(() => {
                injectCheckboxes();
            });

            const aside = document.querySelector('.aside-container');
            if (aside) {
                observer.observe(aside, { childList: true, subtree: true });
            }

            // Fallback for initial load
            setTimeout(injectCheckboxes, 1000);
            setTimeout(injectCheckboxes, 3000);
        })

        watch(() => router.route.path, () => {
            setTimeout(injectCheckboxes, 500)
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
                                    const link = (cb as HTMLElement).nextElementSibling as HTMLAnchorElement
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
