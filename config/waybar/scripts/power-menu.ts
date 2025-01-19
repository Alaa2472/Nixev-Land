#!/usr/bin/env bun
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface PowerAction {
  icon: string;
  label: string;
  command: string;
}

const ROFI_CONFIG = join(homedir(), ".config/rofi/power-menu.rasi");

const POWER_ACTIONS: PowerAction[] = [
  { icon: "", label: "Lock", command: "hyprlock" },
  { icon: "", label: "Shutdown", command: "systemctl poweroff" },
  { icon: "", label: "Reboot", command: "systemctl reboot" },
  { icon: "\u200A", label: "Suspend", command: "systemctl suspend" },
  { icon: "", label: "Hibernate", command: "systemctl hibernate" },
  { icon: "", label: "Logout", command: "hyprctl dispatch exit 0" },
];

async function execCommand(command: string): Promise<void> {
  try {
    await execAsync(command);
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    process.exit(1);
  }
}

async function showMenu(): Promise<string> {
  const options = POWER_ACTIONS.map(
    (action) => `${action.icon} ${action.label}`
  ).join("\n");

  try {
    const { stdout } = await execAsync(
      `echo -e "${options}" | rofi -dmenu -i -config "${ROFI_CONFIG}"`
    );
    return stdout.trim();
  } catch (error) {
    process.exit(0);
  }
}

async function main() {
  try {
    const selected = await showMenu();

    const action = POWER_ACTIONS.find(
      (action) => `${action.icon} ${action.label}` === selected
    );

    if (action) {
      await execCommand(action.command);
    }
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
