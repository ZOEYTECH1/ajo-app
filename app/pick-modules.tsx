import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { useModuleStore, type ModuleKey } from '../src/store/useAppStore';
import { FontSize, Radius, Shadow } from '../src/theme';

interface ModuleOption {
  key: ModuleKey;
  icon: string;
  title: string;
  description: string;
  detail: string;
  accentColor: string;
  bgColor: string;
}

const OPTIONS: ModuleOption[] = [
  {
    key: 'ajo',
    icon: 'people-circle-outline',
    title: 'Ajo Groups',
    description: 'Informal savings circles',
    detail: 'Manage peer savings circles with friends, market traders, and family. Track who paid, who is next to collect, and settle disputes with proof.',
    accentColor: '#0035F0',
    bgColor: '#E6ECFF',
  },
  {
    key: 'thrift',
    icon: 'wallet-outline',
    title: 'Contributions',
    description: 'Formal thrift & cooperative groups',
    detail: 'Run or join a structured thrift or cooperative contribution group. Full audit trail, rotation management, and approval queue for the collector.',
    accentColor: '#16A34A',
    bgColor: '#DCFCE7',
  },
  {
    key: 'inventory',
    icon: 'cube-outline',
    title: 'Inventory',
    description: 'Stock & sales for your shop',
    detail: 'Track products, record sales, log daily opening and closing stock, manage expenses, and see analytics for your business.',
    accentColor: '#E65100',
    bgColor: '#FFF3E0',
  },
];

export default function PickModulesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { setSelectedModules } = useModuleStore();

  const [selected, setSelected] = useState<ModuleKey[]>([]);
  const [firstPicked, setFirstPicked] = useState<ModuleKey | null>(null);

  const toggle = (key: ModuleKey) => {
    setSelected(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      if (!firstPicked) setFirstPicked(key);
      return [...prev, key];
    });
  };

  const handleContinue = () => {
    const primary = firstPicked ?? selected[0];
    setSelectedModules(selected, primary!);
    router.replace('/home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={[s.greeting, { color: colors.textSecondary }]}>
          Welcome{user?.first_name ? `, ${user.first_name}` : ''}
        </Text>
        <Text style={[s.title, { color: colors.textPrimary }]}>
          What will you use{'\n'}Ajo for?
        </Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Select everything that applies — you can always add more later.
        </Text>

        {/* Module cards */}
        {OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.key);
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => toggle(opt.key)}
              activeOpacity={0.82}
              accessibilityRole="checkbox"
              accessibilityLabel={opt.title}
              accessibilityHint={opt.description}
              accessibilityState={{ checked: isSelected }}
              style={[
                s.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? opt.accentColor : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  ...Shadow.card(isSelected ? opt.accentColor : colors.black),
                },
              ]}
            >
              <View style={s.cardTop}>
                <View style={[s.iconBg, { backgroundColor: isSelected ? opt.bgColor : colors.surfaceInput }]}>
                  <Ionicons name={opt.icon as any} size={26} color={isSelected ? opt.accentColor : colors.textTertiary} />
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: isSelected ? opt.accentColor : colors.textPrimary }}>
                    {opt.title}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                    {opt.description}
                  </Text>
                </View>

                <View style={[
                  s.checkbox,
                  {
                    backgroundColor: isSelected ? opt.accentColor : 'transparent',
                    borderColor: isSelected ? opt.accentColor : colors.borderStrong,
                  },
                ]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </View>

              {isSelected && (
                <Text style={[s.cardDetail, { color: colors.textSecondary, borderTopColor: colors.border }]}>
                  {opt.detail}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={selected.length === 0}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue to app"
          accessibilityState={{ disabled: selected.length === 0 }}
          style={[
            s.btn,
            {
              backgroundColor: selected.length > 0 ? '#0035F0' : colors.border,
            },
          ]}
        >
          <Text style={[s.btnText, { color: selected.length > 0 ? '#fff' : colors.textDisabled }]}>
            {selected.length === 0 ? 'Pick at least one' : `Let's go  →`}
          </Text>
        </TouchableOpacity>

        <Text style={[s.hint, { color: colors.textTertiary }]}>
          You can activate more modules from your profile at any time.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 60,
  },
  greeting: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 6,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    marginBottom: 32,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetail: {
    fontSize: FontSize.xs,
    lineHeight: 20,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  btn: {
    paddingVertical: 17,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  hint: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
