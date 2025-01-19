#!/usr/bin/env bun

import { existsSync, copyFileSync, readdirSync, writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

const HOME: string = homedir();
const WAYBAR_CONFIG: string = `${HOME}/.config/waybar`;
const THEME_PATH: string = `${WAYBAR_CONFIG}/themes`;
const STATE_FILE: string = `${WAYBAR_CONFIG}/.last_theme`;

function getThemes(): string[] {
  try {
    return readdirSync(THEME_PATH, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch (err) {
    console.error("Error reading themes directory:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function getNextTheme(themes: string[]): string {
  let lastThemeIndex = -1;

  if (existsSync(STATE_FILE)) {
    const lastTheme = readFileSync(STATE_FILE, "utf8").trim();
    lastThemeIndex = themes.indexOf(lastTheme);
  }

  const nextThemeIndex = (lastThemeIndex + 1) % themes.length;
  writeFileSync(STATE_FILE, themes[nextThemeIndex], "utf8");

  return themes[nextThemeIndex];
}

function switchTheme(themeName: string): void {
  const sourcePath: string = join(THEME_PATH, themeName);
  if (!existsSync(sourcePath)) {
    console.error(`Theme directory ${themeName} not found`);
    process.exit(1);
  }

  try {
    copyFileSync(join(sourcePath, "style.css"), `${WAYBAR_CONFIG}/style.css`);
    copyFileSync(join(sourcePath, "config.jsonc"), `${WAYBAR_CONFIG}/config.jsonc`);

    execSync("killall waybar");
    execSync(
      `waybar -s ${WAYBAR_CONFIG}/style.css -c ${WAYBAR_CONFIG}/config.jsonc &`
    );

    console.log(`Switched to ${themeName} theme`);
  } catch (err) {
    console.error("Error switching theme:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function main(): void {
  const themes = getThemes();

  if (themes.length === 0) {
    console.error("No themes found in the themes directory.");
    process.exit(1);
  }

  const nextTheme = getNextTheme(themes);
  switchTheme(nextTheme);
}

main();
