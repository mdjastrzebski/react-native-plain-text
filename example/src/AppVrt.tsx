import { StyleSheet, View } from 'react-native';
import { PlainText } from 'react-native-plain-text';

export default function AppVrt() {
  return (
    <View testID="vrt-screen" style={styles.screen}>
      <PlainText style={styles.title}>VRT is enabled</PlainText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#16181D',
    fontSize: 32,
    fontWeight: '700',
  },
});
