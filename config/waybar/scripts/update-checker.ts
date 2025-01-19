#!/usr/bin/env bun
import { spawnSync } from "child_process";
import { existsSync } from "fs";

interface WaybarOutput {
    text: string;
    tooltip: string;
    class?: string;
}

// Helper function to check if a command exists
function checkCommand(command: string): boolean {
    const result = spawnSync("which", [command], { encoding: "utf8" });
    return result.status === 0;
}

// Notification function using notify-send
function notify(message: string): void {
    if (checkCommand("notify-send")) {
        spawnSync("notify-send", ["-a", "UpdateCheck Waybar", message]);
    }
    console.error(message);
}

// Format string to specific length with ellipsis if needed
function stringToLen(str: string, len: number): string {
    if (str.length > len) {
        return str.slice(0, len - 2) + "..";
    }
    return str.padEnd(len);
}

// Function to check updates for Pacman
function checkPacmanUpdates(): string[] {
    const result = spawnSync("checkupdates", [], {
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
    });

    if (result.status !== 0) {
        return [];
    }

    return (result.stdout || "").trim().split("\n").filter(Boolean);
}

// Function to check updates for Paru
function checkParuUpdates(): string[] {
    if (!checkCommand("paru")) {
        return [];
    }

    const result = spawnSync("paru", ["-Qu"], {
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
    });

    if (result.status !== 0) {
        return [];
    }

    return (result.stdout || "").trim().split("\n").filter(Boolean);
}

// Main update checking function
function checkUpdates(): WaybarOutput {
    const pacmanUpdates = checkPacmanUpdates();
    const paruUpdates = checkParuUpdates();

    const updates = [...pacmanUpdates, ...paruUpdates];
    const updateCount = updates.length;

    if (updateCount === 0) {
        return {
            text: "󰦘",
            tooltip: "No updates available",
        };
    }

    const tooltip = updates
        .map((update) => {
            const parts = update.split(/\s+/);
            const packageName = stringToLen(parts[0] || "", 20);
            const currentVersion = stringToLen(parts[1] || "", 20);
            const newVersion = stringToLen(parts[3] || "", 20);
            return `** ${packageName} **${currentVersion} -> ${newVersion}`;
        })
        .join("\n");

    return {
        text: `󰦘 ${updateCount}`,
        tooltip,
    };
}

// Run the script and output JSON
console.log(JSON.stringify(checkUpdates()));
