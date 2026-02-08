// docs/.vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import './style.css'
import { h } from 'vue'

export default {
    extends: DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            'doc-before': () => h('button', {
                class: 'print-button',
                onClick: () => { window.print() }
            }, '🖨️ Print this Page')
        })
    }
}
