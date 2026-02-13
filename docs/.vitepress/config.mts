import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

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

  head: [
    ['script', {
      src: "https://polyfill.io/v3/polyfill.min.js?features=es6"
    }],
    ['script', {
      id: "MathJax-script",
      async: true,
      src: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
    }],
    ['script', {}, `
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
          displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
          processEscapes: true
        }
      };
    `]
  ],

  markdown: {
    // config: (md) => {
    //   md.use(mathjax3)
    // }
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
    envDir: process.cwd(),
    plugins: [
      {
        name: 'write-file-server',
        configureServer(server) {
          server.middlewares.use('/__api/write-file', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', () => {
                try {
                  const { path: filePath, content } = JSON.parse(body)
                  const fullPath = path.join(process.cwd(), 'docs', filePath)

                  // Ensure directory exists
                  const dir = path.dirname(fullPath)
                  if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                  }

                  fs.writeFileSync(fullPath, content)
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true }))
                } catch (e) {
                  console.error('File write error:', e)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: e.message }))
                }
              })
            } else {
              next()
            }
          })
        }
      }
    ]
  }
})
