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
  async onload() {
    console.log("Helpers Plugin loaded");
    this.app.plugins.plugins["helpers-plugin"] = {
      sanitizeTime: this.sanitizeTime.bind(this),
      formatLink: this.formatLink.bind(this),
      formatWebLink: this.formatWebLink.bind(this),
      moveFile: this.moveFile.bind(this),
      calculateDuration: this.calculateDuration.bind(this),
      createUniqueId: this.createUniqueId.bind(this),
      openFileInTab: this.openFileInTab.bind(this),
      getNoteType: this.getNoteType.bind(this),
      getActiveNoteContext: this.getActiveNoteContext.bind(this),
      cleanLinkName: this.cleanLinkName.bind(this)
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
  formatLink(value) {
    const app = this.app;
    const file = app.metadataCache.getFirstLinkpathDest(value, "");
    if (!file) return `"[[${value}]]"`;
    const extension = file.extension?.toLowerCase();
    if (extension !== "md") {
      const isImage = ["png", "jpg", "jpeg", "gif", "svg"].includes(extension);
      const prefix = isImage ? "!" : "";
      return `"${prefix}[[${file.name}]]"`;
    }
    const title = app.metadataCache.getFileCache(file)?.frontmatter?.Title;
    if (title && title.trim() && title !== file.basename) {
      return `"[[${file.basename}|${title}]]"`;
    }
    return `"[[${file.basename}]]"`;
  }
  formatWebLink(url) {
    if (!url) return "";
    try {
      const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
      const parsed = new URL(cleanUrl);
      let hostname = parsed.hostname.replace(/^www\./, "");
      const parts = hostname.split(".");
      const domain = parts.length > 2 ? parts.slice(-2, -1)[0] : parts[0];
      const displayName = domain.charAt(0).toUpperCase() + domain.slice(1);
      return `"[${displayName}](${url})"`;
    } catch (e) {
      console.warn("Invalid URL passed to formatWebLink:", url);
      return url;
    }
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
    let num = window.moment().format("X");
    let result = "";
    do {
      result = chars[num % 62] + result;
      num = Math.floor(num / 62);
    } while (num > 0);
    const idPart = result;
    const prefixPart = prefix ? `${prefix}-` : "";
    return `\u{1F194} ${prefixPart}${idPart}`;
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
      return noteTypes.find((item) => item[key] === value) || null;
    } catch (err) {
      console.error("Failed to read or parse noteTypeOptions.json", err);
      new import_obsidian.Notice("Error reading note type options.");
      return null;
    }
  }
  getActiveNoteContext(mode = "both") {
    const app = this.app;
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
      new import_obsidian.Notice("No active file.");
      return null;
    }
    const context = { activeFile };
    if (mode === "frontmatter" || mode === "both") {
      context.frontmatter = app.metadataCache.getFileCache(activeFile)?.frontmatter || {};
    }
    if (mode === "contents" || mode === "both") {
      context.contents = app.vault.read(activeFile);
    }
    return context;
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
};
