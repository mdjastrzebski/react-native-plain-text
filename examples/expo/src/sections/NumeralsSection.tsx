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
      {/* Needs alignItems:"baseline" on the row to sit like a real price tag. */}
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
      {/* Three siblings, not two: baseline alignment is a row-wide property,
        not just first/last child. */}
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
      {/* Same font size both sides: catches a lineHeight-driven baseline
        shift that a size-only fix would miss. */}
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
  // Mirrors Specimen.tsx's overlayText/compareText, reproduced here since a
  // baseline row's overlay is several sibling <Text>s, not one, so it can't
  // go through TextItem.
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
