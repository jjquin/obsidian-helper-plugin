// main.ts — Helpers Plugin for Obsidian
import { Plugin, Notice } from "obsidian";

export default class HelpersPlugin extends Plugin {
    private sharedValues: Record<string, any> = {};

    async onload() {
        console.log("Helpers Plugin loaded");

        (this.app as any).plugins.plugins["helpers-plugin"] = {
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
        let num = parseInt((window as any).moment().format('X'));
        let result = "";

        do {
            result = chars[num % 62] + result;
            num = Math.floor(num / 62);
        } while (num > 0);

        const idPart = result;
        const prefixPart = prefix ? `${prefix}-` : "";

        return `${prefixPart}${idPart}`;
    }

    formatLinks(value: string | string[], suppressQuotes = false): string | string[] {
        const app = this.app;
        const wrap = (s: string) => suppressQuotes ? s : `"${s}"`;

        const format = (v: string) => {
            const stripped = typeof v === "string" ? v.replace(/^"|"$/g, "") : "";
            const file = app.metadataCache.getFirstLinkpathDest(stripped, "");
            if (!file) return wrap(`[[${stripped}]]`);

            const ext = file.extension?.toLowerCase();
            if (ext && ext !== "md") {
                const prefix = ["png", "jpg", "jpeg", "gif", "svg"].includes(ext) ? "!" : "";
                return wrap(`${prefix}[[${file.name}]]`);
            }

            const title = app.metadataCache.getFileCache(file)?.frontmatter?.Title;
            return wrap(title && title.trim() && title !== file.basename
            ? `[[${file.basename}|${title}]]`
            : `[[${file.basename}]]`);
        };

        return Array.isArray(value) ? value.map(format).filter(Boolean) : format(value);
    }

    formatWebLinks(input: string | string[], suppressQuotes = false): string | string[] {
        if (!input) return "";
        const wrap = (s: string) => suppressQuotes ? s : `"${s}"`;

        const format = (url: string) => {
            if (!url) return "";
            try {
                const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
                const parsed = new URL(cleanUrl);
                const host = parsed.hostname.replace(/^www\./, "");
                const domain = host.split('.')[0];
                return wrap(`[${domain.charAt(0).toUpperCase() + domain.slice(1)}](${url})`);
            } catch (e) {
                return wrap(url);
            }
        };

        if (typeof input === "string") {
            return input.includes("\n") ? input.split("\n").map(line => format(line.trim())) : format(input);
        }
        if (Array.isArray(input)) return input.map(url => format(url.trim()));
        return "";
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

    setTemplateValues(data: Record<string, any>): void {
        this.sharedValues = { ...data };
    }

    getTemplateValues(clear: boolean = true): Record<string, any> | null {
        const result = { ...this.sharedValues };
        if (clear) this.sharedValues = {};
        return Object.keys(result).length ? result : null;
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

    async openModalForm({ formName, defaultValues = {}, fileToDelete = null }): Promise<any | null> {
        const app = this.app;
        const modal = (app as any).plugins.plugins.modalforms.api;
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

    async getNoteType(key?: string, value?: string): Promise<any | null> {
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

            if (!key && !value) return noteTypes;

            return noteTypes.find((item: any) => item[key] === value) || null;
        } catch (err) {
            console.error("Failed to read or parse noteTypeOptions.json", err);
            new Notice("Error reading note type options.");
            return null;
        }
    }

    async getNoteContext(path: string | null = null, mode: string = "frontmatter"): Promise<any | null> {
        const file = path
            ? this.app.vault.getAbstractFileByPath(path)
            : this.app.workspace.getActiveFile();

        if (!file) return { activeFile: null };

        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};

        if (mode === "frontmatter") {
            return { file, frontmatter };
        }

        const contents = await this.app.vault.read(file);
        return { file, frontmatter, contents };
    }

    async getJsonObject(filepath: string, key: string | null = null): Promise<any | null> {
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

    async createDailyLogEntry(api: any, logLine: string, dateString: string | null = null): Promise<void> {
        const moment = (window as any).moment;
        const date = dateString || moment().format("YYYY-MM-DD");

        await api.executeChoice("Daily Journal Capture", {
            logLine,
            logDate: date
        });
    }
}
