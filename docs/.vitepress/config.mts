import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SSC Notes",
  description: "Study Material for SSC Exams",
  base: "/ssc-notes/", // Important for GitHub Pages
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
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
          items: [
            { text: 'Number System', link: '/maths/Number System' },
            // Add more files here as you create them
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rakeshvytla9/ssc-notes' }
    ]
  }
})
