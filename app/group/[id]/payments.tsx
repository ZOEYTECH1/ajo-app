import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, Modal, Pressable, TextInput, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/store/useAppStore';
import { groupService, type Payment } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Pill, Skeleton, LoadingOverlay, feedback } from '../../../src/components';

// ─── Status colours ───────────────────────────────────────────────────────────
const statusColor = (status: string, colors: any) => ({
  pending:  { bg: colors.warningLight, fg: colors.warningDark },
  approved: { bg: colors.successLight, fg: colors.successDark },
  rejected: { bg: colors.errorLight,   fg: colors.errorDark   },
}[status] ?? { bg: colors.border, fg: colors.textSecondary });

// ─── Receipt viewer modal ─────────────────────────────────────────────────────
const ReceiptModal: React.FC<{
  uri: string | null;
  onClose: () => void;
}> = ({ uri, onClose }) => {
  const { colors } = useTheme();
  if (!uri) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={lay.receiptOverlay} onPress={onClose}>
        <View style={[lay.receiptBox, { backgroundColor: colors.surface }]}>
          <Image
            source={{ uri }}
            style={{ width: '100%', height: 360, borderRadius: Radius.lg }}
            resizeMode="contain"
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel="Payment receipt image"
          />
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

// ─── Reject reason modal ──────────────────────────────────────────────────────
const RejectModal: React.FC<{
  visible: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}> = ({ visible, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };
  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={lay.receiptOverlay} onPress={handleCancel}>
        <Pressable style={[lay.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 }} accessibilityRole="header">
            Reject payment
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
            Optionally provide a reason so the member knows what to fix.
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            style={[
              lay.reasonInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            accessibilityLabel="Rejection reason"
            accessibilityHint="Optionally describe why this payment is being rejected"
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[lay.modalBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[lay.modalBtn, { backgroundColor: colors.error }]}
              accessibilityRole="button"
              accessibilityLabel="Reject payment"
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Reject</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Approve confirm modal ────────────────────────────────────────────────────
const ApproveModal: React.FC<{
  visible: boolean;
  payment: Payment | null;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, payment, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={lay.receiptOverlay} onPress={onCancel}>
        <Pressable style={[lay.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }} accessibilityRole="header">
            Approve payment?
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 24 }}>
            Approve ₦{Number(payment?.amount_entered ?? 0).toLocaleString()} from{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{payment?.member_name}</Text>?
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={[lay.modalBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[lay.modalBtn, { backgroundColor: colors.success ?? colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Approve payment"
              accessibilityHint="Marks this payment as confirmed"
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Approve</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Payment card ─────────────────────────────────────────────────────────────
const PaymentCard: React.FC<{
  payment: Payment;
  isAdmin: boolean;
  onApprove: (p: Payment) => void;
  onReject:  (p: Payment) => void;
  onViewReceipt: (uri: string) => void;
}> = ({ payment, isAdmin, onApprove, onReject, onViewReceipt }) => {
  const { colors } = useTheme();
  const sc = statusColor(payment.status, colors);
  const date = new Date(payment.submitted_at).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View style={[lay.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            {payment.member_name}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {payment.member_email}
          </Text>
        </View>
        <Pill label={payment.status} bg={sc.bg} color={sc.fg} />
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>Amount</Text>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }}>
            ₦{Number(payment.amount_entered).toLocaleString()}
          </Text>
        </View>
        {payment.cycle_number != null && (
          <View>
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>Cycle</Text>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>
              #{payment.cycle_number}
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>Submitted</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{date}</Text>
        </View>
      </View>

      {payment.rejection_reason ? (
        <View style={[lay.reasonBanner, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.errorDark} />
          <Text style={{ fontSize: FontSize.xs, color: colors.errorDark, marginLeft: 6, flex: 1 }}>
            {payment.rejection_reason}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        {payment.receipt_image && (
          <TouchableOpacity
            onPress={() => onViewReceipt(payment.receipt_image!)}
            style={[lay.chip, { backgroundColor: colors.primaryTint }]}
            accessibilityRole="button"
            accessibilityLabel="View receipt"
          >
            <Ionicons name="image-outline" size={14} color={colors.primary} />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary, marginLeft: 4 }}>
              Receipt
            </Text>
          </TouchableOpacity>
        )}
        {isAdmin && payment.status === 'pending' && (
          <>
            <TouchableOpacity
              onPress={() => onApprove(payment)}
              style={[lay.chip, { backgroundColor: colors.successLight }]}
              accessibilityRole="button"
              accessibilityLabel="Approve payment"
              accessibilityHint="Marks this payment as confirmed"
            >
              <Ionicons name="checkmark" size={14} color={colors.successDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.successDark, marginLeft: 4 }}>
                Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(payment)}
              style={[lay.chip, { backgroundColor: colors.errorLight }]}
              accessibilityRole="button"
              accessibilityLabel="Reject payment"
            >
              <Ionicons name="close" size={14} color={colors.errorDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.errorDark, marginLeft: 4 }}>
                Reject
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// ─── Payments Screen ──────────────────────────────────────────────────────────
export default function PaymentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<Payment | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
    enabled: !!groupId,
  });

  const { data: payments, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payments', groupId, filter],
    queryFn: () => groupService.getPayments(groupId, filter === 'all' ? undefined : filter),
    enabled: !!groupId,
  });

  const isGroupAdmin = group?.admin.id === user?.id;

  const reviewMutation = useMutation({
    mutationFn: ({ paymentId, action, reason }: { paymentId: number; action: 'approve' | 'reject'; reason?: string }) =>
      groupService.reviewPayment(groupId, paymentId, action, reason),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
    },
    onError: () => feedback('error'),
  });

  const handleApproveConfirm = () => {
    if (!approveTarget) return;
    reviewMutation.mutate({ paymentId: approveTarget.id, action: 'approve' });
    setApproveTarget(null);
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;
    reviewMutation.mutate({ paymentId: rejectTarget.id, action: 'reject', reason: reason || undefined });
    setRejectTarget(null);
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={reviewMutation.isPending} message="Reviewing payment…" />

      <ReceiptModal uri={receiptUri} onClose={() => setReceiptUri(null)} />
      <ApproveModal
        visible={!!approveTarget}
        payment={approveTarget}
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveTarget(null)}
      />
      <RejectModal
        visible={!!rejectTarget}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Header */}
      <View style={[lay.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter tabs */}
      <View style={[lay.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => { setFilter(f.key); feedback('light'); }}
              style={[lay.filterTab, { borderBottomColor: active ? colors.primary : 'transparent' }]}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${f.label}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={{ fontSize: FontSize.xs, fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.textSecondary }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={lay.body}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={120} radius={Radius.lg} style={{ marginBottom: 12 }} />
          ))
        ) : !payments || payments.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No payments
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
              {filter === 'all' ? 'No payments have been submitted yet.' : `No ${filter} payments.`}
            </Text>
          </View>
        ) : (
          payments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              isAdmin={isGroupAdmin}
              onApprove={(pay) => setApproveTarget(pay)}
              onReject={(pay) => setRejectTarget(pay)}
              onViewReceipt={(uri) => setReceiptUri(uri)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const lay = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2.5,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: Radius.sm,
    marginBottom: 8,
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  receiptBox: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: 16,
  },
  modalBox: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: FontSize.sm,
    textAlignVertical: 'top',
    minHeight: 80,
  },
});
