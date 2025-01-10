#!/usr/bin/env bun

import { readdir, copyFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const WALLPAPERS_DIR = '/home/nix/Pictures/Nixuccin';
const HYPR_CONFIG_DIR = '/home/nix/.config/hypr';
const TARGET_PATH = join(HYPR_CONFIG_DIR, 'wall.png');

async function ensureDirectories() {
  await mkdir(WALLPAPERS_DIR, { recursive: true });
  await mkdir(HYPR_CONFIG_DIR, { recursive: true });
}

async function listWallpapers() {
  const files = await readdir(WALLPAPERS_DIR);
  return files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
}

async function showRofiMenu(items: string[]): Promise<string> {
  const formattedItems = items.map((item) => {
    const fullPath = join(WALLPAPERS_DIR, item);
    return `${item}\0icon\x1f${fullPath}`;
  });

  const rofi = Bun.spawn(['rofi',
    '-dmenu',
    '-i',
    '-p', '󱥑 Select Wallpaper',
    '-show-icons',
    '-theme', '~/.config/rofi/wallpaper.rasi',
    '-kb-cancel', 'Escape',
    '-no-custom'
  ], {
    stdin: 'pipe',
  });

  await rofi.stdin.write(formattedItems.join('\n'));
  await rofi.stdin.end();

  const output = await new Response(rofi.stdout).text();
  return output.trim().split('\t')[0]; 
}

async function setWallpaper(selected: string) {
  const sourcePath = join(WALLPAPERS_DIR, selected);
  
  if (!existsSync(sourcePath)) {
    throw new Error(`Wallpaper not found: ${sourcePath}`);
  }

  try {
    await Bun.spawn(['swww', 'init']);
  } catch {}

  await Bun.spawn(['swww', 'img', sourcePath]);
}

async function main() {
  try {
    await ensureDirectories();
    const wallpapers = await listWallpapers();
    
    if (wallpapers.length === 0) {
      console.error('No wallpapers found in:', WALLPAPERS_DIR);
      process.exit(1);
    }

    const selected = await showRofiMenu(wallpapers);
    if (selected) {
      await setWallpaper(selected);
      console.log('Wallpaper set successfully:', selected);
    }
  } catch (error) {
    console.error('Failed to set wallpaper:', error);
    process.exit(1);
  }
}

main();