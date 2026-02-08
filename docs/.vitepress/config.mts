import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import mathjax3 from 'markdown-it-mathjax3'

function getSidebarItems(dir: string) {
  const fullPath = path.join(process.cwd(), 'docs', dir)

  if (!fs.existsSync(fullPath)) {
    return []
  }

  return fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => {
      const name = file.replace('.md', '')
      return { text: name, link: `/${dir}/${name}` }
    })
}

export default defineConfig({
  title: "AI Notes Master",
  description: "Advanced AI-Powered Study Material",
  base: "/ai-notes-master/",

  // High-end aesthetic defaults
  appearance: 'dark',
  lastUpdated: true,

  markdown: {
    config: (md) => {
      md.use(mathjax3)
    }
  },

  themeConfig: {
    // New Feature: Local Search
    search: {
      provider: 'local'
    },

    // New Feature: Edit Link
    editLink: {
      pattern: 'https://github.com/rakeshvytla9/ai-notes-master/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Maths', link: '/maths/' },
      { text: 'Reasoning', link: '/reasoning/' },
      { text: 'English', link: '/english/' },
      { text: 'GA', link: '/ga/' }
    ],

    sidebar: {
      '/maths/': [
        {
          text: 'Mathematics',
          items: getSidebarItems('maths')
        }
      ],
      '/reasoning/': [
        {
          text: 'Reasoning',
          items: getSidebarItems('reasoning')
        }
      ],
      '/english/': [
        {
          text: 'English',
          items: getSidebarItems('english')
        }
      ],
      '/ga/': [
        {
          text: 'General Awareness',
          items: getSidebarItems('ga')
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rakeshvytla9/ai-notes-master' }
    ],

    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2024-present Rakesh Mohan'
    }
  }
})
