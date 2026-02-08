# 📚 AI Notes Master

A modern, fast, and aesthetic notes maker and study platform built with [VitePress](https://vitepress.dev/). Designed for advanced study management with integrated AI quiz generation and print-optimized layouts.

## 🌐 Official Website
**Live at:** [https://rakeshvytla9.github.io/ssc-notes/](https://rakeshvytla9.github.io/ai-notes-master/)

---

## ✨ Features
- **AI Practice Quizzes:** Selective section-based quiz generation powered by Gemini/ChatGPT.
- **Aesthetic Dark Mode:** A themed deep-black interface designed for long study hours.
- **Smart Search:** Localized search to find formulas and topics instantly.
- **Math LaTeX Support:** Beautifully rendered mathematical equations via MathJax.
- **One-Click Print:** Global "Print this Page" button with optimized layouts for clean physical notes.
- **Automated Navigation:** Just add a Markdown file, and it automatically appears in the sidebar.

## 📂 Project Structure
- `docs/`: Source directory for your notes.
  - `maths/`, `reasoning/`, `english/`, `ga/`: Subject-wise organized notes.
  - `.vitepress/`: System configuration, theme, and aesthetic styling.

## 🛠️ How to Make Notes
1. Create a new `.md` file in the appropriate folder (e.g., `docs/maths/Algebra.md`).
2. Add your content using standard Markdown.
3. Use the **[Select for AI]** checkboxes on the live site to generate quizzes from your new notes.
4. Commit and push:
   ```bash
   git add .
   git commit -m "Add algebra notes"
   git push
   ```

## 💻 Local Development
```bash
npm install
npm run docs:dev
```

---

## 📜 License
This project is licensed under the ISC License.
