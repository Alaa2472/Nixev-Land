#!/usr/bin/env bun
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { homedir } from 'os';

const execAsync = promisify(exec);

interface UpdateCounts {
  official: number;
  aur: number;
  flatpak: number;
}

interface WaybarOutput {
  text: string;
  tooltip: string;
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${command}`);
    return true;
  } catch {
    return false;
  }
}

async function getCommandOutputCount(command: string): Promise<number> {
  try {
    const { stdout } = await execAsync(command);
    return stdout.trim().split('\n').filter(line => line.length > 0).length;
  } catch {
    return 0;
  }
}

async function isPkgInstalled(pkg: string): Promise<boolean> {
  try {
    await execAsync(`pacman -Qi "${pkg}"`);
    return true;
  } catch {
    try {
      const flatpakInstalled = await commandExists('flatpak');
      if (flatpakInstalled) {
        await execAsync(`flatpak info "${pkg}"`);
        return true;
      }
    } catch {}

    return await commandExists(pkg);
  }
}

async function getAurHelper(): Promise<string | null> {
  if (await isPkgInstalled('yay')) {
    return 'yay';
  } else if (await isPkgInstalled('paru')) {
    return 'paru';
  }
  return null;
}

async function getUpdateCounts(aurHelper: string | null): Promise<UpdateCounts> {
  const counts: UpdateCounts = {
    official: 0,
    aur: 0,
    flatpak: 0
  };

  while (true) {
    try {
      const { stdout } = await execAsync('pgrep -x checkupdates');
      if (!stdout.trim()) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      break;
    }
  }

  counts.official = await getCommandOutputCount('checkupdates');

  if (aurHelper) {
    counts.aur = await getCommandOutputCount(`${aurHelper} -Qua`);
  }

  if (await isPkgInstalled('flatpak')) {
    counts.flatpak = await getCommandOutputCount('flatpak remote-ls --updates');
  }

  return counts;
}

function formatWaybarOutput(counts: UpdateCounts, aurHelper: string | null): WaybarOutput {
  const total = counts.official + counts.aur + counts.flatpak;

  if (total === 0) {
    return {
      text: '󰸟',
      tooltip: 'Packages are up to date'
    };
  }

  const tooltipLines = [
    `Official: ${counts.official}`,
    aurHelper ? `AUR (${aurHelper}): ${counts.aur}` : null,
    `Flatpak: ${counts.flatpak}`
  ].filter(Boolean);

  return {
    text: '󰞒',
    tooltip: tooltipLines.join('\n')
  };
}

async function performUpgrade(aurHelper: string | null): Promise<void> {
  const commands = [
    `${process.argv[0]} ${process.argv[1]} upgrade`,
    aurHelper ? `${aurHelper} -Syu` : null,
    await isPkgInstalled('flatpak') ? 'flatpak update' : null,
    'printf "\\n"',
    'read -n 1 -p "Press any key to continue..."'
  ].filter(Boolean).join(' && ');

  try {
    await execAsync(`kitty --title "󰞒 System Update" sh -c "${commands}"`);
    await execAsync('pkill -RTMIN+20 waybar');
  } catch (error) {
    console.error('Error during upgrade:', error);
  }
}

function printUpgradeInfo(counts: UpdateCounts, aurHelper: string | null): void {
  const lines = [
    `Official: ${counts.official.toString().padEnd(10)}`,
    aurHelper ? `AUR (${aurHelper}): ${counts.aur.toString().padEnd(10)}` : null,
    `Flatpak: ${counts.flatpak.toString().padEnd(10)}`,
    '\n'
  ].filter(Boolean);

  console.log(lines.join('\n'));
}

async function main() {
  if (!existsSync('/etc/arch-release')) {
    process.exit(0);
  }

  const aurHelper = await getAurHelper();
  const counts = await getUpdateCounts(aurHelper);

  if (process.argv[2] === 'up') {
    await performUpgrade(aurHelper);
    process.exit(0);
  }

  if (process.argv[2] === 'upgrade') {
    printUpgradeInfo(counts, aurHelper);
    process.exit(0);
  }

  const output = formatWaybarOutput(counts, aurHelper);
  console.log(JSON.stringify(output));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});