// main.ts — Helpers Plugin for Obsidian
import { Plugin } from "obsidian";

export default class HelpersPlugin extends Plugin {
    async onload() {
        console.log("Helpers Plugin loaded");

        // Make helpers globally accessible
        (this.app as any).plugins.plugins["helpers-plugin"] = {
            sanitizeTime: this.sanitizeTime.bind(this),
            formatLink: this.formatLink.bind(this),
            moveFile: this.moveFile.bind(this),
            calculateDuration: this.calculateDuration.bind(this),
        };
    }

    onunload() {
        console.log("Helpers Plugin unloaded");
        delete (this.app as any).plugins.plugins["helpers-plugin"];
    }

    // === Helper: Sanitize Time ===
    sanitizeTime(inputTime: string): string {
        const moment = (window as any).moment;
        const currentTime = moment().format("HH:mm");
        const momentTime = moment(inputTime, ["h:mm A", "HH:mm", "h:mm"], true);
        return (!inputTime || !momentTime.isValid())
            ? currentTime
            : momentTime.format("HH:mm");
    }

    // === Helper: Format Link ===
    formatLink(value: string): string {
        const app = this.app;
        const file = app.metadataCache.getFirstLinkpathDest(value, "");
        if (!file) return `[[${value}]]`;
        const title = app.metadataCache.getFileCache(file)?.frontmatter?.Title;
        if (title && title.trim() && title !== file.basename) {
            return `[[${file.basename}|${title}]]`;
        }
        return `[[${file.basename}]]`;
    }

    // === Helper: Move File ===
    async moveFile(currentPath: string, newTitle: string, newFolder: string): Promise<string | null> {
        const app = this.app;
        const abstractFile = app.vault.getAbstractFileByPath(currentPath);

        if (!abstractFile) {
            new Notice("File not found.");
            return null;
        }

        // Clean the title
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

    // === Helper: Calculate Duration ===
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
}
