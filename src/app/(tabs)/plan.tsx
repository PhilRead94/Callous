import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export default function PlanScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.placeholder}>
        <Text style={styles.label}>Training Plan</Text>
        <Text style={styles.sub}>Coming in Phase 4</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: 14 },
});
