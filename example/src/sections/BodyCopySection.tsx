import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR, SERIF } from '../theme';

export function BodyCopySection({ showText }: { showText: boolean }) {
  return (
    <Section title="Body Copy">
      {/* body-paragraph */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 16, color: COLOR.ink, lineHeight: 25 }}
        containerStyle={screenStyles.wideRow}
      >
        PlainText renders with the platform text widget directly, so it measures once and lays out
        where the OS would put it, with no round trip through the shadow tree.
      </TextItem>
      {/* body-justified */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 15,
          color: COLOR.ink,
          textAlign: 'justify',
          lineHeight: 23,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Justified body copy stretches every line but the last to the full measure, which makes any
        disagreement about the available width show up as a ragged right edge instead of a subtle
        reflow.
      </TextItem>
      {/* notification-preview */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 14, color: COLOR.inkSoft, lineHeight: 20 }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        Alex commented on your pull request: this looks good to me, though I would pull the
        measurement cache out into its own module first.
      </TextItem>
      {/* list-row-primary */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 17, color: COLOR.ink }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        Annual infrastructure review meeting with the platform team
      </TextItem>
      {/* pull-quote */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 20,
          fontFamily: SERIF,
          fontStyle: 'italic',
          color: COLOR.inkSoft,
          lineHeight: 30,
          paddingLeft: 16,
          borderLeftWidth: 3,
          borderLeftColor: COLOR.line,
        }}
        containerStyle={screenStyles.wideRow}
      >
        “We swapped one component and the long list stopped dropping frames.”
      </TextItem>
      {/* legal-fine-print */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 11, color: COLOR.faint, lineHeight: 16 }}
        containerStyle={screenStyles.wideRow}
        allowFontScaling={false}
      >
        By continuing you agree to the terms of service and acknowledge the privacy policy,
        including how measurement data is retained.
      </TextItem>
    </Section>
  );
}
