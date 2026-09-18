import { StyleSheet, Text, View } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { CompareBox, Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

// Short strings inside a shape: the padding and the radius are doing as much work
// as the type, and each one shrink-wraps to its own text.
export function BadgesSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Badges">
      {/* badge-new */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: COLOR.paper,
          backgroundColor: COLOR.moss,
          letterSpacing: 1,
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderRadius: 10,
        }}
      >
        NEW
      </TextItem>
      {/* badge-outline */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: COLOR.indigo,
          letterSpacing: 1.2,
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderWidth: 1,
          borderColor: COLOR.indigo,
          borderRadius: 4,
        }}
      >
        BETA
      </TextItem>
      {/* avatar-initials */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: COLOR.paper,
          backgroundColor: COLOR.plum,
          textAlign: 'center',
          width: 44,
          height: 44,
          lineHeight: 44,
          borderRadius: 22,
        }}
      >
        MJ
      </TextItem>
      {/* A heading beside a badge: different size and weight, plus a badge with
        its own padding and border radius. Yoga folds a baseline child's own
        padding into where its box sits before aligning, so this also
        exercises that the offset survives padding, not just a bare span of
        text. */}
      <CompareBox
        label="heading-with-badge"
        showText={showText}
        containerStyle={[styles.baselineRow, screenStyles.wideRow]}
        overlay={
          <View style={styles.baselineRow}>
            <Text
              style={[{ fontSize: 24, fontWeight: '700', color: COLOR.ink }, styles.overlayText]}
            >
              New Season
            </Text>
            <Text
              style={[
                {
                  fontSize: 11,
                  fontWeight: '700',
                  color: COLOR.paper,
                  backgroundColor: COLOR.oxblood,
                  letterSpacing: 1,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 4,
                  marginLeft: 8,
                },
                styles.overlayText,
              ]}
            >
              SALE
            </Text>
          </View>
        }
      >
        <PlainText
          style={[
            { fontSize: 24, fontWeight: '700', color: COLOR.ink },
            showText && styles.compareText,
          ]}
        >
          New Season
        </PlainText>
        <PlainText
          style={[
            {
              fontSize: 11,
              fontWeight: '700',
              color: COLOR.paper,
              backgroundColor: COLOR.oxblood,
              letterSpacing: 1,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 4,
              marginLeft: 8,
            },
            showText && styles.compareText,
          ]}
        >
          SALE
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
