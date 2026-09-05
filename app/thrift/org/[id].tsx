import { useState } from 'react';
import {
  View, Text, StatusBar, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, Alert, Modal, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { thriftService, type ThriftOrgMember, type ThriftGroup, type CollectorReport } from '../../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Button, Input, LoadingOverlay, Skeleton, feedback } from '../../../src/components';

type Tab = 'collectors' | 'groups' | 'reports';

const REPORT_STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  reviewed:  '#3B82F6',
  resolved:  '#10B981',
  dismissed: '#6B7280',
};

const REPORT_STATUS_LABEL: Record<string, string> = {
  pending:   'Pending',
  reviewed:  'Under Review',
  resolved:  'Resolved',
  dismissed: 'Dismissed',
};

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ orgId, visible, onClose }: { orgId: number; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.inviteCollector(orgId, email.trim().toLowerCase()),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-org', orgId] });
      setEmail('');
      setError('');
      onClose();
    },
    onError: (err: any) => {
      feedback('error');
      const d = err.response?.data ?? {};
      setError(d.email ?? d.detail ?? 'Could not send invite.');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: 24 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }} accessibilityRole="header">Invite Collector</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
            Enter the email address of the person you want to invite as a collector.
          </Text>
          <Input
            label="Email address"
            placeholder="collector@email.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.primary} />}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <Button label="Cancel" onPress={onClose} variant="outline" style={{ flex: 1 }} />
            <Button label="Send Invite" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!email.trim()} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Report resolution modal ──────────────────────────────────────────────────

function ResolveReportModal({
  orgId, report, visible, onClose,
}: { orgId: number; report: CollectorReport | null; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const resolveMutation = useMutation({
    mutationFn: (action: 'resolve' | 'dismiss' | 'review') =>
      thriftService.resolveReport(orgId, report!.id, action, notes),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-org', orgId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-org-reports', orgId] });
      setNotes('');
      onClose();
    },
    onError: () => feedback('error'),
  });

  if (!report) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: 24 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }} accessibilityRole="header">Review Report</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 4 }}>Reason:</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, marginBottom: 16, lineHeight: 20 }}>{report.reason}</Text>
          <Input
            label="Resolution notes (optional)"
            placeholder="What action was taken?"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => resolveMutation.mutate('review')}
              style={[s.actionBtn, { backgroundColor: '#3B82F6' }]}
              accessibilityRole="button"
              accessibilityLabel="Mark reviewed">
              <Text style={s.actionBtnLabel}>Mark Reviewed</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => resolveMutation.mutate('resolve')}
              style={[s.actionBtn, { backgroundColor: colors.success }]}
              accessibilityRole="button"
              accessibilityLabel="Resolve report">
              <Text style={s.actionBtnLabel}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => resolveMutation.mutate('dismiss')}
              style={[s.actionBtn, { backgroundColor: colors.textSecondary }]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss report">
              <Text style={s.actionBtnLabel}>Dismiss</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Collector groups modal ───────────────────────────────────────────────────

function CollectorGroupsModal({
  collector, groups, visible, onClose,
}: {
  collector: ThriftOrgMember | null;
  groups: ThriftGroup[];
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  if (!collector) return null;

  const collectorGroups = groups.filter((g) => g.collector.id === collector.user.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={[s.avatar, { backgroundColor: colors.primaryTint }]}>
              <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.primary }}>
                {collector.user.first_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary }}>
                {collector.user.first_name} {collector.user.last_name}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>
                {collectorGroups.length} group{collectorGroups.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Groups list */}
          <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {collectorGroups.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="wallet-outline" size={48} color={colors.border} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  This collector has no groups yet.
                </Text>
              </View>
            ) : (
              collectorGroups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => { onClose(); router.push(`/thrift/${g.uuid}` as any); }}
                  activeOpacity={0.8}
                  style={[s.card, { backgroundColor: colors.background, borderColor: colors.border, ...Shadow.soft(colors.black) }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open group: ${g.name}`}
                >
                  <View style={[s.avatar, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="wallet-outline" size={18} color={colors.success} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{g.name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                      {g.frequency} circle · {g.member_count} payer{g.member_count !== 1 ? 's' : ''}
                    </Text>
                    <View style={[s.pill, { backgroundColor: g.active_cycle ? colors.successLight : colors.background, marginTop: 6, borderWidth: g.active_cycle ? 0 : 1, borderColor: colors.border }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: g.active_cycle ? colors.success : colors.textTertiary }}>
                        {g.active_cycle ? `CYCLE #${g.active_cycle.cycle_number} ACTIVE` : 'NO ACTIVE CYCLE'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OrgDashboardRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orgId  = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab]                 = useState<Tab>('collectors');
  const [inviteVisible, setInvite]    = useState(false);
  const [selectedReport, setReport]   = useState<CollectorReport | null>(null);
  const [resolveVisible, setResolve]  = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('all');
  const [collectorGroups, setCollectorGroups] = useState<ThriftOrgMember | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['thrift-org', orgId],
    queryFn:  () => thriftService.getOrgDashboard(orgId),
  });

  const { data: allReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['thrift-org-reports', orgId, reportFilter],
    queryFn:  () => thriftService.getOrgReports(orgId, reportFilter === 'all' ? undefined : reportFilter),
    enabled:  !!orgId,
  });

  const memberActionMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: 'approve' | 'suspend' | 'activate' | 'reject' | 'remove' }) =>
      thriftService.orgMemberAction(orgId, memberId, action),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-org', orgId] });
    },
    onError: () => feedback('error'),
  });

  const confirmMemberAction = (member: ThriftOrgMember, action: 'approve' | 'suspend' | 'activate' | 'reject' | 'remove') => {
    const labels = { approve: 'Approve', suspend: 'Suspend', activate: 'Reactivate', reject: 'Reject', remove: 'Remove' };
    const destructive = action === 'remove' || action === 'reject';
    Alert.alert(
      `${labels[action]} Collector`,
      `${labels[action]} ${member.user.first_name} ${member.user.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: labels[action], style: destructive ? 'destructive' : 'default',
          onPress: () => memberActionMutation.mutate({ memberId: member.id, action }) },
      ],
    );
  };

  const org = data?.organization;

  const pendingCount = data?.pending_collectors?.length ?? 0;

  const handleExport = async () => {
    if (!data) return;
    const fmt = (n: number) => n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lines = [
      `Organisation Report: ${org?.name ?? ''}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      '=== PAYMENT SUMMARY ===',
      'Total,Confirmed,Disputed,Pending,Total Collected (₦),Savings Mobilization (%)',
      `${data.payment_stats.total},${data.payment_stats.confirmed},${data.payment_stats.disputed},${data.payment_stats.pending},${fmt(data.payment_stats.total_collected)},${data.payment_stats.savings_mobilization}`,
      '',
      '=== COLLECTORS ===',
      'Name,Status,Mobilization Rate (%),Dispute Rate (%),₦ Collected,Groups',
      ...(data.collectors).map((m) => {
        const st = data.collector_stats?.[m.id];
        const gCount = data.groups.filter((g) => g.collector.id === m.user.id).length;
        return `"${m.user.first_name} ${m.user.last_name}","${m.status}","${st?.mobilization_rate ?? 'N/A'}","${st?.dispute_rate ?? 'N/A'}","${fmt(st?.confirmed_amount ?? 0)}","${gCount}"`;
      }),
      '',
      '=== GROUPS ===',
      'Name,Payout Cycle,Cycle Type,Members,Collector',
      ...(data.groups).map((g) => `"${g.name}","${g.frequency}","${g.cycle_type}","${g.member_count}","${g.collector.first_name} ${g.collector.last_name}"`),
    ];
    await Share.share({ message: lines.join('\n'), title: `${org?.name ?? 'Org'} Report` });
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'collectors', label: `Collectors (${data?.collectors.length ?? 0})${pendingCount ? ` · ${pendingCount} pending` : ''}` },
    { key: 'groups',     label: `Groups (${data?.groups.length ?? 0})` },
    { key: 'reports',    label: `Reports (${allReports.filter(r => r.status === 'pending').length} pending)` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={memberActionMutation.isPending} message="Updating…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1} accessibilityRole="header">
            {org?.name ?? 'Organisation'}
          </Text>
          {org && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>
              {org.org_type.toUpperCase()}{org.registration_number ? ` · ${org.registration_number}` : ''}
            </Text>
          )}
        </View>
        {org?.is_verified && (
          <View style={[s.verifiedBadge, { backgroundColor: colors.successLight }]}>
            <Ionicons name="shield-checkmark" size={12} color={colors.success} />
            <Text style={{ fontSize: 10, color: colors.success, fontWeight: '700', marginLeft: 3 }}>Verified</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => router.push(`/thrift/org/${orgId}/billing` as any)}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
          style={{ marginLeft: 8 }}
          accessibilityRole="button"
          accessibilityLabel="View billing"
        >
          <Ionicons name="receipt-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        {data && (
          <TouchableOpacity onPress={handleExport} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} style={{ marginLeft: 8 }} accessibilityRole="button" accessibilityLabel="Export organisation report">
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={s.tabBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: tab === t.key }}>
            <Text style={[s.tabLabel, { color: tab === t.key ? colors.primary : colors.textSecondary, fontWeight: tab === t.key ? '700' : '400' }]}>
              {t.label}
            </Text>
            {tab === t.key && <View style={[s.tabUnderline, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <View style={{ padding: 16 }}>
          <Skeleton width="60%" height={20} radius={6} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={80} radius={12} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={80} radius={12} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={80} radius={12} />
        </View>
      )}

      {isError && !isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={{ color: colors.error, fontSize: FontSize.md, fontWeight: '700', marginTop: 12 }}>Could not load dashboard</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: Radius.md }} accessibilityRole="button" accessibilityLabel="Retry">
            <Text style={{ color: colors.white, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <View style={{ flex: 1 }}>

        {/* Financial summary banner */}
        {data && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: colors.successLight, borderRadius: Radius.md, padding: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>TOTAL COLLECTED</Text>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.success, marginTop: 2 }}>
                  ₦{data.payment_stats.total_collected.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.primaryTint, borderRadius: Radius.md, padding: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>SAVINGS MOBILIZATION</Text>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.primary, marginTop: 2 }}>
                  {data.payment_stats.savings_mobilization}%
                </Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>
                  {data.payment_stats.confirmed}/{data.payment_stats.total} payments
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sticky invite button — sits above the scroll area */}
        {tab === 'collectors' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: colors.background }}>
            <Button
              label="+ Invite Collector"
              onPress={() => setInvite(true)}
              style={{ backgroundColor: colors.primary }}
            />
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >

        {/* ── Collectors tab ── */}
        {tab === 'collectors' && (
          <>

            {/* Pending approval */}
            {(data?.pending_collectors ?? []).length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Text style={{ fontSize: FontSize.xs, color: '#F59E0B', fontWeight: '700', marginHorizontal: 10 }}>
                    PENDING APPROVAL
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>
                {(data?.pending_collectors ?? []).map((m) => (
                  <View key={m.id} style={[s.card, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <View style={[s.avatar, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: '#D97706' }}>
                        {m.user.first_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                        {m.user.first_name} {m.user.last_name}
                      </Text>
                      <View style={[s.pill, { backgroundColor: '#FDE68A', marginTop: 6 }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>AWAITING APPROVAL</Text>
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity onPress={() => confirmMemberAction(m, 'approve')} style={[s.miniBtn, { borderColor: colors.success }]} accessibilityRole="button" accessibilityLabel={`Approve ${m.user.first_name} ${m.user.last_name}`}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmMemberAction(m, 'reject')} style={[s.miniBtn, { borderColor: colors.error }]} accessibilityRole="button" accessibilityLabel={`Reject ${m.user.first_name} ${m.user.last_name}`}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.error }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '700', marginHorizontal: 10 }}>
                    ACTIVE
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>
              </>
            )}

            {(data?.collectors ?? []).map((m) => {
              const groupCount = (data?.groups ?? []).filter((g) => g.collector.id === m.user.id).length;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setCollectorGroups(m)}
                  activeOpacity={0.8}
                  style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.user.first_name} ${m.user.last_name}, view groups`}
                >
                  {/* Identity + actions row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.avatar, { backgroundColor: colors.primaryTint }]}>
                      <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.primary }}>
                        {m.user.first_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                        {m.user.first_name} {m.user.last_name}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <View style={[s.pill, { backgroundColor: m.status === 'active' ? colors.successLight : colors.errorLight }]}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: m.status === 'active' ? colors.success : colors.error }}>
                            {m.status.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: colors.primaryTint }]}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                            {groupCount} group{groupCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                      {m.status === 'active' ? (
                        <TouchableOpacity onPress={() => confirmMemberAction(m, 'suspend')} style={[s.miniBtn, { borderColor: '#F59E0B' }]} accessibilityRole="button" accessibilityLabel={`Suspend ${m.user.first_name} ${m.user.last_name}`}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B' }}>Suspend</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => confirmMemberAction(m, 'activate')} style={[s.miniBtn, { borderColor: colors.success }]} accessibilityRole="button" accessibilityLabel={`Activate ${m.user.first_name} ${m.user.last_name}`}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>Activate</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => confirmMemberAction(m, 'remove')} style={[s.miniBtn, { borderColor: colors.error }]} accessibilityRole="button" accessibilityLabel={`Remove ${m.user.first_name} ${m.user.last_name}`}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.error }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Performance metrics row */}
                  {(() => {
                    const st = data?.collector_stats?.[m.id];
                    const mob  = st?.mobilization_rate ?? null;
                    const disp = st?.dispute_rate ?? null;
                    const mobColor  = mob  === null ? colors.textTertiary : mob  >= 90 ? colors.success : mob  >= 70 ? '#D97706' : colors.error;
                    const dispColor = disp === null ? colors.textTertiary : disp <=  5 ? colors.success : disp <= 15 ? '#D97706' : colors.error;
                    return (
                      <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.6 }}>MOBILIZATION</Text>
                          <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: mobColor, marginTop: 2 }}>
                            {mob === null ? '—' : `${mob}%`}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.6 }}>DISPUTE RATE</Text>
                          <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: dispColor, marginTop: 2 }}>
                            {disp === null ? '—' : `${disp}%`}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.6 }}>₦ COLLECTED</Text>
                          <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary, marginTop: 2 }}>
                            {st ? `₦${st.confirmed_amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}` : '—'}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </TouchableOpacity>
              );
            })}
            {!isLoading && (data?.collectors ?? []).length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24, fontSize: FontSize.sm }}>
                No collectors yet. Invite one above.
              </Text>
            )}
          </>
        )}

        {/* ── Groups tab ── */}
        {tab === 'groups' && (
          <>
            {(data?.groups ?? []).map((g) => (
              <TouchableOpacity key={g.id} onPress={() => router.push(`/thrift/${g.uuid}` as any)} activeOpacity={0.85}
                style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Open group: ${g.name}`}
              >
                <View style={[s.avatar, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="wallet-outline" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{g.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                    {g.collector.first_name} {g.collector.last_name} · {g.frequency} · {g.member_count} payers
                  </Text>
                  <View style={[s.pill, { backgroundColor: colors.successLight, marginTop: 6 }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>
                      {g.cycle_type === 'fixed' ? 'FIXED CYCLE' : 'ROLLING'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            {!isLoading && (data?.groups ?? []).length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24, fontSize: FontSize.sm }}>
                No groups yet. Collectors create groups from their home screen.
              </Text>
            )}
          </>
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <>
            {/* Status filter pills */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setReportFilter(f)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
                    backgroundColor: reportFilter === f ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: reportFilter === f ? colors.primary : colors.border,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${f}`}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: reportFilter === f ? '#fff' : colors.textSecondary, textTransform: 'capitalize' }}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {reportsLoading ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 16, fontSize: FontSize.sm }}>Loading reports…</Text>
            ) : allReports.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24, fontSize: FontSize.sm }}>
                No {reportFilter !== 'all' ? reportFilter : ''} reports found.
              </Text>
            ) : allReports.map((r) => (
              <View key={r.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={[s.pill, { backgroundColor: `${REPORT_STATUS_COLOR[r.status]}20` }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: REPORT_STATUS_COLOR[r.status] }}>
                      {REPORT_STATUS_LABEL[r.status] ?? r.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, lineHeight: 20 }} numberOfLines={3}>
                  {r.reason}
                </Text>
                {(r.status === 'pending' || r.status === 'reviewed') && (
                  <TouchableOpacity
                    onPress={() => { setReport(r); setResolve(true); }}
                    style={[s.miniBtn, { borderColor: colors.primary, alignSelf: 'flex-end' }]}
                    accessibilityRole="button"
                    accessibilityLabel="Review report"
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
        </ScrollView>
        </View>
      )}

      <InviteModal orgId={orgId} visible={inviteVisible} onClose={() => setInvite(false)} />
      <ResolveReportModal orgId={orgId} report={selectedReport} visible={resolveVisible} onClose={() => { setResolve(false); setReport(null); }} />
      <CollectorGroupsModal
        collector={collectorGroups}
        groups={data?.groups ?? []}
        visible={!!collectorGroups}
        onClose={() => setCollectorGroups(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: FontSize.xs },
  tabUnderline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md, borderWidth: 1, marginBottom: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1.5 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, marginBottom: 12 },
  actionBtn: { flex: 1, padding: 10, borderRadius: Radius.sm, alignItems: 'center', minWidth: 90 },
  actionBtnLabel: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
});

