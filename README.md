# 📚 SSC Notes Website

A modern, fast, and aesthetic documentation site built with [VitePress](https://vitepress.dev/) to host comprehensive study material for SSC exams (CGL, CHSL, CPO, MTS).

## 🌐 Official Website
**Live at:** [https://rakeshvytla9.github.io/ssc-notes/](https://rakeshvytla9.github.io/ssc-notes/)

---

## ✨ Features
- **Aesthetic Dark Mode:** A themed deep-black interface designed for long study hours.
- **Smart Search:** Localized search to find formulas and topics instantly.
- **Math LaTeX Support:** Beautifully rendered mathematical equations via MathJax.
- **One-Click Print:** Global "Print this Page" button with optimized layouts for clean physical notes.
- **Automated Navigation:** Just add a Markdown file, and it automatically appears in the sidebar.
- **Auto-Deployment:** Changes pushed to GitHub are automatically deployed via GitHub Actions.

## 📂 Project Structure
- `docs/`: Source directory for the website.
  - `maths/`: Mathematics notes (e.g., Number System).
  - `reasoning/`, `english/`, `ga/`: Placeholder directories for other subjects.
  - `.vitepress/`: Website configuration, theme, and styling.
    - `config.mts`: Main configuration logic (Search, Sidebar automation).
    - `theme/`: Custom Vue theme and aesthetic CSS.

## 🛠️ How to Add Notes
1. Create a new `.md` file in the appropriate subject folder (e.g., `docs/reasoning/Coding-Decoding.md`).
2. Add your content using standard Markdown. Use `$` for inline math and `$$` for block math.
3. Commit and push:
   ```bash
   git add .
   git commit -m "Add notes for Coding-Decoding"
   git push
   ```

## 💻 Local Development
If you want to preview the site locally:

```bash
# Install dependencies
npm install

# Run dev server
npm run docs:dev
```
Site will be available at `http://localhost:5173/ssc-notes/`

---

## 📜 License
This project is licensed under the ISC License.
