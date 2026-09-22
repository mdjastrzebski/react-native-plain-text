import { useAppductTool } from '@appduct/react-native';
import { Platform } from 'react-native';
import { z } from 'zod';
import { getVrtExamples } from './examples';

function availableTestIDs(): string[] {
  return getVrtExamples(Platform.OS).map((example) => example.testID);
}

type AppductVrtToolsProps = {
  activeTestID: string | null;
  onSelect: (testID: string | null) => void;
};

// Mounted unconditionally in AppVrt so the tools exist before fonts/URL resolve.
// Inert unless the appduct native module is present (a dev/debug build).
export function AppductVrtTools({ activeTestID, onSelect }: AppductVrtToolsProps) {
  useAppductTool({
    name: 'show_specimen',
    description:
      'Render a single visual-regression specimen by testID, or every specimen when testID is null. Only changes the running app; no relaunch.',
    group: 'vrt',
    inputSchema: z.object({
      testID: z
        .string()
        .nullable()
        .default(null)
        .describe('testID of the specimen to show, or null to show every specimen'),
    }),
    outputSchema: z.object({
      activeTestID: z.string().nullable(),
      rendered: z.boolean().describe('false when the requested testID is not a known specimen'),
      specimenCount: z.number(),
    }),
    annotations: { idempotentHint: true },
    handler: async ({ testID }) => {
      onSelect(testID);
      const ids = availableTestIDs();
      return {
        activeTestID: testID,
        rendered: testID === null || ids.includes(testID),
        specimenCount: testID === null ? ids.length : 1,
      };
    },
  });

  useAppductTool({
    name: 'get_specimen',
    description:
      'Return the specimen currently rendered and every available specimen testID. Read-only.',
    group: 'vrt',
    outputSchema: z.object({
      activeTestID: z.string().nullable(),
      specimenCount: z.number(),
      testIDs: z.array(z.string()),
    }),
    annotations: { readOnlyHint: true },
    handler: async () => {
      const ids = availableTestIDs();
      return { activeTestID, specimenCount: ids.length, testIDs: ids };
    },
  });

  return null;
}
