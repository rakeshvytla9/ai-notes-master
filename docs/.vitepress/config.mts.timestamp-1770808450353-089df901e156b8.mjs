// docs/.vitepress/config.mts
import { defineConfig } from "file:///Users/rakeshmohan/Documents/GitHub/ai-notes-master/node_modules/vitepress/dist/node/index.js";
import fs from "fs";
import path from "path";
import mathjax3 from "file:///Users/rakeshmohan/Documents/GitHub/ai-notes-master/node_modules/markdown-it-mathjax3/index.js";
function getSidebarItems(dir) {
  const fullPath = path.join(process.cwd(), "docs", dir);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  return fs.readdirSync(fullPath).filter((file) => file.endsWith(".md") && file !== "index.md").map((file) => {
    const name = file.replace(".md", "");
    return { text: name, link: `/${dir}/${name}` };
  });
}
var config_default = defineConfig({
  title: "AI Notes Master",
  description: "Comprehensive study material with AI-assisted practice for SSC Exams",
  base: "/ai-notes-master/",
  // High-end aesthetic defaults
  appearance: "dark",
  lastUpdated: true,
  markdown: {
    config: (md) => {
      md.use(mathjax3);
    }
  },
  themeConfig: {
    // New Feature: Local Search
    search: {
      provider: "local"
    },
    // New Feature: Edit Link
    editLink: {
      pattern: "https://github.com/rakeshvytla9/ai-notes-master/edit/main/docs/:path",
      text: "Edit this page on GitHub"
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Dashboard", link: "/dashboard" },
      { text: "Maths", link: "/maths/" },
      { text: "Reasoning", link: "/reasoning/" },
      { text: "English", link: "/english/" },
      { text: "GA", link: "/ga/" }
    ],
    sidebar: {
      "/maths/": [
        {
          text: "Mathematics",
          items: getSidebarItems("maths")
        }
      ],
      "/reasoning/": [
        {
          text: "Reasoning",
          items: getSidebarItems("reasoning")
        }
      ],
      "/english/": [
        {
          text: "English",
          items: getSidebarItems("english")
        }
      ],
      "/ga/": [
        {
          text: "General Awareness",
          items: getSidebarItems("ga")
        }
      ]
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/rakeshvytla9/ai-notes-master" }
    ],
    footer: {
      message: "Released under the ISC License.",
      copyright: "Copyright \xA9 2024-present Rakesh Mohan"
    }
  }
});
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiZG9jcy8udml0ZXByZXNzL2NvbmZpZy5tdHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcmFrZXNobW9oYW4vRG9jdW1lbnRzL0dpdEh1Yi9haS1ub3Rlcy1tYXN0ZXIvZG9jcy8udml0ZXByZXNzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvcmFrZXNobW9oYW4vRG9jdW1lbnRzL0dpdEh1Yi9haS1ub3Rlcy1tYXN0ZXIvZG9jcy8udml0ZXByZXNzL2NvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3Jha2VzaG1vaGFuL0RvY3VtZW50cy9HaXRIdWIvYWktbm90ZXMtbWFzdGVyL2RvY3MvLnZpdGVwcmVzcy9jb25maWcubXRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXByZXNzJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBtYXRoamF4MyBmcm9tICdtYXJrZG93bi1pdC1tYXRoamF4MydcblxuZnVuY3Rpb24gZ2V0U2lkZWJhckl0ZW1zKGRpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkb2NzJywgZGlyKVxuXG4gIGlmICghZnMuZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICByZXR1cm4gW11cbiAgfVxuXG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmdWxsUGF0aClcbiAgICAuZmlsdGVyKGZpbGUgPT4gZmlsZS5lbmRzV2l0aCgnLm1kJykgJiYgZmlsZSAhPT0gJ2luZGV4Lm1kJylcbiAgICAubWFwKGZpbGUgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGZpbGUucmVwbGFjZSgnLm1kJywgJycpXG4gICAgICByZXR1cm4geyB0ZXh0OiBuYW1lLCBsaW5rOiBgLyR7ZGlyfS8ke25hbWV9YCB9XG4gICAgfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgdGl0bGU6IFwiQUkgTm90ZXMgTWFzdGVyXCIsXG4gIGRlc2NyaXB0aW9uOiBcIkNvbXByZWhlbnNpdmUgc3R1ZHkgbWF0ZXJpYWwgd2l0aCBBSS1hc3Npc3RlZCBwcmFjdGljZSBmb3IgU1NDIEV4YW1zXCIsXG4gIGJhc2U6IFwiL2FpLW5vdGVzLW1hc3Rlci9cIixcblxuICAvLyBIaWdoLWVuZCBhZXN0aGV0aWMgZGVmYXVsdHNcbiAgYXBwZWFyYW5jZTogJ2RhcmsnLFxuICBsYXN0VXBkYXRlZDogdHJ1ZSxcblxuICBtYXJrZG93bjoge1xuICAgIGNvbmZpZzogKG1kKSA9PiB7XG4gICAgICBtZC51c2UobWF0aGpheDMpXG4gICAgfVxuICB9LFxuXG4gIHRoZW1lQ29uZmlnOiB7XG4gICAgLy8gTmV3IEZlYXR1cmU6IExvY2FsIFNlYXJjaFxuICAgIHNlYXJjaDoge1xuICAgICAgcHJvdmlkZXI6ICdsb2NhbCdcbiAgICB9LFxuXG4gICAgLy8gTmV3IEZlYXR1cmU6IEVkaXQgTGlua1xuICAgIGVkaXRMaW5rOiB7XG4gICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9naXRodWIuY29tL3Jha2VzaHZ5dGxhOS9haS1ub3Rlcy1tYXN0ZXIvZWRpdC9tYWluL2RvY3MvOnBhdGgnLFxuICAgICAgdGV4dDogJ0VkaXQgdGhpcyBwYWdlIG9uIEdpdEh1YidcbiAgICB9LFxuXG4gICAgbmF2OiBbXG4gICAgICB7IHRleHQ6ICdIb21lJywgbGluazogJy8nIH0sXG4gICAgICB7IHRleHQ6ICdEYXNoYm9hcmQnLCBsaW5rOiAnL2Rhc2hib2FyZCcgfSxcbiAgICAgIHsgdGV4dDogJ01hdGhzJywgbGluazogJy9tYXRocy8nIH0sXG4gICAgICB7IHRleHQ6ICdSZWFzb25pbmcnLCBsaW5rOiAnL3JlYXNvbmluZy8nIH0sXG4gICAgICB7IHRleHQ6ICdFbmdsaXNoJywgbGluazogJy9lbmdsaXNoLycgfSxcbiAgICAgIHsgdGV4dDogJ0dBJywgbGluazogJy9nYS8nIH1cbiAgICBdLFxuXG4gICAgc2lkZWJhcjoge1xuICAgICAgJy9tYXRocy8nOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnTWF0aGVtYXRpY3MnLFxuICAgICAgICAgIGl0ZW1zOiBnZXRTaWRlYmFySXRlbXMoJ21hdGhzJylcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICcvcmVhc29uaW5nLyc6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6ICdSZWFzb25pbmcnLFxuICAgICAgICAgIGl0ZW1zOiBnZXRTaWRlYmFySXRlbXMoJ3JlYXNvbmluZycpXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAnL2VuZ2xpc2gvJzogW1xuICAgICAgICB7XG4gICAgICAgICAgdGV4dDogJ0VuZ2xpc2gnLFxuICAgICAgICAgIGl0ZW1zOiBnZXRTaWRlYmFySXRlbXMoJ2VuZ2xpc2gnKVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJy9nYS8nOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnR2VuZXJhbCBBd2FyZW5lc3MnLFxuICAgICAgICAgIGl0ZW1zOiBnZXRTaWRlYmFySXRlbXMoJ2dhJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG5cbiAgICBzb2NpYWxMaW5rczogW1xuICAgICAgeyBpY29uOiAnZ2l0aHViJywgbGluazogJ2h0dHBzOi8vZ2l0aHViLmNvbS9yYWtlc2h2eXRsYTkvYWktbm90ZXMtbWFzdGVyJyB9XG4gICAgXSxcblxuICAgIGZvb3Rlcjoge1xuICAgICAgbWVzc2FnZTogJ1JlbGVhc2VkIHVuZGVyIHRoZSBJU0MgTGljZW5zZS4nLFxuICAgICAgY29weXJpZ2h0OiAnQ29weXJpZ2h0IFx1MDBBOSAyMDI0LXByZXNlbnQgUmFrZXNoIE1vaGFuJ1xuICAgIH1cbiAgfVxufSlc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
