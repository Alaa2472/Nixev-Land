#!/usr/bin/env bun

import { execSync, spawnSync } from "child_process";
import fs, { existsSync, readdirSync } from "fs";
import path from "path";

const confDir = process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`;
const waybarThemesDir = path.join(confDir, "waybar/themes");
const waybarDir = path.join(confDir, "waybar");
const lastThemeFile = path.join(waybarDir, ".last_theme");

function notify(title: string, message: string, icon = "preferences-desktop-display") {
  execSync(`notify-send -i "${icon}" "${title}" "${message}"`);
}

function fnSelect() {
  if (!existsSync(waybarThemesDir)) {
    notify("Error", `Themes directory does not exist at ${waybarThemesDir}`);
    process.exit(1);
  }

  const themeItems = readdirSync(waybarThemesDir)
    .filter(file => fs.statSync(path.join(waybarThemesDir, file)).isDirectory());

  if (themeItems.length === 0) {
    notify("Error", `No directories found in ${waybarThemesDir}`);
    process.exit(1);
  }

  const selectedTheme = spawnSync("rofi", [
    "-dmenu",
    "-i",
    "-p",
    '-theme', '~/.config/rofi/waybar-selector.rasi',
    "Select Theme",
  ], {
    input: themeItems.join("\n"),
    encoding: "utf-8",
  }).stdout.trim();

  if (!selectedTheme) {
    process.exit(0);
  }

  fs.writeFileSync(lastThemeFile, selectedTheme);
  console.log(`Selected theme: ${selectedTheme}`);

  applyTheme(selectedTheme);
}

function applyTheme(selectedTheme: string) {
  const themePath = path.join(waybarThemesDir, selectedTheme);

  const stylePath = path.join(themePath, "style.css");
  const configPath = path.join(themePath, "config.jsonc");

  console.log(`Checking files for theme: ${selectedTheme}`);
  console.log(`Expected style file: ${stylePath}`);
  console.log(`Expected config file: ${configPath}`);

  if (existsSync(stylePath) && existsSync(configPath)) {
    try {
      execSync(`cp -f ${stylePath} ~/.config/waybar/style.css`);
      execSync(`cp -f ${configPath} ~/.config/waybar/config.jsonc`);

      console.log("Theme applied successfully.");
    } catch (err) {
      console.error("Error while copying files:", err);
      notify("Error", "Failed to copy theme files.");
      return;
    }

    try {
      execSync(`pkill -x waybar`);
      execSync(`waybar -s ~/.config/waybar/style.css -c ~/.config/waybar/config.jsonc &`);
      console.log("Waybar restarted with the selected theme.");
    } catch (err) {
      console.error("Error restarting Waybar:", err);
      notify("Error", "Failed to restart Waybar.");
    }
  } else {
    console.log("Required style or config file not found.");
    notify("Error", `Required files not found for theme: ${selectedTheme}`);
  }
}

const [_, __, command] = process.argv;

if (command === "select") {
  fnSelect();
} else {
  console.log(`
Usage:
    select    Select a theme from the available options
`);
}


