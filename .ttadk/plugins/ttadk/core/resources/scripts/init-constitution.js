#!/usr/bin/env node
/**
 * Initialize Constitution Script
 * Checks docs/ for constitution document set (5 files).
 * For any missing file, copies the corresponding template from
 * templates/constitution/{TYPE}.md to docs/ (overwrite: false).
 * Replaces [PROJECT_NAME] placeholders with the project directory name.
 */
const fs = require("fs");
const path = require("path");
const { existsSync, getRepoRoot } = require("./common");

const repoRoot = getRepoRoot();
const docsDir = path.join(repoRoot, "docs");
const templateDir = path.join(
    repoRoot, ".ttadk", "plugins", "ttadk", "core",
    "resources", "templates"
);

const CONSTITUTION_FILES = [
    "CONSTITUTION.md",
    "QUALITY.md",
    "RELIABILITY.md",
    "SECURITY.md",
    "CODING.md",
];

// Template file names follow: constitution/{TYPE}.md
const TEMPLATE_MAP = {
    "CONSTITUTION.md": "constitution/CONSTITUTION.md",
    "QUALITY.md": "constitution/QUALITY.md",
    "RELIABILITY.md": "constitution/RELIABILITY.md",
    "SECURITY.md": "constitution/SECURITY.md",
    "CODING.md": "constitution/CODING.md",
};

// Detect project name from directory name
const projectName = path.basename(repoRoot);

// Check for legacy .ttadk/memory/constitution.md
const legacyPath = path.join(repoRoot, ".ttadk", "memory", "constitution.md");
const hasLegacy = existsSync(legacyPath);

// Ensure docs directory exists
if (!existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

const results = [];
const today = new Date().toISOString().split("T")[0];

for (const file of CONSTITUTION_FILES) {
    const targetPath = path.join(docsDir, file);
    const templateFile = TEMPLATE_MAP[file];
    const sourcePath = path.join(templateDir, templateFile || file);

    if (existsSync(targetPath)) {
        results.push({ file, status: "exists", path: targetPath });
        continue;
    }

    if (!existsSync(sourcePath)) {
        results.push({ file, status: "missing_template", path: sourcePath });
        continue;
    }

    // Read template, replace [PROJECT_NAME] and [DATE] placeholders
    let content = fs.readFileSync(sourcePath, "utf-8");
    content = content.split("[PROJECT_NAME]").join(projectName);
    content = content.split("[DATE]").join(today);

    fs.writeFileSync(targetPath, content, "utf-8");
    results.push({ file, status: "created", path: targetPath });
}

// Initialize docs subdirectory index files
const DOCS_INDEX_FILES = [
    { file: "arch/index.md",          template: "central-spec-repo/arch/index.md" },
    { file: "product-specs/index.md", template: "central-spec-repo/product-specs/index.md" },
    { file: "references/index.md",    template: "central-spec-repo/references/index.md" },
];

for (const entry of DOCS_INDEX_FILES) {
    const targetPath = path.join(docsDir, entry.file);
    const sourcePath = path.join(templateDir, entry.template);
    const targetDir = path.dirname(targetPath);

    if (existsSync(targetPath)) {
        results.push({ file: entry.file, status: "exists", path: targetPath });
        continue;
    }

    if (!existsSync(sourcePath)) {
        results.push({ file: entry.file, status: "missing_template", path: sourcePath });
        continue;
    }

    if (!existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    let content = fs.readFileSync(sourcePath, "utf-8");
    content = content.split("[PROJECT_NAME]").join(projectName);
    content = content.split("[DATE]").join(today);

    fs.writeFileSync(targetPath, content, "utf-8");
    results.push({ file: entry.file, status: "created", path: targetPath });
}

console.log(JSON.stringify({
    status: results.every(r => r.status !== "missing_template") ? "ok" : "partial",
    legacy_detected: hasLegacy,
    legacy_path: hasLegacy ? legacyPath : null,
    files: results,
}));
