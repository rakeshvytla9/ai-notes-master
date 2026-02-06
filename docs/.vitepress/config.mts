import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

function getSidebarItems(dir: string) {
  // process.cwd() is the project root when running 'vitepress dev docs'
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

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SSC Notes",
  description: "Study Material for SSC Exams",
  base: "/ssc-notes/",
  themeConfig: {
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
      { icon: 'github', link: 'https://github.com/rakeshvytla9/ssc-notes' }
    ]
  }
})
