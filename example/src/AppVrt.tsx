import { Children, isValidElement, type ReactNode } from 'react';
import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Platform,
  ScrollView,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PlainText, type PlainTextProps } from 'react-native-plain-text';
import { screenStyles } from './components/Specimen';
import { COLOR } from './theme';
import {
  testIDSlug,
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
  LINE_HEIGHTS,
  REALWORLD_FONT_SIZES,
  REALWORLD_FONTS,
  VERTICAL_ALIGNS,
  TEXT_ALIGN_VERTICALS,
  BASELINE_ALIGNMENT_GLYPHS,
  LETTER_SPACINGS,
  TEXT_DECORATION_LINES,
  TEXT_SHADOWS,
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
  COLORS,
  FONT_WEIGHTS,
  FONT_FAMILY_RESOLUTION,
  vrtStyles,
  type VrtGroup,
} from './vrt/utils';

export default function AppVrt() {
  const [fontsLoaded] = useFonts({
    Inter_300Light_Italic,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={vrtStyles.screen}>
        <VrtExamples />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function VrtExamples() {
  const occurrences = new Map<string, number>();
  const examples = groups
    .filter(({ platform }) => platform == null || platform === Platform.OS)
    .flatMap(({ children }) => {
      const sectionChildren = isValidElement<{ children?: ReactNode }>(children)
        ? children.props.children
        : children;

      return Children.toArray(sectionChildren).map((specimen, index) => {
        const label =
          isValidElement<{ label?: string }>(specimen) && typeof specimen.props.label === 'string'
            ? specimen.props.label
            : `item-${index + 1}`;
        const baseTestID = `vrt-features-${testIDSlug(label)}`;
        const occurrence = (occurrences.get(baseTestID) ?? 0) + 1;
        occurrences.set(baseTestID, occurrence);

        return {
          testID: occurrence === 1 ? baseTestID : `${baseTestID}-${occurrence}`,
          specimen,
        };
      });
    });

  return (
    <ScrollView
      testID="vrt-screen"
      style={screenStyles.scroll}
      contentContainerStyle={screenStyles.container}
    >
      {examples.map(({ testID, specimen }) => (
        <View key={testID} testID={testID} collapsable={false} style={vrtStyles.example}>
          {specimen}
        </View>
      ))}
    </ScrollView>
  );
}

type VrtTextProps = PlainTextProps & {
  label?: string;
  showText: boolean;
  containerStyle?: PlainTextProps['style'];
  accessibilityProps?: AccessibilityProps & { testID?: string };
};

function VrtText({
  label: _label,
  showText: _showText,
  containerStyle,
  accessibilityProps,
  style,
  ...props
}: VrtTextProps) {
  return (
    <PlainText
      {...props}
      {...accessibilityProps}
      style={[screenStyles.base, containerStyle, style]}
    />
  );
}

function VrtBox({
  label: _label,
  showText: _showText,
  overlay: _overlay,
  containerStyle,
  children,
}: {
  label?: string;
  showText: boolean;
  overlay: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return <View style={containerStyle}>{children}</View>;
}

const groups: VrtGroup[] = [
  {
    children: (
      <>
        {FONT_SIZES.map((fontSize) => (
          <VrtText
            key={fontSize}
            label={`${fontSize}pt`}
            showText={false}
            style={{
              fontSize,
            }}
            // A waterfall: one line per size, clipped at the column edge rather
            // than wrapped, so the sizes stay comparable down the column.
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
        <VrtText label="mixed" showText={false}>
          {EMOJI_SPECIMEN}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        {FONT_FAMILY_RESOLUTION.map(({ label, style }) => (
          <VrtText key={label} label={label} showText={false} style={style}>
            {style.fontFamily}
          </VrtText>
        ))}
      </>
    ),
  },
  {
    children: (
      <>
        {COLORS.map(({ label, color }) => (
          <VrtText
            key={label}
            label={label}
            showText={false}
            style={{
              fontSize: SHORT_ROW_SIZE,
              color,
            }}
          >
            {SPECIMEN}
          </VrtText>
        ))}
        <VrtText
          label="inverse"
          showText={false}
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
            key={fontWeight}
            label={fontWeight}
            showText={false}
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
          label="italic"
          showText={false}
          style={{
            fontSize: SHORT_ROW_SIZE,
            fontStyle: 'italic',
          }}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          label="bold italic"
          showText={false}
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
            key={textAlign}
            label={textAlign}
            showText={false}
            style={[
              styles.body,
              {
                textAlign,
              },
            ]}
            containerStyle={screenStyles.wideRow}
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
            key={writingDirection}
            label={writingDirection}
            showText={false}
            style={[
              styles.body,
              {
                textAlign: 'auto',
                writingDirection,
              },
            ]}
            containerStyle={screenStyles.wideRow}
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
        <VrtBox
          label="H / g / x, ruled at the baseline"
          showText={false}
          containerStyle={styles.baselineRow}
          overlay={
            <View style={styles.baselineRow}>
              {BASELINE_ALIGNMENT_GLYPHS.map(({ text, fontSize }, index) => (
                <Text
                  key={text}
                  style={[
                    {
                      fontSize,
                      marginLeft: index === 0 ? 0 : 10,
                    },
                    styles.overlayInline,
                  ]}
                >
                  {text}
                </Text>
              ))}
            </View>
          }
        >
          {BASELINE_ALIGNMENT_GLYPHS.map(({ text, fontSize }, index) => (
            <PlainText
              key={text}
              style={[
                {
                  fontSize,
                  marginLeft: index === 0 ? 0 : 10,
                },
                false,
              ]}
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
          label="wrap"
          showText={false}
          style={styles.body}
          containerStyle={screenStyles.wideRow}
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
            key={numberOfLines}
            label={`${numberOfLines} line${numberOfLines === 1 ? '' : 's'}`}
            showText={false}
            numberOfLines={numberOfLines}
            style={styles.body}
            containerStyle={screenStyles.wideRow}
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
          label="none"
          showText={false}
          style={styles.body}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          label="vertical 16"
          showText={false}
          style={[
            styles.body,
            {
              paddingVertical: 16,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          label="top 28 bottom 4"
          showText={false}
          style={[
            styles.body,
            {
              paddingTop: 28,
              paddingBottom: 4,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        {/* On a wrapping string: padding shrinks the width left for text, so
          this is where a padding-blind measure pass shows up as a clipped or
          overflowing last line. */}
        <VrtText
          label="all 20, wrapped"
          showText={false}
          style={[
            styles.body,
            {
              padding: 20,
            },
          ]}
          containerStyle={screenStyles.wideRow}
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
          label="all 2"
          showText={false}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 2,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          label="radius 12"
          showText={false}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 2,
              borderRadius: 12,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        {/* Per-side, the accent-bar shape: only the left edge is inset. The color
          comes from `bordered`, so the side widths are the only difference. */}
        <VrtText
          label="left 6"
          showText={false}
          style={[
            styles.body,
            styles.bordered,
            {
              borderLeftWidth: 6,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          label="dashed"
          showText={false}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 2,
              borderStyle: 'dashed',
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          label="all 4 + padding 12"
          showText={false}
          style={[
            styles.body,
            styles.bordered,
            {
              borderWidth: 4,
              padding: 12,
            },
          ]}
          containerStyle={screenStyles.wideRow}
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
            key={lineHeight}
            label={`${lineHeight} / 18`}
            showText={false}
            style={{
              fontSize: 18,
              lineHeight,
            }}
            containerStyle={screenStyles.wideRow}
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
              key={font.label}
              label={`${lineHeight} / ${fontSize}`}
              showText={false}
              style={[
                font.style,
                {
                  fontSize,
                  lineHeight,
                },
              ]}
              containerStyle={[screenStyles.wideRow, styles.clippingRow]}
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
            key={letterSpacing}
            label={`${letterSpacing > 0 ? '+' : ''}${letterSpacing}`}
            showText={false}
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
            key={ellipsizeMode}
            label={ellipsizeMode}
            showText={false}
            numberOfLines={1}
            ellipsizeMode={ellipsizeMode}
            style={styles.body}
            containerStyle={screenStyles.wideRow}
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
            key={s}
            label={s}
            showText={false}
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
        {(['none', 'hangul-word'] as const).map((s) => (
          <VrtText
            key={s}
            label={s}
            showText={false}
            lineBreakStrategyIOS={s}
            style={[
              styles.body,
              {
                width: 220,
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
            key={textBreakStrategy}
            label={textBreakStrategy}
            showText={false}
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
    children: (
      <>
        {TEXT_DECORATION_LINES.map((textDecorationLine) => (
          <VrtText
            key={textDecorationLine}
            label={textDecorationLine}
            showText={false}
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
        {TEXT_SHADOWS.map(({ label, style }) => (
          <VrtText
            key={label}
            label={label}
            showText={false}
            style={{
              fontSize: SHORT_ROW_SIZE,
              ...style,
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
            key={textTransform}
            label={textTransform}
            showText={false}
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
          label="capitalize, digit-led word"
          showText={false}
          style={{
            fontSize: SHORT_ROW_SIZE,
            textTransform: 'capitalize',
          }}
        >
          {TEXT_TRANSFORM_ORDINAL_SPECIMEN}
        </VrtText>
        <VrtText
          label="capitalize, contraction"
          showText={false}
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
    children: (
      <>
        <VrtText
          label="default"
          showText={false}
          style={{
            fontSize: SHORT_ROW_SIZE,
          }}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          label="disabled"
          showText={false}
          style={{
            fontSize: SHORT_ROW_SIZE,
          }}
          allowFontScaling={false}
        >
          {SPECIMEN}
        </VrtText>
        <VrtText
          label="max 1.5x"
          showText={false}
          style={{
            fontSize: SHORT_ROW_SIZE,
          }}
          maxFontSizeMultiplier={1.5}
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
        <VrtText label="default" showText={false} style={fontVariantRow}>
          {FONT_VARIANT_SPECIMEN}
        </VrtText>
        {/* Figure spacing first: the pair of values people actually reach for.
          It shows up as width: the two rows of each pair have the same digit
          count, so tabular figures make them equally wide (each row
          shrink-wraps to its text) and proportional ones do not. Compare
          within a pair, never across. The value name sits in the label gutter
          rather than in the string, so the row measures the digits and nothing
          else. */}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <VrtText
            key={`tabular-${digits}`}
            label="tabular-nums"
            showText={false}
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
            key={`proportional-${digits}`}
            label="proportional-nums"
            showText={false}
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
        <VrtText label="default" showText={false} style={fontVariantFeatureRow}>
          {FONT_VARIANT_SPECIMEN}
        </VrtText>
        {FONT_VARIANTS.map(({ label, fontVariant }) => (
          <VrtText
            key={label}
            label={label}
            showText={false}
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
            key={label}
            label={label}
            showText={false}
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
            key={verticalAlign}
            label={`verticalAlign: ${verticalAlign}`}
            showText={false}
            style={{
              width: '100%',
              height: 72,
              fontSize: SHORT_ROW_SIZE,
              verticalAlign,
            }}
            containerStyle={screenStyles.wideRow}
          >
            {SPECIMEN}
          </VrtText>
        ))}
        {/* Same three positions, driven by the other prop, so a row here should
          land identically to its verticalAlign counterpart above: 'center' is
          textAlignVertical's own name for what 'middle' means to verticalAlign. */}
        {TEXT_ALIGN_VERTICALS.map((textAlignVertical) => (
          <VrtText
            key={textAlignVertical}
            label={`textAlignVertical: ${textAlignVertical}`}
            showText={false}
            style={{
              width: '100%',
              height: 72,
              fontSize: SHORT_ROW_SIZE,
              textAlignVertical,
            }}
            containerStyle={screenStyles.wideRow}
          >
            {SPECIMEN}
          </VrtText>
        ))}
        {/* Both set, disagreeing: verticalAlign wins (matches RN <Text>'s
          Text.js), so this should render identically to the "verticalAlign:
          bottom" row above despite asking textAlignVertical for the opposite. */}
        <VrtText
          label="both set: textAlignVertical top, verticalAlign bottom"
          showText={false}
          style={{
            width: '100%',
            height: 72,
            fontSize: SHORT_ROW_SIZE,
            textAlignVertical: 'top',
            verticalAlign: 'bottom',
          }}
          containerStyle={screenStyles.wideRow}
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
        <VrtText label="control" showText={false} style={styles.wrapProbe}>
          {'One short line   '}
        </VrtText>
        {/* Hard breaks, nothing wraps → hug the longest line. */}
        <VrtText label="hard breaks" showText={false} style={styles.wrapProbe}>
          {'Short\nthis line is longest   '}
        </VrtText>
        {/* Same with more paragraphs, and with the longest one in the middle:
          the width comes from a max over paragraphs, so order shouldn't
          matter. */}
        <VrtText label="longest in middle" showText={false} style={styles.wrapProbe}>
          {'A\nBB\nthis line is longest  \nCCC'}
        </VrtText>
        {/* Same paragraphs, longest one last: the width comes from a max over
          paragraphs, so where it sits shouldn't matter. */}
        <VrtText label="longest last" showText={false} style={styles.wrapProbe}>
          {'A\nBB\nCCC\nthis line is longest  '}
        </VrtText>
        {/* No hard break, too long to fit → full constraint width. */}
        <VrtText label="soft wrap only" showText={false} style={styles.wrapProbe}>
          {'No breaks here, but this sentence is long enough that it has to ' +
            'wrap onto several lines.'}
        </VrtText>
        {/* Both a hard break and a soft wrap → full constraint width. */}
        <VrtText label="break then wrap" showText={false} style={styles.wrapProbe}>
          {'Break then wrap:\nthis second line is long enough that it also ' + 'has to wrap.'}
        </VrtText>
      </>
    ),
  },
  {
    children: (
      <>
        <VrtText
          label="testID"
          showText={false}
          style={styles.a11yRow}
          accessibilityProps={{
            testID: 'plain-text-demo',
          }}
        >
          &quot;plain-text-demo&quot;, findable in the native tree
        </VrtText>
        <VrtText
          label="label"
          showText={false}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityLabel: 'A screen reader announces this instead',
          }}
        >
          Overrides the spoken text
        </VrtText>
        <VrtText
          label="role"
          showText={false}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityRole: 'header',
          }}
        >
          &quot;header&quot;
        </VrtText>
        <VrtText
          label="role + hint"
          showText={false}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityRole: 'link',
            accessibilityHint: 'Opens the linked page',
          }}
        >
          &quot;link&quot;, hinted
        </VrtText>
        <VrtText
          label="state"
          showText={false}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityState: {
              disabled: true,
            },
          }}
        >
          disabled
        </VrtText>
        <VrtText
          label="hidden"
          showText={false}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          }}
        >
          Invisible to screen readers on both platforms
        </VrtText>
      </>
    ),
  },
  {
    platform: 'android',
    children: (
      <>
        <VrtText
          label="default, padding 4"
          showText={false}
          style={[
            styles.body,
            {
              padding: 4,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
        <VrtText
          label="includeFontPadding false, padding 4"
          showText={false}
          style={[
            styles.body,
            {
              padding: 4,
              includeFontPadding: false,
            },
          ]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </VrtText>
      </>
    ),
  },
];
