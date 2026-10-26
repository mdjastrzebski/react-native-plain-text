import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR, MONO, SERIF } from '../theme';

// Fixed, hand-written rows (never generated or shuffled), so runs are
// byte-identical and screenshots diff cleanly.
//
// Arbitrary 3-5 prop stacks catching interactions the realistic rows avoid;
// only shapes a real app could hit by accident belong here. Each row probes
// something no other row does — see its own comment for what.
//
// Color: neutral ramp by default. Indigo marks a surface added to show a
// box's extent (leading, padding, radius); oxblood marks a box that's wrong
// on purpose (overflow, clipped glyphs, undersized radius).
export function RandomCombinationsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Random Combinations">
      {/* tracked-serif-right */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 21,
          fontFamily: SERIF,
          fontWeight: '300',
          letterSpacing: -1.2,
          textAlign: 'right',
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Negative tracking on a thin serif face, right-aligned in a wide box.
      </TextItem>
      {/* dashed-clamped-middle */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 15,
          textAlign: 'center',
          padding: 14,
          borderWidth: 2,
          borderColor: COLOR.faint,
          borderStyle: 'dashed',
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        Dashed border, generous padding, centered, clamped to one line and truncated in the middle.
      </TextItem>
      {/* leading-far-over-size */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 13,
          lineHeight: 44,
          textDecorationLine: 'underline',
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
        }}
        containerStyle={screenStyles.wideRow}
      >
        lineHeight 44 under a 13pt font, underlined, on a background so the leading is visible.
      </TextItem>
      {/* valign-bottom-justified */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 90,
          fontSize: 15,
          fontStyle: 'italic',
          textAlign: 'justify',
          verticalAlign: 'bottom',
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
        }}
        containerStyle={screenStyles.wideRow}
      >
        verticalAlign bottom in a 90pt box, italic, justified
      </TextItem>
      {/* valign-middle-asym-padding */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 80,
          fontSize: 17,
          fontWeight: '100',
          verticalAlign: 'middle',
          paddingLeft: 24,
          paddingRight: 4,
          borderLeftWidth: 6,
          borderLeftColor: COLOR.faint,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        verticalAlign middle, 6pt left border, asymmetric padding, weight 100
      </TextItem>
      {/* break-then-clamped-run */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 14,
          lineHeight: 21,
          padding: 10,
          borderWidth: 3,
          borderColor: COLOR.faint,
          borderRadius: 8,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={3}
      >
        {'Hard break then a long run:\nborder + padding + three-line clamp on a ' +
          'wrapping string that has to spill past the limit.'}
      </TextItem>
      {/* reversed-head-truncated */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 15,
          color: COLOR.paper,
          backgroundColor: COLOR.inkSurface,
          letterSpacing: 2,
          textAlign: 'center',
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="head"
        allowFontScaling={false}
      >
        Reversed out, 2pt tracking, centered, no font scaling, one line, head-truncated when it
        overflows.
      </TextItem>
      {/* clamp-cuts-hard-breaks */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 14,
          fontFamily: MONO,
          textAlign: 'center',
          lineHeight: 26,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {'A\nBB\nCCC (three hard-broken lines under a two-line clamp, monospace, centered)'}
      </TextItem>
      {/* intrinsic-padded-pill */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 16,
          fontFamily: SERIF,
          fontStyle: 'italic',
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
        }}
      >
        No width set: intrinsic sizing with padding, border radius and italic serif.
      </TextItem>
      {/* valign-top-bordered */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 100,
          fontSize: 16,
          fontWeight: '700',
          textDecorationLine: 'underline',
          verticalAlign: 'top',
          padding: 18,
          borderWidth: 4,
          borderColor: COLOR.faint,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        verticalAlign top in a 100pt box with a 4pt border and 18pt padding, weight 700, underlined.
      </TextItem>
      {/* justified-mono */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 13,
          fontFamily: MONO,
          textAlign: 'justify',
          letterSpacing: -0.5,
          lineHeight: 24,
          paddingBottom: 10,
          borderBottomWidth: 2,
          borderBottomColor: COLOR.faint,
          borderStyle: 'dashed',
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
        allowFontScaling={false}
      >
        Justified monospace with a dashed bottom border, negative tracking and no scaling at all.
      </TextItem>
      {/* everything-at-once */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 17,
          fontFamily: SERIF,
          fontWeight: 'bold',
          fontStyle: 'italic',
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
          textAlign: 'center',
          textDecorationLine: 'underline',
          letterSpacing: 0.8,
          lineHeight: 26,
          padding: 12,
          borderWidth: 2,
          borderColor: COLOR.indigo,
          borderRadius: 10,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={3}
        maxFontSizeMultiplier={1.4}
      >
        Everything at once: serif bold italic, underlined, centered, tracked, bordered, padded,
        capped at 1.4x and clamped to three lines on a string long enough to actually hit that
        clamp.
      </TextItem>
      {/* per-corner-radii */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 15,
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
          padding: 14,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 24,
          borderBottomLeftRadius: 0,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Per-corner radii on a padded background: 24 top-left, 0 top-right, 24 bottom-right, 0
        bottom-left.
      </TextItem>
      {/* four-edge-borders: neutral ramp, not four hues — the widths are the
        point, color would just be a swatch test. */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 14,
          lineHeight: 22,
          paddingTop: 4,
          paddingRight: 20,
          paddingBottom: 16,
          paddingLeft: 8,
          borderTopWidth: 1,
          borderTopColor: COLOR.ink,
          borderRightWidth: 5,
          borderRightColor: COLOR.muted,
          borderBottomWidth: 3,
          borderBottomColor: COLOR.faint,
          borderLeftWidth: 8,
          borderLeftColor: COLOR.line,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Four borders, four different widths and tones, with matching asymmetric padding.
      </TextItem>
      {/* zero-width-space */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 15, lineHeight: 22, color: COLOR.inkSoft }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        Zero-width space test​between​words with a two-line clamp and tail ellipsis on a long enough
        string to reach it.
      </TextItem>
      {/* overlong-words-wrapped */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 16,
          fontFamily: MONO,
          padding: 8,
          color: COLOR.inkSoft,
          backgroundColor: COLOR.wash,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Supercalifragilisticexpialidocious-antidisestablishmentarianism-pneumonoultramicroscopicsilicovolcanoconiosis
      </TextItem>
      {/* unbreakable-word-truncated */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 14, letterSpacing: 0.5, color: COLOR.ink }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        One unbreakable word, one line, middle-truncated:
        Donaudampfschiffahrtselektrizitaetenhauptbetriebswerkbauunterbeamtengesellschaft
      </TextItem>
      {/* mixed-scripts */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 17, lineHeight: 28, color: COLOR.ink }}
        containerStyle={screenStyles.wideRow}
      >
        Mixed scripts in one run: English · Ελληνικά · Кириллица · العربية · 日本語 · 한국어 · עברית
      </TextItem>
      {/* emoji-clusters */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 28, letterSpacing: 3, lineHeight: 40, color: COLOR.ink }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        Emoji at 28pt with tracking: 🎯 ✨ 🚀 👩‍👩‍👧‍👦 🇵🇱 🏳️‍🌈 (clamped to one line)
      </TextItem>
      {/* rtl-arabic */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 18,
          textAlign: 'right',
          padding: 12,
          borderWidth: 1,
          borderColor: COLOR.faint,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        ثم نص عربي طويل بمحاذاة يمينية داخل صندوق عريض مع حشوة وحدود.
      </TextItem>
      {/* combining-diacritics */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 20,
          lineHeight: 14,
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Combining diacritics stacked: éééé àààà ñññ ẛ̣ ǫ̈, with a tight 14pt line height under 20pt
        glyphs.
      </TextItem>
      {/* edge-whitespace */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 16,
          fontFamily: MONO,
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
          borderWidth: 1,
          borderColor: COLOR.indigo,
        }}
      >
        {'   Leading and trailing whitespace   '}
      </TextItem>
      {/* leading-newlines */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 14,
          lineHeight: 20,
          padding: 8,
          borderWidth: 2,
          borderColor: COLOR.faint,
          borderRadius: 6,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        {'\n\nThree leading newlines before any glyph, inside a bordered box.'}
      </TextItem>
      {/* tab-separated */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 13,
          fontFamily: MONO,
          letterSpacing: 1,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {'Tab\tseparated\tcolumns\tin\tmonospace under a one-line clip.'}
      </TextItem>
      {/* single-glyph */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 12,
          color: COLOR.ink,
          backgroundColor: COLOR.wash,
          textAlign: 'center',
          padding: 2,
          borderRadius: 999,
        }}
      >
        ·
      </TextItem>
      {/* display-clipped */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 72,
          fontWeight: '800',
          letterSpacing: -4,
          color: COLOR.ink,
          lineHeight: 68,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        72pt uppercase with -4 tracking, clipped
      </TextItem>
      {/* glyphs-taller-than-box */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 40,
          fontSize: 26,
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
          verticalAlign: 'middle',
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
      >
        Fixed 40pt box holding 26pt text: the glyphs are taller than the line box allows.
      </TextItem>
      {/* padding-taller-than-box: realistic version of a fixed-height row
        whose padding token outgrows it. */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 36,
          fontSize: 14,
          paddingVertical: 20,
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
          borderWidth: 1,
          borderColor: COLOR.oxblood,
        }}
        containerStyle={screenStyles.wideRow}
      >
        A 36pt fixed row with the 20pt padding token on both edges: the padding alone is taller than
        the box.
      </TextItem>
      {/* radius-past-half-height */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 30,
          fontSize: 13,
          textAlign: 'center',
          verticalAlign: 'middle',
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
          borderWidth: 2,
          borderColor: COLOR.oxblood,
          borderRadius: 40,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
      >
        Border radius 40 on a box only 30pt tall: the radius is larger than half the height.
      </TextItem>
      {/* rgba-on-rgba: palette's ink/indigo with alpha — only the
        transparency is new here. */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 16,
          color: 'rgba(17, 24, 28, 0.45)',
          backgroundColor: 'rgba(47, 85, 192, 0.13)',
          padding: 12,
          borderWidth: 3,
          borderColor: 'rgba(47, 85, 192, 0.5)',
        }}
        containerStyle={screenStyles.wideRow}
      >
        Semi-transparent color over a semi-transparent background, both rgba, with a 3pt rgba
        border.
      </TextItem>
      {/* unlimited-lines-narrow-box */}
      <TextItem
        showText={showText}
        style={{
          width: 180,
          fontSize: 14,
          fontFamily: SERIF,
          lineHeight: 20,
          padding: 8,
          borderWidth: 2,
          borderColor: COLOR.faint,
          borderStyle: 'dashed',
          color: COLOR.ink,
        }}
        numberOfLines={0}
      >
        numberOfLines 0 means unlimited: this string wraps as far as it needs to inside a narrow
        padded box with a dashed border and a serif face.
      </TextItem>
      {/* scaling-capped-at-1x */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 18,
          fontWeight: '600',
          color: COLOR.indigo,
          backgroundColor: COLOR.indigoWash,
          padding: 10,
        }}
        containerStyle={screenStyles.wideRow}
        maxFontSizeMultiplier={1}
      >
        Scaling capped at exactly 1.0, so this row must not grow at any accessibility text size.
      </TextItem>
      {/* scaling-outgrows-box */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          height: 60,
          fontSize: 15,
          verticalAlign: 'top',
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
          paddingHorizontal: 8,
        }}
        containerStyle={screenStyles.wideRow}
        maxFontSizeMultiplier={4}
      >
        Scaling uncapped at 4x with a fixed 60pt height: the text is allowed to outgrow its own box.
      </TextItem>
    </Section>
  );
}
