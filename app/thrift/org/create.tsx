import { View, Text, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius } from '../../../src/theme';

export default function CreateOrgRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Organisation</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.body}>
        <View style={[s.iconWrap, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="business-outline" size={40} color={colors.primary} />
        </View>

        <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 24, textAlign: 'center' }}>
          Organisation Onboarding
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 22 }}>
          Organisations are onboarded directly by the Ajo team. This ensures every MFB, cooperative, and bank is properly verified before going live.
        </Text>

        <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.infoRow}>
            <View style={[s.bullet, { backgroundColor: colors.successLight }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            </View>
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 12, lineHeight: 20 }}>
              Compliance and identity verification
            </Text>
          </View>
          <View style={s.infoRow}>
            <View style={[s.bullet, { backgroundColor: colors.primaryTint }]}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 12, lineHeight: 20 }}>
              Dedicated collector management dashboard
            </Text>
          </View>
          <View style={s.infoRow}>
            <View style={[s.bullet, { backgroundColor: colors.warningLight ?? colors.primaryTint }]}>
              <Ionicons name="laptop-outline" size={16} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 12, lineHeight: 20 }}>
              Full web portal for self-service management
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 28, textAlign: 'center', lineHeight: 20 }}>
          To get your organisation onboarded, reach out to us at{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>support@ajo.app</Text>
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 40,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  infoCard: {
    width: '100%', borderRadius: Radius.lg, borderWidth: 1,
    padding: 16, marginTop: 28, gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  bullet: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
