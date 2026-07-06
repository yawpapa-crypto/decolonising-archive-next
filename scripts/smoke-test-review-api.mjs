import fs from 'fs';
import path from 'path';
import assert from 'assert';


const root = process.cwd();

(function run() {
  const routes = [
    'app/api/workbench/review/fields/route.ts',
    'app/api/workbench/review/extractions/route.ts',
    'app/api/workbench/review/assignments/route.ts',
    'app/api/workbench/review/screenings/route.ts',
    'app/api/workbench/review/comments/route.ts',
  ];

  for (const r of routes) {
    const full = path.join(root, r);
    const ok = fs.existsSync(full);
    console.log(r, ok ? 'FOUND' : 'MISSING');
    assert.ok(ok, `Route not found: ${r}`);
  }

  console.log('Smoke check passed: all review API route files exist');
})();
