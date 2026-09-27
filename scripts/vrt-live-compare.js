#!/usr/bin/env node

// Compares one fresh capture with its reviewed baseline and prints a one-line
// verdict, so a capture run reports failures as they happen. It mirrors
// reg-cli's per-image rule (same img-diff-js call, same options) but is only an
// early signal: the compare stage stays the authoritative result.
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
