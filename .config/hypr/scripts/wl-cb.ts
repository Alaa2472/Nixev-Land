#!/usr/bin/env bun

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

// إعداد المسارات
const homeDir = process.env.HOME || "";
const cacheDir = process.env.XDG_CACHE_HOME || path.join(homeDir, ".cache");
const clipFile = path.join(cacheDir, "cliphist.log");

// إنشاء المجلد إذا لم يكن موجودًا
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// التحقق من النصوص المكررة
function isDuplicate(content: string): boolean {
  if (!fs.existsSync(clipFile)) return false;

  const lastLine = fs.readFileSync(clipFile, "utf-8").split("\n").filter(Boolean).pop();
  return lastLine === content;
}

// حفظ النصوص في السجل
function saveToHistory(content: string): void {
  if (isDuplicate(content)) return;

  fs.appendFileSync(clipFile, content + "\n");
  console.log(`[حفظ]: ${content}`);
}

// تشغيل wl-paste في وضع المراقبة
function watchClipboard(): void {
  const wlPaste = spawn("wl-paste", ["-p"]);

  wlPaste.stdout.on("data", (data) => {
    const content = data.toString().trim();
    if (content) {
      saveToHistory(content);
    }
  });

  wlPaste.stderr.on("data", (data) => {
    console.error(`خطأ: ${data}`);
  });

  wlPaste.on("close", (code) => {
    // أعد تشغيل المراقبة إذا لزم الأمر
    setTimeout(watchClipboard, 1000);
  });
}

// الوظيفة الرئيسية
function main(): void {
  console.log("بدء مراقبة الحافظة...");
  watchClipboard();
}

main();
