import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { groupService, type Group, type Subscription } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Button, LoadingOverlay, feedback } from '../../../src/components';

// Platform fee rates — must match backend _PLATFORM_FEE_RATES
const FEE_RATES: Record<string, number> = { daily: 0.01, weekly: 0.025, monthly: 0.05 };

// Cycle selector options per frequency
const CYCLE_OPTIONS: Record<string, number[]> = {
  daily:   [1, 3, 7, 14, 30],
  weekly:  [1, 2, 4, 8, 12],
  monthly: [1, 2, 3, 6, 12],
};

const CYCLE_UNIT: Record<string, string> = {
  daily: 'day', weekly: 'week', monthly: 'month',
};

const REDIRECT_URL = 'ajo://payment/verify';

const fmt    = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtNGN = (n: number) => `₦${n.toLocaleString('en-NG')}`;

// ─── Cycle chip ───────────────────────────────────────────────────────────────
function CycleChip({
  n, unit, selected, onPress, colors,
}: { n: number; unit: string; selected: boolean; onPress: () => void; colors: any }) {
  const label = `${n} ${unit}${n !== 1 ? 's' : ''}`;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        s.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor:     selected ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
    >
      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: selected ? '#fff' : colors.textPrimary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Result card ─────────────────────────────────────────────────────────────
function ResultCard({
  subscription, group, onDone, colors,
}: { subscription: Subscription; group: Group; onDone: () => void; colors: any }) {
  const success = subscription.status === 'successful';
  return (
    <View style={{ alignItems: 'center', paddingTop: 32 }}>
      <View style={[s.resultIcon, { backgroundColor: success ? colors.successLight : colors.errorLight }]}>
        <Ionicons
          name={success ? 'checkmark-circle' : 'close-circle'}
          size={56}
          color={success ? colors.success : colors.error}
        />
      </View>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 20, textAlign: 'center' }}>
        {success ? 'Payment confirmed!' : 'Payment not confirmed'}
      </Text>
      {success ? (
        <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          <Text style={{ fontWeight: '700', color: colors.primary }}>{group.name}</Text>
          {' '}is now active until{' '}
          <Text style={{ fontWeight: '700', color: colors.primary }}>
            {subscription.extends_until ? fmt(subscription.extends_until) : '—'}
          </Text>
          . You can now approve beyond 10 members.
        </Text>
      ) : (
        <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          We couldn't confirm the payment. If you completed it, wait a moment and try verifying again.
        </Text>
      )}
      <View style={{ width: '100%', marginTop: 32 }}>
        <Button label="Back to Group" onPress={onDone} />
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SubscriptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cycles, setCycles] = useState(1);
  const [result, setResult] = useState<Subscription | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
  });

  const initMutation = useMutation({
    mutationFn: () => groupService.initiateSubscription(groupId, cycles),
    onSuccess: async ({ link }) => {
      const browserResult = await WebBrowser.openAuthSessionAsync(link, REDIRECT_URL);
      if (browserResult.type !== 'success') return;

      const url = browserResult.url;
      const params = new URL(url).searchParams;
      const transaction_id = params.get('transaction_id');
      const payStatus = params.get('status');

      if (!transaction_id || payStatus !== 'successful') {
        feedback('error');
        return;
      }

      setVerifying(true);
      try {
        const sub = await groupService.verifySubscription(groupId, transaction_id);
        feedback(sub.status === 'successful' ? 'success' : 'error');
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        setResult(sub);
      } catch {
        feedback('error');
      } finally {
        setVerifying(false);
      }
    },
    onError: (_err: unknown) => { feedback('error'); },
  });

  const frequency      = group?.contribution_frequency ?? 'monthly';
  const rate           = FEE_RATES[frequency] ?? 0.05;
  const ratePct        = (rate * 100).toFixed(1).replace('.0', '');
  const contribution   = Number(group?.contribution_amount ?? 0);
  const memberCount    = group?.member_count ?? 0;
  const feePerCycle    = contribution * rate * memberCount;
  const total          = feePerCycle * cycles;
  const cycleUnit      = CYCLE_UNIT[frequency] ?? 'month';
  const cycleOptions   = CYCLE_OPTIONS[frequency] ?? CYCLE_OPTIONS.monthly;

  const isActive  = group?.is_subscription_active;
  const isTrial   = group?.is_on_trial;
  const expiresAt = group?.subscription_expires;

  if (loadingGroup) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={initMutation.isPending || verifying} message={verifying ? 'Verifying payment…' : 'Opening payment page…'} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
          Platform Fee
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {result ? (
          <ResultCard subscription={result} group={group!} onDone={() => router.back()} colors={colors} />
        ) : (
          <>
            {/* Current status banner */}
            <View style={[
              s.statusCard,
              {
                backgroundColor: isActive ? colors.successLight : isTrial ? colors.primaryTint : colors.warningLight,
                borderColor:     isActive ? colors.success       : isTrial ? colors.primaryBorder : colors.warning,
              },
            ]}>
              <Ionicons
                name={isActive ? 'shield-checkmark' : isTrial ? 'time' : 'warning'}
                size={20}
                color={isActive ? colors.success : isTrial ? colors.primary : colors.warning}
              />
              <Text style={{
                flex: 1,
                marginLeft: 10,
                fontSize: FontSize.sm,
                fontWeight: '600',
                color: isActive ? colors.successDark : isTrial ? colors.primary : colors.warningDark,
              }}>
                {isActive
                  ? `Active until ${expiresAt ? fmt(expiresAt) : '—'}`
                  : isTrial
                  ? 'Free trial — up to 10 members'
                  : 'No active plan — limited to 10 members'}
              </Text>
            </View>

            {/* Collect-from-members banner */}
            <View style={[s.infoCard, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: FontSize.sm, color: colors.primary, lineHeight: 20 }}>
                Collect{' '}
                <Text style={{ fontWeight: '800' }}>{fmtNGN(contribution * rate)}</Text>
                {' '}from each of your {memberCount} member{memberCount !== 1 ? 's' : ''} (including yourself), then pay the total below.
              </Text>
            </View>

            {/* Fee breakdown */}
            <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.primary) }]}>
              <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 }}>
                Fee breakdown
              </Text>
              <Row label="Members"              value={`${memberCount}`}                                    colors={colors} />
              <Row label="Contribution per cycle" value={fmtNGN(contribution)}                               colors={colors} />
              <Row label="Platform rate"        value={`${ratePct}% per ${cycleUnit}`}                      colors={colors} />
              <Row label="Each member pays you" value={fmtNGN(contribution * rate)}                         colors={colors} />
              <Row label="Cycles selected"      value={`${cycles} ${cycleUnit}${cycles !== 1 ? 's' : ''}`}  colors={colors} />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Row label="Total due to Ajo"     value={fmtNGN(total)} bold                                  colors={colors} />
            </View>

            {/* Cycle selector */}
            <Text style={[s.label, { color: colors.textSecondary }]}>
              Select number of {cycleUnit}s to pay for
            </Text>
            <View style={s.chipRow}>
              {cycleOptions.map((n) => (
                <CycleChip
                  key={n}
                  n={n}
                  unit={cycleUnit}
                  selected={cycles === n}
                  onPress={() => setCycles(n)}
                  colors={colors}
                />
              ))}
            </View>

            {/* What you get */}
            <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.primary) }]}>
              <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary, marginBottom: 10 }}>
                What you get
              </Text>
              {[
                'Approve unlimited members (beyond the free 10)',
                'Full payment history and audit trail',
                'Tamper-evident records for all contributions',
              ].map((text, i) => (
                <View key={i} style={s.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, marginLeft: 8, fontSize: FontSize.sm, color: colors.textPrimary, lineHeight: 20 }}>
                    {text}
                  </Text>
                </View>
              ))}
            </View>

            <Button
              label={`Pay ${fmtNGN(total)}`}
              onPress={() => initMutation.mutate()}
              loading={initMutation.isPending}
              disabled={memberCount === 0}
              style={{ marginTop: 8 }}
            />
            {memberCount === 0 && (
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                You need at least one member before paying.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold, colors }: { label: string; value: string; bold?: boolean; colors: any }) {
  return (
    <View style={s.row}>
      <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: FontSize.sm, fontWeight: bold ? '800' : '500', color: bold ? colors.primary : colors.textPrimary }}>
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
