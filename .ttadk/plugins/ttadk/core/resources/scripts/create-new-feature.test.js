const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createNewFeature } = require('./create-new-feature.js');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

test('createNewFeature initializes only the standard spec template for specify flow', async (t) => {
  const repoRoot = path.resolve(__dirname, '../../../../../');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ttadk-create-feature-'));
  const tempRepo = path.join(tempRoot, 'repo');
  const templateDir = path.join(
    tempRepo,
    '.ttadk/plugins/ttadk/core/resources/templates'
  );

  fs.mkdirSync(templateDir, { recursive: true });

  copyFile(
    path.join(repoRoot, 'plugins/ttadk/core/resources/templates/spec-template.md'),
    path.join(templateDir, 'spec-template.md')
  );

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

  const result = await createNewFeature('specify standard spec');

  const specFile = path.join(result.FEATURE_DIR, 'spec.md');
  const planFile = path.join(result.FEATURE_DIR, 'plan.md');
  const tasksFile = path.join(result.FEATURE_DIR, 'tasks.md');

  assert.equal(fs.existsSync(specFile), true);
  assert.equal(fs.existsSync(planFile), false);
  assert.equal(fs.existsSync(tasksFile), false);

  assert.equal(
    fs.readFileSync(specFile, 'utf8'),
    fs.readFileSync(path.join(templateDir, 'spec-template.md'), 'utf8')
  );
});
