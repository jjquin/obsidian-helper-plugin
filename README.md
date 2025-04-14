# Helpers Plugin for Obsidian

Reusable helper functions for my Obsidian scripts, QuickAdd macros, and Templater templates.

This plugin centralizes common functions like time sanitization, filename cleaning, moving files, and formatting links for internal use across all my automation scripts.

## 📂 Structure

```
helpers-plugin/          <- GitHub repository root
├── helpers-plugin/      <- Compiled plugin for Obsidian
│   ├── main.js
│   ├── manifest.json
│   └── styles.css
├── main.ts              <- Source TypeScript file (editable!)
├── .github/
│   └── workflows/
│       └── build.yml    <- GitHub Actions for auto-compilation
├── README.md            <- You are here!
```

## 🚀 Usage

### In your Obsidian scripts or templates:

```javascript
const helpers = app.plugins.plugins["helpers-plugin"];

// Sanitize time to HH:mm format
const time = helpers.sanitizeTime("5:12 pm");

// Format an internal link to a note
const link = helpers.formatLink("MyNote");

// Move a file (returns new path if success, null if error)
const newPath = await helpers.moveFile(
    "Folder/OldFile.md",
    "Cleaned New Title",
    "Folder/NewLocation"
);

// Calculate duration between two dates and times
const duration = helpers.calculateDuration(
    "2025-04-13", // startDate
    "23:15",     // startTime
    "2025-04-14", // endDate
    "01:30"      // endTime
);
```

## ⚙️ Adding New Helpers

1. Edit `main.ts` in the repository root.
2. Add your helper function.
3. Push to GitHub.
4. ✅ GitHub Actions will **automatically compile** and update `helpers-plugin/main.js`.

No manual compilation needed!

## 🧩 Installation in Obsidian

1. In GitHub, click **"Code → Download ZIP"**.
2. Extract `helpers-plugin/helpers-plugin/` to:
   ```
   .obsidian/plugins/helpers-plugin/
   ```
3. Enable **Helpers Plugin** in Obsidian settings.
4. ✅ Your helpers are now available in any QuickAdd, Templater, or other scripts.

## 🤖 GitHub Actions: Auto-Compile

This repository is configured with **GitHub Actions**.
- Whenever you update `main.ts`, GitHub will automatically run the build and update `helpers-plugin/main.js`.
- You don't need to compile locally!

---

## 📌 Notes

- This plugin is for **internal use** inside my Obsidian vault.
- No external API calls or dangerous operations.
- Safe to keep public, as it contains no private data.

---

## ✅ To Do

- [ ] Add more helpers as needed from other automation scripts.
- [ ] (Optional) Add helper for general filename sanitization outside moveFile.
- [ ] Maintain clear function documentation inside `main.ts`.

---

Built for personal automation and to reduce duplication across all Obsidian workflows.
