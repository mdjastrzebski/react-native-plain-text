import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from '@jest/globals';
import { VRT_PLATFORMS, type VrtPlatform } from './scenarios';
import { loadVrtScenarios } from './loadScenarios';

// Not a test: scripts/list-vrt-scenarios.sh runs this file through Jest because
// Jest is what can load groups.tsx outside the app. It writes the scenario IDs
// for VRT_PLATFORM to VRT_SCENARIOS_OUT, one per line, in render order.
it('writes the VRT scenario list', () => {
  const platform = process.env.VRT_PLATFORM as VrtPlatform;
  const out = process.env.VRT_SCENARIOS_OUT;
  expect(VRT_PLATFORMS).toContain(platform);
  expect(out).toBeTruthy();

  const { scenarioIDs } = loadVrtScenarios(platform);
  expect(scenarioIDs.length).toBeGreaterThan(0);

  fs.mkdirSync(path.dirname(out!), { recursive: true });
  fs.writeFileSync(out!, `${scenarioIDs.join('\n')}\n`);
});
