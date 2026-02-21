import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import mathjax3 from 'markdown-it-mathjax3'

// Standard subjects we know about to enforce order/naming if present
const KNOWN_SUBJECTS: Record<string, string> = {
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

const sidebarConfig: Record<string, any> = {}

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

import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: "Study Nexus",
  description: "A centralized platform to import YouTube courses and manage your AI-assisted study notes",
  base: "/",

  // High-end aesthetic defaults
  appearance: 'dark',
  lastUpdated: true,

  head: [
    ['script', {
      id: "MathJax-script",
      async: "",
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
    config: (md) => {
      md.use(mathjax3)
    }
  },

  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => {
          return tag.startsWith('mjx-') || tag.startsWith('math')
        }
      }
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
    envDir: process.cwd(),
    plugins: [
      {
        name: 'write-file-server',
        configureServer(server) {
          server.middlewares.use('/__api/read-file', async (req, res, next) => {
            if (req.method === 'GET') {
              const url = new URL(req.url!, `http://${req.headers.host}`)
              const filePath = url.searchParams.get('path')
              if (!filePath) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing path' }))
                return
              }
              const fullPath = path.join(process.cwd(), 'docs', filePath.endsWith('.md') ? filePath : filePath + '.md')
              try {
                if (fs.existsSync(fullPath)) {
                  const content = fs.readFileSync(fullPath, 'utf-8')
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ content }))
                } else {
                  res.statusCode = 404
                  res.end(JSON.stringify({ error: 'File not found: ' + fullPath }))
                }
              } catch (err: any) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            } else {
              next()
            }
          })

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
                } catch (err: any) {
                  console.error('File write error:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            } else {
              next()
            }
          })
          server.middlewares.use('/__api/create-folder', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', () => {
                try {
                  const { folder } = JSON.parse(body)
                  if (!folder) throw new Error("Folder name is required")

                  const dirPath = path.join(process.cwd(), 'docs', folder.toLowerCase())
                  if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true })
                  }

                  const indexPath = path.join(dirPath, 'index.md')
                  let created = false
                  if (!fs.existsSync(indexPath)) {
                    const title = folder.charAt(0).toUpperCase() + folder.slice(1).replace(/-/g, ' ')
                    fs.writeFileSync(indexPath, `# ${title}\n\nYour notes for this subject will appear here.`)
                    created = true
                  }

                  // Force VitePress to reload config and regenerate Navbar
                  if (created) {
                    const configPath = path.join(process.cwd(), 'docs', '.vitepress', 'config.mts')
                    const time = new Date()
                    try {
                      fs.utimesSync(configPath, time, time)
                    } catch (e) {
                      // ignore if utimes fails
                    }
                  }

                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true }))
                } catch (err: any) {
                  console.error('Folder create error:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
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
}))
