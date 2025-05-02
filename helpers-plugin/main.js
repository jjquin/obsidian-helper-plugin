var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => HelpersPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var HelpersPlugin = class extends import_obsidian.Plugin {
  sharedValues = {};
  async onload() {
    console.log("Helpers Plugin loaded");
    this.app.plugins.plugins["helpers-plugin"] = {
      sanitizeTime: this.sanitizeTime.bind(this),
      calculateDuration: this.calculateDuration.bind(this),
      createUniqueId: this.createUniqueId.bind(this),
      formatLinks: this.formatLinks.bind(this),
      formatWebLinks: this.formatWebLinks.bind(this),
      cleanLink: this.cleanLink.bind(this),
      setTemplateValues: this.setTemplateValues.bind(this),
      getTemplateValues: this.getTemplateValues.bind(this),
      moveFile: this.moveFile.bind(this),
      openFileInTab: this.openFileInTab.bind(this),
      openModalForm: this.openModalForm.bind(this),
      getNoteType: this.getNoteType.bind(this),
      getNoteContext: this.getNoteContext.bind(this),
      getJsonObject: this.getJsonObject.bind(this),
      createDailyLogEntry: this.createDailyLogEntry.bind(this)
    };
  }
  onunload() {
    console.log("Helpers Plugin unloaded");
    delete this.app.plugins.plugins["helpers-plugin"];
  }
  sanitizeTime(inputTime) {
    const moment = window.moment;
    const currentTime = moment().format("HH:mm");
    const momentTime = moment(inputTime, ["h:mm A", "HH:mm", "h:mm"], true);
    return !inputTime || !momentTime.isValid() ? currentTime : momentTime.format("HH:mm");
  }
  calculateDuration(startDate, startTime, endDate, endTime) {
    const moment = window.moment;
    const startDateTime = moment(`${startDate} ${startTime}`, "YYYY-MM-DD HH:mm");
    let endDateTime = moment(`${endDate} ${endTime}`, "YYYY-MM-DD HH:mm");
    if (endDateTime.isBefore(startDateTime)) {
      endDateTime = endDateTime.add(1, "day");
    }
    const durationMinutes = endDateTime.diff(startDateTime, "minutes");
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }
  createUniqueId(prefix) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let num = parseInt(window.moment().format("X"));
    let result = "";
    do {
      result = chars[num % 62] + result;
      num = Math.floor(num / 62);
    } while (num > 0);
    const idPart = result;
    const prefixPart = prefix ? `${prefix}-` : "";
    return `${prefixPart}${idPart}`;
  }
  formatLinks(value, suppressQuotes = false) {
    const app = this.app;
    const wrap = (s) => suppressQuotes ? s : `"${s}"`;
    const format = (v) => {
      const stripped = typeof v === "string" ? v.replace(/^"|"$/g, "") : "";
      if (!stripped.trim()) return null;
      const file = app.metadataCache.getFirstLinkpathDest(stripped, "");
      if (!file) return wrap(`[[${stripped}]]`);
      const ext = file.extension?.toLowerCase();
      if (ext && ext !== "md") {
        const prefix = ["png", "jpg", "jpeg", "gif", "svg"].includes(ext) ? "!" : "";
        return wrap(`${prefix}[[${file.name}]]`);
      }
      const title = app.metadataCache.getFileCache(file)?.frontmatter?.Title;
      return wrap(title && title.trim() && title !== file.basename ? `[[${file.basename}|${title}]]` : `[[${file.basename}]]`);
    };
    if (typeof value === "string") {
      return value.trim() ? format(value) : null;
    }
    if (Array.isArray(value)) {
      const filtered = value.map((v) => typeof v === "string" ? v.trim() : "").filter(Boolean);
      if (filtered.length === 0) return null;
      return filtered.map(format).filter(Boolean);
    }
    return null;
  }
  formatWebLinks(input, suppressQuotes = false) {
    if (!input) return "";
    const wrap = (s) => suppressQuotes ? s : `"${s}"`;
    const format = (url) => {
      if (!url) return "";
      try {
        const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
        const parsed = new URL(cleanUrl);
        const host = parsed.hostname.replace(/^www\./, "");
        const domain = host.split(".")[0];
        return wrap(`[${domain.charAt(0).toUpperCase() + domain.slice(1)}](${url})`);
      } catch (e) {
        return wrap(url);
      }
    };
    if (typeof input === "string") {
      return input.includes("\n") ? input.split("\n").map((line) => format(line.trim())) : format(input);
    }
    if (Array.isArray(input)) return input.map((url) => format(url.trim()));
    return "";
  }
  cleanLink(linkText) {
    if (!linkText) return null;
    const clean = linkText.replace(/^\[\[/, "").replace(/\]\]$/, "");
    const [filename, displayRaw] = clean.split("|");
    const display = displayRaw || filename;
    return {
      filename: filename.trim(),
      display: display.trim()
    };
  }
  setTemplateValues(data) {
    this.sharedValues = { ...data };
  }
  getTemplateValues(clear = true) {
    const result = { ...this.sharedValues };
    if (clear) this.sharedValues = {};
    return Object.keys(result).length ? result : null;
  }
  async moveFile(currentPath, newTitle, newFolder) {
    const app = this.app;
    const abstractFile = app.vault.getAbstractFileByPath(currentPath);
    if (!abstractFile) {
      new import_obsidian.Notice("File not found.");
      return null;
    }
    let cleanedTitle = newTitle.replace(/&/g, "n").replace(/'/g, "").replace(/[^a-zA-Z0-9.\-_ ]/g, (match, offset, string) => {
      const prevChar = string[offset - 1];
      const nextChar = string[offset + 1];
      if (prevChar && nextChar && /[a-zA-Z0-9]/.test(prevChar) && /[a-zA-Z0-9]/.test(nextChar)) {
        return "-";
      } else {
        return " ";
      }
    }).trim().replace(/\s+/g, " ");
    const newFilePath = `${newFolder}/${cleanedTitle}.md`;
    if (abstractFile.path === newFilePath) {
      return newFilePath;
    }
    try {
      await app.fileManager.renameFile(abstractFile, newFilePath);
      new import_obsidian.Notice(`File moved successfully to ${newFilePath}`);
      return newFilePath;
    } catch (error) {
      new import_obsidian.Notice(`Error processing file ${abstractFile.path}: ${error.message}`);
      console.error(error);
      return null;
    }
  }
  async openFileInTab(path) {
    const app = this.app;
    const leafs = app.workspace.getLeavesOfType("markdown");
    for (const leaf of leafs) {
      if (leaf.view?.file?.path === path) {
        app.workspace.setActiveLeaf(leaf, true);
        const editor = leaf.view?.editor;
        if (editor) editor.cm.focus();
        return;
      }
    }
    const newLeaf = app.workspace.getLeaf("tab");
    const file = app.vault.getAbstractFileByPath(path);
    if (file) {
      await newLeaf.openFile(file);
      app.workspace.setActiveLeaf(newLeaf, true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const view = newLeaf.view;
      const editor = view?.editor;
      if (editor) editor.cm.focus();
    } else {
      new import_obsidian.Notice(`File not found: ${path}`);
    }
  }
  async openModalForm({ formName, defaultValues = {}, fileToDelete = null }) {
    const app = this.app;
    const modal = app.plugins.plugins.modalforms.api;
    const file = typeof fileToDelete === "string" ? app.vault.getAbstractFileByPath(fileToDelete) : fileToDelete;
    const result = await modal.openForm(formName, { values: defaultValues });
    if (result?.status === "cancelled") {
      if (file && !file.path.startsWith("Toolbox/Templates")) {
        await app.vault.trash(file, true);
      }
      return null;
    }
    return result;
  }
  async getNoteType(key, value) {
    const file = this.app.vault.getAbstractFileByPath("Toolbox/Lookups/noteTypeOptions.json");
    if (!file) {
      new import_obsidian.Notice("noteTypeOptions.json not found.");
      return null;
    }
    try {
      const content = await this.app.vault.read(file);
      const noteTypes = JSON.parse(content)?.noteTypes;
      if (!Array.isArray(noteTypes)) {
        new import_obsidian.Notice("noteTypeOptions.json is not formatted correctly.");
        return null;
      }
      if (!key && !value) return noteTypes;
      return noteTypes.find((item) => item[key] === value) || null;
    } catch (err) {
      console.error("Failed to read or parse noteTypeOptions.json", err);
      new import_obsidian.Notice("Error reading note type options.");
      return null;
    }
  }
  async getNoteContext(path = null, mode = "frontmatter") {
    const file = path ? this.app.vault.getAbstractFileByPath(path) : this.app.workspace.getActiveFile();
    if (!file) return { activeFile: null };
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    if (mode === "frontmatter") {
      return { file, frontmatter };
    }
    const contents = await this.app.vault.read(file);
    return { file, frontmatter, contents };
  }
  async getJsonObject(filepath, key = null) {
    const app = this.app;
    try {
      const raw = await app.vault.adapter.read(filepath);
      const json = JSON.parse(raw);
      return key ? json[key] ?? null : json;
    } catch (e) {
      console.error("Failed to read JSON config", filepath, e);
      return null;
    }
  }
  async createDailyLogEntry(api, logLine, dateString = null) {
    const moment = window.moment;
    const date = dateString || moment().format("YYYY-MM-DD");
    await api.executeChoice("Daily Journal Capture", {
      logLine,
      logDate: date
    });
  }
};
