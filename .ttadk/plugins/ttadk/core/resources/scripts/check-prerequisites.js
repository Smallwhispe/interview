#!/usr/bin/env node
"use strict";
/**
 * Check Prerequisites Script
 * Uses only Node.js built-in modules (no external dependencies)
 *
 * Validates workspace state for TTADK workflow commands.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPrerequisites = checkPrerequisites;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("./common");
function resolveFeaturePaths(featureDir) {
    if (!featureDir) {
        return (0, common_1.getFeaturePaths)();
    }
    const repoRoot = (0, common_1.getRepoRoot)();
    const resolvedFeatureDir = path.isAbsolute(featureDir)
        ? featureDir
        : path.resolve(repoRoot, featureDir);
    return {
        REPO_ROOT: repoRoot,
        FEATURE_NAME: path.basename(resolvedFeatureDir),
        FEATURE_DIR: resolvedFeatureDir,
        FEATURE_SPEC: path.join(resolvedFeatureDir, 'spec.md'),
        IMPL_PLAN: path.join(resolvedFeatureDir, 'plan.md'),
        TASKS: path.join(resolvedFeatureDir, 'tasks.md'),
        RESEARCH: path.join(resolvedFeatureDir, 'research.md'),
        DATA_MODEL: path.join(resolvedFeatureDir, 'data-model.md'),
        QUICKSTART: path.join(resolvedFeatureDir, 'quickstart.md'),
        CONTRACTS_DIR: path.join(resolvedFeatureDir, 'contracts'),
    };
}
async function checkPrerequisites(options = {}) {
    const paths = resolveFeaturePaths(options.featureDir);
    // If paths-only mode, return early without validation
    if (options.pathsOnly) {
        return {
            REPO_ROOT: paths.REPO_ROOT,
            FEATURE_NAME: paths.FEATURE_NAME,
            FEATURE_DIR: paths.FEATURE_DIR,
            FEATURE_SPEC: paths.FEATURE_SPEC,
            IMPL_PLAN: paths.IMPL_PLAN,
            TASKS: paths.TASKS,
        };
    }
    // Branch validation removed - any branch name is now valid
    // Validate required directories and files
    if (!(0, common_1.existsSync)(paths.FEATURE_DIR)) {
        throw new Error(`Feature directory not found: ${paths.FEATURE_DIR}\nRun /specify first to create the feature structure.`);
    }
    if (!(0, common_1.existsSync)(paths.IMPL_PLAN)) {
        throw new Error(`plan.md not found in ${paths.FEATURE_DIR}\nRun /plan first to create the implementation plan.`);
    }
    // Check for tasks.md if required
    if (options.requireTasks && !(0, common_1.existsSync)(paths.TASKS)) {
        throw new Error(`tasks.md not found in ${paths.FEATURE_DIR}\nRun /tasks first to create the task list.`);
    }
    // Build list of available documents
    const docs = [];
    if ((0, common_1.existsSync)(paths.RESEARCH))
        docs.push('research.md');
    if ((0, common_1.existsSync)(paths.DATA_MODEL))
        docs.push('data-model.md');
    // Check contracts directory
    if ((0, common_1.existsSync)(paths.CONTRACTS_DIR) && (0, common_1.isDirSync)(paths.CONTRACTS_DIR)) {
        const files = fs.readdirSync(paths.CONTRACTS_DIR);
        if (files.length > 0)
            docs.push('contracts/');
    }
    if ((0, common_1.existsSync)(paths.QUICKSTART))
        docs.push('quickstart.md');
    // Include tasks.md if requested
    if (options.includeTasks && (0, common_1.existsSync)(paths.TASKS)) {
        docs.push('tasks.md');
    }
    return {
        FEATURE_DIR: paths.FEATURE_DIR,
        AVAILABLE_DOCS: docs,
    };
}
function parseCliOptions(args) {
    const options = {
        json: false,
        requireTasks: false,
        includeTasks: false,
        pathsOnly: false,
        featureDir: '',
    };
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg === '--json') {
            options.json = true;
            continue;
        }
        if (arg === '--require-tasks') {
            options.requireTasks = true;
            continue;
        }
        if (arg === '--include-tasks') {
            options.includeTasks = true;
            continue;
        }
        if (arg === '--paths-only') {
            options.pathsOnly = true;
            continue;
        }
        if (arg === '--feature-dir' && index + 1 < args.length) {
            options.featureDir = args[index + 1];
            index += 1;
            continue;
        }
        if (arg.startsWith('--feature-dir=')) {
            options.featureDir = arg.slice('--feature-dir='.length);
        }
    }
    return options;
}
// CLI mode
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = parseCliOptions(args);
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`Usage: check-prerequisites [OPTIONS]

Consolidated prerequisite checking for TTADK workflow.

OPTIONS:
  --json              Output in JSON format
  --require-tasks     Require tasks.md to exist (for implementation phase)
  --include-tasks     Include tasks.md in AVAILABLE_DOCS list
  --paths-only        Only output path variables (no prerequisite validation)
  --feature-dir PATH  Use the provided FEATURE_DIR instead of auto-detection
  --help, -h          Show this help message

EXAMPLES:
  # Check task prerequisites (plan.md required)
  node check-prerequisites.js --json

  # Check implementation prerequisites (plan.md + tasks.md required)
  node check-prerequisites.js --json --require-tasks --include-tasks

  # Get feature paths only (no validation)
  node check-prerequisites.js --paths-only

  # Use an explicit feature directory
  node check-prerequisites.js --json --feature-dir specs/20260403-demo-feature
`);
        process.exit(0);
    }
    checkPrerequisites(options)
        .then(result => {
            if (options.json) {
                console.log(JSON.stringify(result));
            }
            else {
                console.log(`FEATURE_DIR: ${result.FEATURE_DIR}`);
                if (result.AVAILABLE_DOCS) {
                    console.log('AVAILABLE_DOCS:');
                    result.AVAILABLE_DOCS.forEach(doc => console.log(`  ✓ ${doc}`));
                }
            }
            process.exit(0);
        })
        .catch(error => {
            console.error(`ERROR: ${error.message}`);
            process.exit(1);
        });
}
//# sourceMappingURL=check-prerequisites.js.map