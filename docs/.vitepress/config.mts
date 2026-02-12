import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import mathjax3 from 'markdown-it-mathjax3'

// Standard subjects we know about to enforce order/naming if present
const KNOWN_SUBJECTS = {
  'maths': 'Mathematics',
  'reasoning': 'Reasoning',
  'english': 'English',
  'ga': 'General Awareness'
}

function getSubjectDirs() {
  const docsPath = path.join(process.cwd(), 'docs')
  return fs.readdirSync(docsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'public')
    .map(dirent => dirent.name)
}

function getSidebarItems(dir: string) {
  const fullPath = path.join(process.cwd(), 'docs', dir)

  if (!fs.existsSync(fullPath)) {
    return []
  }

  return fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => {
      const name = file.replace('.md', '')
      // Capitalize first letter of valid filenames
      const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
      return { text: displayName, link: `/${dir}/${name}` }
    })
}

// Dynamically generate Nav and Sidebar
const subjects = getSubjectDirs()
const navItems = [
  { text: 'Home', link: '/' },
  { text: 'Dashboard', link: '/dashboard' }
]

const sidebarConfig = {}

subjects.forEach(sub => {
  const displayName = KNOWN_SUBJECTS[sub] || sub.charAt(0).toUpperCase() + sub.slice(1)

  // Add to Nav
  navItems.push({ text: displayName, link: `/${sub}/` })

  // Add to Sidebar
  sidebarConfig[`/${sub}/`] = [
    {
      text: displayName,
      items: getSidebarItems(sub)
    }
  ]
})

export default defineConfig({
  title: "AI Notes Master",
  description: "Comprehensive study material with AI-assisted practice for SSC Exams",
  base: "/",

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

    nav: navItems,
    sidebar: sidebarConfig,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rakeshvytla9/ai-notes-master' }
    ],

    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2024-present Rakesh Mohan'
    }
  },

  vite: {
    envDir: process.cwd()
  }
})
