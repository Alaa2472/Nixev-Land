#!/usr/bin/env bun

import { execSync, spawnSync } from "child_process";
import fs, { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";

const confDir = process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`;
const animationsDir = path.join(confDir, "hypr/animations");

function notify(title: string, message: string, icon = "preferences-desktop-display") {
  execSync(`notify-send -i "${icon}" "${title}" "${message}"`);
}

function fnSelect() {
  if (!existsSync(animationsDir)) {
    notify("Error", `Animations directory does not exist at ${animationsDir}`);
    process.exit(1);
  }

  const animationItems = readdirSync(animationsDir)
    .filter(file => file.endsWith(".conf") && !["disable.conf", "theme.conf"].includes(file))
    .map(file => file.replace(/\.conf$/, ""));

  if (animationItems.length === 0) {
    notify("Error", `No .conf files found in ${animationsDir}`);
    process.exit(1);
  }


  const selectedAnimation = spawnSync("rofi", [
    "-dmenu",
    "-i",
    "-p",
    "Select animation",
  ], {
    input: animationItems.join("\n"),
    encoding: "utf-8",
  }).stdout.trim();

  if (!selectedAnimation) {
    process.exit(0);
  }

  let animationName = selectedAnimation;

  setConf("HYPR_ANIMATION", animationName);
  fnUpdate(animationName);

  notify("Animation", animationName);
}


function fnUpdate(currentAnimation: string) {
  const animConfPath = path.join(confDir, "hypr/animations.conf");
  const animDir = animationsDir;
  const sourcePath = path.join(animDir, `${currentAnimation}.conf`);

  fs.copyFileSync(sourcePath, animConfPath);
  console.log(`Animation updated to: ${currentAnimation}`);
}

function setConf(key: string, value: string) {
  const stateHome = process.env.HYDE_STATE_HOME || `${process.env.HOME}/`;
  const configPath = path.join(stateHome, "config");

  let configContent = existsSync(configPath) ? readFileSync(configPath, "utf-8") : "";
  const newConfig = configContent.split("\n").filter(line => !line.startsWith(`${key}=`));
  newConfig.push(`${key}=${value}`);
  writeFileSync(configPath, newConfig.join("\n"));
}

const [_, __, command] = process.argv;

if (command === "select") {
  fnSelect();
} else if (command === "update") {
  const currentAnimation = process.env.HYPR_ANIMATION || "theme";
  fnUpdate(currentAnimation);
} else {
  console.log(`
Usage:
    select    Select an animation from the available options
    update    Update the animation to the selected option
`);
}
