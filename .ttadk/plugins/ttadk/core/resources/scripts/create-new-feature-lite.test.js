const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createNewFeatureLite } = require('./create-new-feature-lite.js');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

test('createNewFeatureLite initializes spec, plan, and tasks from standard templates for ff flow', async (t) => {
  const repoRoot = path.resolve(__dirname, '../../../../../');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ttadk-create-feature-lite-'));
  const tempRepo = path.join(tempRoot, 'repo');
  const templateDir = path.join(
    tempRepo,
    '.ttadk/plugins/ttadk/core/resources/templates'
  );

  fs.mkdirSync(templateDir, { recursive: true });

  for (const templateName of ['spec-template.md', 'plan-template.md', 'tasks-template.md']) {
    copyFile(
      path.join(repoRoot, 'plugins/ttadk/core/resources/templates', templateName),
      path.join(templateDir, templateName)
    );
  }

  const previousCwd = process.cwd();
  const previousFeature = process.env.TTADK_FEATURE;

  t.after(() => {
    process.chdir(previousCwd);
    if (previousFeature === undefined) {
      delete process.env.TTADK_FEATURE;
    } else {
      process.env.TTADK_FEATURE = previousFeature;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  delete process.env.TTADK_FEATURE;
  process.chdir(tempRepo);

  const result = await createNewFeatureLite('ff standard templates');

  const specFile = path.join(result.FEATURE_DIR, 'spec.md');
  const planFile = path.join(result.FEATURE_DIR, 'plan.md');
  const tasksFile = path.join(result.FEATURE_DIR, 'tasks.md');

  assert.equal(fs.existsSync(specFile), true);
  assert.equal(fs.existsSync(planFile), true);
  assert.equal(fs.existsSync(tasksFile), true);

  assert.equal(
    fs.readFileSync(specFile, 'utf8'),
    fs.readFileSync(path.join(templateDir, 'spec-template.md'), 'utf8')
  );
  assert.equal(
    fs.readFileSync(planFile, 'utf8'),
    fs.readFileSync(path.join(templateDir, 'plan-template.md'), 'utf8')
  );
  assert.equal(
    fs.readFileSync(tasksFile, 'utf8'),
    fs.readFileSync(path.join(templateDir, 'tasks-template.md'), 'utf8')
  );
});
