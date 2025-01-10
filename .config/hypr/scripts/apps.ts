#!/usr/bin/env bun

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const APPS_DIR = '/usr/share/applications'; // Directory for .desktop files
const ROFI_THEME = '/home/nix/.config/rofi/appSelector.rasi'; // Path to your Rofi theme
const USAGE_FILE = '/home/nix/.config/app_usage.json'; // File to store app usage data

// Function to load usage data
async function loadUsage(): Promise<Record<string, number>> {
  try {
    const data = await readFile(USAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {}; // Return an empty object if the file doesn't exist
  }
}

// Function to save usage data
async function saveUsage(usage: Record<string, number>) {
  try {
    await writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch (error) {
    console.error('Failed to save usage data:', error);
  }
}

// Function to list applications in the system directory
async function listApps() {
    try {
      const files = await readdir(APPS_DIR);
      return files.filter(file => file.endsWith('.desktop')); // Assuming apps are in .desktop files
    } catch (error) {
      console.error('Error listing applications:', error);
      return [];
    }
  }

// Function to extract the icon from the .desktop file
async function getAppIcon(desktopFile: string): Promise<string> {
    const filePath = join(APPS_DIR, desktopFile);
    try {
      const data = await readFile(filePath, 'utf-8');
      const match = data.match(/Icon=(.*)/);
      if (match && match[1]) {
        const iconName = match[1].trim();
        // Check for icon paths in common directories
        const possiblePaths = [
          `/usr/share/icons/hicolor/48x48/apps/${iconName}.png`,
          `/usr/share/icons/hicolor/64x64/apps/${iconName}.png`,
          `/usr/share/pixmaps/${iconName}.png`,
        ];
        for (const path of possiblePaths) {
          if (existsSync(path)) {
            return path; // Return the full path if the icon exists
          }
        }
        return iconName; // Return the name if no path is found
      }
      return ''; // Return empty string if no icon is found
    } catch (error) {
      console.error('Error reading icon for', desktopFile, error);
      return '';
    }
  }

// Function to show Rofi menu with apps
async function showRofiMenu(items: string[]): Promise<string> {
  const usage = await loadUsage();

  // Sort apps by usage count (most used first), then alphabetically
  const sortedItems = items.sort((a, b) => {
    const aUsage = usage[a] || 0;
    const bUsage = usage[b] || 0;
    if (aUsage !== bUsage) {
      return bUsage - aUsage; // Place more used apps at the top
    }
    return a.localeCompare(b); // Alphabetical order for apps with the same usage
  });

  const formattedItems = await Promise.all(sortedItems.map(async (item) => {
    const appName = item.replace('.desktop', ''); // Remove extension for display
    const icon = await getAppIcon(item); // Get the icon for the app
    return `${appName}\0icon\x1f${icon || 'application'}\0${item}`; // Include full item for selection
  }));

  const rofi = Bun.spawn(['rofi',
    '-dmenu',
    '-i',
    '-p', '󱥑 Select Application',
    '-show-icons',
    '-theme', ROFI_THEME,
    '-kb-cancel', 'Escape',
    '-no-custom',
    '-mesg', 'Use ↑↓ to scroll, Enter to select', // Adding helpful message
  ], {
    stdin: 'pipe',
  });

  await rofi.stdin.write(formattedItems.join('\n'));
  await rofi.stdin.end();

  const output = await new Response(rofi.stdout).text();
  const selected = output.trim();
  
  // Find the corresponding app full name
  const match = formattedItems.find(item => item.startsWith(`${selected}\0`));
  return match?.split('\0')[2] || ''; // Return full file name (with extension) if found
}

// Function to extract the executable command from the .desktop file
async function getAppExec(desktopFile: string): Promise<string> {
  const filePath = join(APPS_DIR, desktopFile);
  try {
    const data = await readFile(filePath, 'utf-8');
    const match = data.match(/Exec=(.*)/);
    if (match && match[1]) {
      // Remove placeholders like %U, %u, %F, %f, etc.
      return match[1].trim().replace(/%.*/g, '').trim();
    }
    return ''; // Return empty string if no exec command is found
  } catch (error) {
    console.error('Error reading exec command for', desktopFile, error);
    return '';
  }
}

// Function to launch the selected application
async function launchApp(selected: string) {
  const appPath = join(APPS_DIR, selected);

  if (!existsSync(appPath)) {
    throw new Error(`Application not found: ${appPath}`);
  }

  try {
    const execCommand = await getAppExec(selected);
    if (!execCommand) {
      throw new Error(`No executable command found for: ${selected}`);
    }
    const [command, ...args] = execCommand.split(' ');
    await Bun.spawn([command, ...args]); // Using the extracted command and arguments to start the application
  } catch (error) {
    throw new Error(`Failed to launch application: ${selected}`);
  }
}

// Function to update usage count
async function updateUsage(selectedApp: string) {
  const usage = await loadUsage();
  usage[selectedApp] = (usage[selectedApp] || 0) + 1; // Increment usage count
  await saveUsage(usage);
}

// Main function to run the application selector
async function main() {
  try {
    const apps = await listApps();

    if (apps.length === 0) {
      console.error('No applications found in:', APPS_DIR);
      process.exit(1);
    }

    const selected = await showRofiMenu(apps);
    if (selected) {
      const appName = selected.replace('.desktop', ''); // Remove the extension for display
      await launchApp(selected);
      await updateUsage(selected); // Update usage count
      console.log('Application launched successfully:', appName);
    } else {
      console.log('No application selected.');
    }
  } catch (error) {
    console.error('Failed to launch application:', error);
    process.exit(1);
  }
}

main();