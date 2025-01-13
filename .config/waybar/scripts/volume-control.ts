#!/usr/bin/env bun
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function printError() {
  console.log(`Usage: ./volumecontrol.ts -[device] <actions>
...valid devices are...
    i   -- input device
    o   -- output device
    p   -- player application
...valid actions are...
    i   -- increase volume [+2]
    d   -- decrease volume [-2]
    m   -- mute [x]`);
  process.exit(1);
}

async function sendNotification() {
  const { stdout } = await execAsync("pactl get-sink-volume @DEFAULT_SINK@");
  const vol = stdout.match(/\d+%/)?.[0] ?? "0%";
  await execAsync(`notify-send -r 91190 "Volume: ${vol}"`);
}

async function notifyMute() {
  const { stdout } = await execAsync("pactl get-sink-mute @DEFAULT_SINK@");
  const mute = stdout.includes("yes");
  await execAsync(`notify-send -r 91190 "${mute ? "Muted" : "Unmuted"}"`);
}

async function actionVolume(action: string) {
  const { stdout } = await execAsync("pactl get-sink-volume @DEFAULT_SINK@");
  const currentVol = parseInt(stdout.match(/\d+%/)?.[0] ?? "0", 10);

  if (action === "i" && currentVol < 100) {
    const newVol = Math.min(currentVol + 2, 100);
    await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${newVol}%`);
  } else if (action === "d") {
    const newVol = Math.max(currentVol - 2, 0);
    await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${newVol}%`);
  }
}

async function selectOutput(desc: string) {
  const { stdout } = await execAsync(
    `pactl list sinks | grep -C2 -F "Description: ${desc}" | grep Name`
  );
  const device = stdout.split(":")[1]?.trim();
  if (device) {
    try {
      await execAsync(`pactl set-default-sink ${device}`);
      await execAsync(`notify-send -r 91190 "Activated: ${desc}"`);
    } catch {
      await execAsync(`notify-send -r 91190 "Error activating ${desc}"`);
    }
  } else {
    const { stdout: sinks } = await execAsync(
      'pactl list sinks | grep -ie "Description:"'
    );
    console.log(sinks.split(": ")[1].trim().split("\n").sort().join("\n"));
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    await printError();
  }

  const deviceOpt = args[0];
  const action = args[1];

  switch (deviceOpt) {
    case "-i":
      break;
    case "-o":
      break;
    case "-p":
      break;
    case "-s":
      await selectOutput(action);
      process.exit(0);
    default:
      await printError();
  }

  switch (action) {
    case "i":
      await actionVolume("i");
      break;
    case "d":
      await actionVolume("d");
      break;
    case "m":
      await execAsync("pactl set-sink-mute @DEFAULT_SINK@ toggle");
      await notifyMute();
      process.exit(0);
    default:
      await printError();
  }

  await sendNotification();
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
