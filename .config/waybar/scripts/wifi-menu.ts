#!/usr/bin/env bun
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

const config = join(homedir(), ".config/rofi/wifi-menu.rasi");

const options = `Manual Entry\nDisable Wi-Fi`;
const optionDisabled = "Enable Wi-Fi";

const overrideSsid =
  'entry { placeholder: "Enter SSID"; } listview { enabled: false; }';
const overridePassword =
  'entry { placeholder: "Enter password"; } listview { enabled: false; }';
const overrideDisabled =
  "mainbox { children: [ listview ]; } listview { lines: 1; padding: 6px; }";

async function getPassword(): Promise<string> {
  const command = `rofi -dmenu -password -config "${config}" -theme-str "entry { placeholder: \\"Enter password\\"; } listview { enabled: false; }" -p " "`;
  const { stdout } = await execAsync(command);
  return stdout.trim();
}

async function sendNotification(message: string): Promise<void> {
  await execAsync(`notify-send "${message}"`);
}

async function wifiList(): Promise<string> {
  const { stdout } = await execAsync(
    'nmcli --fields "SECURITY,SSID" device wifi list'
  );
  return stdout
    .split("\n")
    .slice(1) // Skip header line
    .map((line) => line.replace(/  +/g, " "))
    .map((line) => line.replace(/WPA\S*/g, "󰤪 "))
    .map((line) => line.replace(/^--/, "󰤨 "))
    .filter((line) => !line.includes("--"))
    .join("\n");
}

async function connectToWifi(ssid: string, password: string = ""): Promise<boolean> {
  const connectCommand = password
    ? `nmcli device wifi connect "${ssid}" password "${password}"`
    : `nmcli device wifi connect "${ssid}"`;

  try {
    const { stdout } = await execAsync(connectCommand);
    if (stdout.includes("successfully")) {
      await sendNotification(`Successfully connected to "${ssid}".`);
      return true;
    }
  } catch (error) {
    const stderr = error.stderr;
    if (stderr.includes("Secrets were required, but not provided")) {
      await sendNotification(`Incorrect password for "${ssid}".`);
    } else if (stderr.includes("No network with SSID")) {
      await sendNotification(`No network found with SSID "${ssid}".`);
    } else {
      await sendNotification(`Failed to connect to "${ssid}".`);
    }
    return false;
  }
  return false;
}

async function enableWifi(): Promise<void> {
  await sendNotification("Scanning for networks...");
  await execAsync("nmcli radio wifi on");
  await execAsync("nmcli device wifi rescan");
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

async function disableWifi(): Promise<void> {
  await sendNotification("Wi-Fi Disabled.");
  await execAsync("nmcli radio wifi off");
  process.exit(0);
}

async function manualEntry(): Promise<void> {
  const manualSsid = (
    await execAsync(
      `rofi -dmenu -config "${config}" -theme-str '${overrideSsid}' -p " "`
    )
  ).stdout.trim();
  if (!manualSsid) process.exit(0);

  const wifiPassword = await getPassword();
  if (await connectToWifi(manualSsid, wifiPassword)) {
    await sendNotification(`Connected to "${manualSsid}".`);
  } else {
    await sendNotification(`Failed to connect to "${manualSsid}".`);
  }
}

async function main() {
  const incorrectPasswords = new Set<string>();

  while (true) {
    try {
      const { stdout: wifiStatus } = await execAsync("nmcli -fields WIFI g");
      let selectedOption: string;

      if (wifiStatus.includes("enabled")) {
        const wifiOptions = `${options}\n${await wifiList()}`;
        selectedOption = (
          await execAsync(
            `echo -e "${wifiOptions.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" | rofi -dmenu -i -selected-row 1 -config "${config}" -p " "`
          )
        ).stdout.trim();
      } else {
        selectedOption = (
          await execAsync(
            `echo "${optionDisabled}" | rofi -dmenu -i -config "${config}" -theme-str "${overrideDisabled}"`
          )
        ).stdout.trim();
      }

      const selectedSsid = selectedOption.replace(/^[^a-zA-Z0-9]+/, '').trim();

      switch (selectedOption) {
        case "":
          process.exit(0);
        case "Enable Wi-Fi":
          await enableWifi();
          break;
        case "Disable Wi-Fi":
          await disableWifi();
          break;
        case "Manual Entry":
          await manualEntry();
          break;
        default:
          const savedConnections = (
            await execAsync("nmcli -g NAME connection")
          ).stdout.split("\n");
          if (savedConnections.includes(selectedSsid)) {
            if (await connectToWifi(selectedSsid)) {
              break;
            }
          } else {
            let wifiPassword = "";
            if (selectedOption.startsWith("󰤪") || incorrectPasswords.has(selectedSsid)) {
              wifiPassword = await getPassword();
              incorrectPasswords.delete(selectedSsid);
            }
            while (!(await connectToWifi(selectedSsid, wifiPassword))) {
              wifiPassword = await getPassword();
              incorrectPasswords.add(selectedSsid);
            }
          }
      }
    } catch (error) {
      await sendNotification(`An error occurred: ${error.message}`);
      process.exit(1);
    }
  }
}

main().catch(async (error) => {
  await sendNotification(`Fatal error: ${error.message}`);
  process.exit(1);
});
