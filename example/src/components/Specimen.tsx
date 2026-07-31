import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { PlainText, type PlainTextStyle } from 'react-native-plain-text';
import { COLOR } from '../theme';

// The specimen-book furniture both screens are set in: the title page, the
// section headings and the row that puts one PlainText against the RN <Text>
// overlay. Nothing here decides what to demonstrate — the screens do that.

// Sets the register before the first section: optionally the largest glyphs on
// the screen and the page's name, then one line on what the page holds.
//
// `lockup` is a pair rather than two props because the two halves are one mark
// (see the styles at the bottom), and it is optional because it is worth its
// space only on a page it says something about: the glyph is a specimen of the
// type itself, which is the Features screen's subject rather than any other's,
// and the title is the library's name set as a wordmark, so it belongs on that
// same page and nowhere the nav bar already names.
export function Cover({
  lockup,
  blurb,
}: {
  lockup?: { glyph: string; title: string };
  blurb: string;
}) {
  return (
    <View style={styles.cover}>
      {/* The two of them set side by side: a specimen book's "Aa" and the name of
          the type it is showing belong together, and stacked they read as a
          heading with a caption under it instead. */}
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

export function Section({
  title,
  footer,
  spacedRows,
  children,
}: {
  title: string;
  // Notes about the section's props — caveats, platform gaps, what to look at.
  footer?: string;
  // For sections whose children are not TextItems: the row separation lives in
  // each specimen's run-off padding (see `section` below), so anything else — the
  // Performance screen's buttons, chip rows and props sheet — has nothing to sit
  // apart on and needs the gap back here.
  spacedRows?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, spacedRows === true && styles.spacedSection]}>
      {/* Tracked caps with a rule running out to the margin. Caps rather than a
          large sentence-case heading: the rows underneath are the type on this
          page, and a 22pt heading competed with them for the same weight class,
          where caps read as furniture at any size. */}
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
  allowFontScaling,
  maxFontSizeMultiplier,
  accessibilityProps,
  children,
}: {
  // The value this row varies, set in a caption above the specimen. Keeping it
  // out of the specimen is what lets the specimen be real text rather than a
  // description of itself. Above rather than beside, because a gutter would cost
  // every row the same 80-odd points of width, which a phone does not have to
  // spare and which the wrapping and measured-width sections need most.
  //
  // Omitted by the composite use-case rows: those are whole UI shapes rather than
  // one value, and have nothing to put here.
  label?: string;
  // PlainTextStyle, not TextStyle: the Font Variation Settings rows carry
  // fontVariationSettings, which RN has no style key for. The overlay below casts
  // it away again.
  style?: StyleProp<PlainTextStyle>;
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
    <View style={styles.rowContainer}>
      {label != null && <PlainText style={styles.rowLabel}>{label.toUpperCase()}</PlainText>}
      {/* Full width, and the overlay's containing block. The grey row inside
          shrink-wraps to PlainText; the overlay must NOT, or it would be handed
          PlainText's width as its own constraint and could only ever wrap where
          the real difference is that RN wanted a wider box. */}
      <View style={styles.specimen}>
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
          // the brass box edge comparable to the grey one.
          <View style={styles.overlay}>
            <Text
              // Cast back to what RN accepts. A fontVariationSettings in there is
              // dropped, which is the gap the Font Variation Settings section
              // exists to show.
              style={[style as StyleProp<TextStyle>, styles.overlayText]}
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
    </View>
  );
}

// White paper kept under every specimen for a taller-than-PlainText overlay to run
// off into (see `specimen`). It is inside the specimen box, so it counts as part of
// whatever gap follows a row — which means everything that sits below a specimen has
// to subtract it, and everything that sits above one has to add it, or the page
// spaces itself differently depending on which side of a row you are on.
const RUN_OFF = 16;

// The page itself: the scroll view both screens use, and the one row modifier
// they both hand to TextItem.
export const screenStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLOR.paper,
  },
  container: {
    flexGrow: 1,
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 18,
    // Sections need to read as separate sheets of a specimen book, so the gap
    // between them is deliberately much larger than the gap between rows.
    //
    // Written as a subtraction because a section ends in a specimen, whose run-off
    // padding lands in this gap and pushed it to a visibly loose 56. What one
    // section's last row and the next section's heading actually sit apart is the
    // 40 on the left.
    gap: 40 - RUN_OFF,
  },
  // Used for demos whose PlainText itself has an explicit width: the row
  // should stretch to match instead of shrink-wrapping.
  wideRow: {
    alignSelf: 'stretch',
  },
});

// The cover lockup's one type size, weight and tracking: the "Aa" in the mark and
// the wordmark beside it are the same type, and they have to stay that way.
//
// No `fontFamily`, so both take the system face — the same one every specimen on
// every screen is set in. A serif wordmark read as a claim about typography, and
// this library's claim is the opposite one: it draws with the platform's own text
// widget, in the platform's own face, one style per node. The mark should say that
// rather than borrow a face the library never uses (and which is a different face
// on each platform anyway).
//
// Light and opened up rather than heavy and tight, which is the other half of what
// the mark has to say. A display weight reads as loud, and nothing about this
// library is loud: it is the lighter of the two components, doing less per node.
// Light type has to be big to carry a page: the thinner the stroke, the more size
// it needs before it reads as deliberate rather than faint, and the mark is the
// one thing on the screen allowed to be this large. The positive tracking is what
// keeps it precise at that size instead of merely wide.
//
// 48pt is also about the ceiling: "PlainText" tracked and set beside the mark has
// to stay on one line down to a 320pt-wide phone.
const LOCKUP_SIZE = 48;
const LOCKUP_WEIGHT = '200';
const LOCKUP_TRACKING = 2.0;

// The mark's rounded square, sized off the type in it so the two can't drift
// apart: enough room around a 48pt "Aa" to read as a box rather than a crop.
const LOCKUP_MARK = LOCKUP_SIZE + 28;

const styles = StyleSheet.create({
  cover: {
    gap: 12,
    // The cover is the one block that ends in something other than a specimen, so
    // it has no run-off padding of its own to fill the shortened section gap with
    // and has to bring it. Without this the first heading rides 16 closer to the
    // blurb than every other heading does to what precedes it.
    paddingBottom: 4 + RUN_OFF,
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // The glyph as a mark: reversed out of the ink surface in a rounded square,
  // sized by width/height/lineHeight the way the avatar row on the Use Cases page
  // is.
  coverGlyph: {
    width: LOCKUP_MARK,
    height: LOCKUP_MARK,
    fontSize: LOCKUP_SIZE,
    lineHeight: LOCKUP_MARK,
    fontWeight: LOCKUP_WEIGHT,
    // Half the wordmark's tracking: `letterSpacing` also lands after the last
    // glyph, and the full value pushed a centered two-letter string visibly off
    // center inside the square.
    letterSpacing: LOCKUP_TRACKING / 2,
    textAlign: 'center',
    color: COLOR.paper,
    backgroundColor: COLOR.inkSurface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // A wordmark rather than the tracked caps label this used to be: with the nav
  // bar down to "Features", the cover is where the library is named, and a 12pt
  // label read as a caption on the mark beside it.
  coverTitle: {
    // The same face, size and weight as the "Aa" in the mark, so the lockup is one
    // line of type with a box drawn around its first two letters rather than a
    // heading beside a logo.
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
  // Nothing, deliberately. `specimen` already holds the row-to-row space as its
  // run-off padding, and every child of a Section is a TextItem, so every one of
  // them brings its own; a gap here stacks on top of that instead of replacing it,
  // and 16 of run-off plus a 4pt gap read as 20 points of nothing between a row and
  // the next row's caption.
  //
  // So the run-off band and the row separation are one and the same 16 points. That
  // is the floor: the band cannot be tightened further without a whole extra line of
  // overlay ending up somewhere other than white paper. The header and footer, which
  // have no specimen padding facing them, take theirs back below.
  section: {
    gap: 0,
  },
  // The same 16 a specimen's run-off band comes to, so a section of buttons and a
  // section of specimens separate their rows by the same amount.
  spacedSection: {
    gap: RUN_OFF,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // The whole of the heading's distance from the first specimen, now that the
    // section gap is 0 — and the same 14 it has always been.
    marginBottom: 14,
  },
  // Caps and a rule still, but at full ink and half again the row labels' size:
  // at 11pt muted it sat in the same weight class as the captions above each
  // specimen, and a reader scrolling past could not find where a section began.
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
    // Marginalia on the section rather than another row of it, so it wants air above
    // — and the last specimen's run-off padding is already 16 of it, against the 14
    // the rows used to get. Nothing to add above.
    //
    // Below is the same problem the cover has: a footer displaces the specimen that
    // would otherwise have ended the section, so it owes the next section the
    // run-off the gap is short.
    marginBottom: RUN_OFF,
  },
  rowContainer: {
    alignSelf: 'stretch',
    // Tight: 4pt binds the label to the specimen below it, against the 16pt of
    // run-off padding that separates one row from the next.
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
    // Run-off room for the overlay, and where the section's row gap went. Only the
    // grey row is in flow here, so this box's height is PlainText's height and
    // nothing else: an overlay that measures taller has to go somewhere, and
    // without this it goes onto the next row's label, which reads as a glitch
    // rather than as the disagreement it is. The overlay is not *clipped* either
    // way — it has no `bottom` or `height`, so it takes its own measured height —
    // but a height difference is only legible if it lands on white paper.
    //
    // A full line of the page's body size rather than the few points a rounding
    // difference needs. The point is to catch a disagreement while scrolling past,
    // and at 8 a whole extra line of overlay ran out of white before it was obviously
    // there — it has to be a band, not a lip. More than the 14 the rows used to sit
    // apart, so the sections are a little longer than they were; a comparison you
    // can read while scrolling is worth 6 points a row.
    paddingBottom: RUN_OFF,
  },
  row: {
    // Sized to the PlainText. The overlay shares this box's top-left origin but
    // not its width — see the specimen view in TextItem.
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    // As light as it can go and still hold an edge against the white page: that
    // edge is the measured width, so it has to stay findable, but the type in
    // front of it is what the screen is for. Anything above ~#f4 stops reading as
    // a box on a phone in daylight.
    backgroundColor: COLOR.wash,
  },
  // Pinned to all three edges so the Text is *offered* the container's full
  // width — the same width PlainText was measured against — while
  // `alignItems: flex-start` keeps the Text itself a shrink-wrapping child of
  // this box rather than stretched to it. That combination is what makes the brass
  // edge the overlay's own measured width instead of the container's, which is
  // the whole comparison. A demo whose style sets an explicit width (the align
  // and multiline rows) still gets it from `style`, applied before this.
  //
  // No `bottom` and no `height`, deliberately: height is the other half of the
  // comparison, so the Text has to be free to measure taller than the PlainText
  // under it and show it. `specimen`'s bottom padding is where that goes.
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
    // Transparent so the PlainText underneath stays visible for comparison. Brass at
    // the same alpha the red fill used, since the point of the fill is the box edge,
    // not the tint.
    backgroundColor: '#84752620',
    color: COLOR.brass,
  },
});
