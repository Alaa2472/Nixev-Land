#!/usr/bin/env bun
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getWifiStatus() {
  try {
    await execAsync('command -v nmcli');
  } catch {
    console.log(JSON.stringify({ text: '󰤮', tooltip: 'nmcli utility is missing' }));
    process.exit(1);
  }

  try {
    const { stdout: wifiStatus } = await execAsync('nmcli radio wifi');
    if (wifiStatus.trim() === 'disabled') {
      console.log(JSON.stringify({ text: '󰤮', tooltip: 'Wi-Fi Disabled' }));
      process.exit(0);
    }

    const { stdout: wifiInfo } = await execAsync('nmcli -t -f active,ssid,signal,security dev wifi | grep "^yes"');
    if (!wifiInfo) {
      console.log(JSON.stringify({ text: '󰤮', tooltip: 'No Connection' }));
      process.exit(0);
    }

    const [active, ssid, signal, security] = wifiInfo.split(':');
    let ipAddress = '127.0.0.1';
    let chan = 'N/A';

    const { stdout: deviceStatus } = await execAsync('nmcli -t -f DEVICE,STATE device status | grep -w "connected" | grep -v -E "^(dummy|lo:)"');
    const activeDevice = deviceStatus.split(':')[0];

    if (activeDevice) {
      const { stdout: deviceInfo } = await execAsync(`nmcli -e no -g ip4.address,ip4.gateway,general.hwaddr device show ${activeDevice}`);
      ipAddress = deviceInfo.split('\n')[0];

      const { stdout: wifiDetails } = await execAsync('nmcli -e no -t -f active,bssid,chan,freq device wifi | grep "^yes"');
      const [_, __, chanNum, freq] = wifiDetails.split(':');
      chan = `${chanNum} (${freq})`;
    }

    const tooltip = `${ssid}\n\nIP Address: ${ipAddress}\nSecurity: ${security}\nChannel: ${chan}\nStrength: ${signal} / 100`;

    let icon = '󰤮';
    if (parseInt(signal) >= 80) {
      icon = '󰤨';
    } else if (parseInt(signal) >= 60) {
      icon = '󰤥';
    } else if (parseInt(signal) >= 40) {
      icon = '󰤢';
    } else if (parseInt(signal) >= 20) {
      icon = '󰤟';
    }

    console.log(JSON.stringify({ text: icon, tooltip }));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getWifiStatus();