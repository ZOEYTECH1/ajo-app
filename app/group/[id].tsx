import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import { groupService, type Payment, type Cycle, type Group, type CollectionSlot } from '../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Skeleton, Pill } from '../../src/components';

// ─── Invite Code card ─────────────────────────────────────────────────────────
const InviteCard: React.FC<{ groupId: number; inviteCode: string; colors: any }> = ({
  groupId, inviteCode, colors,
}) => {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const regenMutation = useMutation({
    mutationFn: () => groupService.regenerateInviteCode(groupId),
    onSuccess: (data) => {
      queryClient.setQueryData(['group', groupId], (old: any) =>
        old ? { ...old, invite_code: data.invite_code } : old,
      );
    },
  });

  const handleCopy = () => {
    Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[s.inviteCard, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Ionicons name="key-outline" size={16} color={colors.primary} />
        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.primary, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Invite Code
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.primary, letterSpacing: 2, flex: 1 }}>
          {regenMutation.isPending ? '········' : inviteCode}
        </Text>

        <TouchableOpacity
          onPress={handleCopy}
          style={[s.inviteBtn, { backgroundColor: copied ? colors.successLight : colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Invite code copied' : 'Copy invite code'}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? colors.successDark : colors.primary}
          />
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: copied ? colors.successDark : colors.primary, marginLeft: 4 }}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => regenMutation.mutate()}
          disabled={regenMutation.isPending}
          style={[s.inviteBtn, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Regenerate invite code"
        >
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: FontSize.xs, color: colors.primary, opacity: 0.7, marginTop: 8 }}>
        Share this code with people you want to invite. Tap refresh to generate a new code.
      </Text>
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const freqLabel = (f: string) => ({ daily: 'Daily contribution', weekly: 'Weekly contribution', monthly: 'Monthly contribution' }[f] ?? f);

// Derived from the cycle's own end_date/is_over (server-authoritative) rather
// than reconstructing an independent day-count from start_date — a cycle IS
// one period now (see Group.compute_cycle_end_date on the backend), so
// showing "Month 2" for an overdue monthly cycle was actively misleading:
// it implied normal ongoing progress rather than "this should have closed already."
const computePeriodLabel = (cycle: Cycle): string => {
  const diffDays = Math.round((new Date(cycle.end_date).getTime() - Date.now()) / 86_400_000);
  if (cycle.is_over) {
    const overdue = Math.abs(diffDays);
    return `Overdue ${overdue} day${overdue === 1 ? '' : 's'}`;
  }
  if (diffDays === 0) return 'Ends today';
  return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
};

// A cycle is already fully live (collecting, payable) from the moment it's
// created, regardless of start_date — this label is purely so a cycle
// dated for the future doesn't show a misleading end-date countdown before
// it's actually begun. It does not affect payment/collection behavior.
const computeStartLabel = (cycle: Cycle): string | null => {
  const diffDays = Math.round((new Date(cycle.start_date).getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 0) return null;
  if (diffDays === 1) return 'Starts tomorrow';
  return `Starts in ${diffDays} days`;
};

const formatAmt = (v: string | number) => `₦${Number(v).toLocaleString()}`;

const statusColor = (status: string, colors: any) => ({
  pending:  { bg: colors.warningLight, fg: colors.warningDark },
  approved: { bg: colors.successLight, fg: colors.successDark },
  rejected: { bg: colors.errorLight,   fg: colors.errorDark   },
  active:   { bg: colors.primaryTint,  fg: colors.primary      },
  closed:   { bg: colors.border,       fg: colors.textSecondary },
}[status] ?? { bg: colors.border, fg: colors.textSecondary });

// ─── Payment row (read-only — full review handled in /payments screen) ────────
const PaymentRow: React.FC<{ payment: Payment }> = ({ payment }) => {
  const { colors } = useTheme();
  const sc = statusColor(payment.status, colors);

  return (
    <View style={[s.payRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>
          {payment.member_name}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
          {formatAmt(payment.amount_entered)}
          {payment.cycle_number ? ` · Cycle ${payment.cycle_number}` : ''}
        </Text>
      </View>
      <Pill label={payment.status} bg={sc.bg} color={sc.fg} />
    </View>
  );
};

// ─── Round progress bar ─────────────────────────────────────────────────────
const RoundProgressBar: React.FC<{ slot: number; total: number; colors: any; tint: string; track: string }> = ({
  slot, total, colors, tint, track,
}) => {
  const pct = total > 0 ? Math.min(100, Math.max(0, (slot / total) * 100)) : 0;
  return (
    <View style={{ height: 8, borderRadius: Radius.full, backgroundColor: track, overflow: 'hidden' }}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${pct}%`, height: '100%', borderRadius: Radius.full }}
      />
    </View>
  );
};

// ─── Round & Cycle status card ─────────────────────────────────────────────────
const CycleCard: React.FC<{ cycle: Cycle | undefined; roundJustCompleted?: boolean; completedRoundNumber?: number; colors: any }> = ({
  cycle, roundJustCompleted, completedRoundNumber, colors,
}) => {
  if (!cycle) {
    return (
      <View style={[s.roundCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.roundIcon, { backgroundColor: roundJustCompleted ? colors.primaryTint : colors.background }]}>
            <Ionicons name={roundJustCompleted ? 'trophy' : 'time-outline'} size={20} color={roundJustCompleted ? colors.primary : colors.textTertiary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary }}>
              {roundJustCompleted ? `Round ${completedRoundNumber} complete 🎉` : 'No active cycle'}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
              {roundJustCompleted
                ? 'Every member has collected once'
                : 'Start one from the Cycles screen'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const sc = statusColor(cycle.status, colors);
  const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  const start = new Date(cycle.start_date).toLocaleDateString('en-NG', dateOpts);
  const end = new Date(cycle.end_date).toLocaleDateString('en-NG', dateOpts);
  const periodLabel = computePeriodLabel(cycle);
  const startLabel = computeStartLabel(cycle);
  const overdue = cycle.is_over;

  return (
    <View style={[s.roundCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      {/* Top row: round identity + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[s.roundIcon, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="sync" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            Round {cycle.round_number}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>
            Cycle {cycle.cycle_number} of {cycle.total_member_count}
          </Text>
        </View>
        <Pill label={cycle.status} bg={sc.bg} color={sc.fg} />
      </View>

      {/* Progress bar — how far through this round's rotation */}
      <View style={{ marginTop: 16 }}>
        <RoundProgressBar
          slot={startLabel ? 0 : cycle.slot_number}
          total={cycle.total_member_count}
          colors={colors}
          tint={colors.primaryTint}
          track={colors.background}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {startLabel ? (
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textTertiary }}>
              {startLabel}
            </Text>
          ) : (
            <>
              <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>
                Member {cycle.slot_number} of {cycle.total_member_count} collecting
              </Text>
              {periodLabel && (
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: overdue ? colors.error : colors.primary }}>
                  {periodLabel}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Footer: start/end date / early-close info */}
      <View style={[s.roundFooter, { borderTopColor: colors.border }]}>
        <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 6 }}>
          {start} – {end}
          {cycle.force_close_requested
            ? ` · ${cycle.force_close_acceptor_count}/${cycle.total_member_count} accepted early close`
            : ''}
        </Text>
      </View>
    </View>
  );
};

// ─── Quick action button ──────────────────────────────────────────────────────
const ActionBtn: React.FC<{ icon: string; label: string; onPress: () => void; colors: any }> = ({
  icon, label, onPress, colors,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={label}>
    <View style={[s.actionIcon, { backgroundColor: colors.primaryTint }]}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
    </View>
    <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.textPrimary, marginTop: 8, textAlign: 'center' }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Group Detail Screen ──────────────────────────────────────────────────────
export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: group, isLoading: groupLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
    enabled: !!groupId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', groupId],
    queryFn: () => groupService.getPayments(groupId),
    enabled: !!groupId,
  });

  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['cycles', groupId],
    queryFn: () => groupService.getCycles(groupId),
    enabled: !!groupId,
  });

  const { data: collectionOrder } = useQuery({
    queryKey: ['collection-order', groupId],
    queryFn: () => groupService.getCollectionOrder(groupId),
    enabled: !!groupId,
  });

  const [showRules, setShowRules] = useState(false);

  const isGroupAdmin = group?.admin.id === user?.id;
  const activeCycle  = cycles?.find((c) => c.status === 'active');

  // A Round is a full rotation — every member has collected once. If the
  // last closed cycle was the round's last slot and no new cycle has
  // started yet, nudge the admin — they can also just start one anytime
  // from the Cycles screen regardless, this isn't a hard gate.
  const lastClosedCycle = cycles
    ? [...cycles].filter((c) => c.status === 'closed').sort((a, b) => b.cycle_number - a.cycle_number)[0]
    : undefined;
  const roundJustCompleted = !activeCycle && !!lastClosedCycle
    && lastClosedCycle.slot_number >= lastClosedCycle.total_member_count;

  // Pending items count (admin only)
  const pendingPayments = payments?.filter((p) => p.status === 'pending').length ?? 0;

  // Total approved contributions across all members in this group
  const totalGroupContributions = (payments ?? [])
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + parseFloat(p.amount_entered), 0);

  // Paid members = approved payments in the active cycle (or all if no cycle)
  const approvedPayments = (payments ?? []).filter((p) => {
    if (p.status !== 'approved') return false;
    if (activeCycle) return p.cycle_number === activeCycle.cycle_number;
    return true;
  });

  // The cycle's own slot_number (server-computed, wraps back to 1 once a
  // full Round completes) — not re-derived from cycle_number here, since
  // that would need the member count *at the time the cycle was created*,
  // not the current count.
  const activeCycleNumber = activeCycle?.cycle_number ?? null;
  const effectiveSlot = activeCycle?.slot_number ?? null;

  const currentCollector: CollectionSlot | undefined = effectiveSlot != null
    ? collectionOrder?.find((s) => s.collection_slot === effectiveSlot)
    : collectionOrder?.[0];

  if (groupLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 52, marginBottom: 24 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Skeleton width="60%" height={24} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 24 }} />
        <Skeleton width="100%" height={80} radius={Radius.lg} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={80} radius={Radius.lg} />
      </View>
    );
  }

  if (isError || !group) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="warning-outline" size={48} color={colors.error} />
        <Text style={{ fontSize: FontSize.md, color: colors.textPrimary, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
          Could not load group
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16 }} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Header ── */}
        <View style={[s.groupHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: '#FFF', marginBottom: 4 }}>
                {group.name}
              </Text>
              {!!group.description && (
                <Text style={{ fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 18 }}>
                  {group.description}
                </Text>
              )}
              {!!group.rules && (
                <>
                  <TouchableOpacity
                    onPress={() => setShowRules(r => !r)}
                    style={{ marginTop: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={showRules ? 'Hide group rules' : 'View group rules'}
                  >
                    <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                      {showRules ? '▲ Hide rules' : '▼ View rules'}
                    </Text>
                  </TouchableOpacity>
                  {showRules && (
                    <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 6, lineHeight: 18 }}>
                      {group.rules}
                    </Text>
                  )}
                </>
              )}
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
                Admin: {group.admin.first_name} {group.admin.last_name}
              </Text>
              {(activeCycle || roundJustCompleted) && (
                <View style={[s.roundHeaderPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Ionicons name={roundJustCompleted ? 'trophy' : 'sync'} size={12} color="#FFF" />
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFF', marginLeft: 5 }}>
                    {activeCycle
                      ? `Round ${activeCycle.round_number} · Cycle ${activeCycle.cycle_number}`
                      : `Round ${lastClosedCycle?.round_number} complete`}
                  </Text>
                </View>
              )}
            </View>
            {isGroupAdmin && (
              <View style={[s.adminBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFF' }}>Admin</Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={[s.statsRow, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={s.statItem}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }}>
                {formatAmt(group.contribution_amount)}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                {freqLabel(group.contribution_frequency)}
              </Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }}>
                {group.member_count}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>Members</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              {paymentsLoading ? (
                <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: 'rgba(255,255,255,0.4)' }}>—</Text>
              ) : (
                <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmt(totalGroupContributions)}
                </Text>
              )}
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>Cycle collection</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* ── Subscription status ── */}
          {(group.is_on_trial || !group.is_subscription_active) && (
            <TouchableOpacity
              onPress={() => router.push(`/group/${groupId}/subscription` as any)}
              style={[s.alertBanner, {
                backgroundColor: group.is_on_trial ? colors.primaryTint : colors.errorLight,
                borderColor: group.is_on_trial ? colors.primaryBorder : colors.error,
                marginBottom: 12,
              }]}
              accessibilityRole="button"
              accessibilityLabel={group.is_on_trial ? 'Trial active — tap to upgrade' : 'Subscription inactive — tap to renew'}
            >
              <Ionicons name="shield-outline" size={18} color={group.is_on_trial ? colors.primary : colors.error} />
              <Text style={{ fontSize: FontSize.sm, color: group.is_on_trial ? colors.primary : colors.error, flex: 1, marginLeft: 8, fontWeight: '600' }}>
                {group.is_on_trial ? 'Trial active — upgrade to continue' : 'Subscription inactive — renew now'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={group.is_on_trial ? colors.primary : colors.error} />
            </TouchableOpacity>
          )}

          {/* ── Pending alert (admin only) ── */}
          {isGroupAdmin && pendingPayments > 0 && (
            <TouchableOpacity
              onPress={() => router.push(`/group/${groupId}/payments` as any)}
              style={[s.alertBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}
              accessibilityRole="button"
              accessibilityLabel={`${pendingPayments} payment${pendingPayments > 1 ? 's' : ''} awaiting review`}
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.warningDark} />
              <Text style={{ fontSize: FontSize.sm, color: colors.warningDark, flex: 1, marginLeft: 8, fontWeight: '600' }}>
                {pendingPayments} payment{pendingPayments > 1 ? 's' : ''} awaiting your review
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.warningDark} />
            </TouchableOpacity>
          )}

          {/* ── Invite code card (admin only) ── */}
          {isGroupAdmin && (
            <InviteCard groupId={groupId} inviteCode={group.invite_code} colors={colors} />
          )}

          {/* ── Round & Cycle Status ── */}
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>
            Round Progress
          </Text>
          {cyclesLoading ? (
            <Skeleton width="100%" height={64} radius={Radius.lg} style={{ marginBottom: 20 }} />
          ) : (
            <View style={{ marginBottom: 20 }}>
              <CycleCard
                cycle={activeCycle}
                roundJustCompleted={roundJustCompleted}
                completedRoundNumber={lastClosedCycle?.round_number}
                colors={colors}
              />
            </View>
          )}

          {/* ── Collection Schedule ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>
              Collection Schedule
            </Text>
            {isGroupAdmin && (
              <TouchableOpacity onPress={() => router.push(`/group/${groupId}/collection-order` as any)} accessibilityRole="button" accessibilityLabel="Edit collection order">
                <Text style={{ fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' }}>Edit Order</Text>
              </TouchableOpacity>
            )}
          </View>

          {currentCollector && (
            <View style={[s.collectorCard, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
              <Ionicons name="trophy-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: FontSize.xs, color: colors.primary, fontWeight: '600' }}>
                  {activeCycleNumber ? `Cycle ${activeCycleNumber} collector` : 'Next to collect'}
                </Text>
                <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.primary }}>
                  {currentCollector.full_name}
                </Text>
              </View>
            </View>
          )}

          {collectionOrder && collectionOrder.length > 0 && (
            <View style={[s.section, { backgroundColor: colors.surface, ...Shadow.card(colors.black), marginBottom: 20 }]}>
              {collectionOrder.map((slot, idx) => {
                const isCurrentCollector = effectiveSlot != null && slot.collection_slot === effectiveSlot;
                return (
                  <View
                    key={slot.id}
                    style={[
                      s.slotRow,
                      idx < collectionOrder.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[s.slotBadge, { backgroundColor: isCurrentCollector ? colors.primary : colors.background }]}>
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: isCurrentCollector ? '#FFF' : colors.textTertiary }}>
                        {slot.collection_slot}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, marginLeft: 10, fontSize: FontSize.sm, fontWeight: isCurrentCollector ? '700' : '500', color: isCurrentCollector ? colors.primary : colors.textPrimary }}>
                      {slot.full_name}
                    </Text>
                    {isCurrentCollector && (
                      <Pill label="Now" bg={colors.primaryTint} color={colors.primary} />
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Quick actions ── */}
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
            Actions
          </Text>
          <View style={s.actionsGrid}>
            <ActionBtn
              icon="cash-outline"
              label="Submit Payment"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/submit-payment` as any)}
            />
            <ActionBtn
              icon="people-outline"
              label="Members"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/members` as any)}
            />
            <ActionBtn
              icon="receipt-outline"
              label="Payments"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/payments` as any)}
            />
            <ActionBtn
              icon="trophy-outline"
              label="Who Collected"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/collection-history` as any)}
            />
            {activeCycle && (
              <ActionBtn
                icon="alert-circle-outline"
                label="Defaulters"
                colors={colors}
                onPress={() => router.push(`/group/${groupId}/defaulters/${activeCycle.id}` as any)}
              />
            )}
            {isGroupAdmin && (
              <ActionBtn
                icon="refresh-circle-outline"
                label="Cycles"
                colors={colors}
                onPress={() => router.push(`/group/${groupId}/cycles` as any)}
              />
            )}
            {isGroupAdmin && (
              <ActionBtn
                icon="card-outline"
                label="Subscription"
                colors={colors}
                onPress={() => router.push(`/group/${groupId}/subscription` as any)}
              />
            )}
            {isGroupAdmin && (
              <ActionBtn
                icon="settings-outline"
                label="Settings"
                colors={colors}
                onPress={() => router.push(`/group/${groupId}/settings` as any)}
              />
            )}
          </View>

          {/* ── Paid Members ── */}
          <View style={[s.section, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>
                Who Has Paid
              </Text>
              <View style={[s.paidBadge, { backgroundColor: approvedPayments.length > 0 ? colors.successLight : colors.border }]}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: approvedPayments.length > 0 ? colors.success : colors.textSecondary }}>
                  {paymentsLoading ? '…' : `${approvedPayments.length} / ${group.member_count}`}
                </Text>
              </View>
            </View>

            {paymentsLoading ? (
              <>
                <Skeleton width="100%" height={48} radius={Radius.sm} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={48} radius={Radius.sm} />
              </>
            ) : approvedPayments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Ionicons name="time-outline" size={28} color={colors.textTertiary} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 8 }}>
                  No payments approved yet this cycle
                </Text>
              </View>
            ) : (
              approvedPayments.map((p) => {
                const name    = p.member_name || 'Unknown';
                const initial = name.charAt(0).toUpperCase();
                return (
                  <View key={p.id} style={[s.payRow, { borderBottomColor: colors.border }]}>
                    <View style={[s.memberInitial, { backgroundColor: colors.primaryTint }]}>
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: colors.primary }}>
                        {initial}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>
                        {name}
                      </Text>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>
                        {formatAmt(p.amount_entered ?? '0')}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                );
              })
            )}
          </View>

          {/* ── Recent payments ── */}
          <View style={[s.section, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>
                Recent Payments
              </Text>
              <TouchableOpacity onPress={() => router.push(`/group/${groupId}/payments` as any)} accessibilityRole="button" accessibilityLabel="See all payments">
                <Text style={{ fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' }}>See all</Text>
              </TouchableOpacity>
            </View>

            {paymentsLoading ? (
              <>
                <Skeleton width="100%" height={48} radius={Radius.sm} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={48} radius={Radius.sm} />
              </>
            ) : !payments || payments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="document-outline" size={32} color={colors.textTertiary} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 8 }}>
                  No payments yet
                </Text>
              </View>
            ) : (
              payments.slice(0, 5).map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Layout stylesheet ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  groupHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  adminBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  roundCard: {
    padding: 16,
    borderRadius: Radius.xl,
  },
  roundIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  roundHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    width: '47%',
    padding: 16,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inviteCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  collectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  slotBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
});
