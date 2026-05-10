#!/usr/bin/env node
/**
 * Streamlined deploy: validates the working tree, runs gates, commits any
 * pending changes, pushes to origin/main, and watches the Pages workflow run.
 *
 * Usage:
 *   npm run deploy                 # uses an auto-generated commit message
 *   npm run deploy -- "your msg"   # custom commit message
 *   npm run deploy -- --skip-check # skip lint/test/build (CI re-runs them anyway)
 *   npm run deploy -- --no-watch   # do not block on the workflow run
 */
import { execSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const skipCheck = args.includes('--skip-check');
const noWatch = args.includes('--no-watch');
const message =
  args.find((a) => !a.startsWith('--')) ?? `chore: deploy ${new Date().toISOString()}`;

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function shOut(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function step(label, fn) {
  console.log(`\n\u001b[36m\u25b6 ${label}\u001b[0m`);
  fn();
}

try {
  shOut('git rev-parse --is-inside-work-tree');
} catch {
  console.error('Not a git repo. Run from the project root.');
  process.exit(1);
}

const branch = shOut('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  console.error(`On branch '${branch}'. Switch to main before deploying.`);
  process.exit(1);
}

if (!skipCheck) {
  step('Running lint + tests + build', () => sh('npm run check'));
} else {
  console.log('Skipping local checks (--skip-check). CI will still run them.');
}

const dirty = shOut('git status --porcelain');
if (dirty) {
  step(`Committing local changes (${dirty.split('\n').length} file(s))`, () => {
    sh('git add -A');
    sh(`git commit -m ${JSON.stringify(message)}`);
  });
} else {
  console.log('\nWorking tree clean. Nothing new to commit.');
}

step('Pushing to origin/main', () => sh('git push origin main'));

if (noWatch) {
  console.log(
    '\nPushed. CI will build & publish to https://evertqin.github.io/reppr/ shortly.',
  );
  process.exit(0);
}

const has = spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0;
if (!has) {
  console.log('\n`gh` CLI not found. Open Actions tab on GitHub to watch the run.');
  process.exit(0);
}

step('Waiting for the latest workflow run to start', () => {
  // Brief wait so the new run appears in the list.
  for (let i = 0; i < 10; i++) {
    try {
      const out = shOut(
        'gh run list --limit 1 --json databaseId,status,headSha,event',
      );
      const [run] = JSON.parse(out);
      const headSha = shOut('git rev-parse HEAD');
      if (run && run.headSha === headSha && run.status !== 'completed') {
        console.log(`Tracking run #${run.databaseId} for commit ${headSha.slice(0, 7)}`);
        sh(`gh run watch ${run.databaseId} --exit-status`);
        return;
      }
    } catch {
      // ignore until the run appears
    }
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{}, 1500)']);
  }
  console.log('Could not locate the new workflow run. Check the Actions tab.');
});

console.log('\n\u2705 Live: https://evertqin.github.io/reppr/');
