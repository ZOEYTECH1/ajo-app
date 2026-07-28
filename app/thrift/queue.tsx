import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { thriftService, type QueueMember, type QueuePayment } from '../../src/services/thriftService';
import { FontSize } from '../../src/theme';
import { feedback } from '../../src/components';

const fmtAmt  = (v: string | number) => `₦${Number(v).toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
const initials = (name: string) =>
  name.split(' ').map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, bg }: { name: string; bg: string }) {
  return (
    <View style={[s.avatar, { backgroundColor: bg }]}>
      <Text style={s.avatarText}>{initials(name)}</Text>
    </View>
  );
}

// ─── Member card ───────────────────────────────────────────────────────────────
function MemberCard({
  item,
  onApprove,
  onReject,
  onFlag,
  busy,
}: {
  item: QueueMember;
  onApprove: () => void;
  onReject:  () => void;
  onFlag:    () => void;
  busy:      boolean;
}) {
  const { colors } = useTheme();
  const fullName = `${item.user.first_name} ${item.user.last_name}`.trim();
  const isAmountPending = item.status === 'amount_pending';

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.cardRow}>
        <Avatar name={fullName} bg={colors.successLight} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.cardName, { color: colors.textPrimary }]}>{fullName}</Text>
          <Text style={[s.cardSub, { color: colors.textSecondary }]}>
            {item.group_name}  ·  {fmtAmt(item.personal_amount)}/period
          </Text>
          <Text style={[s.cardMeta, { color: colors.textTertiary }]}>
            Requested {fmtDate(item.created_at)}
          </Text>
        </View>
        {busy && <ActivityIndicator size="small" color={colors.success} />}
      </View>

      {isAmountPending && !!item.flag_reason && (
        <View style={[s.flagBox, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
          <Ionicons name="flag" size={13} color={colors.warning} />
          <Text style={[s.flagText, { color: colors.warning }]}> {item.flag_reason}</Text>
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.successLight, borderColor: colors.success }]}
          onPress={onApprove}
          disabled={busy}
          activeOpacity={0.75}
        >
          <Ionicons name="checkmark" size={15} color={colors.success} />
          <Text style={[s.actionLabel, { color: colors.success }]}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}
          onPress={onFlag}
          disabled={busy}
          activeOpacity={0.75}
        >
          <Ionicons name="flag-outline" size={15} color={colors.warning} />
          <Text style={[s.actionLabel, { color: colors.warning }]}>Flag Amount</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
          onPress={onReject}
          disabled={busy}
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={15} color={colors.error} />
          <Text style={[s.actionLabel, { color: colors.error }]}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Disputed payment card ─────────────────────────────────────────────────────
function DisputeCard({ item, onViewGroup }: { item: QueuePayment; onViewGroup: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.cardRow}>
        <Avatar name={item.member_name} bg={colors.errorLight} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.cardName, { color: colors.textPrimary }]}>{item.member_name}</Text>
          <Text style={[s.cardSub, { color: colors.textSecondary }]}>
            {item.group_name}  ·  {fmtAmt(item.amount)}  ·  {fmtDate(item.period_date)}
          </Text>
          {!!item.dispute_reason && (
            <Text style={[s.cardMeta, { color: colors.error }]} numberOfLines={2}>
              "{item.dispute_reason}"
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[s.viewGroupBtn, { borderColor: colors.border }]}
        onPress={onViewGroup}
        activeOpacity={0.75}
      >
        <Text style={[s.viewGroupLabel, { color: colors.textSecondary }]}>Open group to resolve</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Flag-amount modal ─────────────────────────────────────────────────────────
function FlagModal({
  visible,
  onClose,
  onSubmit,
  busy,
}: {
  visible: boolean;
  onClose:  () => void;
  onSubmit: (reason: string) => void;
  busy:     boolean;
}) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');

  const submit = () => {
    if (reason.trim().length < 3) return;
    onSubmit(reason.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>Flag Contribution Amount</Text>
          <Text style={[s.sheetSub, { color: colors.textSecondary }]}>
            Tell the payer what's wrong with the amount they requested.
          </Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            placeholder="e.g. The minimum contribution is ₦5,000"
            placeholderTextColor={colors.textTertiary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={[s.sheetBtn, { backgroundColor: colors.background, flex: 1 }]}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sheetBtn, { backgroundColor: colors.warning, flex: 1, opacity: reason.trim().length < 3 ? 0.5 : 1 }]}
              onPress={submit}
              disabled={busy || reason.trim().length < 3}
            >
              {busy
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={{ color: '#FFF', fontWeight: '700' }}>Send Flag</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function CollectorQueueScreen() {
  const router     = useRouter();
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const qc         = useQueryClient();

  const [flagTarget, setFlagTarget] = useState<QueueMember | null>(null);
  const [busyId,     setBusyId]     = useState<number | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['thrift-collector-queue'],
    queryFn:  thriftService.getCollectorQueue,
  });

  const reviewMut = useMutation({
    mutationFn: ({ groupId, memberId, action, reason }: {
      groupId: number; memberId: number; action: 'approve' | 'reject' | 'flag_amount'; reason?: string;
    }) => thriftService.reviewMember(groupId, memberId, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-collector-queue'] });
      qc.invalidateQueries({ queryKey: ['thrift-groups'] });
      feedback('success');
    },
    onSettled: () => setBusyId(null),
  });

  const handleAction = useCallback((
    member: QueueMember,
    action: 'approve' | 'reject' | 'flag_amount',
    reason?: string,
  ) => {
    setBusyId(member.id);
    reviewMut.mutate({ groupId: member.group_id, memberId: member.id, action, reason });
  }, [reviewMut]);

  const pendingMembers   = data?.pending_members   ?? [];
  const disputedPayments = data?.disputed_payments ?? [];
  const total = pendingMembers.length + disputedPayments.length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Approval Queue</Text>
        {total > 0 && (
          <View style={[s.badge, { backgroundColor: colors.error }]}>
            <Text style={s.badgeText}>{total > 99 ? '99+' : total}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={colors.success} />
          </View>
        )}

        {!isLoading && total === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.successLight} />
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>
              No pending approvals or disputed payments right now.
            </Text>
          </View>
        )}

        {pendingMembers.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              WAITING FOR YOUR APPROVAL ({pendingMembers.length})
            </Text>
            {pendingMembers.map((m) => (
              <MemberCard
                key={m.id}
                item={m}
                busy={busyId === m.id}
                onApprove={() => handleAction(m, 'approve')}
                onReject={()  => handleAction(m, 'reject')}
                onFlag={() => setFlagTarget(m)}
              />
            ))}
          </>
        )}

        {disputedPayments.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: pendingMembers.length > 0 ? 24 : 0 }]}>
              DISPUTED PAYMENTS ({disputedPayments.length})
            </Text>
            {disputedPayments.map((p) => (
              <DisputeCard
                key={p.id}
                item={p}
                onViewGroup={() => router.push(`/thrift/${p.group_id}` as any)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <FlagModal
        visible={!!flagTarget}
        busy={reviewMut.isPending && busyId === flagTarget?.id}
        onClose={() => setFlagTarget(null)}
        onSubmit={(reason) => {
          if (!flagTarget) return;
          handleAction(flagTarget, 'flag_amount', reason);
          setFlagTarget(null);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700' },
  badge:       { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  badgeText:   { color: '#FFF', fontSize: 11, fontWeight: '800' },

  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10 },

  card:     { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.sm, fontWeight: '700' },
  cardSub:  { fontSize: FontSize.xs, marginTop: 2 },
  cardMeta: { fontSize: FontSize.xs, marginTop: 4 },

  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#555' },

  flagBox:  { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, padding: 8, borderRadius: 8, borderWidth: 1 },
  flagText: { fontSize: FontSize.xs, flex: 1 },

  actions:     { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  actionLabel: { fontSize: FontSize.xs, fontWeight: '700' },

  viewGroupBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  viewGroupLabel: { fontSize: FontSize.xs },

  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', marginTop: 16 },
  emptySub:   { fontSize: FontSize.sm, marginTop: 6, textAlign: 'center', lineHeight: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  sheetTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 6 },
  sheetSub:   { fontSize: FontSize.sm, marginBottom: 14 },
  input:      { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: FontSize.sm, textAlignVertical: 'top', minHeight: 80 },
  sheetBtn:   { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
