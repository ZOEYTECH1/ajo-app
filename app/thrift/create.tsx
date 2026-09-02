import { useState, useEffect } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { thriftService, type ThriftFrequency, type ThriftCycleType, type ThriftOrganization } from '../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../src/components';

const FREQUENCIES: { value: ThriftFrequency; label: string; desc: string }[] = [
  { value: 'daily',   label: 'Daily',   desc: 'Payers contribute every day' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Payers contribute every week' },
  { value: 'monthly', label: 'Monthly', desc: 'Payers contribute every month' },
];

const CYCLE_TYPES: { value: ThriftCycleType; label: string; desc: string; icon: string }[] = [
  { value: 'rolling', label: 'Rolling / Open-ended', desc: 'No end date — runs continuously until you stop it', icon: 'infinite-outline' },
  { value: 'fixed',   label: 'Fixed Cycle',          desc: 'Set a start and end date; restart each new cycle',  icon: 'calendar-outline' },
];

export default function CreateThriftRoute() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName]               = useState('');
  const [description, setDesc]        = useState('');
  const [frequency, setFrequency]     = useState<ThriftFrequency>('daily');
  const [cycleType, setCycleType]     = useState<ThriftCycleType>('rolling');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [selectedOrgId, setOrgId]     = useState<number | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const { data: partnerOrgs, isLoading: orgsLoading } = useQuery<ThriftOrganization[]>({
    queryKey: ['partner-orgs'],
    queryFn: thriftService.getPartnerOrgs,
    staleTime: 10 * 60 * 1000,
  });

  const { data: myMemberships } = useQuery({
    queryKey: ['my-org-memberships'],
    queryFn: thriftService.getMyOrgMemberships,
    staleTime: 5 * 60 * 1000,
  });

  // Memberships where the invite has been accepted (joined_at set) and not suspended
  const confirmedMemberOrgs = (myMemberships ?? [])
    .filter((m) => m.joined_at !== null && m.status !== 'suspended')
    .map((m) => m.organization);

  // Auto-select on first load if already a member of an org
  useEffect(() => {
    const confirmed = (myMemberships ?? []).filter((m) => m.joined_at !== null && m.status !== 'suspended');
    if (confirmed.length > 0 && selectedOrgId === null) {
      setOrgId(confirmed[0].organization.id);
    }
  }, [myMemberships]);

  // True when the selected org is one the user is already an approved member of
  const isAlreadyMember = confirmedMemberOrgs.some((o) => o.id === selectedOrgId);

  // Org list: member orgs first (they may not be in partnerOrgs), then remaining partner orgs
  const displayedOrgs = [
    ...confirmedMemberOrgs,
    ...(partnerOrgs ?? []).filter((o) => !confirmedMemberOrgs.some((m) => m.id === o.id)),
  ];

  const mutation = useMutation({
    mutationFn: () => thriftService.createGroup({
      name: name.trim(),
      description: description.trim(),
      frequency,
      cycle_type:  cycleType,
      start_date:  cycleType === 'fixed' ? startDate || null : null,
      end_date:    cycleType === 'fixed' ? endDate   || null : null,
      org_id:      selectedOrgId,
      invite_token: selectedOrgId && !isAlreadyMember ? inviteToken.trim() || null : null,
    }),
    onSuccess: (group) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-groups'] });
      router.replace(`/thrift/${group.uuid}` as any);
    },
    onError: (err: any) => {
      feedback('error');
      const d = err.response?.data ?? {};
      setErrors({
        name:         d.name?.[0]         ?? '',
        start_date:   d.start_date?.[0]   ?? d.start_date   ?? '',
        end_date:     d.end_date?.[0]     ?? d.end_date     ?? '',
        invite_token: d.invite_token?.[0] ?? d.invite_token ?? '',
        general:      d.detail ?? d.non_field_errors?.[0] ?? '',
      });
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Group name is required.';
    if (cycleType === 'fixed') {
      if (!startDate) e.start_date = 'Start date is required for fixed cycles.';
      if (!endDate)   e.end_date   = 'End date is required for fixed cycles.';
      if (startDate && endDate && endDate <= startDate)
        e.end_date = 'End date must be after start date.';
    }
    if (Object.keys(e).length) { setErrors(e); feedback('error'); return; }
    setErrors({});
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Creating group…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">New Contribution Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Input
          label="Group name"
          placeholder="e.g. Market Women Thrift 2025"
          value={name}
          onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })); }}
          error={errors.name}
          leftIcon={<Ionicons name="wallet-outline" size={18} color={colors.success} />}
        />

        <Input
          label="Description (optional)"
          placeholder="What is this group for?"
          value={description}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          style={{ marginTop: 16 }}
        />

        {/* Frequency */}
        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Collection frequency</Text>
        {FREQUENCIES.map((f) => {
          const active = frequency === f.value;
          return (
            <TouchableOpacity key={f.value} onPress={() => setFrequency(f.value)} activeOpacity={0.8}
              style={[s.optionRow, { backgroundColor: active ? colors.successLight : colors.surface, borderColor: active ? colors.success : colors.border, ...Shadow.card(colors.black) }]}
              accessibilityRole="radio"
              accessibilityLabel={`${f.label}: ${f.desc}`}
              accessibilityState={{ checked: active }}
            >
              <View style={[s.dot, { backgroundColor: active ? colors.success : colors.border }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.success : colors.textPrimary }}>{f.label}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Cycle type */}
        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Cycle type</Text>
        {CYCLE_TYPES.map((c) => {
          const active = cycleType === c.value;
          return (
            <TouchableOpacity key={c.value} onPress={() => setCycleType(c.value)} activeOpacity={0.8}
              style={[s.optionRow, { backgroundColor: active ? colors.primaryTint : colors.surface, borderColor: active ? colors.primary : colors.border, ...Shadow.card(colors.black) }]}
              accessibilityRole="radio"
              accessibilityLabel={`${c.label}: ${c.desc}`}
              accessibilityState={{ checked: active }}
            >
              <Ionicons name={c.icon as any} size={20} color={active ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.primary : colors.textPrimary }}>{c.label}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{c.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Fixed-cycle date inputs */}
        {cycleType === 'fixed' && (
          <View style={{ marginTop: 16 }}>
            <Input
              label="Start date"
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={(v) => { setStartDate(v); setErrors((p) => ({ ...p, start_date: '' })); }}
              keyboardType="numbers-and-punctuation"
              error={errors.start_date}
              leftIcon={<Ionicons name="play-circle-outline" size={18} color={colors.primary} />}
            />
            <View style={{ marginTop: 12 }}>
              <Input
                label="End date"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={(v) => { setEndDate(v); setErrors((p) => ({ ...p, end_date: '' })); }}
                keyboardType="numbers-and-punctuation"
                error={errors.end_date}
                leftIcon={<Ionicons name="stop-circle-outline" size={18} color={colors.primary} />}
              />
            </View>
          </View>
        )}

        {/* Organisation affiliation */}
        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Organisation affiliation <Text style={{ fontWeight: '400', color: colors.textSecondary }}>(optional)</Text></Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 12 }}>
          Tap to select if you collect on behalf of a partner organisation. Leave blank if you're independent.
        </Text>

        {/* Org list — member orgs first, then remaining partner orgs */}
        {orgsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
        ) : displayedOrgs.map((org) => {
          const active = selectedOrgId === org.id;
          const isMember = confirmedMemberOrgs.some((o) => o.id === org.id);
          return (
            <TouchableOpacity
              key={org.id}
              onPress={() => {
                if (active) {
                  setOrgId(null);
                  setInviteToken('');
                  setErrors((p) => ({ ...p, invite_token: '' }));
                } else {
                  setOrgId(org.id);
                  setInviteToken('');
                  setErrors((p) => ({ ...p, invite_token: '' }));
                }
              }}
              activeOpacity={0.8}
              style={[s.optionRow, { backgroundColor: active ? colors.primaryTint : colors.surface, borderColor: active ? colors.primary : colors.border, ...Shadow.card(colors.black) }]}
              accessibilityRole="radio"
              accessibilityLabel={org.name}
              accessibilityState={{ checked: active }}
            >
              <View style={[s.orgIcon, { backgroundColor: active ? colors.primary : colors.border }]}>
                <Ionicons name="business-outline" size={14} color={colors.white} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.primary : colors.textPrimary }}>{org.name}</Text>
                {isMember ? (
                  <Text style={{ fontSize: FontSize.xs, color: colors.success, marginTop: 2 }}>You are a member</Text>
                ) : org.registration_number ? (
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>RC {org.registration_number}</Text>
                ) : null}
              </View>
              {org.is_verified && (
                <Ionicons name="shield-checkmark" size={16} color={active ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
              )}
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}

        {/* Invite token — only required when selecting an org the user hasn't joined yet */}
        {selectedOrgId !== null && !isAlreadyMember && (
          <View style={{ marginTop: 16 }}>
            <Input
              label="Organisation invite token"
              placeholder="Paste the token sent to you by the org admin"
              value={inviteToken}
              onChangeText={(v) => { setInviteToken(v); setErrors((p) => ({ ...p, invite_token: '' })); }}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.invite_token}
              leftIcon={<Ionicons name="key-outline" size={18} color={colors.primary} />}
            />
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 6, lineHeight: 18 }}>
              The admin of this organisation must invite you first. If you haven't received a token, contact them.
            </Text>
          </View>
        )}

        {errors.general ? (
          <Text style={{ color: colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' }} accessibilityRole="alert" accessibilityLiveRegion="assertive">{errors.general}</Text>
        ) : null}

        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 24, marginBottom: 20 }} />

        <Button label="Create Group" onPress={handleSubmit} loading={mutation.isPending} style={{ backgroundColor: colors.success }} />
        <View style={{ height: insets.bottom + 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { paddingHorizontal: 24, paddingTop: 24 },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: 10,
  },
  dot: { width: 18, height: 18, borderRadius: 9 },
  orgIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

