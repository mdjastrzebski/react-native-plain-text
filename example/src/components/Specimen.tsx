import { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { PlainText, type PlainTextStyle } from 'react-native-plain-text';
import { useCompatOn } from './CompareText';
import { COLOR } from '../theme';

export function Cover({
  lockup,
  blurb,
}: {
  lockup?: { glyph: string; title: string };
  blurb: string;
}) {
  return (
    <View style={styles.cover}>
      {lockup != null && (
        <View style={styles.lockup}>
          <PlainText style={styles.coverGlyph}>{lockup.glyph}</PlainText>
          <PlainText style={styles.coverTitle}>{lockup.title}</PlainText>
        </View>
      )}
      <PlainText style={styles.coverBlurb}>{blurb}</PlainText>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchBarRow}>
      <View style={styles.searchField}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLOR.faint}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {Platform.OS === 'android' && value !== '' && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Text style={styles.searchClear}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function Section({
  title,
  footer,
  spacedRows,
  children,
}: {
  title: string;
  // Notes about the section's props: caveats, platform gaps, what to look at.
  footer?: string;
  // For sections whose children aren't TextItems (no run-off padding of their own
  // to space rows with), e.g. Performance screen's buttons/chips/props sheet.
  spacedRows?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, spacedRows === true && styles.spacedSection]}>
      <View style={styles.sectionHeaderRow}>
        <PlainText style={styles.sectionHeader}>{title.toUpperCase()}</PlainText>
        <View style={styles.sectionRule} />
      </View>
      {children}
      {footer != null && <PlainText style={styles.sectionFooter}>{footer}</PlainText>}
    </View>
  );
}

export function TextItem({
  label,
  style,
  containerStyle,
  showText,
  numberOfLines,
  ellipsizeMode,
  lineBreakStrategyIOS,
  textBreakStrategy,
  allowFontScaling,
  maxFontSizeMultiplier,
  accessibilityProps,
  children,
}: {
  // Caption above the specimen. Omitted by composite use-case rows, which have
  // no single value to show here.
  label?: string;
  // PlainTextStyle, not TextStyle: Font Variation Settings rows carry
  // fontVariationSettings, which RN's TextStyle has no key for.
  style?: StyleProp<PlainTextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  showText: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  lineBreakStrategyIOS?: 'none' | 'standard' | 'hangul-word' | 'push-out';
  textBreakStrategy?: 'simple' | 'highQuality' | 'balanced';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  // Forwarded to both PlainText and the comparison Text so both expose the same
  // accessibility surface.
  accessibilityProps?: AccessibilityProps & { testID?: string };
  children: string;
}) {
  const compatOn = useCompatOn();

  return (
    <View style={styles.rowContainer}>
      {label != null && <PlainText style={styles.rowLabel}>{label.toUpperCase()}</PlainText>}
      {/* Overlay's containing block; must not shrink-wrap or it inherits
          PlainText's measured width instead of measuring its own. */}
      <View style={styles.specimen}>
        <View style={[styles.row, containerStyle]}>
          <PlainText
            // `base` first (so a row's own fontSize/style overrides the default),
            // `compareText` last (so it overrides a demo row's own color/border,
            // same as the Text overlay does).
            style={[screenStyles.base, style, showText && styles.compareText]}
            numberOfLines={numberOfLines}
            ellipsizeMode={ellipsizeMode}
            lineBreakStrategyIOS={lineBreakStrategyIOS}
            textBreakStrategy={textBreakStrategy}
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            unstable_lineHeightClippingCompat={compatOn}
            {...accessibilityProps}
          >
            {children}
          </PlainText>
        </View>
        {showText && (
          <View style={styles.overlay}>
            <Text
              // Cast to TextStyle: RN silently drops fontVariationSettings here,
              // which is the gap the Font Variation Settings section demonstrates.
              style={[screenStyles.base, style as StyleProp<TextStyle>, styles.overlayText]}
              numberOfLines={numberOfLines}
              ellipsizeMode={ellipsizeMode}
              lineBreakStrategyIOS={lineBreakStrategyIOS}
              textBreakStrategy={textBreakStrategy}
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              {...accessibilityProps}
            >
              {children}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Same row/specimen/overlay furniture as TextItem, generalized for specimens
// that aren't a single PlainText/Text pair (e.g. several siblings): `children`/
// `overlay` carry the two trees directly since there's no one style to share.
export function CompareBox({
  label,
  containerStyle,
  showText,
  overlay,
  children,
}: {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  showText: boolean;
  overlay: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.rowContainer}>
      {label != null && <PlainText style={styles.rowLabel}>{label.toUpperCase()}</PlainText>}
      <View style={styles.specimen}>
        <View style={[styles.row, containerStyle]}>{children}</View>
        {showText && <View style={styles.overlay}>{overlay}</View>}
      </View>
    </View>
  );
}

// Bottom padding inside each specimen box, reserved for a taller-than-PlainText
// overlay to run off into (see `specimen`). Counts as part of the gap after a
// row, so anything above/below a specimen must add/subtract it to keep spacing
// consistent.
const RUN_OFF = 16;

export const screenStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLOR.paper,
  },
  container: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 18,
    // Subtracted because the section's last specimen already contributes RUN_OFF
    // of padding to this gap; the effective gap between sections is 40.
    gap: 40 - RUN_OFF,
  },
  // For demos whose PlainText has an explicit width: stretch to match instead
  // of shrink-wrapping.
  wideRow: {
    alignSelf: 'stretch',
  },
  base: {
    fontSize: 20,
    // On PlainText's own style, not the shared `row` container, so it matches
    // PlainText's measured box exactly (a wash on `row` could bleed past it).
    backgroundColor: COLOR.wash,
    // Reserved and invisible so the compare border (`compareText`/`overlayText`)
    // only recolors it instead of adding a border and shifting the box.
    borderWidth: 1,
    borderColor: 'transparent',
  },
});

// Shared by the "Aa" mark and the wordmark beside it, so both stay the same type.
// 48pt is also the ceiling: "PlainText" tracked at this size must stay on one
// line down to a 320pt-wide phone.
const LOCKUP_SIZE = 48;
const LOCKUP_WEIGHT = '200';
const LOCKUP_TRACKING = 2.0;

// Sized off LOCKUP_SIZE so the mark's box always has enough margin around the
// "Aa" to read as a box rather than a crop.
const LOCKUP_MARK = LOCKUP_SIZE + 28;

const styles = StyleSheet.create({
  cover: {
    gap: 12,
    // Cover doesn't end in a specimen, so it has no RUN_OFF padding of its own;
    // adds it back here to match the gap every other section gets.
    paddingBottom: 4 + RUN_OFF,
  },
  // Opaque: once this row sticks, it must fully hide scrolled-under content.
  searchBarRow: {
    backgroundColor: COLOR.paper,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.line,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.wash,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: COLOR.ink,
  },
  searchClear: {
    fontSize: 18,
    color: COLOR.faint,
    paddingHorizontal: 4,
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  coverGlyph: {
    width: LOCKUP_MARK,
    height: LOCKUP_MARK,
    fontSize: LOCKUP_SIZE,
    lineHeight: LOCKUP_MARK,
    fontWeight: LOCKUP_WEIGHT,
    // Half tracking: letterSpacing also lands after the last glyph, so the full
    // value pushed this centered two-letter string off-center in the square.
    letterSpacing: LOCKUP_TRACKING / 2,
    textAlign: 'center',
    color: COLOR.paper,
    backgroundColor: COLOR.inkSurface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coverTitle: {
    fontSize: LOCKUP_SIZE,
    lineHeight: LOCKUP_SIZE + 6,
    fontWeight: LOCKUP_WEIGHT,
    letterSpacing: LOCKUP_TRACKING,
    color: COLOR.ink,
  },
  coverBlurb: {
    width: '100%',
    fontSize: 15,
    lineHeight: 22,
    color: COLOR.muted,
  },
  // 0, deliberately: each TextItem child already brings its own RUN_OFF padding
  // as row-to-row spacing; a gap here would stack on top of that.
  section: {
    gap: 0,
  },
  // RUN_OFF, so non-specimen sections (buttons, chips) space rows the same as
  // specimen sections do via their own padding.
  spacedSection: {
    gap: RUN_OFF,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: COLOR.ink,
  },
  // Fills whatever the header label leaves, out to the margin.
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLOR.line,
  },
  sectionFooter: {
    width: '100%',
    fontSize: 11,
    lineHeight: 16,
    color: COLOR.faint,
    // Footer displaces the specimen that would otherwise end the section and
    // supply RUN_OFF to the next section's gap, so it adds that back here.
    marginBottom: RUN_OFF,
  },
  rowContainer: {
    alignSelf: 'stretch',
    // Tight: 4pt binds label to specimen, vs. 16pt (RUN_OFF) between rows.
    gap: 4,
  },
  rowLabel: {
    width: '100%',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.7,
    color: COLOR.faint,
    // Half the labels are numbers, and a column of them should line up.
    fontVariant: ['tabular-nums'],
  },
  specimen: {
    alignSelf: 'stretch',
    // Room for a taller overlay to run off into on white paper instead of
    // bleeding onto the next row's label; sized to a full line, not just a
    // rounding-error amount, so a mismatch reads clearly while scrolling.
    paddingBottom: RUN_OFF,
  },
  row: {
    // No background here: lives on the text itself (see `screenStyles.base`).
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  // Pinned to all 3 edges so Text is offered the same width PlainText was
  // measured against, while `alignItems: flex-start` keeps it shrink-wrapped
  // rather than stretched — that combination is what exposes the overlay's own
  // measured width as the comparison. No `bottom`/`height`, so it can measure
  // taller than PlainText (that's the other half of the comparison; `specimen`'s
  // padding gives it room). `multiply` (not opacity) so an aligned pair lands on
  // near-black rather than just tinting toward whichever layer is on top.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    pointerEvents: 'none',
    mixBlendMode: 'multiply',
  },
  overlayText: {
    // Matches `row`'s own wash (not a scarlet tint), so an aligned box
    // multiplies to neutral grey and only a size mismatch shows as a color edge.
    backgroundColor: COLOR.wash,
    color: COLOR.scarlet,
    // Overrides a demo row's own borderColor too, so it's part of the
    // comparison against `compareText`'s cobalt border.
    borderColor: COLOR.scarlet,
  },
  // Applied to PlainText while the overlay is showing. Full opacity: `overlay`'s
  // multiply needs saturated cobalt to land on near-black, not a tint.
  // backgroundColor matches `row`'s wash so rows with their own background
  // (badge/card use cases) still land on the same neutral.
  compareText: {
    color: COLOR.cobalt,
    backgroundColor: COLOR.wash,
    borderColor: COLOR.cobalt,
  },
});
