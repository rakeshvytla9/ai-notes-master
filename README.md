# 📚 AI Notes Master

A modern, fast, and aesthetic notes maker and study platform built with [VitePress](https://vitepress.dev/). Designed for comprehensive study material with AI-assisted practice and print-optimized layouts.

## 🌐 Official Website
**Live at:** [https://rakeshvytla9.github.io/ai-notes-master/](https://rakeshvytla9.github.io/ai-notes-master/)

---

## ✨ Features
- **AI Practice Quizzes:** Generate targeted quizzes from any topic by selecting it in the Table of Contents.
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
3. Use the checkboxes in the **On this page** section on the live site to select topics for AI quizzes.
4. Commit and push:
   ```bash
   git add .
   git commit -m "Add algebra notes"
   git push
   ```

## 💻 Local Development

1. **Clone and Install:**
    ```bash
    git clone https://github.com/rakeshvytla9/ai-notes-master.git
    cd ai-notes-master
    npm install
    ```

2. **Configure API Key (YouTube Data API v3):**
    - **Option A (Recommended):** Create a `.env` file in the root directory:
      ```
      VITE_YOUTUBE_API_KEY=your_api_key_here
      ```
    - **Option B (Manual):** Go to the **Dashboard -> Settings** tab in the running app and enter your key manually.

3. **Run Dev Server:**
    ```bash
    npm run docs:dev
    ```

---

## 📜 License
This project is licensed under the ISC License.
