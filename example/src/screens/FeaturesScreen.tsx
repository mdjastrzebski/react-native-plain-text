import { useLayoutEffect, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlainText } from 'react-native-plain-text';

type Props = NativeStackScreenProps<ParamListBase>;

export default function FeaturesScreen({ navigation }: Props) {
  const [showText, setShowText] = useState(false);

  // Install the compare toggle into the native stack header.
  useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <Pressable onPress={() => setShowText((v) => !v)} hitSlop={8} style={styles.headerButton}>
          <Text style={styles.headerButtonLabel}>{showText ? 'Hide Text' : 'Compare Text'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, showText]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Section title="Font Size">
        {FONT_SIZES.map((fontSize) => (
          <TextItem
            key={fontSize}
            showText={showText}
            style={{ fontSize }}
          >{`${fontSize}pt font size`}</TextItem>
        ))}
      </Section>
      <Section title="Font Family">
        {FONT_FAMILIES.map(({ label, fontFamily }) => (
          <TextItem
            key={label}
            showText={showText}
            style={{ fontSize: 18, fontFamily }}
          >{`${label} font family`}</TextItem>
        ))}
      </Section>
      <Section title="Color">
        {COLORS.map(({ label, color }) => (
          <TextItem
            key={label}
            showText={showText}
            style={{ fontSize: 18, color }}
          >{`${label} text color`}</TextItem>
        ))}
      </Section>
      <Section title="Background Color">
        <TextItem
          showText={showText}
          style={{ fontSize: 18, color: '#ffffff', backgroundColor: '#333333' }}
        >
          White text on a dark background
        </TextItem>
      </Section>
      <Section title="Font Weight">
        {FONT_WEIGHTS.map((fontWeight) => (
          <TextItem
            key={fontWeight}
            showText={showText}
            style={{ fontSize: 18, fontWeight }}
          >{`${fontWeight} font weight`}</TextItem>
        ))}
      </Section>
      <Section title="Font Style">
        <TextItem showText={showText} style={styles.italic}>
          Italic font style
        </TextItem>
        <TextItem
          showText={showText}
          style={{ fontSize: 18, fontWeight: 'bold', fontStyle: 'italic' }}
        >
          Bold italic font style
        </TextItem>
      </Section>
      <Section title="Text Align">
        <TextItem showText={showText} style={styles.alignLeft} containerStyle={styles.wideRow}>
          This text is left-aligned within a wider fixed-width box.
        </TextItem>
        <TextItem showText={showText} style={styles.alignCenter} containerStyle={styles.wideRow}>
          This text is center-aligned within a wider fixed-width box.
        </TextItem>
        <TextItem showText={showText} style={styles.alignRight} containerStyle={styles.wideRow}>
          This text is right-aligned within a wider fixed-width box.
        </TextItem>
        <TextItem showText={showText} style={styles.alignJustify} containerStyle={styles.wideRow}>
          This text is justify-aligned within a wider fixed-width box so every line but the last
          stretches to fill it.
        </TextItem>
      </Section>
      <Section title="Multiline">
        <TextItem showText={showText} style={styles.multiline} containerStyle={styles.wideRow}>
          This is a longer piece of text that should wrap onto multiple lines and size its height
          automatically.
        </TextItem>
      </Section>
      <Section title="Number of Lines">
        {[1, 2, 3].map((numberOfLines) => (
          <TextItem
            key={numberOfLines}
            showText={showText}
            numberOfLines={numberOfLines}
            style={styles.multiline}
            containerStyle={styles.wideRow}
          >
            {`Clamped to ${numberOfLines} line${numberOfLines === 1 ? '' : 's'}: ` +
              'this is a longer piece of text that should truncate with an ' +
              'ellipsis once it exceeds the allotted number of lines.'}
          </TextItem>
        ))}
      </Section>
      {/* padding isn't a text-style prop: it stays in the style handed to the
          native view, so Yoga lays it out around the self-measured text. What to
          look at is the grey box growing while the glyphs move down with it — a
          box that grew but glyphs that stayed put means the space was reserved
          and nothing insetted the text. */}
      <Section title="Padding">
        <TextItem showText={showText} style={styles.spacingBase} containerStyle={styles.wideRow}>
          Baseline: no padding.
        </TextItem>
        <TextItem
          showText={showText}
          style={[styles.spacingBase, { paddingVertical: 16 }]}
          containerStyle={styles.wideRow}
        >
          paddingVertical 16
        </TextItem>
        <TextItem
          showText={showText}
          style={[styles.spacingBase, { paddingTop: 28, paddingBottom: 4 }]}
          containerStyle={styles.wideRow}
        >
          paddingTop 28, paddingBottom 4
        </TextItem>
        {/* On a wrapping string: padding shrinks the width left for text, so
            this is where a padding-blind measure pass shows up as a clipped or
            overflowing last line. */}
        <TextItem
          showText={showText}
          style={[styles.spacingBase, { paddingVertical: 12 }]}
          containerStyle={styles.wideRow}
        >
          paddingVertical 12, on a longer string that has to wrap onto more than one line.
        </TextItem>
      </Section>
      {/* Borders are view styles too, and border width joins padding in the
          contentInsets Yoga reserves — so the same two questions apply: is the
          border drawn at all, and is the text inset by it. The last row pairs
          both so the insets have to add up. */}
      <Section title="Borders">
        <TextItem
          showText={showText}
          style={[styles.borderBase, { borderWidth: 2, borderColor: '#3e63dd' }]}
          containerStyle={styles.wideRow}
        >
          borderWidth 2, borderColor blue
        </TextItem>
        <TextItem
          showText={showText}
          style={[styles.borderBase, { borderWidth: 2, borderColor: '#3e63dd', borderRadius: 12 }]}
          containerStyle={styles.wideRow}
        >
          borderRadius 12
        </TextItem>
        {/* Per-side, the accent-bar shape: only the left edge is inset. */}
        <TextItem
          showText={showText}
          style={[styles.borderBase, { borderLeftWidth: 6, borderLeftColor: '#e5484d' }]}
          containerStyle={styles.wideRow}
        >
          borderLeftWidth 6 only
        </TextItem>
        <TextItem
          showText={showText}
          style={[
            styles.borderBase,
            { borderWidth: 2, borderColor: '#30a46c', borderStyle: 'dashed' },
          ]}
          containerStyle={styles.wideRow}
        >
          borderStyle dashed
        </TextItem>
        <TextItem
          showText={showText}
          style={[styles.borderBase, { borderWidth: 4, borderColor: '#3e63dd', padding: 12 }]}
          containerStyle={styles.wideRow}
        >
          borderWidth 4 + padding 12, on a longer string that has to wrap onto more than one line.
        </TextItem>
      </Section>
      <Section title="Line Height">
        {LINE_HEIGHTS.map((lineHeight) => (
          <TextItem
            key={lineHeight}
            showText={showText}
            style={{ fontSize: 18, lineHeight }}
            containerStyle={styles.wideRow}
          >
            {`lineHeight ${lineHeight}: this is a longer piece of text that wraps ` +
              'onto multiple lines so the spacing between lines is visible.'}
          </TextItem>
        ))}
      </Section>
      <Section title="Letter Spacing">
        {LETTER_SPACINGS.map((letterSpacing) => (
          <TextItem
            key={letterSpacing}
            showText={showText}
            style={{ fontSize: 18, letterSpacing }}
          >{`letterSpacing ${letterSpacing}`}</TextItem>
        ))}
      </Section>
      <Section title="Ellipsize Mode">
        {ELLIPSIZE_MODES.map((ellipsizeMode) => (
          <TextItem
            key={ellipsizeMode}
            showText={showText}
            numberOfLines={1}
            ellipsizeMode={ellipsizeMode}
            style={styles.multiline}
            containerStyle={styles.wideRow}
          >
            {`ellipsizeMode "${ellipsizeMode}": this single line of text is too long to fit and gets truncated.`}
          </TextItem>
        ))}
      </Section>
      <Section title="Text Decoration Line">
        {TEXT_DECORATION_LINES.map((textDecorationLine) => (
          <TextItem
            key={textDecorationLine}
            showText={showText}
            style={{ fontSize: 18, textDecorationLine }}
          >{`textDecorationLine "${textDecorationLine}"`}</TextItem>
        ))}
      </Section>
      {/* Font scaling follows the OS accessibility text-size setting (Dynamic
          Type on iOS, Font size on Android); FONT_SCALING_FOOTER names the path
          for whichever platform is running. */}
      <Section title="Font Scaling" footer={FONT_SCALING_FOOTER}>
        <TextItem showText={showText} style={{ fontSize: 18 }}>
          Default: scales with the OS text-size setting.
        </TextItem>
        <TextItem showText={showText} style={{ fontSize: 18 }} allowFontScaling={false}>
          allowFontScaling false: never scales.
        </TextItem>
        <TextItem showText={showText} style={{ fontSize: 18 }} maxFontSizeMultiplier={1.5}>
          maxFontSizeMultiplier 1.5: scales up to 1.5x.
        </TextItem>
      </Section>
      {/* fontVariant turns OpenType features on, so a row only changes if the
          font actually carries the feature — which is why iOS runs these rows in
          a serif rather than SF, from the second baseline row down; see
          FONT_VARIANT_FEATURE_FAMILY. The figure-spacing rows above it stay on the
          system font, which handles tabular/proportional correctly. A row that
          looks like its baseline is usually a missing feature, not a broken
          prop.

          The red <Text> overlay is the less capable of the two here, for two
          reasons in RN core. Its New Architecture props layer has no room for the
          ligature and contextual values at all — the C++ FontVariant bitmask
          covers only small-caps, the figure styles and ss01-ss20 — so those rows
          never change on either platform. And on Android it only applies what
          survives when fontStyle, fontWeight or fontFamily is set as well, which
          is why these rows pass fontStyle 'normal' (see fontVariantRow below).
          PlainText has its own mapping and applies it unconditionally.

          Where that adds up to a visible difference is no-common-ligatures: the
          gray box drops the ffl/ffi ligatures and the overlay keeps them, now on
          both platforms, since the serif and Roboto both carry them. Both
          reasons are spelled out in docs/agent/native-gotchas.md. */}
      <Section title="Font Variant" footer={FONT_VARIANT_FOOTER}>
        {/* Baseline to compare every row below against. */}
        <TextItem showText={showText} style={fontVariantRow}>
          default: Waffle office 0123456789
        </TextItem>
        {/* Figure spacing first — the pair of values people actually reach for.
            It shows up as width: the two rows of each pair have the same digit
            count, so tabular figures make them equally wide (each row
            shrink-wraps to its text) and proportional ones do not. Compare
            within a pair, never across: the label prefix is identical inside a
            pair, which is what makes the right edge a read on the digits alone. */}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <TextItem
            key={`tabular-${digits}`}
            showText={showText}
            style={{ ...fontVariantRow, fontVariant: ['tabular-nums'] }}
          >{`tabular-nums: ${digits}`}</TextItem>
        ))}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <TextItem
            key={`proportional-${digits}`}
            showText={showText}
            style={{ ...fontVariantRow, fontVariant: ['proportional-nums'] }}
          >{`proportional-nums: ${digits}`}</TextItem>
        ))}
        {/* Second baseline, in the serif the feature rows below use, so they have
            something to differ from. On Android it is the same font as the first
            baseline — that platform stays on the system font throughout. */}
        <TextItem showText={showText} style={fontVariantFeatureRow}>
          default: Waffle office 0123456789
        </TextItem>
        {FONT_VARIANTS.map(({ label, fontVariant }) => (
          <TextItem
            key={label}
            showText={showText}
            style={{ ...fontVariantFeatureRow, fontVariant }}
          >{`${label}: Waffle office 0123456789`}</TextItem>
        ))}
      </Section>
      {/* Vertical alignment is Android-only (matches RN <Text>); on iOS it's a
          no-op — see VERTICAL_ALIGN_FOOTER. Each box is taller than its text so
          the position is visible. */}
      <Section title="Vertical Align (Android)" footer={VERTICAL_ALIGN_FOOTER}>
        {VERTICAL_ALIGNS.map((verticalAlign) => (
          <TextItem
            key={verticalAlign}
            showText={showText}
            style={{ width: '100%', height: 72, fontSize: 18, verticalAlign }}
            containerStyle={styles.wideRow}
          >{`verticalAlign "${verticalAlign}"`}</TextItem>
        ))}
      </Section>
      {/*
        Measured *width*, which is the one thing wrap detection decides. RN
        reports the full constraint width for text that word-wrapped and the
        tight widest-line width for text that didn't — so what to look at is the
        grey box edge, not the glyphs. None of these rows sets a width: the row
        shrink-wraps to whatever the text measured, and "Compare Text" overlays
        RN's own answer in red on top.

        Two things to check, in order: PlainText against the red Text overlay on
        one platform, then iOS against Android.

        Rows 2 and 3 are the interesting case — hard breaks that all fit, so
        nothing wrapped and the box must stop at the longest line. Every line is
        kept well under ~25 characters so it still fits on a narrow phone; if a
        line soft-wraps the row stops testing what it is here to test.
      */}
      <Section title="Wrap Detection">
        {/* Control. Nothing to detect — if this one disagrees, the harness is
            wrong, not the wrap logic. */}
        <TextItem showText={showText} style={styles.wrapProbe}>
          {'One short line   '}
        </TextItem>
        {/* Hard breaks, nothing wraps → hug the longest line. */}
        <TextItem showText={showText} style={styles.wrapProbe}>
          {'Short\nthis line is longest   '}
        </TextItem>
        {/* Same with more paragraphs, and with the longest one in the middle:
            the width comes from a max over paragraphs, so order shouldn't
            matter. */}
        <TextItem showText={showText} style={styles.wrapProbe}>
          {'A\nBB\nthis line is longest  \nCCC'}
        </TextItem>
        {/* Same with more paragraphs, and with the longest one in the middle:
            the width comes from a max over paragraphs, so order shouldn't
            matter. */}
        <TextItem showText={showText} style={styles.wrapProbe}>
          {'A\nBB\nCCC\nthis line is longest  '}
        </TextItem>
        {/* No hard break, too long to fit → full constraint width. */}
        <TextItem showText={showText} style={styles.wrapProbe}>
          {'No breaks here, but this sentence is long enough that it has to ' +
            'wrap onto several lines.'}
        </TextItem>
        {/* Both a hard break and a soft wrap → full constraint width. */}
        <TextItem showText={showText} style={styles.wrapProbe}>
          {'Break then wrap:\nthis second line is long enough that it also ' + 'has to wrap.'}
        </TextItem>
      </Section>
      {/* Accessibility props are part of RN's ViewProps, so they pass straight
          through to the native view. They're not visually distinct — turn on
          VoiceOver (iOS) / TalkBack (Android) to hear the label/role/state, or
          inspect the native tree for the testID. */}
      <Section title="Accessibility">
        <TextItem
          showText={showText}
          style={{ fontSize: 18 }}
          accessibilityProps={{ testID: 'plain-text-demo' }}
        >
          testID "plain-text-demo" (find it in the native tree)
        </TextItem>
        <TextItem
          showText={showText}
          style={{ fontSize: 18 }}
          accessibilityProps={{
            accessibilityLabel: 'A screen reader announces this instead',
          }}
        >
          accessibilityLabel overrides the spoken text
        </TextItem>
        <TextItem
          showText={showText}
          style={{ fontSize: 18 }}
          accessibilityProps={{ accessibilityRole: 'header' }}
        >
          accessibilityRole "header"
        </TextItem>
        <TextItem
          showText={showText}
          style={{ fontSize: 18 }}
          accessibilityProps={{
            accessibilityRole: 'link',
            accessibilityHint: 'Opens the linked page',
          }}
        >
          accessibilityRole "link" with a hint
        </TextItem>
        <TextItem
          showText={showText}
          style={{ fontSize: 18 }}
          accessibilityProps={{ accessibilityState: { disabled: true } }}
        >
          accessibilityState disabled
        </TextItem>
        <TextItem
          showText={showText}
          style={{ fontSize: 18 }}
          accessibilityProps={{
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          }}
        >
          Hidden from screen readers (iOS + Android)
        </TextItem>
      </Section>
      {/* Every section above varies one prop at a time. These rows stack three
          to six of them at once, which is where props that are individually
          fine start disagreeing — padding against a border against a clamped
          line count, letterSpacing against wrap detection, lineHeight against
          verticalAlign. Both lists are fixed literals (see EXAMPLE_USE_CASES
          and RANDOM_USE_CASES) so a screenshot from one build is comparable to
          a screenshot from the next; nothing here is generated at runtime. */}
      <Section title="Example Use Cases">
        {EXAMPLE_USE_CASES.map(({ label, text, style, wide, ...props }) => (
          <TextItem
            key={label}
            showText={showText}
            style={style}
            containerStyle={wide ? styles.wideRow : undefined}
            {...props}
          >
            {text}
          </TextItem>
        ))}
      </Section>
      <Section title="Random Use Cases">
        {RANDOM_USE_CASES.map(({ label, text, style, wide, ...props }) => (
          <TextItem
            key={label}
            showText={showText}
            style={style}
            containerStyle={wide ? styles.wideRow : undefined}
            {...props}
          >
            {text}
          </TextItem>
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  footer,
  children,
}: {
  title: string;
  // Notes about the section's props — caveats, platform gaps, what to look at.
  footer?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <PlainText style={styles.sectionHeader}>{title}</PlainText>
      {children}
      {footer != null && <PlainText style={styles.sectionFooter}>{footer}</PlainText>}
    </View>
  );
}

function TextItem({
  style,
  containerStyle,
  showText,
  numberOfLines,
  ellipsizeMode,
  allowFontScaling,
  maxFontSizeMultiplier,
  accessibilityProps,
  children,
}: {
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  showText: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  // Forwarded to both PlainText and the comparison Text so the two expose the
  // same accessibility surface (testID, role, label, ...) to the native tree.
  accessibilityProps?: AccessibilityProps & { testID?: string };
  children: string;
}) {
  return (
    // Full width, and the overlay's containing block. The grey row inside
    // shrink-wraps to PlainText; the overlay must NOT, or it would be handed
    // PlainText's width as its own constraint and could only ever wrap where
    // the real difference is that RN wanted a wider box.
    <View style={styles.rowContainer}>
      <View style={[styles.row, containerStyle]}>
        {/* No explicit height: the native text measures its own size. */}
        <PlainText
          style={style}
          numberOfLines={numberOfLines}
          ellipsizeMode={ellipsizeMode}
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          {...accessibilityProps}
        >
          {children}
        </PlainText>
      </View>
      {showText && (
        // `alignItems: flex-start` leaves the Text a normal flex child, so it
        // shrink-wraps to its own measured width but still wraps at the same
        // available width PlainText was measured against — which is what makes
        // the red box edge comparable to the grey one.
        <View style={styles.overlay}>
          <Text
            style={[style, styles.overlayText]}
            numberOfLines={numberOfLines}
            ellipsizeMode={ellipsizeMode}
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            {...accessibilityProps}
          >
            {children}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 22,
  },
  sectionFooter: {
    width: '100%',
    fontSize: 12,
    lineHeight: 17,
    color: '#687076',
  },
  rowContainer: {
    alignSelf: 'stretch',
  },
  row: {
    // Sized to the PlainText. The overlay shares this box's top-left origin but
    // not its width — see rowContainer.
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#d0d0d0',
  },
  // Used for demos whose PlainText itself has an explicit width: the row
  // should stretch to match instead of shrink-wrapping.
  wideRow: {
    alignSelf: 'stretch',
  },
  // No `right`, so the width stays auto: the Text shrink-wraps to its own text
  // and wraps only at the container's full width. Pinning both edges stretched
  // it to the container instead, and a demo whose style sets an explicit width
  // (the align and multiline rows) still gets it from `style`, which is applied
  // before this.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  overlayText: {
    opacity: 0.5,
    // Transparent so the PlainText underneath stays visible for comparison.
    backgroundColor: '#ff000020',
    color: 'red',
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerButtonLabel: {
    fontSize: 16,
    color: '#007aff',
  },
  italic: {
    fontSize: 18,
    fontStyle: 'italic',
  },
  multiline: {
    width: '100%',
    fontSize: 18,
  },
  // Deliberately no width: the row shrink-wraps to the measured intrinsic
  // width, which is the thing the Wrap Detection section is checking.
  wrapProbe: {
    fontSize: 18,
  },
  // No background of its own: the row's grey is the control, same as every other
  // section. Full width so the vertical padding is the only thing that changes
  // between rows.
  spacingBase: {
    width: '100%',
    fontSize: 18,
  },
  // No background of its own, like spacingBase: the row's grey is the control,
  // and the border colors read against it on their own.
  borderBase: {
    width: '100%',
    fontSize: 18,
  },
  alignLeft: {
    width: '100%',
    fontSize: 18,
    textAlign: 'left',
  },
  alignCenter: {
    width: '100%',
    fontSize: 18,
    textAlign: 'center',
  },
  alignRight: {
    width: '100%',
    fontSize: 18,
    textAlign: 'right',
  },
  alignJustify: {
    width: '100%',
    fontSize: 18,
    textAlign: 'justify',
  },
});

const FONT_SIZES = [48, 40, 32, 26, 20, 16, 13, 10];

const ELLIPSIZE_MODES = ['head', 'middle', 'tail', 'clip'] as const;

const LINE_HEIGHTS = [18, 26, 36];

// Name only the path the reader can actually go and change.
const FONT_SCALING_FOOTER = Platform.select({
  ios: 'Settings ▸ Accessibility ▸ Display & Text Size ▸ Larger Text. Only the first row follows it.',
  default: 'Settings ▸ Display ▸ Display size and text ▸ Font size. Only the first row follows it.',
});

const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;

const VERTICAL_ALIGN_FOOTER = Platform.select({
  ios: 'Android-only in RN <Text>. PlainText matches, so all three rows look the same.',
  default: 'Each box is 72pt tall, so the text has room to move.',
});

const LETTER_SPACINGS = [-2, 0, 2, 6];

const TEXT_DECORATION_LINES = [
  'none',
  'underline',
  'line-through',
  'underline line-through',
] as const;

// The section needs a font that actually carries the features, and SF does not:
// it forms no ff/ffi/ffl ligatures and ships no oldstyle figures, so those rows
// couldn't move on iOS no matter which side applied the value. So the rows that
// need those features run in a serif on iOS.
//
// Scoped to those rows only, and deliberately not to the figure-spacing ones. SF
// gets tabular/proportional right, whereas a serif can reorganize its figure sets
// under 'tnum'/'pnum' in ways that make the pair read backwards. Hoefler Text did
// exactly that, rendering its tabular row proportional and vice versa. Feature
// coverage varies face to face, so if a row here goes flat after a font change, try
// the next candidate before suspecting the prop: Palatino, Iowan Old Style, Charter,
// Didot. Baskerville is verified for small caps, oldstyle figures and the ff/ffi/ffl
// ligatures.
//
// Android needs no override. Roboto carries the ff ligatures and 'onum' both, so
// every row that can move there does. Naming a family would be harmless rather than
// forbidden: the CustomStyleSpan gate is already satisfied by the fontStyle 'normal'
// these rows carry.
const FONT_VARIANT_FEATURE_FAMILY = Platform.select({ ios: 'Baskerville', default: undefined });

// `fontStyle: 'normal'` is not cosmetic — it is what makes the red <Text> overlay
// show any of this on Android. RN only attaches the span that carries
// fontFeatureSettings when fontStyle, fontWeight or fontFamily is set too, so
// fontVariant on its own renders unchanged there (see
// docs/agent/native-gotchas.md). Applied to both sides rather than to the overlay
// alone, so the comparison stays apples-to-apples: it is a no-op for PlainText,
// which already resolves fontStyle 'normal' the same as unset. It does nudge RN's
// own paint — the span also sets isSubpixelText/isLinearText — which is
// unavoidable, since that span is RN's only carrier for the features.
const fontVariantRow: TextStyle = { fontSize: 18, fontStyle: 'normal' };

// The figure-spacing rows use fontVariantRow above; everything else uses this.
const fontVariantFeatureRow: TextStyle = {
  ...fontVariantRow,
  fontFamily: FONT_VARIANT_FEATURE_FAMILY,
};

// Typed against TextStyle rather than inferred: the literal unions are what make
// each entry assignable to the style prop's FontVariant[].
const FONT_VARIANTS: { label: string; fontVariant?: TextStyle['fontVariant'] }[] = [
  // Ordered by how often the value actually gets used in app UIs, commonest first.
  // The section renders the baseline row and the two figure-spacing values
  // (tabular-nums, proportional-nums) ahead of this list — those are the ones
  // reached for most, and they need paired rows to show anything, so they can't be
  // driven from here.
  //
  // Everyday: headers, labels, acronyms set at text size.
  { label: 'small-caps', fontVariant: ['small-caps'] },
  // Editorial/serif typography. This is the figure *shape*, not the spacing the
  // tabular rows cover. Lining figures all sit on the baseline at cap height
  // (1234567890). Oldstyle ones vary, with 3456789 dropping below it and 68 rising
  // above, so digits blend into lowercase the way a printed book sets them.
  //
  // Only the row asking for the shape the face does not already use can move, and
  // both faces default to lining, so 'oldstyle-nums' is the row that renders and
  // 'lining-nums' is flat. Verified on both platforms: Baskerville carries 'onum' on
  // iOS, and so does Roboto on Android.
  { label: 'oldstyle-nums', fontVariant: ['oldstyle-nums'] },
  { label: 'lining-nums', fontVariant: ['lining-nums'] },
  // Niche, but the one row that turns a default-on feature *off*, which is the only
  // way a ligature value can be seen at all: "Waffle office" loses its ffl/ffi
  // ligatures. Both fonts here carry them, so this is where PlainText's box should
  // differ from the <Text> overlay on either platform.
  { label: 'no-common-ligatures', fontVariant: ['no-common-ligatures'] },
  // Barely ever written by hand: 'liga'/'clig' are on by default in both system
  // fonts, so this asks for what is already there and can't differ either way.
  { label: 'common-ligatures', fontVariant: ['common-ligatures'] },
  // Not a real-world combination; here so the array form is exercised with more
  // than one entry.
  { label: 'small-caps + oldstyle-nums', fontVariant: ['small-caps', 'oldstyle-nums'] },
];

// Per-platform: the RN <Text> gaps and the fonts differ. Detail in
// docs/agent/native-gotchas.md.
const FONT_VARIANT_FOOTER = Platform.select({
  ios: 'RN <Text> ignores the ligature values. (no-common-ligatures row)',
  default:
    'RN <Text> ignores the ligature values, and all of fontVariant unless another ' +
    "font prop is set (hence fontStyle 'normal').",
});

// Same number of digits per row, differing only in which ones.
const TABULAR_FIGURE_ROWS = ['1111111111', '0123456789'];

const COLORS = [
  { label: 'Red', color: '#e5484d' },
  { label: 'Green', color: '#30a46c' },
  { label: 'Blue', color: '#3e63dd' },
];

const FONT_WEIGHTS = ['normal', 'bold', '100', '300', '500', '700', '900'] as const;

// Same platform caveat as FONT_FAMILIES below, for the combination rows: they
// need a monospace and a serif face by name, and the names differ per platform.
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

type Combination = {
  label: string;
  text: string;
  style: TextStyle;
  // Rows whose style sets an explicit width need the grey row to stretch to
  // match instead of shrink-wrapping — same flag `wideRow` carries elsewhere.
  wide?: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
};

// Fixed, hand-written lists — never generated, never shuffled — so two runs of
// the app render byte-identical rows and screenshots diff cleanly.
//
// EXAMPLE_USE_CASES are shapes that show up in real UIs (card titles, badges,
// prices, code, quotes, toasts, ...).
const EXAMPLE_USE_CASES: Combination[] = [
  {
    label: 'card-title',
    text: 'Quarterly revenue is up',
    style: { fontSize: 22, fontWeight: '700', color: '#11181c', letterSpacing: -0.4 },
  },
  {
    label: 'card-subtitle',
    text: 'Updated 3 minutes ago by the sync service',
    style: { width: '100%', fontSize: 14, color: '#687076', lineHeight: 20 },
    wide: true,
    numberOfLines: 2,
  },
  {
    label: 'list-row-primary',
    text: 'Annual infrastructure review meeting with the platform team',
    style: { width: '100%', fontSize: 17, color: '#11181c' },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  {
    label: 'list-row-secondary',
    text: 'Conference room B · 14:00 – 15:30 · 6 attendees',
    style: { width: '100%', fontSize: 13, color: '#889096', letterSpacing: 0.2 },
    wide: true,
    numberOfLines: 1,
  },
  {
    label: 'badge-new',
    text: 'NEW',
    style: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      backgroundColor: '#30a46c',
      letterSpacing: 1,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
  },
  {
    label: 'badge-outline',
    text: 'BETA',
    style: {
      fontSize: 11,
      fontWeight: '600',
      color: '#3e63dd',
      letterSpacing: 1.2,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: '#3e63dd',
      borderRadius: 4,
    },
  },
  {
    label: 'price-large',
    text: '$1,249.00',
    style: { fontSize: 34, fontWeight: '800', color: '#11181c', letterSpacing: -1 },
  },
  {
    label: 'price-struck',
    text: '$1,799.00',
    style: { fontSize: 16, color: '#889096', textDecorationLine: 'line-through' },
  },
  {
    label: 'button-label',
    text: 'Continue to checkout',
    style: {
      width: '100%',
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
      backgroundColor: '#3e63dd',
      textAlign: 'center',
      paddingVertical: 14,
      borderRadius: 10,
    },
    wide: true,
    numberOfLines: 1,
  },
  {
    label: 'button-disabled',
    text: 'Continue to checkout',
    style: {
      width: '100%',
      fontSize: 16,
      fontWeight: '600',
      color: '#b0b4b8',
      backgroundColor: '#f1f3f5',
      textAlign: 'center',
      paddingVertical: 14,
      borderRadius: 10,
    },
    wide: true,
  },
  {
    label: 'link',
    text: 'Read the migration guide',
    style: { fontSize: 16, color: '#3e63dd', textDecorationLine: 'underline' },
  },
  {
    label: 'error-inline',
    text: 'That email address is already registered.',
    style: { width: '100%', fontSize: 13, color: '#e5484d', lineHeight: 18 },
    wide: true,
  },
  {
    label: 'error-banner',
    text: 'We could not reach the server. Check your connection and try again.',
    style: {
      width: '100%',
      fontSize: 15,
      color: '#641723',
      backgroundColor: '#ffefef',
      lineHeight: 22,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#e5484d',
      borderRadius: 6,
    },
    wide: true,
  },
  {
    label: 'success-toast',
    text: 'Settings saved',
    style: {
      fontSize: 15,
      fontWeight: '500',
      color: '#ffffff',
      backgroundColor: '#1c2024',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
  },
  {
    label: 'section-header',
    text: 'ACCOUNT SETTINGS',
    style: { fontSize: 12, fontWeight: '600', color: '#687076', letterSpacing: 1.4 },
  },
  {
    label: 'hero-heading',
    text: 'Native text, without the layout tax',
    style: { width: '100%', fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.8 },
    wide: true,
  },
  {
    label: 'body-paragraph',
    text:
      'PlainText renders with the platform text widget directly, so it measures ' +
      'once and lays out where the OS would put it — the same paragraph, minus ' +
      'the shadow tree round trip.',
    style: { width: '100%', fontSize: 16, color: '#11181c', lineHeight: 25 },
    wide: true,
  },
  {
    label: 'body-justified',
    text:
      'Justified body copy stretches every line but the last to the full ' +
      'measure, which makes any disagreement about the available width show up ' +
      'as a ragged right edge instead of a subtle reflow.',
    style: { width: '100%', fontSize: 15, textAlign: 'justify', lineHeight: 23 },
    wide: true,
  },
  {
    label: 'pull-quote',
    text: '“The fastest text is the text you never have to measure twice.”',
    style: {
      width: '100%',
      fontSize: 20,
      fontFamily: SERIF,
      fontStyle: 'italic',
      color: '#3a3f42',
      lineHeight: 30,
      paddingLeft: 16,
      borderLeftWidth: 3,
      borderLeftColor: '#d7dbdf',
    },
    wide: true,
  },
  {
    label: 'code-inline',
    text: 'yarn add react-native-plain-text',
    style: {
      fontSize: 14,
      fontFamily: MONO,
      color: '#8e4ec6',
      backgroundColor: '#f4f0f8',
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
  },
  {
    label: 'code-block',
    text: 'const styles = StyleSheet.create({\n  title: { fontSize: 22 },\n});',
    style: {
      width: '100%',
      fontSize: 13,
      fontFamily: MONO,
      color: '#e6e8eb',
      backgroundColor: '#1c2024',
      lineHeight: 20,
      padding: 14,
      borderRadius: 8,
    },
    wide: true,
  },
  {
    label: 'caption',
    text: 'Figure 1 — measured width on a 390pt viewport',
    style: { fontSize: 12, color: '#889096', fontStyle: 'italic', letterSpacing: 0.1 },
  },
  {
    label: 'timestamp',
    text: '2026-07-31 09:14',
    style: { fontSize: 12, fontFamily: MONO, color: '#889096', letterSpacing: 0.4 },
  },
  {
    label: 'avatar-initials',
    text: 'MJ',
    style: {
      fontSize: 18,
      fontWeight: '700',
      color: '#ffffff',
      backgroundColor: '#8e4ec6',
      textAlign: 'center',
      width: 44,
      height: 44,
      lineHeight: 44,
      borderRadius: 22,
    },
  },
  {
    label: 'notification-preview',
    text:
      'Alex commented on your pull request: this looks good to me, though I ' +
      'would pull the measurement cache out into its own module first.',
    style: { width: '100%', fontSize: 14, color: '#3a3f42', lineHeight: 20 },
    wide: true,
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  {
    label: 'file-path',
    text: 'ios/PlainTextView/PlainTextShadowNode.mm',
    style: { width: '100%', fontSize: 13, fontFamily: MONO, color: '#687076' },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'head',
  },
  {
    label: 'stat-value',
    text: '98.4%',
    style: { fontSize: 40, fontWeight: '300', color: '#11181c', letterSpacing: -1.5 },
  },
  {
    label: 'legal-fine-print',
    text:
      'By continuing you agree to the terms of service and acknowledge the ' +
      'privacy policy, including how measurement data is retained.',
    style: { width: '100%', fontSize: 11, color: '#889096', lineHeight: 16 },
    wide: true,
    allowFontScaling: false,
  },
  {
    label: 'empty-state',
    text: 'Nothing here yet.\nPull down to refresh.',
    style: {
      width: '100%',
      fontSize: 16,
      color: '#889096',
      textAlign: 'center',
      lineHeight: 24,
      paddingVertical: 24,
    },
    wide: true,
  },
  {
    label: 'tab-label-active',
    text: 'Overview',
    style: {
      fontSize: 15,
      fontWeight: '600',
      color: '#3e63dd',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderBottomWidth: 2,
      borderBottomColor: '#3e63dd',
    },
    maxFontSizeMultiplier: 1.3,
  },
];

// RANDOM_USE_CASES are deliberately arbitrary stacks of three to five props,
// including combinations no designer would ask for; they are there to catch
// interactions the realistic rows happen to avoid.
const RANDOM_USE_CASES: Combination[] = [
  {
    label: 'combo-31',
    text: 'letterSpacing 4 + bold italic + line-through',
    style: {
      fontSize: 17,
      fontWeight: 'bold',
      fontStyle: 'italic',
      letterSpacing: 4,
      textDecorationLine: 'line-through',
    },
  },
  {
    label: 'combo-32',
    text: 'Negative tracking on a thin serif face, right-aligned in a wide box.',
    style: {
      width: '100%',
      fontSize: 21,
      fontFamily: SERIF,
      fontWeight: '300',
      letterSpacing: -1.2,
      textAlign: 'right',
    },
    wide: true,
  },
  {
    label: 'combo-33',
    text: 'Dashed border, generous padding, centered, clamped to one line and truncated in the middle.',
    style: {
      width: '100%',
      fontSize: 15,
      textAlign: 'center',
      padding: 14,
      borderWidth: 2,
      borderColor: '#30a46c',
      borderStyle: 'dashed',
    },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  {
    label: 'combo-34',
    text: 'lineHeight 12 under an 18pt font — deliberately tighter than the glyphs, over two wrapped lines.',
    style: { width: '100%', fontSize: 18, lineHeight: 12, color: '#e5484d' },
    wide: true,
  },
  {
    label: 'combo-35',
    text: 'lineHeight 44 under a 13pt font, underlined, on a background so the leading is visible.',
    style: {
      width: '100%',
      fontSize: 13,
      lineHeight: 44,
      textDecorationLine: 'underline',
      backgroundColor: '#eef1ff',
    },
    wide: true,
  },
  {
    label: 'combo-36',
    text: 'Monospace 900 weight with 3pt tracking, clipped at one line.',
    style: { width: '100%', fontSize: 16, fontFamily: MONO, fontWeight: '900', letterSpacing: 3 },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  {
    label: 'combo-37',
    text: 'verticalAlign bottom in a 90pt box, italic, justified',
    style: {
      width: '100%',
      height: 90,
      fontSize: 15,
      fontStyle: 'italic',
      textAlign: 'justify',
      verticalAlign: 'bottom',
      backgroundColor: '#fff4e6',
    },
    wide: true,
  },
  {
    label: 'combo-38',
    text: 'verticalAlign middle, 6pt left border, asymmetric padding, weight 100',
    style: {
      width: '100%',
      height: 80,
      fontSize: 17,
      fontWeight: '100',
      verticalAlign: 'middle',
      paddingLeft: 24,
      paddingRight: 4,
      borderLeftWidth: 6,
      borderLeftColor: '#8e4ec6',
    },
    wide: true,
  },
  {
    label: 'combo-39',
    text: 'Hard break then a long run:\nborder + padding + three-line clamp on a wrapping string that has to spill past the limit.',
    style: {
      width: '100%',
      fontSize: 14,
      lineHeight: 21,
      padding: 10,
      borderWidth: 3,
      borderColor: '#e5484d',
      borderRadius: 8,
    },
    wide: true,
    numberOfLines: 3,
  },
  {
    label: 'combo-40',
    text: 'White on black, 2pt tracking, centered, no font scaling, one line, head-truncated when it overflows.',
    style: {
      width: '100%',
      fontSize: 15,
      color: '#ffffff',
      backgroundColor: '#000000',
      letterSpacing: 2,
      textAlign: 'center',
    },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'head',
    allowFontScaling: false,
  },
  {
    label: 'combo-41',
    text: 'Serif italic underline + line-through together at 24pt',
    style: {
      fontSize: 24,
      fontFamily: SERIF,
      fontStyle: 'italic',
      textDecorationLine: 'underline line-through',
      color: '#8e4ec6',
    },
  },
  {
    label: 'combo-42',
    text: 'Tiny text, huge padding, rounded, capped at 1.2x scaling.',
    style: {
      fontSize: 10,
      color: '#11181c',
      backgroundColor: '#f1f3f5',
      paddingVertical: 26,
      paddingHorizontal: 26,
      borderRadius: 18,
    },
    maxFontSizeMultiplier: 1.2,
  },
  {
    label: 'combo-43',
    text: 'Right-aligned bold 28pt with -2 tracking and a bottom border',
    style: {
      width: '100%',
      fontSize: 28,
      fontWeight: 'bold',
      letterSpacing: -2,
      textAlign: 'right',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#d7dbdf',
    },
    wide: true,
  },
  {
    label: 'combo-44',
    text: 'A\nBB\nCCC — three hard-broken lines under a two-line clamp, monospace, centered.',
    style: { width: '100%', fontSize: 14, fontFamily: MONO, textAlign: 'center', lineHeight: 26 },
    wide: true,
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  {
    label: 'combo-45',
    text: 'Green on pale green, weight 500, 1.5 tracking, 32 line height, 20 padding, two-line clamp on a string long enough to reach it.',
    style: {
      width: '100%',
      fontSize: 15,
      fontWeight: '500',
      color: '#18794e',
      backgroundColor: '#e9f9ee',
      letterSpacing: 1.5,
      lineHeight: 32,
      padding: 20,
    },
    wide: true,
    numberOfLines: 2,
  },
  {
    label: 'combo-46',
    text: 'No width set: intrinsic sizing with padding, border radius and italic serif.',
    style: {
      fontSize: 16,
      fontFamily: SERIF,
      fontStyle: 'italic',
      backgroundColor: '#fdf0f3',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
  },
  {
    label: 'combo-47',
    text: 'verticalAlign top in a 100pt box with a 4pt border and 18pt padding, weight 700, underlined.',
    style: {
      width: '100%',
      height: 100,
      fontSize: 16,
      fontWeight: '700',
      textDecorationLine: 'underline',
      verticalAlign: 'top',
      padding: 18,
      borderWidth: 4,
      borderColor: '#3e63dd',
    },
    wide: true,
  },
  {
    label: 'combo-48',
    text: '48pt thin text clamped to one line and clipped, with 5pt tracking.',
    style: { width: '100%', fontSize: 48, fontWeight: '100', letterSpacing: 5, color: '#687076' },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  {
    label: 'combo-49',
    text: 'Justified monospace with a dashed bottom border, negative tracking and no scaling at all.',
    style: {
      width: '100%',
      fontSize: 13,
      fontFamily: MONO,
      textAlign: 'justify',
      letterSpacing: -0.5,
      lineHeight: 24,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: '#889096',
      borderStyle: 'dashed',
    },
    wide: true,
    allowFontScaling: false,
  },
  {
    label: 'combo-50',
    text: 'Everything at once: serif bold italic, underlined, centered, tracked, bordered, padded, capped at 1.4x and clamped to three lines on a string long enough to actually hit that clamp.',
    style: {
      width: '100%',
      fontSize: 17,
      fontFamily: SERIF,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#641723',
      backgroundColor: '#fff8f8',
      textAlign: 'center',
      textDecorationLine: 'underline',
      letterSpacing: 0.8,
      lineHeight: 26,
      padding: 12,
      borderWidth: 2,
      borderColor: '#e5484d',
      borderRadius: 10,
    },
    wide: true,
    numberOfLines: 3,
    maxFontSizeMultiplier: 1.4,
  },
  {
    label: 'combo-51',
    text: 'Per-corner radii on a padded background: 24 top-left, 0 top-right, 24 bottom-right, 0 bottom-left.',
    style: {
      width: '100%',
      fontSize: 15,
      color: '#11181c',
      backgroundColor: '#eef1ff',
      padding: 14,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 24,
      borderBottomLeftRadius: 0,
    },
    wide: true,
  },
  {
    label: 'combo-52',
    text: 'Four borders, four different colors and widths, with matching asymmetric padding.',
    style: {
      width: '100%',
      fontSize: 14,
      lineHeight: 22,
      paddingTop: 4,
      paddingRight: 20,
      paddingBottom: 16,
      paddingLeft: 8,
      borderTopWidth: 1,
      borderTopColor: '#e5484d',
      borderRightWidth: 5,
      borderRightColor: '#30a46c',
      borderBottomWidth: 3,
      borderBottomColor: '#3e63dd',
      borderLeftWidth: 8,
      borderLeftColor: '#f5a524',
    },
    wide: true,
  },
  {
    label: 'combo-53',
    text: 'Dotted border at 1pt around 8pt text with 2pt tracking — the thinnest stroke the platform will draw.',
    style: {
      width: '100%',
      fontSize: 8,
      letterSpacing: 2,
      padding: 6,
      borderWidth: 1,
      borderColor: '#11181c',
      borderStyle: 'dotted',
    },
    wide: true,
  },
  {
    label: 'combo-54',
    text: 'Zero-width space test​between​words with a two-line clamp and tail ellipsis on a long enough string to reach it.',
    style: { width: '100%', fontSize: 15, lineHeight: 22, color: '#8e4ec6' },
    wide: true,
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  {
    label: 'combo-55',
    text: 'Supercalifragilisticexpialidocious-antidisestablishmentarianism-pneumonoultramicroscopicsilicovolcanoconiosis',
    style: {
      width: '100%',
      fontSize: 16,
      fontFamily: MONO,
      padding: 8,
      backgroundColor: '#f1f3f5',
    },
    wide: true,
  },
  {
    label: 'combo-56',
    text: 'One unbreakable word, one line, middle-truncated: Donaudampfschiffahrtselektrizitaetenhauptbetriebswerkbauunterbeamtengesellschaft',
    style: { width: '100%', fontSize: 14, letterSpacing: 0.5 },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  {
    label: 'combo-57',
    text: 'Mixed scripts in one run: English · Ελληνικά · Кириллица · العربية · 日本語 · 한국어 · עברית',
    style: { width: '100%', fontSize: 17, lineHeight: 28 },
    wide: true,
  },
  {
    label: 'combo-58',
    text: 'Emoji at 28pt with tracking: 🎯 ✨ 🚀 👩‍👩‍👧‍👦 🇵🇱 🏳️‍🌈 — clamped to one line.',
    style: { width: '100%', fontSize: 28, letterSpacing: 3, lineHeight: 40 },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  {
    label: 'combo-59',
    text: 'ثم نص عربي طويل بمحاذاة يمينية داخل صندوق عريض مع حشوة وحدود.',
    style: {
      width: '100%',
      fontSize: 18,
      textAlign: 'right',
      padding: 12,
      borderWidth: 1,
      borderColor: '#889096',
    },
    wide: true,
  },
  {
    label: 'combo-60',
    text: 'Combining diacritics stacked: éééé àààà ñññ ẛ̣ ǫ̈ — with a tight 14pt line height under 20pt glyphs.',
    style: { width: '100%', fontSize: 20, lineHeight: 14, backgroundColor: '#fff4e6' },
    wide: true,
  },
  {
    label: 'combo-61',
    text: '   Leading and trailing whitespace   ',
    style: {
      fontSize: 16,
      fontFamily: MONO,
      backgroundColor: '#e9f9ee',
      borderWidth: 1,
      borderColor: '#18794e',
    },
  },
  {
    label: 'combo-62',
    text: '\n\nThree leading newlines before any glyph, inside a bordered box.',
    style: {
      width: '100%',
      fontSize: 14,
      lineHeight: 20,
      padding: 8,
      borderWidth: 2,
      borderColor: '#8e4ec6',
      borderRadius: 6,
    },
    wide: true,
  },
  {
    label: 'combo-63',
    text: 'Tab\tseparated\tcolumns\tin\tmonospace under a one-line clip.',
    style: { width: '100%', fontSize: 13, fontFamily: MONO, letterSpacing: 1 },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  {
    label: 'combo-64',
    text: 'W',
    style: { fontSize: 22, lineHeight: 60, paddingHorizontal: 10 },
    numberOfLines: 5,
  },
  {
    label: 'combo-65',
    text: '·',
    style: {
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#f1f3f5',
      textAlign: 'center',
      padding: 2,
      borderRadius: 999,
    },
  },
  {
    label: 'combo-66',
    text: '72pt uppercase with -4 tracking, clipped',
    style: {
      width: '100%',
      fontSize: 72,
      fontWeight: '800',
      letterSpacing: -4,
      color: '#11181c',
      lineHeight: 68,
    },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  {
    label: 'combo-67',
    text: '6pt text with 6pt line height and 0.1 tracking, three lines deep inside a padded box that forces wrapping.',
    style: { width: '100%', fontSize: 6, lineHeight: 6, letterSpacing: 0.1, padding: 10 },
    wide: true,
  },
  {
    label: 'combo-68',
    text: 'Weight 200 serif at 30pt against weight 800 sans elsewhere — italic, justified, no scaling.',
    style: {
      width: '100%',
      fontSize: 30,
      fontFamily: SERIF,
      fontWeight: '200',
      fontStyle: 'italic',
      textAlign: 'justify',
      lineHeight: 34,
    },
    wide: true,
    allowFontScaling: false,
  },
  {
    label: 'combo-69',
    text: 'Fixed 40pt box holding 26pt text: the glyphs are taller than the line box allows.',
    style: {
      width: '100%',
      height: 40,
      fontSize: 26,
      backgroundColor: '#fdf0f3',
      verticalAlign: 'middle',
    },
    wide: true,
    numberOfLines: 1,
  },
  {
    label: 'combo-70',
    text: 'Fixed 140pt box, bottom-aligned, one line, right-aligned, with 30pt of top padding on top of that.',
    style: {
      width: '100%',
      height: 140,
      fontSize: 15,
      textAlign: 'right',
      verticalAlign: 'bottom',
      paddingTop: 30,
      backgroundColor: '#eef1ff',
    },
    wide: true,
    numberOfLines: 1,
  },
  {
    label: 'combo-71',
    text: 'Padding larger than the box: 60pt vertical padding inside a 70pt tall container.',
    style: {
      width: '100%',
      height: 70,
      fontSize: 14,
      paddingVertical: 60,
      backgroundColor: '#fff4e6',
      borderWidth: 1,
      borderColor: '#f5a524',
    },
    wide: true,
  },
  {
    label: 'combo-72',
    text: 'Border radius 40 on a box only 30pt tall — the radius is larger than half the height.',
    style: {
      width: '100%',
      height: 30,
      fontSize: 13,
      textAlign: 'center',
      verticalAlign: 'middle',
      backgroundColor: '#e9f9ee',
      borderWidth: 2,
      borderColor: '#18794e',
      borderRadius: 40,
    },
    wide: true,
    numberOfLines: 1,
  },
  {
    label: 'combo-73',
    text: 'Transparent text on a solid background with an underline that still has to show.',
    style: {
      width: '100%',
      fontSize: 18,
      color: 'transparent',
      backgroundColor: '#d7dbdf',
      textDecorationLine: 'underline',
      padding: 10,
    },
    wide: true,
  },
  {
    label: 'combo-74',
    text: 'Semi-transparent color over a semi-transparent background, both rgba, with a 3pt rgba border.',
    style: {
      width: '100%',
      fontSize: 16,
      color: 'rgba(17, 24, 28, 0.45)',
      backgroundColor: 'rgba(62, 99, 221, 0.15)',
      padding: 12,
      borderWidth: 3,
      borderColor: 'rgba(229, 72, 77, 0.5)',
    },
    wide: true,
  },
  {
    label: 'combo-75',
    text: 'Justified text with 8pt tracking — the last line and the tracking fight each other across three wrapped lines of filler.',
    style: { width: '100%', fontSize: 15, textAlign: 'justify', letterSpacing: 8, lineHeight: 30 },
    wide: true,
  },
  {
    label: 'combo-76',
    text: 'Center-aligned single word in a wide box, head-truncated at one line',
    style: { width: '100%', fontSize: 19, textAlign: 'center', fontWeight: '600' },
    wide: true,
    numberOfLines: 1,
    ellipsizeMode: 'head',
  },
  {
    label: 'combo-77',
    text: 'numberOfLines 0 means unlimited: this string wraps as far as it needs to inside a narrow padded box with a dashed border and a serif face.',
    style: {
      width: 180,
      fontSize: 14,
      fontFamily: SERIF,
      lineHeight: 20,
      padding: 8,
      borderWidth: 2,
      borderColor: '#3e63dd',
      borderStyle: 'dashed',
    },
    numberOfLines: 0,
  },
  {
    label: 'combo-78',
    text: 'Ten-line clamp on a two-line string, with underline and a bottom border underneath it.',
    style: {
      width: '100%',
      fontSize: 16,
      textDecorationLine: 'underline',
      paddingBottom: 6,
      borderBottomWidth: 3,
      borderBottomColor: '#30a46c',
    },
    wide: true,
    numberOfLines: 10,
  },
  {
    label: 'combo-79',
    text: 'Scaling capped at exactly 1.0 — this row must not grow at any accessibility text size.',
    style: {
      width: '100%',
      fontSize: 18,
      fontWeight: '600',
      color: '#641723',
      backgroundColor: '#fff8f8',
      padding: 10,
    },
    wide: true,
    maxFontSizeMultiplier: 1,
  },
  {
    label: 'combo-80',
    text: 'Scaling uncapped at 4x with a fixed 60pt height: the text is allowed to outgrow its own box.',
    style: {
      width: '100%',
      height: 60,
      fontSize: 15,
      verticalAlign: 'top',
      backgroundColor: '#f1f3f5',
      paddingHorizontal: 8,
    },
    wide: true,
    maxFontSizeMultiplier: 4,
  },
];

// Font family names aren't portable across platforms, so pick the equivalent
// built-in for each — mirrors how RN's own <Text> docs demo fontFamily.
const FONT_FAMILIES = Platform.select({
  ios: [
    { label: 'System', fontFamily: undefined },
    { label: 'Georgia', fontFamily: 'Georgia' },
    { label: 'Menlo', fontFamily: 'Menlo' },
    { label: 'Courier', fontFamily: 'Courier' },
  ],
  default: [
    { label: 'System', fontFamily: undefined },
    { label: 'serif', fontFamily: 'serif' },
    { label: 'monospace', fontFamily: 'monospace' },
    { label: 'sans-serif-condensed', fontFamily: 'sans-serif-condensed' },
  ],
});
