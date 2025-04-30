// main.ts — Helpers Plugin for Obsidian
import { Plugin, Notice } from "obsidian";

export default class HelpersPlugin extends Plugin {
    async onload() {
        console.log("Helpers Plugin loaded");

        (this.app as any).plugins.plugins["helpers-plugin"] = {
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
        delete (this.app as any).plugins.plugins["helpers-plugin"];
    }

    sanitizeTime(inputTime: string): string {
        const moment = (window as any).moment;
        const currentTime = moment().format("HH:mm");
        const momentTime = moment(inputTime, ["h:mm A", "HH:mm", "h:mm"], true);
        return (!inputTime || !momentTime.isValid())
        ? currentTime
        : momentTime.format("HH:mm");
    }

    formatLink(value: string): string {
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

    formatWebLink(url: string): string {
        if (!url) return "";

        try {
            const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
            const parsed = new URL(cleanUrl);
            let hostname = parsed.hostname.replace(/^www\./, "");

            const parts = hostname.split('.');
            const domain = parts.length > 2 ? parts.slice(-2, -1)[0] : parts[0];
            const displayName = domain.charAt(0).toUpperCase() + domain.slice(1);

            return `"[${displayName}](${url})"`;
        } catch (e) {
            console.warn("Invalid URL passed to formatWebLink:", url);
            return url;
        }
    }

    async moveFile(currentPath: string, newTitle: string, newFolder: string): Promise<string | null> {
        const app = this.app;
        const abstractFile = app.vault.getAbstractFileByPath(currentPath);

        if (!abstractFile) {
            new Notice("File not found.");
            return null;
        }

        let cleanedTitle = newTitle
        .replace(/&/g, "n")
        .replace(/'/g, "")
        .replace(/[^a-zA-Z0-9.\-_ ]/g, (match, offset, string) => {
            const prevChar = string[offset - 1];
            const nextChar = string[offset + 1];
            if (prevChar && nextChar && /[a-zA-Z0-9]/.test(prevChar) && /[a-zA-Z0-9]/.test(nextChar)) {
                return "-";
            } else {
                return " ";
            }
        })
        .trim()
        .replace(/\s+/g, " ");

        const newFilePath = `${newFolder}/${cleanedTitle}.md`;

        if (abstractFile.path === newFilePath) {
            return newFilePath;
        }

        try {
            await app.fileManager.renameFile(abstractFile, newFilePath);
            new Notice(`File moved successfully to ${newFilePath}`);
            return newFilePath;
        } catch (error: any) {
            new Notice(`Error processing file ${abstractFile.path}: ${error.message}`);
            console.error(error);
            return null;
        }
    }

    calculateDuration(startDate: string, startTime: string, endDate: string, endTime: string): string {
        const moment = (window as any).moment;
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

    createUniqueId(prefix?: string): string {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let num = (window as any).moment().format('X');
        let result = "";

        do {
            result = chars[num % 62] + result;
            num = Math.floor(num / 62);
        } while (num > 0);

        const idPart = result;
        const prefixPart = prefix ? `${prefix}-` : "";

        return `🆔 ${prefixPart}${idPart}`;
    }

    async openFileInTab(path: string): Promise<void> {
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

            await new Promise(resolve => setTimeout(resolve, 100));
            const view = newLeaf.view;
            const editor = view?.editor;
            if (editor) editor.cm.focus();
        } else {
            new Notice(`File not found: ${path}`);
        }
    }

    async getNoteType(key: string, value: string): Promise<any | null> {
        const file = this.app.vault.getAbstractFileByPath("Toolbox/Lookups/noteTypeOptions.json");
        if (!file) {
            new Notice("noteTypeOptions.json not found.");
            return null;
        }

        try {
            const content = await this.app.vault.read(file);
            const noteTypes = JSON.parse(content)?.noteTypes;
            if (!Array.isArray(noteTypes)) {
                new Notice("noteTypeOptions.json is not formatted correctly.");
                return null;
            }

            return noteTypes.find((item: any) => item[key] === value) || null;
        } catch (err) {
            console.error("Failed to read or parse noteTypeOptions.json", err);
            new Notice("Error reading note type options.");
            return null;
        }
    }

    getActiveNoteContext(mode: string = "both"): any | null {
        const app = this.app;
        const activeFile = app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active file.");
            return null;
        }

        const context: any = { activeFile };

        if (mode === "frontmatter" || mode === "both") {
            context.frontmatter = app.metadataCache.getFileCache(activeFile)?.frontmatter || {};
        }

        if (mode === "contents" || mode === "both") {
            context.contents = app.vault.read(activeFile); // returns a Promise
        }

        return context;
    }

    cleanLink(linkText: string): { filename: string, display: string } | null {
        if (!linkText) return null;

        const clean = linkText.replace(/^\[\[/, "").replace(/\]\]$/, "");
        const [filename, displayRaw] = clean.split("|");
        const display = displayRaw || filename;

        return {
            filename: filename.trim(),
            display: display.trim()
        };
    }

}
