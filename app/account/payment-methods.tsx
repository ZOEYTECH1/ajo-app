import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../src/theme';

export default function PaymentMethodsRoute() {
  const router = useRouter();
  return (
    <View style={s.container}>
      <TouchableOpacity style={s.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={s.title}>Payment Methods</Text>
      <Text style={s.sub}>Coming soon</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  back:  { position: 'absolute', top: 52, left: 20 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  sub:   { fontSize: FontSize.base, color: Colors.textSecondary },
});
