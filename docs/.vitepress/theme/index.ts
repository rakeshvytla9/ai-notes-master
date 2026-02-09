import DefaultTheme from 'vitepress/theme'
import './style.css'
import { h, onMounted, watch } from 'vue'
import { useData, useRouter } from 'vitepress'
import Dashboard from './components/Dashboard.vue'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('Dashboard', Dashboard)
    },
    Layout() {
        const { page } = useData()
        const router = useRouter()

        const injectCheckboxes = () => {
            try {
                // Target both desktop and mobile (local nav) outline links
                const tocLinks = document.querySelectorAll('.outline-link, .VPLocalNav .outline-link, .VPLocalNav a[href^="#"]');
                if (tocLinks.length === 0) return;

                tocLinks.forEach((link, index) => {
                    const parent = link.parentElement;
                    if (!parent || parent.querySelector('.toc-checkbox')) return;

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'toc-checkbox';
                    checkbox.id = `toc-cb-${index}`;
                    checkbox.checked = false;

                    if (link instanceof HTMLAnchorElement) {
                        checkbox.dataset.targetHash = link.hash;
                    }

                    checkbox.onclick = null; // Remove individual handler in favor of delegation

                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.className = 'toc-checkbox-label';
                    label.appendChild(checkbox);
                    parent.prepend(label);
                });

                document.querySelectorAll('.section-checkbox, .section-checkbox-label, .sidebar-checkbox').forEach(el => el.remove());
            } catch (e) {
                console.error("TOC Injection Error:", e);
            }
        }

        onMounted(() => {
            injectCheckboxes();

            const observer = new MutationObserver(() => {
                injectCheckboxes();
            });

            // Target body to catch mobile TOC and other dynamic changes
            observer.observe(document.body, { childList: true, subtree: true });

            // Fallback for initial load
            setTimeout(injectCheckboxes, 1000);
            setTimeout(injectCheckboxes, 3000);

            // Global Event Delegation for Checkboxes
            // This handles clicks on cloned elements (like mobile TOC) where listeners are lost
            document.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).classList.contains('toc-checkbox')) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    // Optional: Manually toggle if needed, but default behavior usually works if propagation stopped
                }
            }, true); // Use capture phase to catch it before any link handlers
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
                                    // Read directly from data attribute - robust and traversal-free
                                    const hash = (cb as HTMLElement).dataset.targetHash
                                    if (!hash) return

                                    const headerId = decodeURIComponent(hash.substring(1))
                                    const header = document.getElementById(headerId)

                                    if (header) {
                                        context += `\n### ${header.textContent}\n`

                                        const startLevel = parseInt(header.tagName.replace('H', '')) || 6

                                        let sibling = header.nextElementSibling
                                        while (sibling) {
                                            const tagName = sibling.tagName
                                            if (/^H[1-6]$/.test(tagName)) {
                                                const currentLevel = parseInt(tagName.replace('H', ''))
                                                if (currentLevel <= startLevel) break
                                            }
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

                            const cleanContext = context.replace(/\s+/g, ' ').trim().slice(0, 6000)
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
