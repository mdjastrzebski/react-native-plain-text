import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PlainText, type PlainTextProps } from 'react-native-plain-text';
import { COLOR } from '../theme';
import { EXAMPLE_GROUPS, type ExampleItem } from './examples';
import {
  SHORT_ROW_SIZE,
  styles,
  SPECIMEN,
  PARAGRAPH,
  PARAGRAPH_LONG,
  FONT_VARIANT_SPECIMEN,
  EMOJI_SPECIMEN,
  FONT_SIZES,
  TEXT_ALIGNS,
  ELLIPSIZE_MODES,
  ORPHAN_SPECIMEN,
  KOREAN_WORD_WRAP_SPECIMEN,
  TEXT_BREAK_STRATEGIES,
  TEXT_BREAK_STRATEGY_SPECIMEN,
  SOFT_HYPHEN_SPECIMEN,
  HYPHENATION_SPECIMEN,
  LINE_HEIGHTS,
  REALWORLD_FONT_SIZES,
  REALWORLD_FONTS,
  VERTICAL_ALIGNS,
  TEXT_ALIGN_VERTICALS,
  BASELINE_ALIGNMENT_GLYPHS,
  LETTER_SPACINGS,
  TEXT_DECORATION_LINES,
  TEXT_TRANSFORMS,
  TEXT_TRANSFORM_SPECIMEN,
  TEXT_TRANSFORM_ORDINAL_SPECIMEN,
  TEXT_TRANSFORM_CONTRACTION_SPECIMEN,
  fontVariantRow,
  fontVariantFeatureRow,
  FONT_VARIANTS,
  TABULAR_FIGURE_ROWS,
  variableFontRow,
  FONT_VARIATION_SETTINGS,
  FONT_WEIGHTS,
  FONT_FAMILY_RESOLUTION,
  type VrtGroup,
  testIDSlug,
  vrtStyles,
} from './utils';

// Mirrors TextItem in the example app's Specimen.tsx: shrink-wraps the text
// unless containerStyle stretches it.
function VrtText({
  testID,
  containerStyle,
  style,
  ...props
}: PlainTextProps & { containerStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[vrtStyles.row, containerStyle]}>
      <PlainText {...props} testID={`${testID}-text`} style={[vrtStyles.base, style]} />
    </View>
  );
}

// Mirrors CompareBox in the example app's Specimen.tsx.
function VrtBox({
  testID,
  containerStyle,
  children,
}: {
  testID: string;
  containerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View testID={`${testID}-box`} style={[vrtStyles.row, containerStyle]}>
      {children}
    </View>
  );
}

function VrtExample({ item, testID }: { item: ExampleItem; testID: string }) {
  if (item.kind === 'baseline') {
    return (
      <VrtBox testID={testID} containerStyle={[styles.baselineRow, vrtStyles.wideRow]}>
        {item.parts.map((part, index) => (
          <PlainText key={index} style={[vrtStyles.base, part.style]}>
            {part.text}
          </PlainText>
        ))}
      </VrtBox>
    );
  }

  const { text, style, numberOfLines, ellipsizeMode } = item;
  return (
    <VrtText
      testID={testID}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={[{ color: COLOR.ink }, style]}
      containerStyle={style.width === '100%' ? vrtStyles.wideRow : undefined}
    >
      {text}
    </VrtText>
  );
}

const FONT_SCALING_SIZE = 14;

export const groups: VrtGroup[] = [
  {
    children: (
      <>
        {FONT_SIZES.map((fontSize) => (
          <VrtText
            testID={`vrt-features-font-size-${fontSize}`}
            key={fontSize}
            style={{
              fontSize,
            }}
            // Clip rather than wrap so the sizes stay comparable down the column.
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText testID="vrt-features-emoji-mixed">{EMOJI_SPECIMEN}</VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {FONT_FAMILY_RESOLUTION.map(({ label, style }) => (
          <VrtText
            testID={`vrt-features-font-family-${testIDSlug(label)}`}
            key={label}
            style={style}
          >
            {style.fontFamily}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText
          testID="vrt-features-color-indigo"
          style={{
            fontSize: SHORT_ROW_SIZE,
            color: COLOR.indigo,
          }}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-color-inverse"
          style={{
            fontSize: SHORT_ROW_SIZE,
            color: COLOR.paper,
            backgroundColor: COLOR.inkSurface,
          }}
        >
          {SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {FONT_WEIGHTS.map((fontWeight) => (
          <VrtText
            testID={`vrt-features-font-weight-${fontWeight}`}
            key={fontWeight}
            style={{
              fontSize: SHORT_ROW_SIZE,
              fontWeight,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText
          testID="vrt-features-font-style-italic"
          style={{
            fontSize: SHORT_ROW_SIZE,
            fontStyle: 'italic',
          }}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-font-style-bold-italic"
          style={{
            fontSize: SHORT_ROW_SIZE,
            fontWeight: 'bold',
            fontStyle: 'italic',
          }}
        >
          {SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {TEXT_ALIGNS.map((textAlign) => (
          <VrtText
            testID={`vrt-features-text-align-${textAlign}`}
            key={textAlign}
            containerStyle={vrtStyles.wideRow}
            style={[
              styles.body,
              {
                textAlign,
              },
            ]}
          >
            {/* Justify only shows itself on text long enough to stretch more
              than one line to the full measure. */}
            {textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    platform: 'ios',
    children: (
      <>
        {(['ltr', 'rtl'] as const).map((writingDirection) => (
          <VrtText
            testID={`vrt-features-writing-direction-${writingDirection}`}
            key={writingDirection}
            containerStyle={vrtStyles.wideRow}
            style={[
              styles.body,
              {
                textAlign: 'auto',
                writingDirection,
              },
            ]}
          >
            {PARAGRAPH}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        <VrtBox testID="vrt-features-baseline-alignment" containerStyle={styles.baselineRow}>
          {BASELINE_ALIGNMENT_GLYPHS.map(({ text, fontSize }, index) => (
            <PlainText
              key={text}
              style={{
                fontSize,
                marginLeft: index === 0 ? 0 : 10,
              }}
            >
              {text}
            </PlainText>
          ))}
          <View style={styles.baselineRuler} />
        </VrtBox>
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText
          testID="vrt-features-multiline-wrap"
          containerStyle={vrtStyles.wideRow}
          style={styles.body}
        >
          {PARAGRAPH_LONG}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {[1, 2, 3].map((numberOfLines) => (
          <VrtText
            testID={`vrt-features-number-of-lines-${numberOfLines}`}
            key={numberOfLines}
            numberOfLines={numberOfLines}
            containerStyle={vrtStyles.wideRow}
            style={styles.body}
          >
            {PARAGRAPH_LONG}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText
          testID="vrt-features-padding-none"
          containerStyle={vrtStyles.wideRow}
          style={styles.body}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          testID="vrt-features-padding-vertical-16"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            {
              paddingVertical: 16,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          testID="vrt-features-padding-top-28-bottom-4"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            {
              paddingTop: 28,
              paddingBottom: 4,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        {/* On a wrapping string: padding shrinks the width left for text, so
          this is where a padding-blind measure pass shows up as a clipped or
          overflowing last line. */}
        <VrtText
          testID="vrt-features-padding-all-20-wrapped"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            {
              padding: 20,
            },
          ]}
        >
          {PARAGRAPH_LONG}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText
          testID="vrt-features-borders-all-2"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 2,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          testID="vrt-features-borders-radius-12"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 2,
              borderRadius: 12,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        {/* Per-side, the accent-bar shape: only the left edge is inset. The color
          comes from `bordered`, so the side widths are the only difference. */}
        <VrtText
          testID="vrt-features-borders-left-6"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            styles.bordered,
            {
              borderLeftWidth: 6,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          testID="vrt-features-borders-dashed"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 2,
              borderStyle: 'dashed',
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          testID="vrt-features-borders-all-4-padding-12"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 4,
              padding: 12,
            },
          ]}
        >
          {PARAGRAPH_LONG}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {LINE_HEIGHTS.map((lineHeight) => (
          <VrtText
            testID={`vrt-features-line-height-${lineHeight}`}
            key={lineHeight}
            containerStyle={vrtStyles.wideRow}
            style={{
              fontSize: 18,
              lineHeight,
            }}
          >
            {PARAGRAPH_LONG}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {REALWORLD_FONTS.map((font, index) => {
          const fontSize = REALWORLD_FONT_SIZES[index]!;
          const lineHeight = Math.round(fontSize * 0.8);
          return (
            <VrtText
              testID={`vrt-features-line-height-clipping-${testIDSlug(font.label)}`}
              key={font.label}
              containerStyle={[vrtStyles.wideRow, styles.clippingRow]}
              style={[
                font.style,
                {
                  fontSize,
                  lineHeight,
                },
              ]}
            >
              {font.label}
            </VrtText>
          );
        })}
      </>
    ),
  },
  {
    children: (
      <>
        {LETTER_SPACINGS.map((letterSpacing) => (
          <VrtText
            testID={`vrt-features-letter-spacing-${letterSpacing < 0 ? `negative-${Math.abs(letterSpacing)}` : letterSpacing}`}
            key={letterSpacing}
            style={{
              fontSize: SHORT_ROW_SIZE,
              letterSpacing,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {ELLIPSIZE_MODES.map((ellipsizeMode) => (
          <VrtText
            testID={`vrt-features-ellipsize-mode-${ellipsizeMode}`}
            key={ellipsizeMode}
            numberOfLines={1}
            ellipsizeMode={ellipsizeMode}
            containerStyle={vrtStyles.wideRow}
            style={styles.body}
          >
            {PARAGRAPH_LONG}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    platform: 'ios',
    children: (
      <>
        {(['none', 'push-out', 'standard'] as const).map((s) => (
          <VrtText
            testID={`vrt-features-line-break-strategy-${s}`}
            key={s}
            lineBreakStrategyIOS={s}
            style={[
              styles.body,
              {
                width: 300,
              },
            ]}
          >
            {ORPHAN_SPECIMEN}
          </VrtText>
        ))}
        {/* 210pt, not 220pt: at 220pt hangul-word rendered identically to none,
          so a broken mapping would go unnoticed. */}
        {(['none', 'hangul-word'] as const).map((s) => (
          <VrtText
            testID={`vrt-features-line-break-strategy-${s === 'none' ? 'korean-none' : s}`}
            key={s}
            lineBreakStrategyIOS={s}
            style={[
              styles.body,
              {
                width: 210,
              },
            ]}
          >
            {KOREAN_WORD_WRAP_SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    platform: 'android',
    children: (
      <>
        {TEXT_BREAK_STRATEGIES.map((textBreakStrategy) => (
          <VrtText
            testID={`vrt-features-text-break-strategy-${testIDSlug(textBreakStrategy)}`}
            key={textBreakStrategy}
            textBreakStrategy={textBreakStrategy}
            style={[
              styles.body,
              {
                width: 300,
              },
            ]}
          >
            {TEXT_BREAK_STRATEGY_SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    // The devices run in English, so the "de" row also proves `lang` reaches
    // native. A "lang: en" row would add nothing.
    children: (
      <>
        <VrtText testID="vrt-features-hyphens-none" hyphens="none" style={styles.hyphenationRow}>
          {HYPHENATION_SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-hyphens-none-soft-hyphens"
          hyphens="none"
          style={styles.hyphenationRow}
        >
          {SOFT_HYPHEN_SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-hyphens-auto-lang-de"
          hyphens="auto"
          lang="de"
          style={styles.hyphenationRow}
        >
          {HYPHENATION_SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    // With `hyphens` unset, android_hyphenationFrequency is the fallback.
    platform: 'android',
    children: (
      <>
        {(['none', 'normal', 'full'] as const).map((frequency) => (
          <VrtText
            testID={`vrt-features-hyphenation-frequency-${frequency}`}
            key={frequency}
            android_hyphenationFrequency={frequency}
            style={styles.hyphenationRow}
          >
            {HYPHENATION_SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {TEXT_DECORATION_LINES.map((textDecorationLine) => (
          <VrtText
            testID={`vrt-features-text-decoration-line-${testIDSlug(textDecorationLine)}`}
            key={textDecorationLine}
            style={{
              fontSize: SHORT_ROW_SIZE,
              textDecorationLine,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {TEXT_TRANSFORMS.map((textTransform) => (
          <VrtText
            testID={`vrt-features-text-transform-${textTransform}`}
            key={textTransform}
            style={{
              fontSize: SHORT_ROW_SIZE,
              textTransform,
            }}
          >
            {TEXT_TRANSFORM_SPECIMEN}
          </VrtText>
        ))}
        {/* capitalize's two gotchas: a digit-led word and a contraction. */}
        <VrtText
          testID="vrt-features-text-transform-capitalize-digit-led-word"
          style={{
            fontSize: SHORT_ROW_SIZE,
            textTransform: 'capitalize',
          }}
        >
          {TEXT_TRANSFORM_ORDINAL_SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-text-transform-capitalize-contraction"
          style={{
            fontSize: SHORT_ROW_SIZE,
            textTransform: 'capitalize',
          }}
        >
          {TEXT_TRANSFORM_CONTRACTION_SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    // Font-scale suite only (Android 1.3, iOS 1.353x), so the three rows differ.
    // Body size on purpose: Android 14+ scales non-linearly, so at 1.3 a 26sp row
    // grows only ~1.06x (under the 1.2x cap), while 14sp gets ~1.34x.
    suite: 'font-scale',
    children: (
      <>
        <VrtText
          testID="vrt-features-font-scaling-default"
          style={{
            fontSize: FONT_SCALING_SIZE,
          }}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-font-scaling-disabled"
          style={{
            fontSize: FONT_SCALING_SIZE,
          }}
          allowFontScaling={false}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          testID="vrt-features-font-scaling-max-1-2x"
          style={{
            fontSize: FONT_SCALING_SIZE,
          }}
          maxFontSizeMultiplier={1.2}
        >
          {SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {/* Baseline to compare every row below against. */}
        <VrtText testID="vrt-features-font-variant-system-default" style={fontVariantRow}>
          {FONT_VARIANT_SPECIMEN}
        </VrtText>
        {/* Both rows of a pair have the same digit count, so tabular figures
          make them equally wide (each row shrink-wraps) and proportional ones
          do not. Compare within a pair, never across. */}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <VrtText
            testID={`vrt-features-font-variant-tabular-nums-${digits}`}
            key={`tabular-${digits}`}
            style={{
              ...fontVariantRow,
              fontVariant: ['tabular-nums'],
            }}
          >
            {digits}
          </VrtText>
        ))}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <VrtText
            testID={`vrt-features-font-variant-proportional-nums-${digits}`}
            key={`proportional-${digits}`}
            style={{
              ...fontVariantRow,
              fontVariant: ['proportional-nums'],
            }}
          >
            {digits}
          </VrtText>
        ))}
        {/* Second baseline, in the serif the feature rows below use, so they have
          something to differ from. On Android it is the same font as the first
          baseline: that platform stays on the system font throughout. */}
        <VrtText
          testID="vrt-features-font-variant-feature-font-default"
          style={fontVariantFeatureRow}
        >
          {FONT_VARIANT_SPECIMEN}
        </VrtText>
        {FONT_VARIANTS.map(({ label, fontVariant }) => (
          <VrtText
            testID={`vrt-features-font-variant-${testIDSlug(label)}`}
            key={label}
            style={{
              ...fontVariantFeatureRow,
              fontVariant,
            }}
          >
            {FONT_VARIANT_SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {FONT_VARIATION_SETTINGS.map(({ label, fontVariationSettings }) => (
          <VrtText
            testID={`vrt-features-font-variation-settings-${testIDSlug(label)}`}
            key={label}
            style={{
              ...variableFontRow,
              fontVariationSettings,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {VERTICAL_ALIGNS.map((verticalAlign) => (
          <VrtText
            testID={`vrt-features-vertical-align-${verticalAlign}`}
            key={verticalAlign}
            containerStyle={vrtStyles.wideRow}
            style={{
              width: '100%',
              height: 72,
              fontSize: SHORT_ROW_SIZE,
              verticalAlign,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
        {/* Same three positions, driven by the other prop, so a row here should
          land identically to its verticalAlign counterpart above: 'center' is
          textAlignVertical's own name for what 'middle' means to verticalAlign. */}
        {TEXT_ALIGN_VERTICALS.map((textAlignVertical) => (
          <VrtText
            testID={`vrt-features-text-align-vertical-${textAlignVertical}`}
            key={textAlignVertical}
            containerStyle={vrtStyles.wideRow}
            style={{
              width: '100%',
              height: 72,
              fontSize: SHORT_ROW_SIZE,
              textAlignVertical,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
        {/* Both set, disagreeing: verticalAlign wins (matches RN <Text>'s
          Text.js), so this should render identically to the "verticalAlign:
          bottom" row above despite asking textAlignVertical for the opposite. */}
        <VrtText
          testID="vrt-features-vertical-align-overrides-text-align-vertical"
          containerStyle={vrtStyles.wideRow}
          style={{
            width: '100%',
            height: 72,
            fontSize: SHORT_ROW_SIZE,
            textAlignVertical: 'top',
            verticalAlign: 'bottom',
          }}
        >
          {SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {/* Control. Nothing to detect: if this one disagrees, the harness is
          wrong, not the wrap logic. */}
        <VrtText testID="vrt-features-wrap-detection-control" style={styles.wrapProbe}>
          {'One short line   '}
        </VrtText>
        {/* Hard breaks, nothing wraps → hug the longest line. */}
        <VrtText testID="vrt-features-wrap-detection-hard-breaks" style={styles.wrapProbe}>
          {'Short\nthis line is longest   '}
        </VrtText>
        {/* Same with more paragraphs, and with the longest one in the middle:
          the width comes from a max over paragraphs, so order shouldn't
          matter. */}
        <VrtText testID="vrt-features-wrap-detection-longest-in-middle" style={styles.wrapProbe}>
          {'A\nBB\nthis line is longest  \nCCC'}
        </VrtText>
        <VrtText testID="vrt-features-wrap-detection-longest-last" style={styles.wrapProbe}>
          {'A\nBB\nCCC\nthis line is longest  '}
        </VrtText>
        {/* No hard break, too long to fit → full constraint width. */}
        <VrtText testID="vrt-features-wrap-detection-soft-wrap-only" style={styles.wrapProbe}>
          {'No breaks here, but this sentence is long enough that it has to ' +
            'wrap onto several lines.'}
        </VrtText>
        {/* Both a hard break and a soft wrap → full constraint width. */}
        <VrtText testID="vrt-features-wrap-detection-break-then-wrap" style={styles.wrapProbe}>
          {'Break then wrap:\nthis second line is long enough that it also ' + 'has to wrap.'}
        </VrtText>
      </>
    ),
  },
  {
    platform: 'android',
    children: (
      <>
        <VrtText
          testID="vrt-features-font-padding-default-padding-4"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            {
              padding: 4,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          testID="vrt-features-font-padding-disabled-padding-4"
          containerStyle={vrtStyles.wideRow}
          style={[
            styles.body,
            {
              padding: 4,
              includeFontPadding: false,
            },
          ]}
        >
          {PARAGRAPH}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {EXAMPLE_GROUPS.flatMap(({ items }) => items).map((item) => (
          <VrtExample key={item.label} item={item} testID={`vrt-examples-${item.label}`} />
        ))}
      </>
    ),
  },
];
