#!/usr/bin/env bun

import { execa } from "execa";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const SAVE_DIR = "/home/nix/Pictures/Screenshots";
mkdirSync(SAVE_DIR, { recursive: true });

const getFileName = () => {
  const date = new Date().toISOString().replace(/:/g, "-");
  return join(SAVE_DIR, `screenshot-${date}.png`);
};

const takeScreenshot = async (mode: string) => {
    const fileName = getFileName();
  
    try {
      // Take screenshot based on mode
      switch (mode) {
        case "-f": // Full screen
          await execa("grim", [fileName]);
          break;
  
        case "-m": // All monitors
          await execa("sh", [
            "-c",
            `grim -o "$(hyprctl monitors -j | jq -r '.[].name')" "${fileName}" || wl-copy`
          ]);
          break;
  
        case "-s": // Selected area
          try {
            await execa("sh", [
              "-c",
              `grim -g "$(slurp -d)" "${fileName}"`
            ]);
          } catch (error) {
            console.log("Selection cancelled");
            process.exit(0);
          }
          break;
  
        default:
          console.log("Usage: screenshot.ts [-f|-m|-s]");
          process.exit(1);
      }
  
      // Copy saved file to clipboard first
      if (existsSync(fileName)) {
        await execa("wl-copy", ["-t", "image/png", fileName]);
      }
  
      // Open in editor for all modes
      try {
        await execa("swappy", ["-f", fileName]);
      } catch (error) {
        console.log("Editor closed");
      }
  
      // Send notification
      await execa("notify-send", ["Screenshot", `Saved to ${fileName}`]);
  
    } catch (error) {
      console.error("Screenshot failed:", error);
      process.exit(1);
    }
  };

const mode = process.argv[2] || "-f";
takeScreenshot(mode);