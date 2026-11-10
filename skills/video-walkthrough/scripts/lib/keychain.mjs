import { execFileSync } from 'node:child_process';

export const SERVICE = process.env.VIDEO_WALKTHROUGH_KEYCHAIN_SERVICE || 'video-walkthrough-openai';

/** OPENAI_API_KEY wins; else the macOS Keychain. Returns the key or null. Never logs it. */
export function getOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (process.platform !== 'darwin') return null;
  try {
    const key = execFileSync('security', ['find-generic-password', '-s', SERVICE, '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return key || null;
  } catch {
    return null;
  }
}
