import type { ReactNode } from 'react';
import { Platform, StyleSheet, type TextStyle } from 'react-native';
import type { PlainTextStyle } from 'react-native-plain-text';
import { COLOR, VARIABLE } from '../theme';
// A suite has its own device settings and baselines. Groups default to 'default'.
export const VRT_SUITES = ['default', 'font-scale'] as const;
export type VrtSuite = (typeof VRT_SUITES)[number];
export type VrtGroup = {
  platform?: 'ios' | 'android';
  suite?: VrtSuite;
  children: ReactNode;
};
export function testIDSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/^-/, 'negative-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
export const SHORT_ROW_SIZE = 26;
export const styles = StyleSheet.create({
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  baselineRuler: {
    width: 28,
    height: 2,
    marginLeft: 10,
    backgroundColor: COLOR.indigo,
  },
  body: {
    width: '100%',
    fontSize: 20,
  },
  clippingRow: Platform.select({
    ios: {
      overflow: 'hidden',
    },
    default: {},
  }),
  bordered: {
    borderColor: COLOR.indigo,
  },
  wrapProbe: {
    fontSize: 18,
  },
  // Fixed narrow width: at 100% the word wrapped at the preceding space rather
  // than mid-word, so no row showed a real hyphen.
  hyphenationRow: {
    width: 260,
    fontSize: 20,
  },
});
export const SPECIMEN = 'Quick brown fox';
export const PARAGRAPH = 'The quick brown fox jumps over the lazy dog.';
export const PARAGRAPH_LONG = `${PARAGRAPH} ${PARAGRAPH} ${PARAGRAPH}`;
export const FONT_VARIANT_SPECIMEN = 'Waffle office 0123456789';
export const EMOJI_SPECIMEN = 'Quick brown 🦊 jumps over the lazy 🐶';
export const FONT_SIZES = [48, 40, 32, 26, 20, 16, 13, 10];
export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;
// Short text, so the side it lands on is visible in the full-width row.
export const DIRECTION_ROWS = [
  { label: 'left', textAlign: 'left', text: SPECIMEN },
  { label: 'right', textAlign: 'right', text: SPECIMEN },
  { label: 'center', textAlign: 'center', text: SPECIMEN },
] as const;

export const ELLIPSIZE_MODES = ['head', 'middle', 'tail', 'clip'] as const;
export const ORPHAN_SPECIMEN = 'The last word of this text does not fit.';
export const KOREAN_WORD_WRAP_SPECIMEN = '한글개행 한글개행 한글개행 한글개행 한글개행';
export const TEXT_BREAK_STRATEGIES = ['simple', 'highQuality', 'balanced'] as const;
export const SOFT_HYPHEN_SPECIMEN =
  'Die Rei­se­kran­ken­ver­si­che­rung war früh­er nur et­was für Ge­schäfts­rei­sen­de, heu­te nut­zen sie auch ganz nor­ma­le Fa­mi­li­en.';
export const HYPHENATION_SPECIMEN = SOFT_HYPHEN_SPECIMEN.replaceAll('\u00AD', '');
export const TEXT_BREAK_STRATEGY_SPECIMEN =
  'Extraordinarily meticulous engineers occasionally debug astonishingly trivial issues quite carefully today, especially near release day, right before shipping.';
export const LINE_HEIGHTS = [18, 26, 36];
export const REALWORLD_FONT_SIZES = [16, 20, 24, 32, 40];
export const REALWORLD_FONTS: {
  label: string;
  style: PlainTextStyle;
}[] = Platform.select({
  ios: [
    {
      label: 'System',
      style: {},
    },
    {
      label: 'Georgia',
      style: {
        fontFamily: 'Georgia',
      },
    },
    {
      label: 'Helvetica Neue',
      style: {
        fontFamily: 'Helvetica Neue',
      },
    },
    {
      label: 'Baskerville',
      style: {
        fontFamily: 'Baskerville',
      },
    },
    {
      label: 'Inter SemiBold',
      style: {
        fontFamily: 'Inter_600SemiBold',
      },
    },
  ],
  default: [
    {
      label: 'System',
      style: {},
    },
    {
      label: 'serif',
      style: {
        fontFamily: 'serif',
      },
    },
    {
      label: 'sans-serif-medium',
      style: {
        fontFamily: 'sans-serif-medium',
      },
    },
    {
      label: 'cursive',
      style: {
        fontFamily: 'cursive',
      },
    },
    {
      label: 'Inter SemiBold',
      style: {
        fontFamily: 'Inter_600SemiBold',
      },
    },
  ],
});
export const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;
export const TEXT_ALIGN_VERTICALS = ['top', 'center', 'bottom'] as const;
export const BASELINE_ALIGNMENT_GLYPHS: {
  text: string;
  fontSize: number;
}[] = [
  {
    text: 'H',
    fontSize: 56,
  },
  {
    text: 'g',
    fontSize: 32,
  },
  {
    text: 'x',
    fontSize: 18,
  },
];
export const LETTER_SPACINGS = [-2, 0, 2, 6];
export const TEXT_DECORATION_LINES = [
  'none',
  'underline',
  'line-through',
  'underline line-through',
] as const;
export const TEXT_TRANSFORMS = ['none', 'lowercase', 'uppercase', 'capitalize'] as const;
export const TEXT_TRANSFORM_SPECIMEN = 'Quick BROWN fox';
export const TEXT_TRANSFORM_ORDINAL_SPECIMEN = '3rd place winner';
export const TEXT_TRANSFORM_CONTRACTION_SPECIMEN = "it's a trap, don't panic";
const FONT_VARIANT_FEATURE_FAMILY = Platform.select({
  ios: 'Baskerville',
  default: undefined,
});
export const fontVariantRow: TextStyle = {
  fontSize: SHORT_ROW_SIZE,
  fontStyle: 'normal',
};
export const fontVariantFeatureRow: TextStyle = {
  ...fontVariantRow,
  fontFamily: FONT_VARIANT_FEATURE_FAMILY,
};
export const FONT_VARIANTS: {
  label: string;
  fontVariant?: TextStyle['fontVariant'];
}[] = [
  {
    label: 'small-caps',
    fontVariant: ['small-caps'],
  },
  {
    label: 'oldstyle-nums',
    fontVariant: ['oldstyle-nums'],
  },
  {
    label: 'no-common-ligatures',
    fontVariant: ['no-common-ligatures'],
  },
  {
    label: 'small-caps + oldstyle-nums',
    fontVariant: ['small-caps', 'oldstyle-nums'],
  },
];
export const TABULAR_FIGURE_ROWS = ['1111111111', '0123456789'];
export const variableFontRow: PlainTextStyle = {
  fontSize: SHORT_ROW_SIZE,
  fontFamily: VARIABLE,
};
export const FONT_VARIATION_SETTINGS: {
  label: string;
  fontVariationSettings?: string;
}[] = [
  {
    label: 'default',
  },
  {
    label: '"wght" 300',
    fontVariationSettings: '"wght" 300',
  },
  {
    label: '"wght" 550',
    fontVariationSettings: '"wght" 550',
  },
  {
    label: '"wght" 800',
    fontVariationSettings: '"wght" 800',
  },
  {
    label: '"wdth" 87.5',
    fontVariationSettings: '"wdth" 87.5',
  },
  {
    label: '"wdth" 75',
    fontVariationSettings: '"wdth" 75',
  },
  {
    label: '"wght" 800, "wdth" 75',
    fontVariationSettings: '"wght" 800, "wdth" 75',
  },
];
export const FONT_WEIGHTS = ['normal', 'bold', '100', '300', '500', '700', '900'] as const;
type FontFamilyRow = {
  label: string;
  style: TextStyle & {
    fontFamily: string;
  };
};
const PLATFORM_FONT_ROWS: FontFamilyRow[] = Platform.select({
  ios: [
    {
      label: 'System',
      style: {
        fontSize: 26,
        fontFamily: 'System',
      },
    },
    {
      label: 'Georgia',
      style: {
        fontSize: 26,
        fontFamily: 'Georgia',
      },
    },
    {
      label: 'Menlo',
      style: {
        fontSize: 26,
        fontFamily: 'Menlo',
      },
    },
    {
      label: 'Courier',
      style: {
        fontSize: 26,
        fontFamily: 'Courier',
      },
    },
    {
      label: 'Family and weight',
      style: {
        fontSize: 26,
        fontFamily: 'Avenir Next',
        fontWeight: '100',
      },
    },
    {
      label: 'Single-cut family',
      style: {
        fontSize: 26,
        fontFamily: 'Zapfino',
        fontWeight: 'bold',
      },
    },
    {
      label: 'Weight with a real cut',
      style: {
        fontSize: 26,
        fontFamily: 'Helvetica Neue',
        fontWeight: '200',
      },
    },
    {
      label: 'Weight suffix in the name',
      style: {
        fontSize: 26,
        fontFamily: 'HelveticaNeue-Thin',
      },
    },
    {
      label: 'Slant with no cut',
      style: {
        fontSize: 26,
        fontFamily: 'Copperplate',
        fontStyle: 'italic',
      },
    },
    {
      label: 'Face name',
      style: {
        fontSize: 26,
        fontFamily: 'Georgia-BoldItalic',
      },
    },
    {
      label: 'Condensed face',
      style: {
        fontSize: 26,
        fontFamily: 'HelveticaNeue-CondensedBlack',
      },
    },
  ],
  default: [
    {
      label: 'System',
      style: {
        fontSize: 26,
        fontFamily: 'System',
      },
    },
    {
      label: 'serif',
      style: {
        fontSize: 26,
        fontFamily: 'serif',
      },
    },
    {
      label: 'monospace',
      style: {
        fontSize: 26,
        fontFamily: 'monospace',
      },
    },
    {
      label: 'sans-serif-condensed',
      style: {
        fontSize: 26,
        fontFamily: 'sans-serif-condensed',
      },
    },
    {
      label: 'Family and weight',
      style: {
        fontSize: 26,
        fontFamily: 'sans-serif',
        fontWeight: '100',
      },
    },
    {
      label: 'Single-cut family',
      style: {
        fontSize: 26,
        fontFamily: 'cursive',
      },
    },
    {
      label: 'Condensed face',
      style: {
        fontSize: 26,
        fontFamily: 'sans-serif-condensed-light',
      },
    },
    {
      label: 'Weight with a real cut',
      style: {
        fontSize: 26,
        fontFamily: 'sans-serif',
        fontWeight: '300',
      },
    },
    {
      label: 'Weight suffix in the name',
      style: {
        fontSize: 26,
        fontFamily: 'sans-serif-light',
      },
    },
    {
      label: 'Slant with no cut',
      style: {
        fontSize: 26,
        fontFamily: 'monospace',
        fontStyle: 'italic',
      },
    },
    {
      label: 'Named cut',
      style: {
        fontSize: 26,
        fontFamily: 'sans-serif-medium',
      },
    },
  ],
});
const CUSTOM_FONT_ROWS: FontFamilyRow[] = [
  {
    label: 'expo-font alias',
    style: {
      fontSize: 26,
      fontFamily: 'Inter_400Regular',
    },
  },
  {
    label: 'expo-font alias, heavier cut',
    style: {
      fontSize: 26,
      fontFamily: 'Inter_600SemiBold',
    },
  },
  {
    label: 'expo-font alias, light italic',
    style: {
      fontSize: 26,
      fontFamily: 'Inter_300Light_Italic',
    },
  },
];
const UNRESOLVABLE_FONT_ROW: FontFamilyRow = {
  label: 'Unresolvable name',
  style: {
    fontSize: 26,
    fontFamily: 'NoSuchFont-Regular',
  },
};
export const FONT_FAMILY_RESOLUTION: FontFamilyRow[] = [
  ...PLATFORM_FONT_ROWS,
  ...CUSTOM_FONT_ROWS,
  UNRESOLVABLE_FONT_ROW,
];
export const vrtStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scenario: {
    alignSelf: 'stretch',
  },
  // Same as the example app's row in Specimen.tsx.
  row: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  base: {
    fontSize: 20,
    backgroundColor: COLOR.wash,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  wideRow: {
    alignSelf: 'stretch',
  },
});
