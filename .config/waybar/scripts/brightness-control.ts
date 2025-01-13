#!/usr/bin/env bun
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function printError() {
  console.log(`Usage: ./brightnesscontrol.sh <action>
Valid actions are:
    i -- <i>ncrease brightness [+2%]
    d -- <d>ecrease brightness [-2%]`);
}

async function sendNotification() {
  const { stdout } = await execAsync(
    'brightnessctl info | grep -oP "(?<=\\()\\d+(?=%)"'
  );
  const brightness = stdout.trim();
  await execAsync(`notify-send -r 91190 "Brightness: ${brightness}%"`);
}

async function getBrightness() {
  const { stdout } = await execAsync("brightnessctl -m");
  const lines = stdout.split("\n");
  const brightness = lines[0].match(/\d+%/)?.[0]?.slice(0, -1) ?? "0";
  const device = lines[0]
    .split(",")[0]
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const currentBrightness = lines[0].split(",")[2];
  const maxBrightness = lines[0].split(",")[4];
  return { brightness, device, currentBrightness, maxBrightness };
}

async function handleOptions(action: string) {
  const { brightness } = await getBrightness();
  switch (action) {
    case "i":
      if (parseInt(brightness) < 10) {
        await execAsync("brightnessctl set +1%");
      } else {
        await execAsync("brightnessctl set +2%");
      }
      await sendNotification();
      break;
    case "d":
      if (parseInt(brightness) <= 1) {
        await execAsync("brightnessctl set 1%");
      } else if (parseInt(brightness) <= 10) {
        await execAsync("brightnessctl set 1%-");
      } else {
        await execAsync("brightnessctl set 2%-");
      }
      await sendNotification();
      break;
    default:
      await printError();
      break;
  }
}

function getIcon(brightness: number) {
  if (brightness <= 5) return "";
  if (brightness <= 15) return "";
  if (brightness <= 30) return "";
  if (brightness <= 45) return "";
  if (brightness <= 55) return "";
  if (brightness <= 65) return "";
  if (brightness <= 80) return "";
  if (brightness <= 95) return "";
  return "";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    await printError();
    process.exit(1);
  }

  const action = args[0];
  await handleOptions(action);

  const { brightness, device, currentBrightness, maxBrightness } =
    await getBrightness();
  const icon = getIcon(parseInt(brightness));
  const module = `${icon} ${brightness}%`;
  const tooltip = `Device Name: ${device}\nBrightness:  ${currentBrightness} / ${maxBrightness}`;

  console.log(JSON.stringify({ text: module, tooltip }));
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
