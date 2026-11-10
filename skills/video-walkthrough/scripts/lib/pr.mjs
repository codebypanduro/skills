import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();

/** Fail fast, before any paid or slow work: PR number valid and belonging to the current branch. */
export function checkPr(prNumber) {
  if (!/^\d+$/.test(String(prNumber))) throw new Error(`pr must be a number, got "${prNumber}"`);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === 'HEAD') throw new Error('Detached HEAD: check out the PR branch first.');
  const head = JSON.parse(execFileSync('gh', ['pr', 'view', String(prNumber), '--json', 'headRefName'], { encoding: 'utf8' })).headRefName;
  if (head !== branch) throw new Error(`PR #${prNumber} is for branch "${head}", but you are on "${branch}".`);
  return branch;
}

/**
 * Commit `files` onto pr-assets/<branch> with git plumbing (own temp index, no
 * checkout), push it, and comment the link on the PR. The working tree and the
 * feature branch stay untouched.
 */
export function uploadToPr({ prNumber, files, dir }) {
  const branch = checkPr(prNumber);
  const assets = `pr-assets/${branch}`;
  const remote = 'origin';
  let parent = null;
  try {
    git(['fetch', '--quiet', remote, `+refs/heads/${assets}:refs/remotes/${remote}/${assets}`]);
    parent = git(['rev-parse', `refs/remotes/${remote}/${assets}`]);
  } catch {}

  const idxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-idx-'));
  const idx = path.join(idxDir, 'index');
  const env = { ...process.env, GIT_INDEX_FILE: idx };
  let tree;
  try {
    if (parent) git(['read-tree', parent], { env });
    for (const f of files) {
      const blob = git(['hash-object', '-w', f]);
      git(['update-index', '--add', '--cacheinfo', `100644,${blob},${dir}/${path.basename(f)}`], { env });
    }
    tree = git(['write-tree'], { env });
  } finally {
    fs.rmSync(idxDir, { recursive: true, force: true });
  }
  const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `Walkthrough assets for PR #${prNumber}`]);
  git(['push', '--quiet', remote, `${commit}:refs/heads/${assets}`]);

  const repo = JSON.parse(execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner,url'], { encoding: 'utf8' }));
  const base = `${repo.url}/blob/${commit}/${dir}`;
  const links = files.map((f) => `- [${path.basename(f)}](${base}/${path.basename(f)}?raw=true)`).join('\n');
  const body = `### Video walkthrough\n\n${links}\n\nStored on \`${assets}\` (not part of this branch); delete it after merge.`;
  const comment = execFileSync('gh', ['pr', 'comment', String(prNumber), '--body', body], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
  return { assets, commit, comment, url: `${base}/${path.basename(files[0])}` };
}
