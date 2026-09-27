#!/usr/bin/env node

// Prints a one-line verdict for one capture against its baseline, with reg-cli's
// per-image rule. An early signal only; the compare stage decides.
//
// Usage: vrt-live-compare.js <actual.png> <baseline.png> <diff.png> <matchingThreshold> <thresholdPixel>

const fs = require('fs');
const path = require('path');

const [actual, baseline, diff, matchingThreshold, thresholdPixel] = process.argv.slice(2);
const name = path.basename(actual, '.png');

// img-diff-js is reg-cli's dependency, not ours; resolve it the way reg-cli does
// so both always run the same diff.
const regCliDir = path.dirname(require.resolve('reg-cli/package.json'));
const { imgDiff } = require(require.resolve('img-diff-js', { paths: [regCliDir] }));

if (!fs.existsSync(baseline)) {
  console.log(`🆕 ${name}: no baseline`);
  process.exit(0);
}
if (fs.readFileSync(actual).equals(fs.readFileSync(baseline))) {
  console.log(`✅ ${name}`);
  process.exit(0);
}

imgDiff({
  actualFilename: actual,
  expectedFilename: baseline,
  diffFilename: diff,
  generateOnlyDiffFile: true,
  // reg-cli runs with --enableAntialias, which it passes as includeAA: false.
  options: { threshold: Number(matchingThreshold), includeAA: false },
}).then(
  ({ diffCount }) => {
    if (diffCount <= Number(thresholdPixel)) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}: ${diffCount} px differ (${path.relative(process.cwd(), diff)})`);
    }
  },
  (error) => {
    console.log(`⚠️  ${name}: comparison failed (${error.message})`);
  }
);
