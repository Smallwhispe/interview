const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { enumerateMultiInstance, enforceOutputLimit, findFilesRecursive, grepFilesRecursive,
        extractImportsGraph, extractInterfaces, extractFileTree,
        extractConfigFiles, extractDeploymentFiles, DEFAULT_GENERIC_NAMES } = require('./compound-preprocess.js');

function mkServiceSrc(rootDir, service, relDir, fileNames) {
  const dir = path.join(rootDir, 'services', service, 'src', relDir);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fileNames) {
    fs.writeFileSync(path.join(dir, name), '// stub');
  }
  return dir;
}

function withTempRepo(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ttadk-compound-preprocess-'));
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
  return tempRoot;
}

test('enumerateMultiInstance groups directories across services by fingerprint', (t) => {
  const repo = withTempRepo(t);

  mkServiceSrc(repo, 'alpha', 'handlers', ['auth.ts', 'user.ts']);
  mkServiceSrc(repo, 'beta', 'handlers', ['user.ts', 'auth.ts']);
  mkServiceSrc(repo, 'gamma', 'handlers', ['auth.ts', 'user.ts']);

  const groups = enumerateMultiInstance(repo);

  assert.equal(groups.length, 1, 'exactly one multi-instance group expected');
  const group = groups[0];
  assert.equal(group.kind, 'handlers');
  assert.equal(group.instances.length, 3);
  assert.deepEqual(group.instances.slice().sort(), group.instances, 'instances should be sorted for determinism');
  for (const inst of group.instances) {
    assert.match(inst, /services\/(alpha|beta|gamma)\/src\/handlers$/);
  }
  assert.deepEqual(group.fingerprint_sample, ['auth.ts', 'user.ts']);
});

test('enumerateMultiInstance returns empty array when fewer than 3 instances share a fingerprint', (t) => {
  const repo = withTempRepo(t);

  mkServiceSrc(repo, 'alpha', 'handlers', ['auth.ts', 'user.ts']);
  mkServiceSrc(repo, 'beta', 'handlers', ['auth.ts', 'user.ts']);

  const groups = enumerateMultiInstance(repo);

  assert.deepEqual(groups, []);
});

test('enumerateMultiInstance is inclusive at the boundary of exactly 3 instances', (t) => {
  const repo = withTempRepo(t);

  for (const svc of ['a', 'b', 'c']) {
    mkServiceSrc(repo, svc, 'adapters', ['http.ts', 'grpc.ts']);
  }

  const groups = enumerateMultiInstance(repo);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].instances.length, 3);
});

test('enumerateMultiInstance resolves generic leaf names to parent directory', (t) => {
  const repo = withTempRepo(t);

  for (const svc of ['a', 'b', 'c']) {
    mkServiceSrc(repo, svc, 'payment/index', ['mod.ts', 'types.ts']);
  }

  const groups = enumerateMultiInstance(repo);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, 'payment', 'generic "index" leaf should yield parent as kind');
});

test('enumerateMultiInstance returns empty array when services/ is absent', (t) => {
  const repo = withTempRepo(t);

  const groups = enumerateMultiInstance(repo);

  assert.deepEqual(groups, []);
});

test('enumerateMultiInstance does not group directories that share files but have different subdirectories', (t) => {
  const repo = withTempRepo(t);

  // alpha/handlers has a subdirectory; beta and gamma do not
  mkServiceSrc(repo, 'alpha', 'handlers', ['auth.ts', 'user.ts']);
  fs.mkdirSync(path.join(repo, 'services', 'alpha', 'src', 'handlers', 'middleware'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'services', 'alpha', 'src', 'handlers', 'middleware', 'log.ts'), '// stub');

  mkServiceSrc(repo, 'beta', 'handlers', ['auth.ts', 'user.ts']);
  mkServiceSrc(repo, 'gamma', 'handlers', ['auth.ts', 'user.ts']);

  const groups = enumerateMultiInstance(repo);

  // alpha has middleware/ subdirectory, beta/gamma do not — fingerprints differ, no group
  assert.deepEqual(groups, [], 'directories with same files but different subdirectories must not be grouped');
});

// ============================================================================
// enforceOutputLimit tests
// ============================================================================

function buildLargeOutput(fieldName, itemCount) {
  const item = 'x'.repeat(200);
  return {
    scan_metadata: { timestamp: '', detected_languages: [], services_count: 0, total_files_scanned: 0 },
    [fieldName]: Array.from({ length: itemCount }, () => item)
  };
}

test('enforceOutputLimit returns output unchanged when under the 50KB limit', () => {
  const output = { scan_metadata: { timestamp: '', detected_languages: [], services_count: 0, total_files_scanned: 0 }, multi_instance: [] };
  const result = enforceOutputLimit(output);
  assert.deepEqual(result, output);
});

test('enforceOutputLimit truncates low-priority fields first when over 50KB', () => {
  // 400 items × 200 chars ≈ 82KB; after halving to 200 items ≈ 41KB — under limit
  const output = buildLargeOutput('deployment_files', 400);
  const result = enforceOutputLimit(output);

  const json = JSON.stringify(result, null, 2);
  assert.ok(Buffer.byteLength(json, 'utf8') <= 50 * 1024, 'output must be within 50KB after truncation');
  assert.ok(result.deployment_files.length < 400, 'deployment_files should have been truncated');
});

test('enforceOutputLimit truncates iteratively through priority order when a single pass is insufficient', () => {
  // Fill both deployment_files and config_files; each alone stays over limit after half,
  // but both halved together fall under it.
  const item = 'x'.repeat(200);
  const output = {
    scan_metadata: { timestamp: '', detected_languages: [], services_count: 0, total_files_scanned: 0 },
    deployment_files: Array.from({ length: 200 }, () => item),  // ~42KB alone
    config_files: Array.from({ length: 200 }, () => item)       // ~42KB alone; together ~84KB > 50KB
  };

  const result = enforceOutputLimit(output);

  const json = JSON.stringify(result, null, 2);
  assert.ok(Buffer.byteLength(json, 'utf8') <= 50 * 1024, 'output must be within 50KB after multi-pass truncation');
});

// ============================================================================
// main() error path test
// ============================================================================

test('main() exits with error when the target directory does not exist', () => {
  const scriptPath = path.join(__dirname, 'compound-preprocess.js');
  const nonExistent = path.join(os.tmpdir(), 'ttadk-does-not-exist-12345');

  let threw = false;
  try {
    execSync(`node "${scriptPath}" "${nonExistent}"`, { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    threw = true;
    // stderr should contain an error message; exit code must be non-zero
    assert.notEqual(err.status, 0, 'exit code should be non-zero for missing directory');
  }
  assert.ok(threw, 'process should have thrown / exited non-zero for a non-existent directory');
});

// ============================================================================
// TST-003: main() JSON output shape
// ============================================================================

test('main() outputs valid JSON with all required top-level fields', (t) => {
  const repo = withTempRepo(t);
  // Minimal repo — just needs to exist
  fs.writeFileSync(path.join(repo, 'index.ts'), 'export const x = 1;');

  const scriptPath = path.join(__dirname, 'compound-preprocess.js');
  const stdout = execSync(`node "${scriptPath}" "${repo}"`, { encoding: 'utf8' });

  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(stdout); }, 'output must be valid JSON');

  const required = ['scan_metadata', 'file_tree', 'interfaces', 'imports_graph',
                    'pattern_signatures', 'config_files', 'test_files',
                    'deployment_files', 'terminology', 'multi_instance'];
  for (const key of required) {
    assert.ok(Object.prototype.hasOwnProperty.call(parsed, key), `top-level key "${key}" must be present`);
  }
  assert.ok(typeof parsed.scan_metadata.timestamp === 'string', 'scan_metadata.timestamp must be a string');
  assert.ok(Array.isArray(parsed.scan_metadata.detected_languages), 'scan_metadata.detected_languages must be an array');
  assert.ok(typeof parsed.scan_metadata.services_count === 'number', 'scan_metadata.services_count must be a number');
  assert.ok(typeof parsed.scan_metadata.total_files_scanned === 'number', 'scan_metadata.total_files_scanned must be a number');
});

// ============================================================================
// TST-001: BINARY_EXTS filtering in grepFilesRecursive
// ============================================================================

test('grepFilesRecursive excludes binary-extension files even when they match content', (t) => {
  const repo = withTempRepo(t);

  // Write two files: a .ts with matching content, and a .png with the same content
  fs.writeFileSync(path.join(repo, 'source.ts'), 'export function myFunc() {}');
  fs.writeFileSync(path.join(repo, 'image.png'), 'export function myFunc() {}');

  const regex = /myFunc/;
  const results = grepFilesRecursive(repo, [regex], [], 100);

  assert.ok(results.some(f => f.endsWith('source.ts')), 'source.ts should be matched');
  assert.ok(!results.some(f => f.endsWith('image.png')), '.png must be excluded by BINARY_EXTS');
});

test('grepFilesRecursive excludes files with .map and .min.js extensions', (t) => {
  const repo = withTempRepo(t);

  fs.writeFileSync(path.join(repo, 'bundle.js'), 'function target() {}');
  fs.writeFileSync(path.join(repo, 'bundle.js.map'), 'function target() {}');
  fs.writeFileSync(path.join(repo, 'bundle.min.js'), 'function target() {}');

  const results = grepFilesRecursive(repo, [/target/], [], 100);

  assert.ok(results.some(f => f.endsWith('bundle.js')), 'bundle.js should be matched');
  assert.ok(!results.some(f => f.endsWith('.map')), '.map must be excluded');
  assert.ok(!results.some(f => f.endsWith('.min.js')), '.min.js must be excluded');
});

// ============================================================================
// TST-002: MAX_FILE_BYTES size-gating in grepFilesRecursive
// ============================================================================

test('grepFilesRecursive skips files larger than MAX_FILE_BYTES (512KB)', (t) => {
  const repo = withTempRepo(t);

  // Write a small file and a large file (>512KB), both containing the target string
  const target = 'UNIQUE_SEARCH_TARGET';
  fs.writeFileSync(path.join(repo, 'small.ts'), `const x = '${target}';`);

  const large = Buffer.alloc(520 * 1024, 'x');
  large.write(target, 0);
  fs.writeFileSync(path.join(repo, 'huge.ts'), large);

  const results = grepFilesRecursive(repo, [new RegExp(target)], [], 100);

  assert.ok(results.some(f => f.endsWith('small.ts')), 'small.ts must be matched');
  assert.ok(!results.some(f => f.endsWith('huge.ts')), 'huge.ts (>512KB) must be skipped by MAX_FILE_BYTES');
});

// ============================================================================
// TST-007: enforceOutputLimit object-field truncation
// ============================================================================

test('enforceOutputLimit truncates object-type fields (not just arrays) when over limit', () => {
  // 250 keys × 250 chars ≈ 65KB (over 50KB); after halving to 125 keys ≈ 32KB (under 50KB)
  const manyKeys = {};
  for (let i = 0; i < 250; i++) {
    manyKeys[`key_${String(i).padStart(3, '0')}`] = 'x'.repeat(250);
  }
  const output = {
    scan_metadata: { timestamp: '', detected_languages: [], services_count: 0, total_files_scanned: 0 },
    terminology: manyKeys
  };

  const result = enforceOutputLimit(output);
  const json = JSON.stringify(result, null, 2);

  assert.ok(Buffer.byteLength(json, 'utf8') <= 50 * 1024, 'output must be within 50KB after object truncation');
  assert.ok(Object.keys(result.terminology).length < 250, 'terminology object must have been truncated');
});

// ============================================================================
// extractFileTree tests
// ============================================================================

test('extractFileTree returns a tree keyed by service name', (t) => {
  const repo = withTempRepo(t);

  mkServiceSrc(repo, 'svc-a', 'handlers', ['auth.ts']);
  mkServiceSrc(repo, 'svc-b', 'handlers', ['user.ts']);

  const tree = extractFileTree(repo);

  assert.ok(Object.prototype.hasOwnProperty.call(tree, 'svc-a'), 'svc-a key expected');
  assert.ok(Object.prototype.hasOwnProperty.call(tree, 'svc-b'), 'svc-b key expected');
});

test('extractFileTree returns null for empty services directory', (t) => {
  const repo = withTempRepo(t);
  // An empty repo — services/ does not exist; falls back to rootDir itself.
  const tree = extractFileTree(repo);

  // rootDir is the single "service"; it has no subdirectories or files, so its value is null.
  const values = Object.values(tree);
  assert.equal(values.length, 1, 'one top-level entry expected (rootDir fallback)');
  assert.equal(values[0], null, 'empty directory yields null node');
});

// ============================================================================
// extractInterfaces tests
// ============================================================================

test('extractInterfaces finds interface declarations in TypeScript files', (t) => {
  const repo = withTempRepo(t);

  // Place a package.json so TypeScript is detected.
  fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"test"}');
  mkServiceSrc(repo, 'svc', '', ['auth.ts']);
  fs.writeFileSync(
    path.join(repo, 'services', 'svc', 'src', 'auth.ts'),
    'export interface AuthService { login(u: string): Promise<void>; }'
  );

  const results = extractInterfaces(repo, ['typescript']);

  assert.ok(results.length > 0, 'at least one interface entry expected');
  assert.ok(results.some(r => r.file.includes('auth.ts')), 'auth.ts must appear in results');
  assert.ok(results.some(r => r.type === 'interface'), 'type field must be "interface"');
});

// ============================================================================
// extractImportsGraph tests
// ============================================================================

test('extractImportsGraph detects TypeScript cross-service imports', (t) => {
  const repo = withTempRepo(t);

  fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"test"}');
  mkServiceSrc(repo, 'alpha', '', ['index.ts']);
  mkServiceSrc(repo, 'beta', '', ['index.ts']);
  // alpha imports something from beta
  fs.writeFileSync(
    path.join(repo, 'services', 'alpha', 'src', 'index.ts'),
    "import { foo } from '@org/beta/foo';"
  );

  const graph = extractImportsGraph(repo, ['typescript']);

  assert.ok(Object.prototype.hasOwnProperty.call(graph, 'alpha'), 'alpha should appear in graph');
  assert.ok(graph['alpha'].includes('beta'), 'alpha should list beta as dependency');
});

test('extractImportsGraph does not produce false Go cross-service dependencies from string literals', (t) => {
  const repo = withTempRepo(t);

  mkServiceSrc(repo, 'parser', '', ['main.go']);
  mkServiceSrc(repo, 'renderer', '', ['main.go']);
  // parser has a string literal that happens to contain "renderer" but is NOT an import
  fs.writeFileSync(
    path.join(repo, 'services', 'parser', 'src', 'main.go'),
    `package main\n\nfunc main() {\n  msg := "the renderer is fast"\n  _ = msg\n}\n`
  );

  const graph = extractImportsGraph(repo, ['go']);

  // "renderer" should NOT appear as a dependency of "parser"
  if (Object.prototype.hasOwnProperty.call(graph, 'parser')) {
    assert.ok(!graph['parser'].includes('renderer'), 'string literal must not create false Go dependency');
  }
});

// ============================================================================
// extractConfigFiles / extractDeploymentFiles basic smoke tests
// ============================================================================

test('extractConfigFiles returns yaml and toml files', (t) => {
  const repo = withTempRepo(t);

  fs.writeFileSync(path.join(repo, 'config.yml'), 'key: value');
  fs.writeFileSync(path.join(repo, 'settings.toml'), '[app]');

  const files = extractConfigFiles(repo);

  assert.ok(files.some(f => f.endsWith('config.yml')), 'config.yml must be found');
  assert.ok(files.some(f => f.endsWith('settings.toml')), 'settings.toml must be found');
});

test('extractDeploymentFiles returns Dockerfile and Makefile paths', (t) => {
  const repo = withTempRepo(t);

  fs.writeFileSync(path.join(repo, 'Dockerfile'), 'FROM node:18');
  fs.writeFileSync(path.join(repo, 'Makefile'), 'build:\n\tnpm run build');

  const files = extractDeploymentFiles(repo);

  assert.ok(files.some(f => f.endsWith('Dockerfile')), 'Dockerfile must be found');
  assert.ok(files.some(f => f.endsWith('Makefile')), 'Makefile must be found');
});

// ============================================================================
// DEFAULT_GENERIC_NAMES and options.genericNames
// ============================================================================

test('enumerateMultiInstance exposes DEFAULT_GENERIC_NAMES and honours options.genericNames', (t) => {
  const repo = withTempRepo(t);

  // Use a custom generic name "api" — without the override the leaf name would be "api"
  // not resolved to its parent, so the kind would equal "api" in both branches.
  // With the override, "api" is treated as generic and the parent ("services") becomes kind.
  for (const svc of ['a', 'b', 'c']) {
    mkServiceSrc(repo, svc, 'api', ['router.ts', 'types.ts']);
  }

  // Without override: 'api' is not in the default set → kind = 'api'
  const defaultGroups = enumerateMultiInstance(repo);
  assert.equal(defaultGroups.length, 1);
  assert.equal(defaultGroups[0].kind, 'api', 'default: "api" is not generic, kind stays as-is');

  // DEFAULT_GENERIC_NAMES is exported and is a Set
  assert.ok(DEFAULT_GENERIC_NAMES instanceof Set, 'DEFAULT_GENERIC_NAMES must be a Set');
  assert.ok(DEFAULT_GENERIC_NAMES.has('index'), 'DEFAULT_GENERIC_NAMES must include "index"');

  // With override including 'api' → kind resolves to parent
  const customGroups = enumerateMultiInstance(repo, {
    genericNames: [...DEFAULT_GENERIC_NAMES, 'api']
  });
  assert.equal(customGroups.length, 1);
  assert.notEqual(customGroups[0].kind, 'api', 'custom: "api" is now generic, kind resolves to parent');
});

// ============================================================================
// TST-000 / TST-006: Pending integration tests
// ============================================================================
// These tests cover AI workflow behaviors defined in compound.md (not Node.js logic)
// and require a full compound command integration harness to run.

test.todo('TST-000: pending_evidence → orphan state machine (two-round compound run)');
// When to implement: set up a compound integration test harness that:
//   1. Runs compound on a repo where constitution-style dimensions lack evidence.
//   2. Asserts round 1 emits status: pending_evidence for at least one rule.
//   3. Runs compound a second time without new evidence.
//   4. Asserts round 2 promotes affected rules to status: orphan with
//      unresolved_rounds: 2 and requires_human_confirm: true.

test.todo('TST-006: corrupt coverage-gaps.md triggers first-run mode recovery');
// When to implement: set up a compound integration test harness that:
//   1. Places a corrupt or truncated coverage-gaps.md in docs/references/.
//   2. Runs compound and captures stderr/logs.
//   3. Asserts Phase 0 logs "downgrading to first-run mode".
//   4. Asserts the command completes without aborting and produces a valid
//      coverage-gaps.md that conforms to extraction-schemas/coverage-gaps.json.

