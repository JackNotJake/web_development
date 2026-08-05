#!/usr/bin/env node
// keys.js — 凭据录入 / 查看状态 / 清除 CLI
// 用法: node keys.js set|status|clear [name]
// 录入时采用隐藏输入(Windows readline 关闭 echo),不打印明文。

import { setCredential, getCredential, clearCredential, maskStatus } from '../services/credentialService.js';
import readline from 'readline';

const VALID_NAMES = ['FOOTBALL_DATA_TOKEN', 'JWT_SECRET'];

function hiddenPrompt(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (value) => {
      rl.close();
      resolve(value.trim());
    });
    // 隐藏输入字符
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        if (stringToWrite.trim().length === 0) return;
        rl.output.write('*');
      } else {
        rl.output.write(stringToWrite);
      }
    };
    process.stdin.on('keypress', (c, k) => {
      if (k && k.name === 'return') {
        process.stdout.write('\n');
      }
    });
  });
}

async function setCmd(name) {
  if (!VALID_NAMES.includes(name)) {
    console.error(`未知凭据名: ${name}. 可选: ${VALID_NAMES.join(', ')}`);
    process.exit(1);
  }
  const value = await hiddenPrompt(`请输入 ${name} (输入不可见): `);
  if (!value) {
    console.error('输入为空,未保存。');
    process.exit(1);
  }
  await setCredential(name, value);
  console.log(`${name}: 已安全保存到系统钥匙串。`);
}

async function statusCmd() {
  console.log(await maskStatus(VALID_NAMES));
}

async function clearCmd(name) {
  if (!VALID_NAMES.includes(name)) {
    console.error(`未知凭据名: ${name}. 可选: ${VALID_NAMES.join(', ')}`);
    process.exit(1);
  }
  await clearCredential(name);
  console.log(`${name}: 已清除。`);
}

async function main() {
  const [cmd, name] = process.argv.slice(2);
  try {
    if (cmd === 'set') {
      if (!name) {
        console.error('用法: keys.js set <name>');
        process.exit(1);
      }
      await setCmd(name);
    } else if (cmd === 'status') {
      await statusCmd();
    } else if (cmd === 'clear') {
      if (!name) {
        console.error('用法: keys.js clear <name>');
        process.exit(1);
      }
      await clearCmd(name);
    } else {
      console.log('用法: node keys.js <set|status|clear> [name]');
      console.log('示例:');
      console.log('  node keys.js set FOOTBALL_DATA_TOKEN');
      console.log('  node keys.js status');
      console.log('  node keys.js clear FOOTBALL_DATA_TOKEN');
    }
  } catch (e) {
    console.error('[keys] 失败:', e.message);
    process.exit(1);
  }
}

main();
