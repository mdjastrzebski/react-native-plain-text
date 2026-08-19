import { Platform, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlainText, type PlainTextStyle } from 'react-native-plain-text';
import { useCompareText } from '../components/CompareText';
import { CompareBox, Cover, Section, TextItem, screenStyles } from '../components/Specimen';
import { COLOR, VARIABLE } from '../theme';

type Props = NativeStackScreenProps<ParamListBase>;

// One prop per section, one value per row. Rows that stack several props at once
// live on the Use Cases screen.
export default function FeaturesScreen({ navigation }: Props) {
  const showText = useCompareText(navigation);

  return (
    <ScrollView style={screenStyles.scroll} contentContainerStyle={screenStyles.container}>
      <Cover
        lockup={{ glyph: 'Aa', title: 'PlainText' }}
        blurb="A faster, lower-memory React Native <Text> alternative for simple, single-style text."
      />
      <Section title="Font Size">
        {FONT_SIZES.map((fontSize) => (
          <TextItem
            key={fontSize}
            label={`${fontSize}pt`}
            showText={showText}
            style={{ fontSize }}
            // A waterfall: one line per size, clipped at the column edge rather
            // than wrapped, so the sizes stay comparable down the column.
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {SPECIMEN}
          </TextItem>
        ))}
      </Section>
      {/* Emoji glyphs sit outside every text font's own glyph table, so drawing
          one forces color-emoji fallback regardless of fontFamily. Nothing
          here to tune, just a line to check nothing drops the glyph or clips
          its line height. */}
      <Section title="Emoji">
        <TextItem label="mixed" showText={showText}>
          {EMOJI_SPECIMEN}
        </TextItem>
      </Section>
      <Section title="Font Family" footer={FONT_FAMILY_RESOLUTION_FOOTER}>
        {FONT_FAMILY_RESOLUTION.map(({ label, style }) => (
          <TextItem key={label} label={label} showText={showText} style={style}>
            {style.fontFamily}
          </TextItem>
        ))}
      </Section>
      <Section title="Color">
        {COLORS.map(({ label, color }) => (
          <TextItem
            key={label}
            label={label}
            showText={showText}
            style={{ fontSize: SHORT_ROW_SIZE, color }}
          >
            {SPECIMEN}
          </TextItem>
        ))}
        <TextItem
          label="inverse"
          showText={showText}
          style={{
            fontSize: SHORT_ROW_SIZE,
            color: COLOR.paper,
            backgroundColor: COLOR.inkSurface,
          }}
        >
          {SPECIMEN}
        </TextItem>
      </Section>
      <Section title="Font Weight">
        {FONT_WEIGHTS.map((fontWeight) => (
          <TextItem
            key={fontWeight}
            label={fontWeight}
            showText={showText}
            style={{ fontSize: SHORT_ROW_SIZE, fontWeight }}
          >
            {SPECIMEN}
          </TextItem>
        ))}
      </Section>
      <Section title="Font Style">
        <TextItem
          label="italic"
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, fontStyle: 'italic' }}
        >
          {SPECIMEN}
        </TextItem>
        <TextItem
          label="bold italic"
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, fontWeight: 'bold', fontStyle: 'italic' }}
        >
          {SPECIMEN}
        </TextItem>
      </Section>
      <Section title="Text Align">
        {TEXT_ALIGNS.map((textAlign) => (
          <TextItem
            key={textAlign}
            label={textAlign}
            showText={showText}
            style={[styles.body, { textAlign }]}
            containerStyle={screenStyles.wideRow}
          >
            {/* Justify only shows itself on text long enough to stretch more
                than one line to the full measure. */}
            {textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}
          </TextItem>
        ))}
      </Section>
      {/* Three sizes, nothing else: no color, background or padding to explain
          away a misalignment as some other prop's doing. `alignItems: "baseline"`
          on the row asks each sibling where its own text baseline sits instead
          of lining them up on the row's cross-axis edges, and PlainText only
          has an answer for that because it registers a Yoga baseline function
          (`BaselineYogaNode`, both shadow nodes) instead of leaving Yoga to
          fall back to each node's bottom edge.

          The three glyphs are chosen for what they do at the baseline, not
          for being a word: "H" is flat-bottomed and sits exactly on it, "g"
          has a bowl that also sits on it but a tail that drops below, and "x"
          is an x-height letter with nothing above or below the line at all.
          A ruler makes that line itself visible rather than asking the eye to
          find it: a plain `View`, not a `PlainText`, so it has no baseline
          function of its own. Yoga's fallback for that
          (`calculateBaseline` in yoga/algorithm/Baseline.cpp) is to report a
          childless node's own height as its baseline, which means a hairline
          view's *bottom edge* is what the baseline layout lines up here, for
          free, on every child that opts out of having a real one. "H" and
          "x" should look planted on it, and only "g"'s tail should cross it.

          The overlay is the same three glyphs as real RN `<Text>`s in the
          same row, since RN's `<Text>` has always gotten this right and is
          exactly what PlainText now has to match. It carries no ruler of its
          own: the ruler is a fixed reference for the eye, not part of the
          PlainText/RN comparison. Realistic shapes built on top of this (a
          price beside its VAT note, a heading beside its badge) live on the
          Use Cases screen. */}
      <Section title="Baseline alignment">
        <CompareBox
          label="H / g / x, ruled at the baseline"
          showText={showText}
          containerStyle={styles.baselineRow}
          overlay={
            <View style={styles.baselineRow}>
              {BASELINE_ALIGNMENT_GLYPHS.map(({ text, fontSize }, index) => (
                <Text
                  key={text}
                  style={[{ fontSize, marginLeft: index === 0 ? 0 : 10 }, styles.overlayInline]}
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
                { fontSize, marginLeft: index === 0 ? 0 : 10 },
                showText && styles.compareTextInline,
              ]}
            >
              {text}
            </PlainText>
          ))}
          <View style={styles.baselineRuler} />
        </CompareBox>
      </Section>
      <Section title="Multiline">
        <TextItem
          label="wrap"
          showText={showText}
          style={styles.body}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH_LONG}
        </TextItem>
      </Section>
      <Section title="Number of Lines">
        {[1, 2, 3].map((numberOfLines) => (
          <TextItem
            key={numberOfLines}
            label={`${numberOfLines} line${numberOfLines === 1 ? '' : 's'}`}
            showText={showText}
            numberOfLines={numberOfLines}
            style={styles.body}
            containerStyle={screenStyles.wideRow}
          >
            {PARAGRAPH_LONG}
          </TextItem>
        ))}
      </Section>
      {/* padding isn't a text-style prop: it stays in the style handed to the
          native view, so Yoga lays it out around the self-measured text. What to
          look at is the grey box growing while the glyphs move down with it: a
          box that grew but glyphs that stayed put means the space was reserved
          and nothing insetted the text. */}
      <Section title="Padding">
        <TextItem
          label="none"
          showText={showText}
          style={styles.body}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        <TextItem
          label="vertical 16"
          showText={showText}
          style={[styles.body, { paddingVertical: 16 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        <TextItem
          label="top 28 bottom 4"
          showText={showText}
          style={[styles.body, { paddingTop: 28, paddingBottom: 4 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        {/* On a wrapping string: padding shrinks the width left for text, so
            this is where a padding-blind measure pass shows up as a clipped or
            overflowing last line. */}
        <TextItem
          label="all 20, wrapped"
          showText={showText}
          style={[styles.body, { padding: 20 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH_LONG}
        </TextItem>
      </Section>
      {/* Borders are view styles too, and border width joins padding in the
          contentInsets Yoga reserves, so the same two questions apply: is the
          border drawn at all, and is the text inset by it. The last row pairs
          both so the insets have to add up.

          One color for the whole section, set once in `bordered`: nothing here is
          testing borderColor (the Colors section does that), so a row that changed
          hue as well as geometry only made the column harder to read down. Each row
          carries widths, a radius or a style and nothing else. */}
      <Section title="Borders">
        <TextItem
          label="all 2"
          showText={showText}
          style={[styles.body, styles.bordered, { borderWidth: 2 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        <TextItem
          label="radius 12"
          showText={showText}
          style={[styles.body, styles.bordered, { borderWidth: 2, borderRadius: 12 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        {/* Per-side, the accent-bar shape: only the left edge is inset. The color
            comes from `bordered`, so the side widths are the only difference. */}
        <TextItem
          label="left 6"
          showText={showText}
          style={[styles.body, styles.bordered, { borderLeftWidth: 6 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        <TextItem
          label="dashed"
          showText={showText}
          style={[styles.body, styles.bordered, { borderWidth: 2, borderStyle: 'dashed' }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
        <TextItem
          label="all 4 + padding 12"
          showText={showText}
          style={[styles.body, styles.bordered, { borderWidth: 4, padding: 12 }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH_LONG}
        </TextItem>
      </Section>
      <Section title="Line Height">
        {LINE_HEIGHTS.map((lineHeight) => (
          <TextItem
            key={lineHeight}
            label={`${lineHeight} / 18`}
            showText={showText}
            style={{ fontSize: 18, lineHeight }}
            containerStyle={screenStyles.wideRow}
          >
            {PARAGRAPH_LONG}
          </TextItem>
        ))}
      </Section>
      {/* Repro for RN issue #29507: tight lineHeight clipped by the row's box, across a few font families. */}
      <Section
        title="Line Height Clipping"
        footer="RN Text has broken line height clipping on iOS. See RN issue #29507."
      >
        {REALWORLD_FONTS.map((font, index) => {
          const fontSize = REALWORLD_FONT_SIZES[index]!;
          const lineHeight = Math.round(fontSize * 0.8);
          return (
            <TextItem
              key={font.label}
              label={`${lineHeight} / ${fontSize}`}
              showText={showText}
              style={[font.style, { fontSize, lineHeight }]}
              containerStyle={[screenStyles.wideRow, styles.clippingRow]}
            >
              {font.label}
            </TextItem>
          );
        })}
      </Section>
      <Section title="Letter Spacing">
        {LETTER_SPACINGS.map((letterSpacing) => (
          <TextItem
            key={letterSpacing}
            label={`${letterSpacing > 0 ? '+' : ''}${letterSpacing}`}
            showText={showText}
            style={{ fontSize: SHORT_ROW_SIZE, letterSpacing }}
          >
            {SPECIMEN}
          </TextItem>
        ))}
      </Section>
      <Section title="Ellipsize Mode">
        {ELLIPSIZE_MODES.map((ellipsizeMode) => (
          <TextItem
            key={ellipsizeMode}
            label={ellipsizeMode}
            showText={showText}
            numberOfLines={1}
            ellipsizeMode={ellipsizeMode}
            style={styles.body}
            containerStyle={screenStyles.wideRow}
          >
            {PARAGRAPH_LONG}
          </TextItem>
        ))}
      </Section>
      <Section title="Text Decoration Line">
        {TEXT_DECORATION_LINES.map((textDecorationLine) => (
          <TextItem
            key={textDecorationLine}
            label={textDecorationLine}
            showText={showText}
            style={{ fontSize: SHORT_ROW_SIZE, textDecorationLine }}
          >
            {SPECIMEN}
          </TextItem>
        ))}
      </Section>
      <Section title="Text Transform" footer={TEXT_TRANSFORM_FOOTER}>
        {TEXT_TRANSFORMS.map((textTransform) => (
          <TextItem
            key={textTransform}
            label={textTransform}
            showText={showText}
            style={{ fontSize: SHORT_ROW_SIZE, textTransform }}
          >
            {TEXT_TRANSFORM_SPECIMEN}
          </TextItem>
        ))}
        {/* capitalize's two gotchas: a digit-led word and a contraction. */}
        <TextItem
          label="capitalize, digit-led word"
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, textTransform: 'capitalize' }}
        >
          {TEXT_TRANSFORM_ORDINAL_SPECIMEN}
        </TextItem>
        <TextItem
          label="capitalize, contraction"
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, textTransform: 'capitalize' }}
        >
          {TEXT_TRANSFORM_CONTRACTION_SPECIMEN}
        </TextItem>
      </Section>
      {/* Font scaling follows the OS accessibility text-size setting (Dynamic
          Type on iOS, Font size on Android). FONT_SCALING_FOOTER names the path
          for whichever platform is running. */}
      <Section title="Font Scaling" footer={FONT_SCALING_FOOTER}>
        <TextItem label="default" showText={showText} style={{ fontSize: SHORT_ROW_SIZE }}>
          {SPECIMEN}
        </TextItem>
        <TextItem
          label="disabled"
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE }}
          allowFontScaling={false}
        >
          {SPECIMEN}
        </TextItem>
        <TextItem
          label="max 1.5x"
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE }}
          maxFontSizeMultiplier={1.5}
        >
          {SPECIMEN}
        </TextItem>
      </Section>
      {/* fontVariant turns OpenType features on, so a row only changes if the
          font actually carries the feature, which is why iOS runs these rows in
          a serif rather than SF, from the second baseline row down. See
          FONT_VARIANT_FEATURE_FAMILY. The figure-spacing rows above it stay on the
          system font, which handles tabular/proportional correctly. A row that
          looks like its baseline is usually a missing feature, not a broken
          prop.

          The scarlet <Text> overlay is the less capable of the two here, for two
          reasons in RN core. Its New Architecture props layer has no room for the
          ligature and contextual values at all (the C++ FontVariant bitmask
          covers only small-caps, the figure styles and ss01-ss20), so those rows
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
        <TextItem label="default" showText={showText} style={fontVariantRow}>
          {FONT_VARIANT_SPECIMEN}
        </TextItem>
        {/* Figure spacing first: the pair of values people actually reach for.
            It shows up as width: the two rows of each pair have the same digit
            count, so tabular figures make them equally wide (each row
            shrink-wraps to its text) and proportional ones do not. Compare
            within a pair, never across. The value name sits in the label gutter
            rather than in the string, so the row measures the digits and nothing
            else. */}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <TextItem
            key={`tabular-${digits}`}
            label="tabular-nums"
            showText={showText}
            style={{ ...fontVariantRow, fontVariant: ['tabular-nums'] }}
          >
            {digits}
          </TextItem>
        ))}
        {TABULAR_FIGURE_ROWS.map((digits) => (
          <TextItem
            key={`proportional-${digits}`}
            label="proportional-nums"
            showText={showText}
            style={{ ...fontVariantRow, fontVariant: ['proportional-nums'] }}
          >
            {digits}
          </TextItem>
        ))}
        {/* Second baseline, in the serif the feature rows below use, so they have
            something to differ from. On Android it is the same font as the first
            baseline: that platform stays on the system font throughout. */}
        <TextItem label="default" showText={showText} style={fontVariantFeatureRow}>
          {FONT_VARIANT_SPECIMEN}
        </TextItem>
        {FONT_VARIANTS.map(({ label, fontVariant }) => (
          <TextItem
            key={label}
            label={label}
            showText={showText}
            style={{ ...fontVariantFeatureRow, fontVariant }}
          >
            {FONT_VARIANT_SPECIMEN}
          </TextItem>
        ))}
      </Section>
      {/* Three things about this section:

          - It is the one with nothing to compare against. RN <Text> has no
            fontVariationSettings on either platform, so the scarlet overlay sits at
            the font's default instance on every row while the grey box moves.
            Two PRs tried to add it to core and both went stale unmerged
            (facebook/react-native#44685 for iOS, #44667 for Android). See
            docs/agent/native-gotchas.md.
          - Every row needs a font whose file carries an fvar table, which no
            system font usably does: SF keeps its axes private, and Roboto is
            only variable from Android 12. Hence the bundled Open Sans (see
            VARIABLE in ../theme), with wght 300-800 and wdth 75-100.
          - If every row looks identical, suspect the font before the prop. A
            family that failed to resolve falls back silently, to SF on iOS (no
            usable axes, so nothing moves) and to Roboto on Android (variable, so
            the axes still apply and it looks like it worked). That asymmetry is
            exactly how this section first read as iOS-only-broken. */}
      <Section title="Font Variation Settings" footer={FONT_VARIATION_FOOTER}>
        {FONT_VARIATION_SETTINGS.map(({ label, fontVariationSettings }) => (
          <TextItem
            key={label}
            label={label}
            showText={showText}
            style={{ ...variableFontRow, fontVariationSettings }}
          >
            {SPECIMEN}
          </TextItem>
        ))}
      </Section>
      {/* Android-only in RN <Text>, closed on iOS here (see
          docs/agent/workflow.md#when-rn-itself-has-the-platform-gap). Each box
          is taller than its text so the position is visible. Rows drive this
          through `verticalAlign`, which RN aliases onto `textAlignVertical` in
          JS, so it covers both props. */}
      <Section title="Vertical Align" footer={VERTICAL_ALIGN_FOOTER}>
        {VERTICAL_ALIGNS.map((verticalAlign) => (
          <TextItem
            key={verticalAlign}
            label={verticalAlign}
            showText={showText}
            style={{ width: '100%', height: 72, fontSize: SHORT_ROW_SIZE, verticalAlign }}
            containerStyle={screenStyles.wideRow}
          >
            {SPECIMEN}
          </TextItem>
        ))}
      </Section>
      {/*
        Measured *width*, which is the one thing wrap detection decides. RN
        reports the full constraint width for text that word-wrapped and the
        tight widest-line width for text that didn't, so what to look at is the
        grey box edge, not the glyphs. None of these rows sets a width: the row
        shrink-wraps to whatever the text measured, and "Compare Text" overlays
        RN's own answer in scarlet on top.

        Two things to check, in order: PlainText against the scarlet Text overlay on
        one platform, then iOS against Android.

        Rows 2 and 3 are the interesting case: hard breaks that all fit, so
        nothing wrapped and the box must stop at the longest line. Every line is
        kept well under ~25 characters so it still fits on a narrow phone. If a
        line soft-wraps the row stops testing what it is here to test. The label
        sits above the row rather than beside it, so it costs these probes no
        width at all.
      */}
      <Section title="Wrap Detection">
        {/* Control. Nothing to detect: if this one disagrees, the harness is
            wrong, not the wrap logic. */}
        <TextItem label="control" showText={showText} style={styles.wrapProbe}>
          {'One short line   '}
        </TextItem>
        {/* Hard breaks, nothing wraps → hug the longest line. */}
        <TextItem label="hard breaks" showText={showText} style={styles.wrapProbe}>
          {'Short\nthis line is longest   '}
        </TextItem>
        {/* Same with more paragraphs, and with the longest one in the middle:
            the width comes from a max over paragraphs, so order shouldn't
            matter. */}
        <TextItem label="longest in middle" showText={showText} style={styles.wrapProbe}>
          {'A\nBB\nthis line is longest  \nCCC'}
        </TextItem>
        {/* Same paragraphs, longest one last: the width comes from a max over
            paragraphs, so where it sits shouldn't matter. */}
        <TextItem label="longest last" showText={showText} style={styles.wrapProbe}>
          {'A\nBB\nCCC\nthis line is longest  '}
        </TextItem>
        {/* No hard break, too long to fit → full constraint width. */}
        <TextItem label="soft wrap only" showText={showText} style={styles.wrapProbe}>
          {'No breaks here, but this sentence is long enough that it has to ' +
            'wrap onto several lines.'}
        </TextItem>
        {/* Both a hard break and a soft wrap → full constraint width. */}
        <TextItem label="break then wrap" showText={showText} style={styles.wrapProbe}>
          {'Break then wrap:\nthis second line is long enough that it also ' + 'has to wrap.'}
        </TextItem>
      </Section>
      {/* Accessibility props are part of RN's ViewProps, so they pass straight
          through to the native view. They're not visually distinct: turn on
          VoiceOver (iOS) / TalkBack (Android) to hear the label/role/state, or
          inspect the native tree for the testID. */}
      <Section title="Accessibility">
        <TextItem
          label="testID"
          showText={showText}
          style={styles.a11yRow}
          accessibilityProps={{ testID: 'plain-text-demo' }}
        >
          &quot;plain-text-demo&quot;, findable in the native tree
        </TextItem>
        <TextItem
          label="label"
          showText={showText}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityLabel: 'A screen reader announces this instead',
          }}
        >
          Overrides the spoken text
        </TextItem>
        <TextItem
          label="role"
          showText={showText}
          style={styles.a11yRow}
          accessibilityProps={{ accessibilityRole: 'header' }}
        >
          &quot;header&quot;
        </TextItem>
        <TextItem
          label="role + hint"
          showText={showText}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityRole: 'link',
            accessibilityHint: 'Opens the linked page',
          }}
        >
          &quot;link&quot;, hinted
        </TextItem>
        <TextItem
          label="state"
          showText={showText}
          style={styles.a11yRow}
          accessibilityProps={{ accessibilityState: { disabled: true } }}
        >
          disabled
        </TextItem>
        <TextItem
          label="hidden"
          showText={showText}
          style={styles.a11yRow}
          accessibilityProps={{
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          }}
        >
          Invisible to screen readers on both platforms
        </TextItem>
      </Section>
    </ScrollView>
  );
}

// The sections whose specimen is one short line (the face itself, its weight,
// style, color, tracking, decoration and OpenType features) are set a few points
// up from body size. Those rows are looked at rather than read, and at 18pt the
// differences between them were too small to judge. Sections whose specimen has to
// wrap stay at 18: there the point is the paragraph, not the glyph.
const SHORT_ROW_SIZE = 26;

const styles = StyleSheet.create({
  // Same treatment CompareBox's own overlayText gets (see Specimen.tsx): grey
  // background matching the row, scarlet ink, multiplied against the PlainText
  // layer underneath so this one-off composite overlay reads as part of the
  // same comparison as every TextItem row.
  overlayInline: {
    backgroundColor: COLOR.wash,
    color: COLOR.scarlet,
  },
  // Mirrors `compareText` in Specimen.tsx: full-opacity cobalt plus the same
  // wash `overlayInline` carries, since `row` no longer supplies one.
  compareTextInline: {
    color: COLOR.cobalt,
    backgroundColor: COLOR.wash,
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // A plain View, not a PlainText: it has no baseline function of its own, so
  // Yoga's fallback (a childless node's baseline is its own height) puts this
  // view's bottom edge exactly on the row's shared baseline. That makes it a
  // ruler for the eye rather than another thing under comparison.
  baselineRuler: {
    width: 28,
    height: 2,
    marginLeft: 10,
    backgroundColor: COLOR.indigo,
  },
  // Every section whose specimen wraps: full width, body size, and no background
  // of its own, because the row's grey is the control. What each of those sections
  // demonstrates (the alignment, the padding, the border geometry, the clamp) is
  // set on top of this at the row, so the column differs only in the one thing it
  // is about.
  //
  // Anything that sets a width obliges every row using it to pass
  // `containerStyle={screenStyles.wideRow}` as well, so the percentage resolves
  // against a definite row width rather than against the overlay's full-width box
  // on one side and a shrink-wrapping row on the other. A section that is not
  // about layout should set no width at all instead. See `a11yRow`.
  body: {
    width: '100%',
    fontSize: 20,
  },
  // iOS needs explicit clipping to reproduce the bug (clipsToBounds is off by
  // default); Android's TextView already clips to its bounds.
  clippingRow: Platform.select({ ios: { overflow: 'hidden' }, default: {} }),
  // Indigo rather than ink for the border sections: at 4pt a near-black stroke
  // outweighed the 18pt type inside it. Set once here so the whole section is drawn
  // in one ink and the rows differ only in the geometry.
  //
  // It is the one accent used at this weight, so it is also the constraint on how
  // bright the blue can go: a 4pt stroke reads roughly twice as loud as the same
  // color set as text.
  bordered: {
    borderColor: COLOR.indigo,
  },
  // Deliberately no width, so it can't take `body`: the row shrink-wraps to the
  // measured intrinsic width, which is the thing the Wrap Detection section is
  // checking.
  wrapProbe: {
    fontSize: 18,
  },
  // Accessibility rows carry no visual difference at all, so they are set below
  // body size: the label above the row is the content here.
  //
  // No width, like `wrapProbe`: these rows demonstrate props that do not affect
  // layout at all, so both boxes should just hug their text. A `width: '100%'`
  // here resolved against two different containing blocks (the shrink-wrapping
  // row under the PlainText, the full-width overlay box over it) and showed a
  // scarlet box running to the margin over a grey one hugging the glyphs, which is
  // a difference in the harness rather than in anything either component
  // measured.
  a11yRow: {
    fontSize: 15,
    color: COLOR.inkSoft,
  },
});

// Specimen strings. Every value a row varies now lives in the label gutter, so
// these can be real text, which is what a row set in it is actually for.
//
// All of them are the one familiar pangram at three lengths, so a reader scanning
// down the screen is comparing the property and not the sentence. SPECIMEN is a
// fragment because the waterfall rows want one line per size; PARAGRAPH wraps to
// two or three; PARAGRAPH_LONG is the same sentence three times over, which
// outruns every clamp in the screen without introducing a second sentence to
// read.
const SPECIMEN = 'Quick brown fox';
const PARAGRAPH = 'The quick brown fox jumps over the lazy dog.';
const PARAGRAPH_LONG = `${PARAGRAPH} ${PARAGRAPH} ${PARAGRAPH}`;

// Its own specimen: the Font Variant rows need the ff/ffl ligature pairs and a
// full run of figures in one string, and the pangram carries neither.
const FONT_VARIANT_SPECIMEN = 'Waffle office 0123456789';

const EMOJI_SPECIMEN = 'Quick brown 🦊 jumps over the lazy 🐶';

const FONT_SIZES = [48, 40, 32, 26, 20, 16, 13, 10];

// 'auto' is left out: it resolves to the writing direction's own start edge, so on
// an LTR device it renders identically to the 'left' row above it.
const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;

const ELLIPSIZE_MODES = ['head', 'middle', 'tail', 'clip'] as const;

const LINE_HEIGHTS = [18, 26, 36];

// Same lineHeight/fontSize ratio (0.8) at each size, paired 1:1 with REALWORLD_FONTS.
const REALWORLD_FONT_SIZES = [16, 20, 24, 32, 40];

// Families with varied ascender/descender/leading, to exercise the shift
// formula in applyContentFromProps beyond the one font it was written against.
const REALWORLD_FONTS: { label: string; style: PlainTextStyle }[] = Platform.select({
  ios: [
    { label: 'System', style: {} },
    { label: 'Georgia', style: { fontFamily: 'Georgia' } },
    { label: 'Helvetica Neue', style: { fontFamily: 'Helvetica Neue' } },
    { label: 'Baskerville', style: { fontFamily: 'Baskerville' } },
    { label: 'Inter SemiBold', style: { fontFamily: 'Inter_600SemiBold' } },
  ],
  default: [
    { label: 'System', style: {} },
    { label: 'serif', style: { fontFamily: 'serif' } },
    { label: 'sans-serif-medium', style: { fontFamily: 'sans-serif-medium' } },
    { label: 'cursive', style: { fontFamily: 'cursive' } },
    { label: 'Inter SemiBold', style: { fontFamily: 'Inter_600SemiBold' } },
  ],
});

// Name only the path the reader can actually go and change.
const FONT_SCALING_FOOTER = Platform.select({
  ios: 'Settings ▸ Accessibility ▸ Display & Text Size ▸ Larger Text. Only the first row follows it.',
  default: 'Settings ▸ Display ▸ Display size and text ▸ Font size. Only the first row follows it.',
});

const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;

const VERTICAL_ALIGN_FOOTER = Platform.select({
  ios: 'RN Text: Android-only ',
});

// Three letterforms picked for their shape at the baseline, not for spelling
// anything, at three sizes chosen to stress the ascent math the most:
// flat-bottomed "H", "g" with a descending tail, and the x-height-only "x".
// Nothing here but font size, so a misaligned baseline has nowhere else to
// hide. Realistic shapes stacking baseline alignment with other props (a
// badge's padding, a pinned lineHeight) live on the Use Cases screen instead.
const BASELINE_ALIGNMENT_GLYPHS: { text: string; fontSize: number }[] = [
  { text: 'H', fontSize: 56 },
  { text: 'g', fontSize: 32 },
  { text: 'x', fontSize: 18 },
];

const LETTER_SPACINGS = [-2, 0, 2, 6];

const TEXT_DECORATION_LINES = [
  'none',
  'underline',
  'line-through',
  'underline line-through',
] as const;

const TEXT_TRANSFORMS = ['none', 'lowercase', 'uppercase', 'capitalize'] as const;

// Mid-word caps ("BROWN") make capitalize's row visibly diverge from the
// scarlet <Text> overlay on iOS: see TEXT_TRANSFORM_FOOTER.
const TEXT_TRANSFORM_SPECIMEN = 'Quick BROWN fox';

// A digit has no uppercase form, so capitalize leaves it alone.
const TEXT_TRANSFORM_ORDINAL_SPECIMEN = '3rd place winner';

// Apostrophes stay inside the word rather than starting a new one.
const TEXT_TRANSFORM_CONTRACTION_SPECIMEN = "it's a trap, don't panic";

const TEXT_TRANSFORM_FOOTER =
  "RN <Text>'s capitalize has a bug on iOS (facebook/react-native#34117).";

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

// `fontStyle: 'normal'` is not cosmetic: it is what makes the scarlet <Text> overlay
// show any of this on Android. RN only attaches the span that carries
// fontFeatureSettings when fontStyle, fontWeight or fontFamily is set too, so
// fontVariant on its own renders unchanged there (see
// docs/agent/native-gotchas.md). Applied to both sides rather than to the overlay
// alone, so the comparison stays apples-to-apples: it is a no-op for PlainText,
// which already resolves fontStyle 'normal' the same as unset. It does nudge RN's
// own paint (the span also sets isSubpixelText/isLinearText), which is
// unavoidable, since that span is RN's only carrier for the features.
const fontVariantRow: TextStyle = { fontSize: SHORT_ROW_SIZE, fontStyle: 'normal' };

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
  // (tabular-nums, proportional-nums) ahead of this list: those are the ones
  // reached for most, and they need paired rows to show anything, so they can't be
  // driven from here.
  //
  // Every row here has to be able to *move*. A value that asks a font for what it
  // already does renders identically to the baseline row above it by construction,
  // so it can never fail and reading it teaches nothing: 'lining-nums' and
  // 'common-ligatures' are both defaults in both faces, and both were dropped.
  //
  // Everyday: headers, labels, acronyms set at text size.
  { label: 'small-caps', fontVariant: ['small-caps'] },
  // Editorial/serif typography. This is the figure *shape*, not the spacing the
  // tabular rows cover. Lining figures all sit on the baseline at cap height
  // (1234567890). Oldstyle ones vary, with 3456789 dropping below it and 68 rising
  // above, so digits blend into lowercase the way a printed book sets them. Both
  // faces default to lining, so asking for oldstyle is the direction that renders.
  // Verified on both platforms: Baskerville carries 'onum' on iOS, Roboto on Android.
  { label: 'oldstyle-nums', fontVariant: ['oldstyle-nums'] },
  // Niche, but the one row that turns a default-on feature *off*, which is the only
  // way a ligature value can be seen at all: "Waffle office" loses its ffl/ffi
  // ligatures. Both fonts here carry them, so this is where PlainText's box should
  // differ from the <Text> overlay on either platform.
  { label: 'no-common-ligatures', fontVariant: ['no-common-ligatures'] },
  // Not a real-world combination. Here so the array form is exercised with more
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

// VARIABLE, not a system face: only a font file with an fvar table can move, and
// the theme comment says why none of the built-in ones qualify.
const variableFontRow: PlainTextStyle = {
  fontSize: SHORT_ROW_SIZE,
  fontFamily: VARIABLE,
};

// The value is the label: the point of the section is which string produces
// which instance, and the CSS syntax is the API.
const FONT_VARIATION_SETTINGS: { label: string; fontVariationSettings?: string }[] = [
  // Baseline. The font's default instance, which is what every row below is read
  // against, and what the <Text> overlay is stuck at on all of them.
  { label: 'default' },
  // The weight axis, the one people actually reach for. Interpolated, not
  // snapped: 550 is a real instance, unlike fontWeight, which can only name the
  // nine hundred-steps and picks the nearest face.
  { label: '"wght" 300', fontVariationSettings: '"wght" 300' },
  { label: '"wght" 550', fontVariationSettings: '"wght" 550' },
  { label: '"wght" 800', fontVariationSettings: '"wght" 800' },
  // Width. Open Sans only condenses (75-100), so this axis moves in one
  // direction. A font with a wider upper bound would move both ways.
  { label: '"wdth" 87.5', fontVariationSettings: '"wdth" 87.5' },
  { label: '"wdth" 75', fontVariationSettings: '"wdth" 75' },
  // Two axes at once, comma-separated. The form both platforms' parsers take.
  { label: '"wght" 800, "wdth" 75', fontVariationSettings: '"wght" 800, "wdth" 75' },
];

const FONT_VARIATION_FOOTER = Platform.select({
  android: 'RN <Text> has no fontVariationSettings. Variable fonts need API 26+.',
  default: 'RN <Text> has no fontVariationSettings style.',
});

// The section only has to show that `color` is honored, so these are the screen's
// own accents in palette order rather than red/green/blue: same job, and the column
// stays part of the page instead of turning into a primaries test. Labeled with the
// pigment name each value is, which is also what it's called in COLOR.
const COLORS = [
  { label: 'Indigo', color: COLOR.indigo },
  { label: 'Plum', color: COLOR.plum },
  { label: 'Oxblood', color: COLOR.oxblood },
  { label: 'Ochre', color: COLOR.ochre },
  { label: 'Moss', color: COLOR.moss },
];

const FONT_WEIGHTS = ['normal', 'bold', '100', '300', '500', '700', '900'] as const;

// The first rows are plain registered family names, which resolve the easy way.
// The rest take the names that don't, a row per branch of the iOS resolution in
// ios/PlainTextFont.mm: weight matching inside a family, a family carrying a
// single cut, a name that is neither family nor face, a face the family path
// can't reach, a weight met by a real cut, the same cut named outright, a slant
// met by none, and a face name.
//
// Every face and family here is verified present in the iOS 26.5 simulator
// runtime, and the PostScript names are read from its font files rather than
// guessed. A name that isn't installed renders as the system font, which is
// what the Unresolvable row is for, so a wrong name elsewhere would quietly read
// as a passing row.
//
// The Face name and Unresolvable rows are the pair worth watching together.
// Resolution used to match UIFontDescriptorFamilyAttribute, which takes a
// registered family name and nothing else, so a face name silently produced the
// system font, the very thing an unresolvable name produces, which is what made
// the bug hard to see: a loaded custom font and a typo rendered identically.
// They should look different now, and both should match the scarlet <Text> overlay.
//
// Android resolves fontFamily through Typeface family names, with no PostScript
// names and no weight matching to do, so its rows are the nearest analogs rather
// than the same cases.

// Each row renders its own fontFamily value as its content, so what you read is
// what was passed. There is no second copy of the name to fall out of step with
// the style, and fontFamily is required rather than optional so the content
// can't come out empty.
type FontFamilyRow = { label: string; style: TextStyle & { fontFamily: string } };

const PLATFORM_FONT_ROWS: FontFamilyRow[] = Platform.select({
  ios: [
    // The straightforward ones first: a registered family name, which is the
    // only thing the resolution this section exercises never had trouble with.
    { label: 'System', style: { fontSize: 26, fontFamily: 'System' } },
    { label: 'Georgia', style: { fontSize: 26, fontFamily: 'Georgia' } },
    { label: 'Menlo', style: { fontSize: 26, fontFamily: 'Menlo' } },
    { label: 'Courier', style: { fontSize: 26, fontFamily: 'Courier' } },
    {
      // Renders in the Ultra Light cut, not a system font at weight 100.
      label: 'Family and weight',
      style: { fontSize: 26, fontFamily: 'Avenir Next', fontWeight: '100' },
    },
    {
      // One cut in the family, so the bold has nothing to resolve to and must
      // leave the row in Zapfino rather than fall back.
      label: 'Single-cut family',
      style: { fontSize: 26, fontFamily: 'Zapfino', fontWeight: 'bold' },
    },
    {
      // HelveticaNeue-Thin, picked because RCTGetFontWeight reads the name suffix:
      // a weight trait alone would not have singled it out. Also the order in
      // that suffix list earning its keep: the family carries UltraLight, Thin
      // and Light, and "ultralight" has to be tested before "light" or the
      // UltraLight face would answer to weight 300.
      label: 'Weight with a real cut',
      style: { fontSize: 26, fontFamily: 'Helvetica Neue', fontWeight: '200' },
    },
    {
      // The same cut, asked for by name instead of by weight. Renders identically
      // to the row above, by a different branch: no family matches this string, so
      // it resolves as a face.
      label: 'Weight suffix in the name',
      style: { fontSize: 26, fontFamily: 'HelveticaNeue-Thin' },
    },
    {
      // Copperplate ships Regular, Light and Bold, and no italic. So the slant
      // filter rejects every cut, the first face is taken instead, and the slant
      // on top of it is synthesized. Contrast with the Georgia row, which has a
      // real italic to find.
      label: 'Slant with no cut',
      style: { fontSize: 26, fontFamily: 'Copperplate', fontStyle: 'italic' },
    },
    {
      // A face carries its own slant, so fontStyle stays out of this row:
      // nothing in it is synthesized.
      label: 'Face name',
      style: { fontSize: 26, fontFamily: 'Georgia-BoldItalic' },
    },
    {
      // Both Condensed cuts sit in family "Helvetica Neue", but the family path
      // filters condensed faces out, so no weight reaches them there: a face
      // name is the only way in. The two branches are not interchangeable.
      label: 'Condensed face',
      style: { fontSize: 26, fontFamily: 'HelveticaNeue-CondensedBlack' },
    },
  ],
  default: [
    { label: 'System', style: { fontSize: 26, fontFamily: 'System' } },
    { label: 'serif', style: { fontSize: 26, fontFamily: 'serif' } },
    { label: 'monospace', style: { fontSize: 26, fontFamily: 'monospace' } },
    {
      label: 'sans-serif-condensed',
      style: { fontSize: 26, fontFamily: 'sans-serif-condensed' },
    },
    {
      // Renders in the Thin cut.
      label: 'Family and weight',
      style: { fontSize: 26, fontFamily: 'sans-serif', fontWeight: '100' },
    },
    {
      label: 'Single-cut family',
      style: { fontSize: 26, fontFamily: 'cursive' },
    },
    {
      label: 'Condensed face',
      style: { fontSize: 26, fontFamily: 'sans-serif-condensed-light' },
    },
    {
      // Light rather than Thin, so this pair stays distinguishable from the
      // family-and-weight row above.
      label: 'Weight with a real cut',
      style: { fontSize: 26, fontFamily: 'sans-serif', fontWeight: '300' },
    },
    {
      label: 'Weight suffix in the name',
      style: { fontSize: 26, fontFamily: 'sans-serif-light' },
    },
    {
      // Android synthesizes the slant here too, for the same reason: the family
      // carries no italic cut.
      label: 'Slant with no cut',
      style: { fontSize: 26, fontFamily: 'monospace', fontStyle: 'italic' },
    },
    {
      label: 'Named cut',
      style: { fontSize: 26, fontFamily: 'sans-serif-medium' },
    },
  ],
});

// Custom fonts, as against the platform built-ins above, and the only rows in
// this screen that are the same on iOS and Android, because the name is ours
// rather than the platform's. Loaded in App.tsx via expo-font, which is how most
// apps get a custom font, and the reason this section exists: it is the case the
// old resolution failed on hardest.
//
// What expo-font does on iOS, in its own words (ios/UIFont+FontFamilyAlias.swift):
// it swizzles +fontNames(forFamilyName:) so that an unknown family name gets
// retried as an alias, and when the alias resolves to a PostScript name that is
// not itself a family, it answers with that one name in a one-element array.
// So resolution reaches the face only if it goes through that method:
// UIFontDescriptorFamilyAttribute matching does not call it, which is why every
// row here used to come out as the system font.
//
// It is also why the earlier attempt at this fix, which special-cased
// `fontNamesForFamilyName:.count == 0`, could never have worked in an Expo app:
// the swizzle returns one name, not none.
//
// On Android the same aliases resolve without any of this: expo-font registers
// them into ReactFontManager (android FontLoaderModule.kt), which is what
// PlainTextView.applyTypeface already resolves through.
const CUSTOM_FONT_ROWS: FontFamilyRow[] = [
  {
    label: 'expo-font alias',
    style: { fontSize: 26, fontFamily: 'Inter_400Regular' },
  },
  {
    // Each cut is loaded under its own alias, so weight lives in the name here
    // rather than in fontWeight: one alias is a one-face family, and there is
    // no sibling cut for a weight to match against.
    label: 'expo-font alias, heavier cut',
    style: { fontSize: 26, fontFamily: 'Inter_600SemiBold' },
  },
  {
    // Slant in the name too, and for the same reason. Nothing synthesized: the
    // face is already italic, so plainTextFont's italic round-trip is skipped.
    label: 'expo-font alias, light italic',
    style: { fontSize: 26, fontFamily: 'Inter_300Light_Italic' },
  },
];

const UNRESOLVABLE_FONT_ROW: FontFamilyRow = {
  label: 'Unresolvable name',
  style: { fontSize: 26, fontFamily: 'NoSuchFont-Regular' },
};

const FONT_FAMILY_RESOLUTION: FontFamilyRow[] = [
  ...PLATFORM_FONT_ROWS,
  ...CUSTOM_FONT_ROWS,
  UNRESOLVABLE_FONT_ROW,
];

const FONT_FAMILY_RESOLUTION_FOOTER = Platform.select({
  ios: 'Compare Text should agree on every row. Inter_* are expo-font aliases, one per cut.',
  default: 'The built-in rows are Android analogs. Inter_* are expo-font aliases, one per cut.',
});
