import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlainText } from 'react-native-plain-text';
import { Cover, Section, screenStyles } from '../components/Specimen';
import { COLOR } from '../theme';

type Props = NativeStackScreenProps<ParamListBase>;

export default function OtherExamplesScreen({ navigation }: Props) {
  return (
    <ScrollView style={screenStyles.scroll} contentContainerStyle={screenStyles.container}>
      <Cover blurb="Focused reproductions and comparisons for text behavior that does not fit on the main feature pages." />
      <Section title="Examples" spacedRows>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Android text clipping example"
          onPress={() => navigation.navigate('AndroidTextClipping')}
          style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
        >
          <View style={styles.copy}>
            <PlainText style={styles.title}>Android text clipping</PlainText>
            <PlainText style={styles.description}>
              React Native issue #56402 on Android 15 and 16
            </PlainText>
          </View>
          <PlainText style={styles.chevron}>›</PlainText>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 12,
    backgroundColor: COLOR.wash,
  },
  pressedRow: {
    backgroundColor: COLOR.indigoWash,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    width: '100%',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: COLOR.ink,
  },
  description: {
    width: '100%',
    fontSize: 13,
    lineHeight: 18,
    color: COLOR.muted,
  },
  chevron: {
    fontSize: 28,
    lineHeight: 32,
    color: COLOR.faint,
  },
});
