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
            // Target document headers
            const container = document.querySelector('.vp-doc') || document.querySelector('main');
            if (container) {
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

            // Target sidebar items (Sidepanel)
            const sidebarItems = document.querySelectorAll('.VPSidebarItem.level-1, .VPSidebarItem.level-2');
            sidebarItems.forEach((item, index) => {
                if (item.querySelector('.sidebar-checkbox')) return;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'sidebar-checkbox';
                checkbox.id = `sidebar-cb-${index}`;
                checkbox.checked = true;
                checkbox.style.marginRight = '8px';
                checkbox.style.cursor = 'pointer';

                const textContainer = item.querySelector('.text') || item.querySelector('a');
                if (textContainer) {
                    textContainer.prepend(checkbox);
                }
            });
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
                            const checkboxes = document.querySelectorAll('.section-checkbox:checked')
                            let context = ''

                            if (checkboxes.length > 0) {
                                checkboxes.forEach(cb => {
                                    const header = cb.parentElement
                                    if (!header) return
                                    context += `\n### ${header.textContent}\n`
                                    let sibling = header.nextElementSibling
                                    while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
                                        context += (sibling as HTMLElement).innerText + ' '
                                        sibling = sibling.nextElementSibling
                                    }
                                })
                            } else {
                                const selection = window.getSelection()?.toString()
                                if (selection && selection.length > 10) {
                                    context = selection
                                } else {
                                    alert('⚠️ Please check the boxes for the sections you need questions on, or highlight some text first!');
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
