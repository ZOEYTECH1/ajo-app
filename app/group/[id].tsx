import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import { groupService, type Payment, type Cycle, type Group, type CollectionSlot } from '../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Skeleton, Pill, LoadingOverlay } from '../../src/components';

// ─── Invite Code card ─────────────────────────────────────────────────────────
const InviteCard: React.FC<{ groupId: number; inviteCode: string; isAdmin: boolean; colors: any }> = ({
  groupId, inviteCode, isAdmin, colors,
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

        {isAdmin && (
          <TouchableOpacity
            onPress={() => regenMutation.mutate()}
            disabled={regenMutation.isPending}
            style={[s.inviteBtn, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Regenerate invite code"
          >
            <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ fontSize: FontSize.xs, color: colors.primary, opacity: 0.7, marginTop: 8 }}>
        Share this code with people you want to invite. Tap refresh to generate a new code.
      </Text>
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const freqLabel = (f: string) => ({ daily: 'Daily contribution', weekly: 'Weekly contribution', monthly: 'Monthly contribution' }[f] ?? f);

const computePeriodLabel = (cycle: Cycle, group: Group): string => {
  const diffDays = Math.max(0, Math.floor((Date.now() - new Date(cycle.start_date).getTime()) / 86_400_000));
  switch (group.contribution_frequency) {
    case 'monthly': return `Month ${Math.floor(diffDays / 30) + 1}`;
    case 'weekly':  return `Week ${Math.floor(diffDays / 7) + 1}`;
    default:        return `Day ${diffDays + 1}`;
  }
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

// ─── Cycle status card ────────────────────────────────────────────────────────
const CycleCard: React.FC<{ cycle: Cycle | undefined; group: Group | undefined; colors: any }> = ({ cycle, group, colors }) => {
  if (!cycle) {
    return (
      <View style={[s.cycleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="time-outline" size={20} color={colors.textTertiary} />
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginLeft: 8 }}>
          No active cycle
        </Text>
      </View>
    );
  }

  const sc = statusColor(cycle.status, colors);
  const end = new Date(cycle.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  const periodLabel = group ? computePeriodLabel(cycle, group) : null;

  return (
    <View style={[s.cycleCard, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            Cycle {cycle.cycle_number}
          </Text>
          {periodLabel && <Pill label={periodLabel} bg={colors.primaryTint} color={colors.primary} />}
          <Pill label={cycle.status} bg={sc.bg} color={sc.fg} />
        </View>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
          Ends {end}
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

  const joinMutation = useMutation({
    mutationFn: () => groupService.joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const handleJoinPress = () => {
    if (!user?.profile_photo) {
      Alert.alert(
        'Profile Photo Required',
        'Upload a profile photo before joining a group.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/profile' as any) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    joinMutation.mutate();
  };

  const isGroupAdmin = group?.admin.id === user?.id;
  const activeCycle  = cycles?.find((c) => c.status === 'active');

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

  // Effective slot wraps around after a full round: cycle 1→slot 1, cycle N+1→slot 1 again
  const activeCycleNumber = activeCycle?.cycle_number ?? null;
  const totalMembers = collectionOrder?.length ?? 1;
  const effectiveSlot = activeCycleNumber != null
    ? ((activeCycleNumber - 1) % totalMembers) + 1
    : null;

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
      <LoadingOverlay visible={joinMutation.isPending} message="Sending join request…" />

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

          {/* ── Invite code ── */}
          <InviteCard groupId={groupId} inviteCode={group.invite_code} isAdmin={isGroupAdmin} colors={colors} />

          {/* ── Cycle Status ── */}
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>
            Current Cycle
          </Text>
          {cyclesLoading ? (
            <Skeleton width="100%" height={64} radius={Radius.lg} style={{ marginBottom: 20 }} />
          ) : (
            <View style={{ marginBottom: 20 }}>
              <CycleCard cycle={activeCycle} group={group} colors={colors} />
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

          {/* ── Join button (non-member) ── */}
          {!isGroupAdmin && (
            <TouchableOpacity
              onPress={handleJoinPress}
              disabled={joinMutation.isPending}
              style={[s.joinBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Request to Join"
            >
              <Ionicons name="person-add-outline" size={18} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: FontSize.md, fontWeight: '700', marginLeft: 8 }}>
                Request to Join
              </Text>
            </TouchableOpacity>
          )}
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
  cycleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
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
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.full,
    marginTop: 8,
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
