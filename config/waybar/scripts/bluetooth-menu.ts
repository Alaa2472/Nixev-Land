#!/usr/bin/env bun
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface BluetoothDevice {
  mac: string;
  name: string;
  icon: string;
}

interface RofiConfig {
  config: string;
  overrideDisabled: string;
}

const ROFI_CONFIG: RofiConfig = {
  config: join(homedir(), ".config/rofi/bluetooth-menu.rasi"),
  overrideDisabled:
    "mainbox { children: [ listview ]; } listview { lines: 1; padding: 6px; }",
};

async function execCommand(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error: any) {
    if (command.includes("rofi")) {
      return "";
    }
    if (
      command.includes("bluetoothctl") &&
      error.stdout?.includes("No default controller available")
    ) {
      return "";
    }
    throw error;
  }
}

async function runRofi(
  options: string,
  config: string,
  extraArgs: string = ""
): Promise<string> {
  try {
    const command = `echo -e "${options}" | rofi -dmenu -i -selected-row 1 -config "${config}" ${extraArgs}`;
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    return "";
  }
}

async function isBluetoothControllerAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("bluetoothctl show");
    return !stdout.includes("No default controller available");
  } catch (error: any) {
    if (error.stdout?.includes("No default controller available")) {
      return false;
    }
    throw error;
  }
}

async function getDeviceIcon(deviceMac: string): Promise<string> {
  const deviceInfo = await execCommand(`bluetoothctl info "${deviceMac}"`);
  const deviceIcon =
    deviceInfo
      .split("\n")
      .find((line) => line.includes("Icon:"))
      ?.split(":")[1]
      ?.trim() || "";

  switch (deviceIcon) {
    case "audio-headphones":
    case "audio-headset":
      return "󰋋";
    case "video-display":
    case "computer":
      return "󰍹";
    case "audio-input-microphone":
      return "󰍬";
    case "input-keyboard":
      return "󰌌";
    case "audio-speakers":
      return "󰓃";
    case "input-mouse":
      return "󰍽";
    case "phone":
      return "󰏲";
    default:
      return "󰂱";
  }
}

async function getPairedDevices(): Promise<BluetoothDevice[]> {
  const devices: BluetoothDevice[] = [];
  const output = await execCommand("bluetoothctl devices");

  for (const line of output.split("\n")) {
    if (!line) continue;
    const [_, mac, ...nameParts] = line.split(" ");
    if (mac) {
      const icon = await getDeviceIcon(mac);
      devices.push({
        mac,
        name: nameParts.join(" "),
        icon,
      });
    }
  }

  return devices;
}

async function getBluetoothStatus(): Promise<boolean> {
  try {
    const controllerAvailable = await isBluetoothControllerAvailable();
    if (!controllerAvailable) {
      return false;
    }

    const status = await execCommand("bluetoothctl show");
    return status.includes("Powered: yes");
  } catch (error) {
    return false;
  }
}

async function notify(message: string): Promise<void> {
  await execCommand(`notify-send "${message}"`);
}

async function enableBluetooth(): Promise<void> {
  await execCommand("rfkill unblock bluetooth");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await execCommand("bluetoothctl power on");
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function connectToDevice(device: BluetoothDevice): Promise<void> {
  await execCommand(`bluetoothctl trust "${device.mac}"`);
  await execCommand(`bluetoothctl pair "${device.mac}"`);
  await execCommand(`bluetoothctl connect "${device.mac}"`);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const deviceInfo = await execCommand(`bluetoothctl info "${device.mac}"`);
  const isConnected = deviceInfo.includes("Connected: yes");

  if (isConnected) {
    await notify(`Connected to "${device.name}".`);
  } else {
    await notify(`Failed to connect to "${device.name}".`);
  }
}

async function showMenu(devices: BluetoothDevice[]): Promise<string> {
  const options = [
    "Scan for devices  ",
    "Disable Bluetooth",
    ...devices.map((device) => `${device.icon} ${device.name}`),
  ].join("\n");

  return await runRofi(options, ROFI_CONFIG.config, '-p " "');
}

async function main() {
  while (true) {
    try {
      const isBluetoothEnabled = await getBluetoothStatus();

      if (!isBluetoothEnabled) {
        const result = await runRofi(
          "Enable Bluetooth",
          ROFI_CONFIG.config,
          `-theme-str "${ROFI_CONFIG.overrideDisabled}" -p " "`
        );

        if (!result) {
          process.exit(0);
        }

        await notify("Bluetooth Enabled");
        await enableBluetooth();
        continue;
      }

      const devices = await getPairedDevices();
      const selected = await showMenu(devices);

      if (!selected) {
        process.exit(0);
      }

      switch (selected) {
        case "Enable Bluetooth":
          await notify("Bluetooth Enabled");
          await enableBluetooth();
          break;

        case "Disable Bluetooth":
          await notify("Bluetooth Disabled");
          await execCommand("rfkill block bluetooth");
          await execCommand("bluetoothctl power off");
          process.exit(0);

        case "Scan for devices  ":
          await notify("Press '?' to show help.");
          await execCommand(
            "kitty --title '󰂱 Bluetooth TUI' bash -c \"bluetui\""
          );
          break;

        default:
          const deviceName = selected
            .substring(selected.indexOf(" ") + 1)
            .trim();
          const device = devices.find((d) => d.name === deviceName);
          if (device) {
            await connectToDevice(device);
          }
      }
    } catch (error) {
      console.error("An error occurred:", error);
      await notify(
        "An error occurred while managing Bluetooth connections."
      ).catch(() => {});
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
