#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { getRepoRoot, existsSync, isDirSync } = require("./common");

const EXCLUDED_DIRS = ["archived", "doc_export", "brainstorm"];
const KNOWN_FILES = ["spec.md", "plan.md", "tasks.md", "research.md", "data-model.md", "quickstart.md"];

function getSpecsDir() {
    const repoRoot = getRepoRoot();
    return path.join(repoRoot, "specs");
}

function listSpecs() {
    const specsDir = getSpecsDir();
    if (!existsSync(specsDir) || !isDirSync(specsDir)) {
        return { specs: [] };
    }

    const dirs = fs.readdirSync(specsDir)
        .filter(name => {
            const fullPath = path.join(specsDir, name);
            return isDirSync(fullPath) &&
                (/^\d{8}-/.test(name) || /^\d{3}-/.test(name)) &&
                !EXCLUDED_DIRS.includes(name);
        })
        .map(name => {
            const fullPath = path.join(specsDir, name);
            const stat = fs.statSync(fullPath);
            const time = stat.birthtime ? stat.birthtime.getTime() : stat.mtime.getTime();
            return {
                name,
                has_spec: existsSync(path.join(fullPath, "spec.md")),
                has_plan: existsSync(path.join(fullPath, "plan.md")),
                has_tasks: existsSync(path.join(fullPath, "tasks.md")),
                time
            };
        });

    dirs.sort((a, b) => b.time - a.time);

    return {
        specs: dirs.map(({ name, has_spec, has_plan, has_tasks }) => ({
            name, has_spec, has_plan, has_tasks
        }))
    };
}

function checkoutSpec(specName) {
    const specsDir = getSpecsDir();
    const featureDir = path.join(specsDir, specName);

    if (!existsSync(featureDir) || !isDirSync(featureDir)) {
        const available = listSpecs();
        return {
            success: false,
            error: `Spec not found: ${specName}`,
            available_specs: available.specs.map(s => s.name)
        };
    }

    const availableFiles = [];
    const availableDirs = [];

    for (const file of KNOWN_FILES) {
        if (existsSync(path.join(featureDir, file))) {
            availableFiles.push(file);
        }
    }

    const checklistsDir = path.join(featureDir, "checklists");
    if (existsSync(checklistsDir) && isDirSync(checklistsDir)) {
        availableDirs.push("checklists/");
    }

    const contractsDir = path.join(featureDir, "contracts");
    if (existsSync(contractsDir) && isDirSync(contractsDir)) {
        availableDirs.push("contracts/");
    }

    // Persist TTADK_FEATURE into .claude/settings.local.json env field
    const repoRoot = getRepoRoot();
    const settingsPath = path.join(repoRoot, ".claude", "settings.local.json");
    let settings = {};
    if (existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch (e) {
            settings = {};
        }
    }
    if (!settings.env) {
        settings.env = {};
    }
    settings.env.TTADK_FEATURE = specName;
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

    return {
        success: true,
        spec_name: specName,
        feature_dir: featureDir,
        available_files: availableFiles,
        available_dirs: availableDirs
    };
}

function main() {
    const args = process.argv.slice(2);
    const jsonMode = args.includes("--json");
    const listMode = args.includes("--list");
    const specIdx = args.indexOf("--spec");
    const specName = specIdx !== -1 ? args[specIdx + 1] : null;

    let result;

    if (listMode) {
        result = listSpecs();
    } else if (specName) {
        result = checkoutSpec(specName);
    } else {
        result = { error: "Usage: checkout.js --spec <name> --json | --list --json" };
    }

    if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(JSON.stringify(result, null, 2));
    }
}

main();
