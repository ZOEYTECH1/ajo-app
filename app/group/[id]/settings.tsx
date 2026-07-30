import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { groupService } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../../src/components';

export default function GroupSettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
  });

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules]             = useState('');
  const [graceDays, setGraceDays]     = useState('');
  const [errors, setErrors]           = useState<Record<string, string>>({});

  // Pre-fill once group data arrives
  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description ?? '');
    setRules((group as any).rules ?? '');
    setGraceDays(String(group.grace_period_days));
  }, [group]);

  const mutation = useMutation({
    mutationFn: () =>
      groupService.updateGroup(groupId, {
        name:             name.trim(),
        description:      description.trim(),
        rules:            rules.trim(),
        grace_period_days: Number(graceDays),
      }),
    onSuccess: (updated) => {
      feedback('success');
      queryClient.setQueryData(['group', groupId], updated);
      router.back();
    },
    onError: (err: any) => {
      feedback('error');
      const data = err.response?.data ?? {};
      const mapped: Record<string, string> = {};
      for (const key of Object.keys(data)) {
        const val = data[key];
        mapped[key] = Array.isArray(val) ? val[0] : String(val);
      }
      setErrors(mapped);
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Group name is required.';
    const gd = Number(graceDays);
    if (isNaN(gd) || gd < 0 || gd > 30)
      e.grace_period_days = 'Grace period must be 0–30 days.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { feedback('error'); return; }
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Saving changes…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
          Group Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Read-only info */}
        <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.primary) }]}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Fixed settings</Text>
          <InfoRow label="Frequency" value={group?.contribution_frequency ?? '—'} colors={colors} />
          <InfoRow label="Amount" value={group ? `₦${Number(group.contribution_amount).toLocaleString('en-NG')}` : '—'} colors={colors} />
          <InfoRow
            label="Collection day"
            value={group?.collection_day != null ? String(group.collection_day) : 'Not set'}
            colors={colors}
          />
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 8 }}>
            Frequency, amount, and collection day cannot be changed after creation.
          </Text>
        </View>

        {/* Editable fields */}
        <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.primary) }]}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Editable settings</Text>

          <Input
            label="Group name"
            value={name}
            onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
            error={errors.name}
            maxLength={100}
          />

          <Input
            label="Description"
            value={description}
            onChangeText={(v) => { setDescription(v); setErrors((e) => ({ ...e, description: '' })); }}
            error={errors.description}
            multiline
            numberOfLines={3}
            maxLength={500}
            style={{ marginTop: 12 }}
          />

          <Input
            label="Rules (optional)"
            value={rules}
            onChangeText={(v) => { setRules(v); setErrors((e) => ({ ...e, rules: '' })); }}
            error={errors.rules}
            multiline
            numberOfLines={4}
            maxLength={1000}
            placeholder="e.g. Payments due by the 5th. Late payers forfeit their slot."
            style={{ marginTop: 12 }}
          />

          <Input
            label="Grace period (days)"
            value={graceDays}
            onChangeText={(v) => { setGraceDays(v.replace(/[^0-9]/g, '')); setErrors((e) => ({ ...e, grace_period_days: '' })); }}
            error={errors.grace_period_days}
            keyboardType="numeric"
            maxLength={2}
            style={{ marginTop: 12 }}
          />
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 4 }}>
            Days after the first collection deadline before defaulters are visible. 0–30.
          </Text>
        </View>

        <Button label="Save Changes" onPress={handleSave} loading={mutation.isPending} style={{ marginTop: 4 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={s.infoRow}>
      <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' }}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
