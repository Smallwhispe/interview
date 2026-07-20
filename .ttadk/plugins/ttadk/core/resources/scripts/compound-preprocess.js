#!/usr/bin/env node
'use strict';

/**
 * @module compound-preprocess
 * Lightweight metadata pre-scan for Compound command.
 * Extracts structural facts via pure Node.js (no shell commands) before sub-agents run.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const MAX_OUTPUT_SIZE = 50 * 1024; // 50KB limit

const LANGUAGE_PATTERNS = {
  go: {
    detect: ['go.mod'],
    interfaces: ['type\\s+\\w+\\s+interface', 'type\\s+\\w+\\s+struct'],
    tests: ['_test.go'],
    handlers: ['func.*Handler']
  },
  typescript: {
    detect: ['package.json'],
    interfaces: ['export\\s+(class|interface)', 'export\\s+type\\s+'],
    tests: ['*.spec.ts', '*.test.ts', '*.spec.tsx', '*.test.tsx'],
    handlers: ['@Controller', '@Service']
  },
  java: {
    detect: ['pom.xml', 'build.gradle'],
    interfaces: ['@Service', '@Controller', 'implements\\s+', 'interface\\s+\\w+'],
    tests: ['*Test.java', '*Spec.java'],
    handlers: ['@RestController', '@RequestMapping']
  },
  python: {
    detect: ['requirements.txt', 'pyproject.toml'],
    interfaces: ['class\\s+\\w+.*ABC', 'class\\s+\\w+.*Protocol'],
    tests: ['test_*.py', '*_test.py'],
    handlers: ['@pytest', 'def test_']
  }
};

const GENERIC_PATTERN_KEYWORDS = [
  'Factory', 'Strategy', 'Adapter', 'Observer',
  'Handler', 'Service', 'Controller', 'Registry'
];

// Extensions that are always binary — skip before reading content.
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.ogg', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib', '.class', '.pyc',
  '.map'
]);

function isBinaryFile(name) {
  const lower = name.toLowerCase();
  return BINARY_EXTS.has(path.extname(lower)) || lower.endsWith('.min.js');
}

const MAX_FILE_BYTES = 512 * 1024; // skip files larger than 512 KB

// ============================================================================
// Pure-JS helpers (replaces grep / find / head)
// ============================================================================

/**
 * Convert a shell glob (* ? **) to a RegExp.
 * ** matches across path separators; * and ? match within a single segment.
 * Matches the full string, case-sensitive.
 */
function globToRegex(glob) {
  // Split on '**' first so consecutive '*'s aren't treated as two single-star wildcards.
  const parts = glob.split('**');
  const compilePart = (part) => {
    let out = '';
    for (const ch of part) {
      if (ch === '*') out += '[^/]*';
      else if (ch === '?') out += '[^/]';
      else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return out;
  };
  return new RegExp('^' + parts.map(compilePart).join('.*') + '$');
}

/**
 * Walk dir recursively and return paths whose filename matches nameGlob.
 * @param {string} dir
 * @param {string} nameGlob  e.g. '*.yml', '_test.go'
 * @param {string[]} excludeDirs  directory names to skip (e.g. ['node_modules'])
 * @param {number} maxFiles
 */
function findFilesRecursive(dir, nameGlob, excludeDirs, maxFiles) {
  const nameRe = globToRegex(nameGlob);
  const excludeSet = new Set(excludeDirs || []);
  const results = [];

  function walk(current) {
    if (results.length >= maxFiles) return;
    let items;
    try { items = fs.readdirSync(current, { withFileTypes: true }); }
    catch (e) { return; }

    for (const item of items) {
      if (results.length >= maxFiles) return;
      if (excludeSet.has(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (nameRe.test(item.name)) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Walk dir recursively; return paths of text files whose content matches
 * at least one of the given regexes.
 * @param {string} dir
 * @param {RegExp[]} regexes
 * @param {string[]} excludeDirs
 * @param {number} maxFiles
 */
function grepFilesRecursive(dir, regexes, excludeDirs, maxFiles) {
  const excludeSet = new Set(excludeDirs || []);
  const results = [];

  function walk(current) {
    if (results.length >= maxFiles) return;
    let items;
    try { items = fs.readdirSync(current, { withFileTypes: true }); }
    catch (e) { return; }

    for (const item of items) {
      if (results.length >= maxFiles) return;
      if (item.name.startsWith('.') || excludeSet.has(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else {
        if (isBinaryFile(item.name)) continue;
        try {
          const stat = fs.statSync(full);
          if (stat.size > MAX_FILE_BYTES) continue;
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('\0')) continue; // binary guard
          if (regexes.some(re => re.test(content))) results.push(full);
        } catch (e) { /* unreadable, skip */ }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Return lines (with 1-based line numbers) from filePath that match any regex.
 * @param {string} filePath
 * @param {RegExp[]} regexes
 * @param {number} maxLines
 * @returns {{ lineNum: number, text: string }[]}
 */
function grepLinesInFile(filePath, regexes, maxLines) {
  const found = [];
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (let i = 0; i < lines.length && found.length < maxLines; i++) {
      if (regexes.some(re => re.test(lines[i]))) {
        found.push({ lineNum: i + 1, text: lines[i] });
      }
    }
  } catch (e) { /* skip */ }
  return found;
}

/**
 * Walk dir recursively; return all matching lines (as strings) across all files.
 * Used for graph-building where we need every import line, not just file paths.
 * @param {string} dir
 * @param {RegExp} regex
 * @param {string[]} excludeDirs
 * @param {number} maxLines
 */
function getAllMatchingLines(dir, regex, excludeDirs, maxLines) {
  const excludeSet = new Set(excludeDirs || []);
  const lines = [];

  function walk(current) {
    if (lines.length >= maxLines) return;
    let items;
    try { items = fs.readdirSync(current, { withFileTypes: true }); }
    catch (e) { return; }

    for (const item of items) {
      if (lines.length >= maxLines) return;
      if (item.name.startsWith('.') || excludeSet.has(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else {
        if (isBinaryFile(item.name)) continue;
        try {
          const stat = fs.statSync(full);
          if (stat.size > MAX_FILE_BYTES) continue;
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('\0')) continue;
          for (const line of content.split('\n')) {
            if (lines.length >= maxLines) break;
            if (regex.test(line)) lines.push(line);
          }
        } catch (e) { /* skip */ }
      }
    }
  }

  walk(dir);
  return lines;
}

// ============================================================================
// Service directory helper
// ============================================================================

/**
 * Return { base, dirs } for code scanning.
 * If services/ exists and has subdirectories, use those; otherwise fall back
 * to rootDir itself so non-CSR repos still produce results.
 */
function getServiceDirs(rootDir) {
  const servicesDir = path.join(rootDir, 'services');
  if (fs.existsSync(servicesDir)) {
    try {
      const entries = fs.readdirSync(servicesDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      if (entries.length > 0) {
        return {
          base: servicesDir,
          dirs: entries.map(d => ({ name: d.name, path: path.join(servicesDir, d.name) }))
        };
      }
    } catch (e) { /* fall through */ }
  }
  return { base: rootDir, dirs: [{ name: path.basename(rootDir), path: rootDir }] };
}

// ============================================================================
// Language Detection
// ============================================================================

function detectLanguage(dir) {
  const detected = [];

  const servicesDir = path.join(dir, 'services');
  const subdirs = fs.existsSync(servicesDir)
    ? fs.readdirSync(servicesDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(servicesDir, d.name))
    : [dir];

  for (const subdir of subdirs) {
    for (const [lang, config] of Object.entries(LANGUAGE_PATTERNS)) {
      if (detected.includes(lang)) continue;
      for (const marker of config.detect) {
        if (fs.existsSync(path.join(subdir, marker))) {
          detected.push(lang);
          break;
        }
      }
    }
  }

  if (detected.length === 0) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      detected.push('typescript');
    }
  }

  return detected.length > 0 ? detected : ['generic'];
}

// ============================================================================
// Extraction Functions
// ============================================================================

function extractFileTree(rootDir, maxDepth = 3) {
  const { dirs } = getServiceDirs(rootDir);
  const tree = {};

  function walk(dir, depth) {
    if (depth > maxDepth) return null;
    const entries = {};
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        if (item.isDirectory()) {
          const sub = walk(path.join(dir, item.name), depth + 1);
          if (sub !== null) entries[item.name + '/'] = sub;
        } else {
          entries[item.name] = null;
        }
      }
    } catch (e) { /* permission error, skip */ }
    return Object.keys(entries).length > 0 ? entries : null;
  }

  for (const svc of dirs) {
    tree[svc.name] = walk(svc.path, 1);
  }

  return tree;
}

function extractInterfaces(rootDir, languages) {
  const results = [];
  const { dirs } = getServiceDirs(rootDir);

  const rawPatterns = [];
  for (const lang of languages) {
    const config = LANGUAGE_PATTERNS[lang];
    if (config && config.interfaces) rawPatterns.push(...config.interfaces);
  }
  if (rawPatterns.length === 0) {
    rawPatterns.push('interface\\s+\\w+', 'class\\s+\\w+');
  }
  const regexes = rawPatterns.map(p => new RegExp(p));

  for (const svc of dirs) {
    const files = grepFilesRecursive(svc.path, regexes, ['node_modules'], 100);
    for (const file of files.slice(0, 20)) {
      const lines = grepLinesInFile(file, regexes, 5);
      for (const { text } of lines) {
        results.push({
          service: svc.name,
          file: path.relative(rootDir, file),
          name: text.trim().slice(0, 100),
          type: text.includes('interface') ? 'interface' : 'struct'
        });
      }
    }
  }

  return results.slice(0, 200);
}

function extractImportsGraph(rootDir, languages) {
  const graph = {};
  const { dirs } = getServiceDirs(rootDir);

  const importRegexes = {
    typescript: /from\s+['"]/,
    // Match only Go import lines: bare quoted package paths (import block entries like
    //   `"github.com/pkg"`) or single-line imports (`import "pkg"`). Using a path-separator
    // heuristic (`/`) to avoid matching ordinary string literals.
    go: /^\s*(?:\w+\s+)?"[^"]*\/[^"]*"\s*(?:\/\/.*)?$|^\s*import\s+"[^"]+"/,
    java: /import\s+/,
    python: /(from|import)\s+/
  };

  const activeRegexes = ['go', 'typescript', 'java', 'python']
    .filter(lang => languages.includes(lang))
    .map(lang => importRegexes[lang]);
  if (activeRegexes.length === 0) return {};

  const serviceNames = dirs.map(s => s.name);

  for (const svc of dirs) {
    const deps = new Set();
    for (const regex of activeRegexes) {
      const lines = getAllMatchingLines(svc.path, regex, ['node_modules'], 200);
      for (const line of lines) {
        for (const otherSvc of serviceNames) {
          if (otherSvc !== svc.name && line.includes(otherSvc)) {
            deps.add(otherSvc);
          }
        }
      }
    }
    if (deps.size > 0) graph[svc.name] = Array.from(deps);
  }

  return graph;
}

function extractPatternSignatures(rootDir) {
  const signatures = {};
  const { base } = getServiceDirs(rootDir);

  for (const keyword of GENERIC_PATTERN_KEYWORDS) {
    const regex = new RegExp(keyword, 'i');
    const files = grepFilesRecursive(base, [regex], ['node_modules'], 10);

    const entries = [];
    for (const file of files.slice(0, 5)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const head = content.split('\n').slice(0, 5).join('\n').slice(0, 200);
        entries.push({ file: path.relative(rootDir, file), head });
      } catch (e) { /* skip */ }
    }

    if (entries.length > 0) signatures[keyword.toLowerCase()] = entries;
  }

  return signatures;
}

function extractConfigFiles(rootDir) {
  const patterns = ['*.yml', '*.yaml', '.env*', '*.toml', 'tsconfig*.json', '.eslintrc*', '.prettierrc*'];
  const results = [];
  const seen = new Set();

  for (const pattern of patterns) {
    const files = findFilesRecursive(rootDir, pattern, ['node_modules', '.git'], 20);
    for (const file of files) {
      const rel = path.relative(rootDir, file);
      if (!seen.has(rel)) { seen.add(rel); results.push(rel); }
    }
  }

  return results.slice(0, 50);
}

function extractTestFiles(rootDir, languages) {
  const { base } = getServiceDirs(rootDir);
  const testPatterns = [];

  for (const lang of languages) {
    const config = LANGUAGE_PATTERNS[lang];
    if (config && config.tests) testPatterns.push(...config.tests);
  }
  if (testPatterns.length === 0) testPatterns.push('*test*', '*spec*');

  const results = [];
  const seen = new Set();

  for (const pattern of testPatterns) {
    const files = findFilesRecursive(base, pattern, ['node_modules'], 30);
    for (const file of files) {
      const rel = path.relative(rootDir, file);
      if (!seen.has(rel)) { seen.add(rel); results.push(rel); }
    }
  }

  return results.slice(0, 50);
}

function extractDeploymentFiles(rootDir) {
  const targets = ['Dockerfile', 'docker-compose.yml', 'Makefile', '.gitlab-ci.yml',
                   'ci.yaml', 'build.sh', 'deploy.sh', 'Jenkinsfile'];
  const results = [];

  for (const target of targets) {
    const files = findFilesRecursive(rootDir, target, ['node_modules', '.git'], 10);
    for (const file of files) results.push(path.relative(rootDir, file));
  }

  return results.slice(0, 20);
}

function extractTerminology(rootDir) {
  const terminology = {};
  const sources = ['CLAUDE.md', 'README.md', 'README'];

  let content = '';
  for (const src of sources) {
    const filePath = path.join(rootDir, src);
    if (fs.existsSync(filePath)) {
      try { content += fs.readFileSync(filePath, 'utf8') + '\n'; }
      catch (e) { /* skip */ }
    }
  }

  if (!content) return terminology;

  const words = content.match(/\b[A-Z][a-zA-Z]{2,}\b|\b[A-Z][A-Z_]{2,}\b/g) || [];
  const freq = {};

  for (const word of words) {
    if (word.length < 3 || word.length > 30) continue;
    if (['The', 'This', 'That', 'With', 'From', 'When', 'Where', 'What', 'How', 'Why',
         'For', 'Not', 'But', 'And', 'Are', 'Was', 'Were', 'Has', 'Had', 'Can',
         'Could', 'Would', 'Should', 'May', 'Will', 'Must', 'See', 'Use', 'New'].includes(word)) continue;
    freq[word] = (freq[word] || 0) + 1;
  }

  const explained = content.match(/(\w+)\s*[（(][^)）]{2,30}[)）]/g) || [];
  for (const match of explained) {
    const term = match.match(/^(\w+)/);
    if (term) {
      const name = term[1];
      if (!freq[name]) freq[name] = 1;
      freq[name] += 2;
    }
  }

  for (const [term, count] of Object.entries(freq)) {
    if (count >= 3) terminology[term] = { full: term, frequency: count };
  }

  return terminology;
}

const DEFAULT_GENERIC_NAMES = new Set(['index', 'lib', 'src', 'main', 'common', 'utils', 'types']);

function enumerateMultiInstance(rootDir, options = {}) {
  const minInstances = options.minInstances || 3;
  const maxDepth = options.maxDepth || 4;
  const maxDirs = options.maxDirs || 5000;
  const genericNames = options.genericNames
    ? new Set(options.genericNames)
    : DEFAULT_GENERIC_NAMES;
  const skipDirs = new Set(['node_modules', 'dist', 'build', 'out', 'target', 'coverage', 'vendor', '.next']);
  const sampleSize = 5;

  const { dirs } = getServiceDirs(rootDir);

  const dirEntries = [];
  let capped = false;

  function walk(dir, depth) {
    if (capped || depth > maxDepth) return;
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { return; }

    const fileNames = items
      .filter(it => it.isFile() && !it.name.startsWith('.'))
      .map(it => it.name)
      .sort();

    // Include subdirectory names so dirs with the same files but different
    // subdirectory structures aren't incorrectly grouped.
    const subDirNames = items
      .filter(it => it.isDirectory() && !it.name.startsWith('.') && !skipDirs.has(it.name))
      .map(it => it.name + '/')
      .sort();

    if (fileNames.length > 0) {
      const shapeKey = [...fileNames, ...subDirNames].join('|');
      const fingerprint = crypto.createHash('md5').update(shapeKey).digest('hex');
      dirEntries.push({ path: dir, fingerprint, sample: fileNames.slice(0, sampleSize) });
      if (dirEntries.length >= maxDirs) { capped = true; return; }
    }

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.') && !skipDirs.has(item.name)) {
        walk(path.join(dir, item.name), depth + 1);
      }
    }
  }

  for (const svc of dirs) {
    const srcDir = path.join(svc.path, 'src');
    const startDir = fs.existsSync(srcDir) ? srcDir : svc.path;
    walk(startDir, 0);
  }

  const groups = new Map();
  for (const d of dirEntries) {
    if (!groups.has(d.fingerprint)) groups.set(d.fingerprint, []);
    groups.get(d.fingerprint).push(d);
  }

  const result = [];
  for (const members of groups.values()) {
    if (members.length < minInstances) continue;

    const firstBase = path.basename(members[0].path);
    const kind = genericNames.has(firstBase.toLowerCase())
      ? path.basename(path.dirname(members[0].path))
      : firstBase;

    result.push({
      kind,
      instances: members.map(m => path.relative(rootDir, m.path)).sort(),
      fingerprint_sample: members[0].sample
    });
  }

  result.sort((a, b) => a.kind.localeCompare(b.kind) || a.instances[0].localeCompare(b.instances[0]));
  return result;
}

// ============================================================================
// Output Control
// ============================================================================

/**
 * Count all non-directory, non-symlink entries under rootDir (respecting standard
 * exclusions) so main() can report total_files_scanned accurately.
 */
function countFilesRecursive(rootDir) {
  const skipDirs = new Set(['node_modules', 'dist', 'build', 'out', 'target', 'coverage', 'vendor', '.next', '.git']);
  let count = 0;

  function walk(dir) {
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { return; }
    for (const item of items) {
      if (item.name.startsWith('.') || skipDirs.has(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) walk(path.join(dir, item.name));
      else count++;
    }
  }

  walk(rootDir);
  return count;
}

function enforceOutputLimit(output) {
  let json = JSON.stringify(output, null, 2);

  if (Buffer.byteLength(json, 'utf8') <= MAX_OUTPUT_SIZE) return output;

  const truncOrder = ['deployment_files', 'config_files', 'test_files',
                      'pattern_signatures', 'terminology', 'interfaces', 'imports_graph', 'file_tree'];

  for (const field of truncOrder) {
    if (!output[field]) continue;

    if (Array.isArray(output[field])) {
      const half = Math.max(5, Math.floor(output[field].length / 2));
      output[field] = output[field].slice(0, half);
    } else if (typeof output[field] === 'object') {
      const keys = Object.keys(output[field]);
      const half = Math.max(3, Math.floor(keys.length / 2));
      const kept = {};
      for (const k of keys.slice(0, half)) kept[k] = output[field][k];
      output[field] = kept;
    }

    json = JSON.stringify(output, null, 2);
    if (Buffer.byteLength(json, 'utf8') <= MAX_OUTPUT_SIZE) break;
  }

  return output;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const rootDir = process.argv[2] || process.cwd();

  if (!fs.existsSync(rootDir)) {
    console.error(JSON.stringify({ error: `Directory not found: ${rootDir}` }));
    process.exit(1);
  }

  const languages = detectLanguage(rootDir);

  const { dirs } = getServiceDirs(rootDir);
  const servicesCount = dirs.length === 1 && dirs[0].path === rootDir ? 0 : dirs.length;
  const totalFilesScanned = countFilesRecursive(rootDir);

  const output = {
    scan_metadata: {
      timestamp: new Date().toISOString(),
      detected_languages: languages,
      services_count: servicesCount,
      total_files_scanned: totalFilesScanned
    },
    file_tree: extractFileTree(rootDir),
    interfaces: extractInterfaces(rootDir, languages),
    imports_graph: extractImportsGraph(rootDir, languages),
    pattern_signatures: extractPatternSignatures(rootDir),
    config_files: extractConfigFiles(rootDir),
    test_files: extractTestFiles(rootDir, languages),
    deployment_files: extractDeploymentFiles(rootDir),
    terminology: extractTerminology(rootDir),
    multi_instance: enumerateMultiInstance(rootDir)
  };

  const result = enforceOutputLimit(output);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  enumerateMultiInstance,
  enforceOutputLimit,
  findFilesRecursive,
  grepFilesRecursive,
  extractImportsGraph,
  extractInterfaces,
  extractFileTree,
  extractConfigFiles,
  extractTestFiles,
  extractDeploymentFiles,
  extractTerminology,
  DEFAULT_GENERIC_NAMES
};
