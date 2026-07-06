import fs from 'fs';
import path from 'path';
import assert from 'assert';

const root = process.cwd();
const components = [
  'src/components/workbench-review/ReviewSetup.tsx',
  'src/components/workbench-review/ScreeningWorkspace.tsx',
  'src/components/workbench-review/ExtractionForm.tsx',
  'src/components/workbench-review/AssignmentPanel.tsx',
  'src/components/workbench-review/CommentsThread.tsx',
];

(function run() {
  for (const c of components) {
    const full = path.join(root, c);
    assert.ok(fs.existsSync(full), `Component missing: ${c}`);
    const txt = fs.readFileSync(full, 'utf8');
    // basic accessibility checks
    assert.ok(/aria-label|aria-labelledby/.test(txt) || /label htmlFor/.test(txt), `Accessibility labels missing in ${c}`);
    // component may either include explicit buttons or rely on input blur/save handlers
    assert.ok(/button/.test(txt) || /onBlur\=/.test(txt) || /onBlur\s*\(/.test(txt), `No button or input blur handler found in ${c}`);
    console.log(c, 'OK');
  }
  console.log('UI smoke checks passed');
})();
