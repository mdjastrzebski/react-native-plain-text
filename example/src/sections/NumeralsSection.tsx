import { StyleSheet, Text, View } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { CompareBox, Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

// Figures at display sizes, where negative tracking and the digit widths matter.
export function NumeralsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Numerals">
      {/* price-large */}
      <TextItem
        showText={showText}
        style={{ fontSize: 34, fontWeight: '800', color: COLOR.ink, letterSpacing: -1 }}
      >
        $1,249.00
      </TextItem>
      {/* price-struck */}
      <TextItem
        showText={showText}
        style={{ fontSize: 16, color: COLOR.faint, textDecorationLine: 'line-through' }}
      >
        $1,799.00
      </TextItem>
      {/* stat-value */}
      <TextItem
        showText={showText}
        style={{ fontSize: 40, fontWeight: '300', color: COLOR.ink, letterSpacing: -1.5 }}
      >
        98.4%
      </TextItem>
      {/* A price and its tax note sharing one line, set at different sizes.
        Needs `alignItems: "baseline"` on the row to sit together the way a
        real price tag does, rather than lining up on the row's own edges. */}
      <CompareBox
        label="price-with-vat-note"
        showText={showText}
        containerStyle={[styles.baselineRow, screenStyles.wideRow]}
        overlay={
          <View style={styles.baselineRow}>
            <Text
              style={[{ fontSize: 32, fontWeight: '800', color: COLOR.ink }, styles.overlayText]}
            >
              €169.90
            </Text>
            <Text style={[{ fontSize: 13, color: COLOR.muted, marginLeft: 6 }, styles.overlayText]}>
              {' incl. VAT'}
            </Text>
          </View>
        }
      >
        <PlainText
          style={[
            { fontSize: 32, fontWeight: '800', color: COLOR.ink },
            showText && styles.compareText,
          ]}
        >
          €169.90
        </PlainText>
        <PlainText
          style={[
            { fontSize: 13, color: COLOR.muted, marginLeft: 6 },
            showText && styles.compareText,
          ]}
        >
          {' incl. VAT'}
        </PlainText>
      </CompareBox>
      {/* Three siblings, not two: baseline alignment is a property of the
        whole row, not just a pair, so a fix that only special-cases the
        first/last child would still show a gap here. */}
      <CompareBox
        label="stat-with-unit-and-delta"
        showText={showText}
        containerStyle={[styles.baselineRow, screenStyles.wideRow]}
        overlay={
          <View style={styles.baselineRow}>
            <Text
              style={[{ fontSize: 40, fontWeight: '300', color: COLOR.ink }, styles.overlayText]}
            >
              98.4
            </Text>
            <Text style={[{ fontSize: 20, color: COLOR.muted, marginLeft: 2 }, styles.overlayText]}>
              %
            </Text>
            <Text style={[{ fontSize: 13, color: COLOR.moss, marginLeft: 8 }, styles.overlayText]}>
              {' +2.1 today'}
            </Text>
          </View>
        }
      >
        <PlainText
          style={[
            { fontSize: 40, fontWeight: '300', color: COLOR.ink },
            showText && styles.compareText,
          ]}
        >
          98.4
        </PlainText>
        <PlainText
          style={[
            { fontSize: 20, color: COLOR.muted, marginLeft: 2 },
            showText && styles.compareText,
          ]}
        >
          %
        </PlainText>
        <PlainText
          style={[
            { fontSize: 13, color: COLOR.moss, marginLeft: 8 },
            showText && styles.compareText,
          ]}
        >
          {' +2.1 today'}
        </PlainText>
      </CompareBox>
      {/* Same font size on both sides, so a size-only fix could pass the two
        rows above and still fail this one: the first span pins a lineHeight
        far taller than its own font, which only shifts where its baseline
        lands if the extra leading above it is accounted for too. */}
      <CompareBox
        label="total-with-pinned-line-height"
        showText={showText}
        containerStyle={[styles.baselineRow, screenStyles.wideRow]}
        overlay={
          <View style={styles.baselineRow}>
            <Text
              style={[
                {
                  fontSize: 16,
                  lineHeight: 44,
                  color: COLOR.ink,
                  backgroundColor: COLOR.indigoWash,
                  paddingHorizontal: 6,
                },
                styles.overlayText,
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                { fontSize: 16, fontWeight: '600', color: COLOR.ink, marginLeft: 8 },
                styles.overlayText,
              ]}
            >
              €42.00
            </Text>
          </View>
        }
      >
        <PlainText
          style={[
            {
              fontSize: 16,
              lineHeight: 44,
              color: COLOR.ink,
              backgroundColor: COLOR.indigoWash,
              paddingHorizontal: 6,
            },
            showText && styles.compareText,
          ]}
        >
          Total
        </PlainText>
        <PlainText
          style={[
            { fontSize: 16, fontWeight: '600', color: COLOR.ink, marginLeft: 8 },
            showText && styles.compareText,
          ]}
        >
          €42.00
        </PlainText>
      </CompareBox>
    </Section>
  );
}

const styles = StyleSheet.create({
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // Same treatment Specimen.tsx's own `overlayText`/`compareText` give a
  // single-string TextItem, reproduced here because a baseline row's overlay
  // is several sibling `<Text>`s rather than one, so it can't go through
  // TextItem at all.
  overlayText: {
    backgroundColor: COLOR.wash,
    color: COLOR.scarlet,
  },
  // Mirrors `overlayText`'s wash, since `row` no longer supplies one.
  compareText: {
    color: COLOR.cobalt,
    backgroundColor: COLOR.wash,
  },
});
