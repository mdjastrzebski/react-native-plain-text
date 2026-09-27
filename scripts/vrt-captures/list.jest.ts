import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from '@jest/globals';
import { VRT_PLATFORMS, type VrtPlatform } from './captures';
import { loadVrtCaptures } from './loadCaptures';

// Not a test: scripts/list-vrt-captures.sh runs this file through Jest because
// Jest is what can load groups.tsx outside the app. It writes the capture IDs
// for VRT_PLATFORM to VRT_CAPTURES_OUT, one per line, in render order.
it('writes the VRT capture list', () => {
  const platform = process.env.VRT_PLATFORM as VrtPlatform;
  const out = process.env.VRT_CAPTURES_OUT;
  expect(VRT_PLATFORMS).toContain(platform);
  expect(out).toBeTruthy();

  const { captureIDs } = loadVrtCaptures(platform);
  expect(captureIDs.length).toBeGreaterThan(0);

  fs.mkdirSync(path.dirname(out!), { recursive: true });
  fs.writeFileSync(out!, `${captureIDs.join('\n')}\n`);
});
