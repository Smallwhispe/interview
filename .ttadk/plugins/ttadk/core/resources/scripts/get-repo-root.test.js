const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { getRepoRoot } = require('./common.js');

function mkdtemp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  // macOS prefixes /private when realpath'ing /var → make sure we compare consistently
  return fs.realpathSync(dir);
}

function gitInit(dir) {
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email "t@t"', { cwd: dir });
  execSync('git config user.name "t"', { cwd: dir });
}

function withCwd(dir, fn) {
  const prev = process.cwd();
  const prevOverride = process.env.TTADK_REPO_ROOT;
  const prevFeature = process.env.TTADK_FEATURE;
  delete process.env.TTADK_REPO_ROOT;
  delete process.env.TTADK_FEATURE;
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(prev);
    if (prevOverride === undefined) delete process.env.TTADK_REPO_ROOT;
    else process.env.TTADK_REPO_ROOT = prevOverride;
    if (prevFeature === undefined) delete process.env.TTADK_FEATURE;
    else process.env.TTADK_FEATURE = prevFeature;
  }
}

test('1a: normal project — gitRoot has .ttadk, cwd in subdirectory', () => {
  const root = mkdtemp('ttadk-rr-1a-');
  fs.mkdirSync(path.join(root, '.ttadk'), { recursive: true });
  gitInit(root);
  const sub = path.join(root, 'services', 'api');
  fs.mkdirSync(sub, { recursive: true });

  const got = withCwd(sub, () => getRepoRoot());
  assert.equal(got, root);
});

test('1a: hijack defense — parent of gitRoot has .ttadk, must NOT escape gitRoot', () => {
  const outer = mkdtemp('ttadk-rr-hijack-');
  fs.mkdirSync(path.join(outer, '.ttadk'), { recursive: true }); // stray .ttadk above
  const project = path.join(outer, 'project');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(path.join(project, '.ttadk'), { recursive: true });
  gitInit(project);
  const sub = path.join(project, 'src');
  fs.mkdirSync(sub, { recursive: true });

  const got = withCwd(sub, () => getRepoRoot());
  assert.equal(got, project, 'must stop at gitRoot, not climb to outer .ttadk');
});

test('1b: monorepo with TTADK sub-project — gitRoot has no .ttadk, sub does', () => {
  const monorepo = mkdtemp('ttadk-rr-1b-');
  gitInit(monorepo);
  const subProject = path.join(monorepo, 'apps', 'ttadk-app');
  fs.mkdirSync(subProject, { recursive: true });
  fs.mkdirSync(path.join(subProject, '.ttadk'), { recursive: true });
  const deeper = path.join(subProject, 'src', 'feature');
  fs.mkdirSync(deeper, { recursive: true });

  const got = withCwd(deeper, () => getRepoRoot());
  assert.equal(got, subProject);
});

test('1b: gitRoot fallback — no .ttadk anywhere within git boundary', () => {
  const monorepo = mkdtemp('ttadk-rr-fallback-');
  gitInit(monorepo);
  const sub = path.join(monorepo, 'foo');
  fs.mkdirSync(sub, { recursive: true });

  const got = withCwd(sub, () => getRepoRoot());
  assert.equal(got, monorepo);
});

test('P0: TTADK_REPO_ROOT explicit override beats everything', () => {
  const root = mkdtemp('ttadk-rr-override-');
  fs.mkdirSync(path.join(root, '.ttadk'), { recursive: true });
  gitInit(root);
  const override = mkdtemp('ttadk-rr-override-target-');

  const prev = process.env.TTADK_REPO_ROOT;
  process.env.TTADK_REPO_ROOT = override;
  try {
    const got = withCwd(root, () => {
      // re-set inside withCwd because withCwd clears the env; use direct call instead
      process.env.TTADK_REPO_ROOT = override;
      return getRepoRoot();
    });
    assert.equal(got, override);
  } finally {
    if (prev === undefined) delete process.env.TTADK_REPO_ROOT;
    else process.env.TTADK_REPO_ROOT = prev;
  }
});
