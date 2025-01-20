#!/usr/bin/env bun

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const APPS_DIR = '/usr/share/applications'; 
const ROFI_THEME = '/home/nix/.config/rofi/appSelector.rasi';
const USAGE_FILE = '/home/nix/.config/app_usage.json'; 

async function loadUsage(): Promise<Record<string, number>> {
  try {
    const data = await readFile(USAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {}; 
  }
}

async function saveUsage(usage: Record<string, number>) {
  try {
    await writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch (error) {
    console.error('Failed to save usage data:', error);
  }
}

async function listApps() {
    try {
      const files = await readdir(APPS_DIR);
      return files.filter(file => file.endsWith('.desktop')); 
    } catch (error) {
      console.error('Error listing applications:', error);
      return [];
    }
  }

async function getAppIcon(desktopFile: string): Promise<string> {
    const filePath = join(APPS_DIR, desktopFile);
    try {
      const data = await readFile(filePath, 'utf-8');
      const match = data.match(/Icon=(.*)/);
      if (match && match[1]) {
        const iconName = match[1].trim();
        const possiblePaths = [
          `/usr/share/icons/hicolor/48x48/apps/${iconName}.png`,
          `/usr/share/icons/hicolor/64x64/apps/${iconName}.png`,
          `/usr/share/pixmaps/${iconName}.png`,
        ];
        for (const path of possiblePaths) {
          if (existsSync(path)) {
            return path; 
          }
        }
        return iconName; 
      }
      return ''; 
    } catch (error) {
      console.error('Error reading icon for', desktopFile, error);
      return '';
    }
  }

async function showRofiMenu(items: string[]): Promise<string> {
  const usage = await loadUsage();

  const sortedItems = items.sort((a, b) => {
    const aUsage = usage[a] || 0;
    const bUsage = usage[b] || 0;
    if (aUsage !== bUsage) {
      return bUsage - aUsage; 
    }
    return a.localeCompare(b); 
  });

  const formattedItems = await Promise.all(sortedItems.map(async (item) => {
    const appName = item.replace('.desktop', ''); 
    const icon = await getAppIcon(item); 
    return `${appName}\0icon\x1f${icon || 'application'}\0${item}`;
  }));

  const rofi = Bun.spawn(['rofi',
    '-dmenu',
    '-i',
    '-p', '󱥑 Select Application',
    '-show-icons',
    '-theme', ROFI_THEME,
    '-kb-cancel', 'Escape',
    '-no-custom',
    '-mesg', 'Use ↑↓ to scroll, Enter to select',
  ], {
    stdin: 'pipe',
  });

  await rofi.stdin.write(formattedItems.join('\n'));
  await rofi.stdin.end();

  const output = await new Response(rofi.stdout).text();
  const selected = output.trim();
  
  const match = formattedItems.find(item => item.startsWith(`${selected}\0`));
  return match?.split('\0')[2] || ''; 
}

async function getAppExec(desktopFile: string): Promise<string> {
  const filePath = join(APPS_DIR, desktopFile);
  try {
    const data = await readFile(filePath, 'utf-8');
    const match = data.match(/Exec=(.*)/);
    if (match && match[1]) {
      return match[1].trim().replace(/%.*/g, '').trim();
    }
    return ''; 
  } catch (error) {
    console.error('Error reading exec command for', desktopFile, error);
    return '';
  }
}

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
    await Bun.spawn([command, ...args]); 
  } catch (error) {
    throw new Error(`Failed to launch application: ${selected}`);
  }
}

async function updateUsage(selectedApp: string) {
  const usage = await loadUsage();
  usage[selectedApp] = (usage[selectedApp] || 0) + 1; 
  await saveUsage(usage);
}

async function main() {
  try {
    const apps = await listApps();

    if (apps.length === 0) {
      console.error('No applications found in:', APPS_DIR);
      process.exit(1);
    }

    const selected = await showRofiMenu(apps);
    if (selected) {
      const appName = selected.replace('.desktop', '');
      await launchApp(selected);
      await updateUsage(selected);
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