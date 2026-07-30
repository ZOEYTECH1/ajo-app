import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, Modal, Pressable, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/store/useAppStore';
import { groupService, type Cycle, type Group } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Pill, Skeleton, LoadingOverlay, feedback } from '../../../src/components';

// ─── Date formatting ──────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const toISODate = (d: Date) => d.toISOString().split('T')[0];

// ─── Grace-period helpers ─────────────────────────────────────────────────────

// Mirrors the backend Group.defaulters_visible_from() logic.
// Python weekday: 0=Mon … 6=Sun → convert to JS: (n + 1) % 7 → 0=Sun,1=Mon…
const computeVisibleFrom = (cycle: Cycle, group: Group): Date => {
  const start = new Date(cycle.start_date);
  const grace = group.grace_period_days;

  let firstDue: Date;
  if (group.contribution_frequency === 'monthly') {
    const day = group.collection_day ?? 1;
    firstDue = new Date(start.getFullYear(), start.getMonth(), day);
    if (firstDue < start) {
      firstDue = new Date(start.getFullYear(), start.getMonth() + 1, day);
    }
  } else if (group.contribution_frequency === 'weekly') {
    const jsWeekday = ((group.collection_day ?? 0) + 1) % 7; // convert Python Mon=0 → JS Mon=1
    const daysAhead = (jsWeekday - start.getDay() + 7) % 7;
    firstDue = new Date(start);
    firstDue.setDate(firstDue.getDate() + daysAhead);
  } else {
    firstDue = new Date(start);
  }
  firstDue.setDate(firstDue.getDate() + grace);
  return firstDue;
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });

// ─── Confirm modal ────────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, title, message, confirmLabel, destructive, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={lay.overlay} onPress={onCancel}>
        <Pressable style={[lay.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 24 }}>
            {message}
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
              style={[lay.modalBtn, { backgroundColor: destructive ? colors.error : colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Start Cycle modal (admin) ────────────────────────────────────────────────
const StartCycleModal: React.FC<{
  visible: boolean;
  onConfirm: (start: string, end: string) => void;
  onCancel: () => void;
}> = ({ visible, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(defaultEnd);
  const [picking, setPicking]     = useState<'start' | 'end' | null>(null);

  const handleConfirm = () => {
    if (endDate <= startDate) return;
    onConfirm(toISODate(startDate), toISODate(endDate));
    setPicking(null);
  };

  const handleCancel = () => {
    setPicking(null);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <Pressable style={lay.overlay} onPress={handleCancel}>
        <Pressable style={[lay.startCycleBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 }}>
            Start New Cycle
          </Text>

          {/* Start date */}
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
            Start Date
          </Text>
          <TouchableOpacity
            onPress={() => setPicking('start')}
            style={[lay.datePicker, { backgroundColor: colors.background, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Start Date: ${fmt(toISODate(startDate))}`}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 8 }}>
              {fmt(toISODate(startDate))}
            </Text>
          </TouchableOpacity>

          {/* End date */}
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 }}>
            End Date
          </Text>
          <TouchableOpacity
            onPress={() => setPicking('end')}
            style={[lay.datePicker, { backgroundColor: colors.background, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`End Date: ${fmt(toISODate(endDate))}`}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 8 }}>
              {fmt(toISODate(endDate))}
            </Text>
          </TouchableOpacity>

          {endDate <= startDate && (
            <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 6 }}>
              End date must be after start date.
            </Text>
          )}

          {/* Native date pickers */}
          {picking !== null && (
            <DateTimePicker
              value={picking === 'start' ? startDate : endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={picking === 'end' ? startDate : undefined}
              onChange={(_, selected) => {
                if (selected) {
                  if (picking === 'start') setStartDate(selected);
                  else setEndDate(selected);
                }
                if (Platform.OS !== 'ios') setPicking(null);
              }}
            />
          )}
          {Platform.OS === 'ios' && picking !== null && (
            <TouchableOpacity onPress={() => setPicking(null)} style={{ alignItems: 'center', marginTop: 8 }} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
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
              disabled={endDate <= startDate}
              style={[lay.modalBtn, { backgroundColor: endDate > startDate ? colors.primary : colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Start Cycle"
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Start Cycle</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Cycle card ───────────────────────────────────────────────────────────────
const statusColor = (status: string, colors: any) => ({
  active: { bg: colors.primaryTint,  fg: colors.primary       },
  closed: { bg: colors.border,       fg: colors.textSecondary  },
}[status] ?? { bg: colors.border, fg: colors.textSecondary });

const CycleCard: React.FC<{
  cycle: Cycle;
  group: Group;
  isAdmin: boolean;
  colors: any;
  onClose:          (c: Cycle) => void;
  onRequestEarly:   (c: Cycle) => void;
  onAcceptEarly:    (c: Cycle) => void;
  onViewDefaulters: (c: Cycle) => void;
}> = ({ cycle, group, isAdmin, colors, onClose, onRequestEarly, onAcceptEarly, onViewDefaulters }) => {
  const sc = statusColor(cycle.status, colors);
  const visibleFrom   = computeVisibleFrom(cycle, group);
  const graceActive   = new Date() < visibleFrom;
  const defaulterLabel = graceActive ? `Defaulters · ${fmtShort(visibleFrom)}` : 'Defaulters';

  return (
    <View style={[lay.cycleCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }}>
            Cycle {cycle.cycle_number}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {fmt(cycle.start_date)} → {fmt(cycle.end_date)}
          </Text>
        </View>
        <Pill label={cycle.status} bg={sc.bg} color={sc.fg} />
      </View>

      {cycle.status === 'active' && cycle.force_close_requested && (
        <View style={[lay.earlyCloseBanner, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="time-outline" size={14} color={colors.warningDark} />
          <Text style={{ fontSize: FontSize.xs, color: colors.warningDark, marginLeft: 6 }}>
            Early close: {cycle.force_close_acceptor_count}/{cycle.total_member_count} accepted
          </Text>
        </View>
      )}

      {/* Actions */}
      {cycle.status === 'active' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {isAdmin && cycle.can_normal_close && (
            <TouchableOpacity
              onPress={() => onClose(cycle)}
              style={[lay.actionChip, { backgroundColor: colors.primaryTint }]}
              accessibilityRole="button"
              accessibilityLabel={`Close Cycle ${cycle.cycle_number}`}
            >
              <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.primary, marginLeft: 4 }}>
                Close Cycle
              </Text>
            </TouchableOpacity>
          )}
          {!cycle.force_close_requested && (
            <TouchableOpacity
              onPress={() => onRequestEarly(cycle)}
              style={[lay.actionChip, { backgroundColor: colors.warningLight }]}
              accessibilityRole="button"
              accessibilityLabel={`Request early close for Cycle ${cycle.cycle_number}`}
            >
              <Ionicons name="hourglass-outline" size={14} color={colors.warningDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.warningDark, marginLeft: 4 }}>
                Request Early Close
              </Text>
            </TouchableOpacity>
          )}
          {cycle.force_close_requested && (
            <TouchableOpacity
              onPress={() => onAcceptEarly(cycle)}
              style={[lay.actionChip, { backgroundColor: colors.successLight }]}
              accessibilityRole="button"
              accessibilityLabel={`Accept early close for Cycle ${cycle.cycle_number}`}
            >
              <Ionicons name="thumbs-up-outline" size={14} color={colors.successDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.successDark, marginLeft: 4 }}>
                Accept Early Close
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onViewDefaulters(cycle)}
            style={[lay.actionChip, { backgroundColor: graceActive ? colors.border : colors.errorLight }]}
            accessibilityRole="button"
            accessibilityLabel={`View defaulters for Cycle ${cycle.cycle_number}`}
          >
            <Ionicons
              name={graceActive ? 'time-outline' : 'warning-outline'}
              size={14}
              color={graceActive ? colors.textSecondary : colors.errorDark}
            />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: graceActive ? colors.textSecondary : colors.errorDark, marginLeft: 4 }}>
              {defaulterLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── Cycles Screen ────────────────────────────────────────────────────────────
export default function CyclesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [startModalVisible, setStartModalVisible]       = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', confirmLabel: '', destructive: false, onConfirm: () => {} });

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
    enabled: !!groupId,
  });

  const { data: cycles, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cycles', groupId],
    queryFn: () => groupService.getCycles(groupId),
    enabled: !!groupId,
  });

  const isGroupAdmin = group?.admin.id === user?.id;
  const activeCycle  = cycles?.find((c) => c.status === 'active');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cycles', groupId] });
    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
  };

  const startMutation = useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) =>
      groupService.startCycle(groupId, start, end),
    onSuccess: () => { feedback('success'); invalidate(); },
    onError:   () => feedback('error'),
  });

  const closeMutation = useMutation({
    mutationFn: (cycleId: number) => groupService.closeCycle(groupId, cycleId),
    onSuccess: () => { feedback('success'); invalidate(); },
    onError:   () => feedback('error'),
  });

  const requestEarlyMutation = useMutation({
    mutationFn: (cycleId: number) => groupService.requestEarlyClose(groupId, cycleId),
    onSuccess: () => { feedback('success'); invalidate(); },
    onError:   () => feedback('error'),
  });

  const acceptEarlyMutation = useMutation({
    mutationFn: (cycleId: number) => groupService.acceptEarlyClose(groupId, cycleId),
    onSuccess: () => { feedback('success'); invalidate(); },
    onError:   () => feedback('error'),
  });

  const closeModal = () => setConfirmModal((p) => ({ ...p, visible: false }));

  const handleClose = (cycle: Cycle) => {
    setConfirmModal({
      visible: true,
      title: 'Close Cycle',
      message: `Close Cycle ${cycle.cycle_number}? Members will no longer be able to submit payments for this cycle.`,
      confirmLabel: 'Close',
      destructive: false,
      onConfirm: () => { closeModal(); closeMutation.mutate(cycle.id); },
    });
  };

  const handleRequestEarly = (cycle: Cycle) => {
    setConfirmModal({
      visible: true,
      title: 'Request Early Close',
      message: `Request an early close for Cycle ${cycle.cycle_number}? All members must accept before the cycle closes early.`,
      confirmLabel: 'Request',
      destructive: false,
      onConfirm: () => { closeModal(); requestEarlyMutation.mutate(cycle.id); },
    });
  };

  const handleAcceptEarly = (cycle: Cycle) => {
    setConfirmModal({
      visible: true,
      title: 'Accept Early Close',
      message: `Accept the early close request for Cycle ${cycle.cycle_number}?`,
      confirmLabel: 'Accept',
      destructive: false,
      onConfirm: () => { closeModal(); acceptEarlyMutation.mutate(cycle.id); },
    });
  };

  const handleViewDefaulters = (cycle: Cycle) => {
    router.push(`/group/${groupId}/defaulters/${cycle.id}` as any);
  };

  const isBusy = startMutation.isPending || closeMutation.isPending ||
    requestEarlyMutation.isPending || acceptEarlyMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={isBusy} message="Updating cycle…" />

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        destructive={confirmModal.destructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />

      <StartCycleModal
        visible={startModalVisible}
        onConfirm={(start, end) => {
          setStartModalVisible(false);
          startMutation.mutate({ start, end });
        }}
        onCancel={() => setStartModalVisible(false)}
      />

      {/* Header */}
      <View style={[lay.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Cycles</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={lay.body}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Start cycle button (admin, no active cycle) */}
        {isGroupAdmin && !activeCycle && !isLoading && (
          <TouchableOpacity
            onPress={() => setStartModalVisible(true)}
            style={[lay.startBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start New Cycle"
          >
            <Ionicons name="play-circle-outline" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: FontSize.sm, fontWeight: '700', marginLeft: 8 }}>
              Start New Cycle
            </Text>
          </TouchableOpacity>
        )}

        {isLoading ? (
          [1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={100} radius={Radius.lg} style={{ marginBottom: 12 }} />
          ))
        ) : !cycles || cycles.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="refresh-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No cycles yet
            </Text>
            {isGroupAdmin && (
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Start your first cycle to begin tracking contributions.
              </Text>
            )}
          </View>
        ) : (
          cycles.map((c) => (
            <CycleCard
              key={c.id}
              cycle={c}
              group={group!}
              isAdmin={isGroupAdmin}
              colors={colors}
              onClose={handleClose}
              onRequestEarly={handleRequestEarly}
              onAcceptEarly={handleAcceptEarly}
              onViewDefaulters={handleViewDefaulters}
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginBottom: 24,
  },
  cycleCard: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  earlyCloseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: Radius.sm,
    marginBottom: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: 24,
  },
  startCycleBox: {
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
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
