/**
 * Oply CLI — Git Utilities
 * 
 * Real git operations against the user's repository.
 * Every function wraps execSync with proper error handling.
 */

import { execSync } from 'child_process';
import path from 'path';

const execOpts = (cwd) => ({ encoding: 'utf8', cwd, timeout: 15000, stdio: 'pipe' });

/**
 * Check if the current directory is inside a git repo
 */
export function isGitRepo(cwd = process.cwd()) {
  try {
    execSync('git rev-parse --is-inside-work-tree', execOpts(cwd));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git repo root directory
 */
export function getRepoRoot(cwd = process.cwd()) {
  try {
    return execSync('git rev-parse --show-toplevel', execOpts(cwd)).trim();
  } catch {
    return cwd;
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch(cwd = process.cwd()) {
  try {
    return execSync('git branch --show-current', execOpts(cwd)).trim() || 'HEAD (detached)';
  } catch {
    return 'unknown';
  }
}

/**
 * Get short HEAD commit hash
 */
export function getCommitHash(cwd = process.cwd()) {
  try {
    return execSync('git rev-parse --short HEAD', execOpts(cwd)).trim();
  } catch {
    return 'none';
  }
}

/**
 * Get full HEAD commit hash
 */
export function getFullCommitHash(cwd = process.cwd()) {
  try {
    return execSync('git rev-parse HEAD', execOpts(cwd)).trim();
  } catch {
    return '';
  }
}

/**
 * Get remote origin URL
 */
export function getRemoteUrl(cwd = process.cwd()) {
  try {
    return execSync('git remote get-url origin', execOpts(cwd)).trim();
  } catch {
    return '';
  }
}

/**
 * Get staged files with status (A=added, M=modified, D=deleted, R=renamed)
 * Returns: [{ status: 'M', file: 'src/index.ts', insertions: 5, deletions: 2 }]
 */
export function getStagedFiles(cwd = process.cwd()) {
  try {
    const raw = execSync('git diff --cached --name-status', execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const parts = line.split('\t');
      const status = parts[0].charAt(0); // R100 -> R
      const file = parts.length > 2 ? parts[2] : parts[1]; // renamed: old -> new
      const oldFile = parts.length > 2 ? parts[1] : null;
      return { status, file, oldFile };
    });
  } catch {
    return [];
  }
}

/**
 * Get staged diff stats (insertions/deletions per file)
 */
export function getStagedDiffStats(cwd = process.cwd()) {
  try {
    const raw = execSync('git diff --cached --numstat', execOpts(cwd)).trim();
    if (!raw) return {};
    const stats = {};
    raw.split('\n').forEach(line => {
      const [ins, del, file] = line.split('\t');
      stats[file] = {
        insertions: ins === '-' ? 0 : parseInt(ins, 10),
        deletions: del === '-' ? 0 : parseInt(del, 10),
      };
    });
    return stats;
  } catch {
    return {};
  }
}

/**
 * Get unstaged modified files
 */
export function getUnstagedFiles(cwd = process.cwd()) {
  try {
    const raw = execSync('git diff --name-status', execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const [status, file] = line.split('\t');
      return { status: status.charAt(0), file };
    });
  } catch {
    return [];
  }
}

/**
 * Get untracked files
 */
export function getUntrackedFiles(cwd = process.cwd()) {
  try {
    const raw = execSync('git ls-files --others --exclude-standard', execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get recent commits
 * Returns: [{ hash, shortHash, message, author, date, relativeDate }]
 */
export function getRecentCommits(n = 10, cwd = process.cwd()) {
  try {
    const format = '%H||%h||%s||%an||%ai||%ar';
    const raw = execSync(`git log -${n} --pretty=format:"${format}"`, execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const [hash, shortHash, message, author, date, relativeDate] = line.replace(/"/g, '').split('||');
      return { hash, shortHash, message, author, date, relativeDate };
    });
  } catch {
    return [];
  }
}

/**
 * Get diff summary (total files, insertions, deletions)
 */
export function getDiffSummary(ref = 'HEAD~1', cwd = process.cwd()) {
  try {
    const raw = execSync(`git diff --stat ${ref}`, execOpts(cwd)).trim();
    const lastLine = raw.split('\n').pop() || '';
    const filesMatch = lastLine.match(/(\d+) files? changed/);
    const insMatch = lastLine.match(/(\d+) insertions?/);
    const delMatch = lastLine.match(/(\d+) deletions?/);
    return {
      filesChanged: filesMatch ? parseInt(filesMatch[1]) : 0,
      insertions: insMatch ? parseInt(insMatch[1]) : 0,
      deletions: delMatch ? parseInt(delMatch[1]) : 0,
      raw: raw,
    };
  } catch {
    return { filesChanged: 0, insertions: 0, deletions: 0, raw: '' };
  }
}

/**
 * Get the git diff for HEAD~1 (for AI context)
 */
export function getRecentDiff(maxChars = 3000, cwd = process.cwd()) {
  try {
    const raw = execSync('git diff HEAD~1 2>/dev/null || git diff', execOpts(cwd));
    return raw.slice(0, maxChars);
  } catch {
    return '';
  }
}

/**
 * Get the staged diff content (for oply stage diff)
 */
export function getStagedDiff(cwd = process.cwd()) {
  try {
    return execSync('git diff --cached', execOpts(cwd)).trim();
  } catch {
    return '';
  }
}

/**
 * Get branch list
 */
export function getBranchList(cwd = process.cwd()) {
  try {
    const raw = execSync('git branch -a --format="%(refname:short)||%(objectname:short)||%(committerdate:relative)"', execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const [name, hash, date] = line.replace(/"/g, '').split('||');
      return { name, hash, date };
    });
  } catch {
    return [];
  }
}

/**
 * Get tag list
 */
export function getTagList(cwd = process.cwd()) {
  try {
    const raw = execSync('git tag --sort=-creatordate --format="%(refname:short)||%(objectname:short)||%(creatordate:relative)"', execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const [name, hash, date] = line.replace(/"/g, '').split('||');
      return { name, hash, date };
    });
  } catch {
    return [];
  }
}

/**
 * Get commits ahead/behind remote
 */
export function getAheadBehind(cwd = process.cwd()) {
  try {
    const branch = getCurrentBranch(cwd);
    if (branch === 'unknown' || branch.includes('detached')) return { ahead: 0, behind: 0 };
    
    // Make sure we have remote tracking info
    try { execSync(`git rev-parse --abbrev-ref @{upstream}`, execOpts(cwd)); } catch { return { ahead: 0, behind: 0 }; }
    
    const raw = execSync(`git rev-list --left-right --count @{upstream}...HEAD`, execOpts(cwd)).trim();
    const [behind, ahead] = raw.split('\t').map(Number);
    return { ahead: ahead || 0, behind: behind || 0 };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

/**
 * Revert a specific commit
 */
export function gitRevert(commitHash, cwd = process.cwd()) {
  return execSync(`git revert --no-edit ${commitHash}`, { ...execOpts(cwd), stdio: 'pipe' });
}

/**
 * Revert multiple commits (a range)
 */
export function gitRevertRange(fromHash, toHash, cwd = process.cwd()) {
  return execSync(`git revert --no-edit ${fromHash}..${toHash}`, { ...execOpts(cwd), stdio: 'pipe' });
}

/**
 * Git stash
 */
export function gitStash(cwd = process.cwd()) {
  return execSync('git stash', execOpts(cwd));
}

/**
 * Git stash pop
 */
export function gitStashPop(cwd = process.cwd()) {
  try { execSync('git stash pop', execOpts(cwd)); } catch { /* no stash */ }
}

/**
 * Get total commit count
 */
export function getCommitCount(cwd = process.cwd()) {
  try {
    return parseInt(execSync('git rev-list --count HEAD', execOpts(cwd)).trim(), 10);
  } catch {
    return 0;
  }
}

/**
 * Check if working tree is clean
 */
export function isClean(cwd = process.cwd()) {
  try {
    const status = execSync('git status --porcelain', execOpts(cwd)).trim();
    return status.length === 0;
  } catch {
    return true;
  }
}

/**
 * Get list of commits between two refs
 */
export function getCommitsBetween(fromRef, toRef = 'HEAD', cwd = process.cwd()) {
  try {
    const format = '%H||%h||%s||%an||%ar';
    const raw = execSync(`git log ${fromRef}..${toRef} --pretty=format:"${format}"`, execOpts(cwd)).trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const [hash, shortHash, message, author, relativeDate] = line.replace(/"/g, '').split('||');
      return { hash, shortHash, message, author, relativeDate };
    });
  } catch {
    return [];
  }
}
