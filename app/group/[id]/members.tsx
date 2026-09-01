import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  RefreshControl, StatusBar, StyleSheet, Modal, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/store/useAppStore';
import { groupService, type Membership, type RemovalProposal } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Pill, Skeleton, LoadingOverlay, feedback } from '../../../src/components';
import { cloudinaryUrl } from '../../../src/lib/cloudinary';

// ─── Confirm modal ────────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, title, message, confirmLabel, confirmDestructive, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.modalOverlay} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Pressable style={[s.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}} accessible={false}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 24 }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={[s.modalBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[s.modalBtn, { backgroundColor: confirmDestructive ? colors.error : colors.primary }]}
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

// ─── Active removal proposal card ─────────────────────────────────────────────
const ProposalCard: React.FC<{
  proposal: RemovalProposal;
  currentUserId: number | undefined;
  onVote: (proposalId: number, approved: boolean) => void;
  voting: boolean;
  colors: any;
}> = ({ proposal, currentUserId, onVote, voting, colors }) => {
  const pct = proposal.eligible_count > 0
    ? Math.round((proposal.yes_count / proposal.eligible_count) * 100)
    : 0;
  const isTarget    = proposal.target_user_id === currentUserId;
  const hasVoted    = proposal.current_user_vote !== null;
  const votedYes    = proposal.current_user_vote === true;

  return (
    <View style={[s.proposalCard, { backgroundColor: colors.surface, borderColor: colors.warningLight, ...Shadow.soft(colors.black) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        {proposal.target_photo ? (
          <Image source={{ uri: cloudinaryUrl(proposal.target_photo, 96, 96) }} style={s.proposalAvatar} />
        ) : (
          <View style={[s.proposalAvatar, { backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary }}>
              {proposal.target_name.charAt(0)}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            Proposed removal
          </Text>
          <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary }}>
            {proposal.target_name}
          </Text>
        </View>
        <Pill label={`${pct}% yes`} bg={colors.warningLight} color={colors.warningDark} />
      </View>

      {/* Vote bar */}
      <View style={[s.voteBar, { backgroundColor: colors.border }]}>
        <View style={[s.voteBarFill, { width: `${pct}%` as any, backgroundColor: colors.warning }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 }}>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
          {proposal.yes_count} yes · {proposal.no_count} no · {proposal.eligible_count} eligible
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>
          Need {`>`}50% to pass
        </Text>
      </View>

      {/* Vote buttons */}
      {isTarget ? (
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, textAlign: 'center' }}>
          You cannot vote on your own removal
        </Text>
      ) : hasVoted ? (
        <View style={[s.votedBadge, { backgroundColor: votedYes ? colors.warningLight : colors.successLight }]}>
          <Ionicons name={votedYes ? 'thumbs-down' : 'thumbs-up'} size={14} color={votedYes ? colors.warningDark : colors.successDark} />
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: votedYes ? colors.warningDark : colors.successDark, marginLeft: 6 }}>
            You voted to {votedYes ? 'remove' : 'keep'} this member
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => onVote(proposal.id, false)}
            disabled={voting}
            style={[s.voteBtn, { backgroundColor: colors.successLight, flex: 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Vote to keep member"
          >
            <Ionicons name="thumbs-up" size={15} color={colors.successDark} />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.successDark, marginLeft: 6 }}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onVote(proposal.id, true)}
            disabled={voting}
            style={[s.voteBtn, { backgroundColor: colors.errorLight, flex: 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Vote to remove member"
          >
            <Ionicons name="thumbs-down" size={15} color={colors.errorDark} />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.errorDark, marginLeft: 6 }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── Member row ───────────────────────────────────────────────────────────────
const statusColor = (status: string, colors: any) => ({
  pending:  { bg: colors.warningLight,  fg: colors.warningDark  },
  approved: { bg: colors.successLight,  fg: colors.successDark  },
  rejected: { bg: colors.errorLight,    fg: colors.errorDark    },
}[status] ?? { bg: colors.border, fg: colors.textSecondary });

const MemberRow: React.FC<{
  membership: Membership;
  isAdmin: boolean;
  onApprove: (m: Membership) => void;
  onReject:  (m: Membership) => void;
  onProposeRemoval: (m: Membership) => void;
}> = ({ membership, isAdmin, onApprove, onReject, onProposeRemoval }) => {
  const { colors } = useTheme();
  const sc = statusColor(membership.status, colors);
  const streak = membership.consecutive_default_streak ?? 0;
  const isSuggestedForRemoval = streak >= 3;

  return (
    <View style={[s.memberRow, { borderBottomColor: colors.border }]}>
      <View style={[s.avatar, { backgroundColor: colors.primaryTint }]}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary }}>
          {membership.user.first_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            {membership.user.first_name} {membership.user.last_name}
          </Text>
          {isSuggestedForRemoval && (
            <View style={[s.streakBadge, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="flame" size={11} color={colors.error} />
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.error, marginLeft: 3 }}>
                {streak}× default
              </Text>
            </View>
          )}
        </View>
        {membership.joined_at && (
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2 }}>
            Joined {new Date(membership.joined_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
        {membership.status === 'approved' && Number(membership.total_approved) > 0 && (
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2 }}>
            Total paid: ₦{Number(membership.total_approved).toLocaleString()}
          </Text>
        )}
        {isAdmin && isSuggestedForRemoval && membership.status === 'approved' && (
          <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 3, fontWeight: '600' }}>
            Defaulted {streak} cycles in a row — consider a removal vote
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Pill label={membership.status} bg={sc.bg} color={sc.fg} />
        {isAdmin && membership.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => onApprove(membership)}
              style={[s.actionChip, { backgroundColor: colors.successLight }]}
              accessibilityRole="button"
              accessibilityLabel={`Approve ${membership.user.first_name} ${membership.user.last_name}`}
            >
              <Ionicons name="checkmark" size={14} color={colors.successDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.successDark, marginLeft: 3 }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(membership)}
              style={[s.actionChip, { backgroundColor: colors.errorLight }]}
              accessibilityRole="button"
              accessibilityLabel={`Reject ${membership.user.first_name} ${membership.user.last_name}`}
            >
              <Ionicons name="close" size={14} color={colors.errorDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.errorDark, marginLeft: 3 }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {isAdmin && membership.status === 'approved' && (
          <TouchableOpacity
            onPress={() => onProposeRemoval(membership)}
            style={[s.actionChip, { backgroundColor: colors.warningLight }]}
            accessibilityRole="button"
            accessibilityLabel={`Propose removal of ${membership.user.first_name} ${membership.user.last_name}`}
          >
            <Ionicons name="alert-circle-outline" size={13} color={colors.warningDark} />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.warningDark, marginLeft: 3 }}>
              Propose Removal
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Members Screen ───────────────────────────────────────────────────────────
export default function MembersRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const { data: members, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['members', groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !!groupId,
  });

  const { data: proposals = [], isLoading: proposalsLoading } = useQuery({
    queryKey: ['removals', groupId],
    queryFn: () => groupService.getRemovalProposals(groupId),
    enabled: !!groupId,
  });

  const isGroupAdmin = group?.admin.id === user?.id;

  const reviewMutation = useMutation({
    mutationFn: ({ membershipId, action }: { membershipId: number; action: 'approve' | 'reject' }) =>
      groupService.reviewMembership(groupId, membershipId, action),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: () => feedback('error'),
  });

  const proposeMutation = useMutation({
    mutationFn: (membershipId: number) => groupService.proposeRemoval(groupId, membershipId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['removals', groupId] });
    },
    onError: (err: any) => {
      feedback('error');
      const msg = err.response?.data?.detail ?? 'Could not start removal vote.';
      setConfirmModal((prev) => ({ ...prev, visible: false }));
      // Show error briefly via alert — modal is already closed
      setTimeout(() => {
        setConfirmModal({
          visible: true,
          title: 'Cannot start vote',
          message: msg,
          confirmLabel: 'OK',
          destructive: false,
          onConfirm: closeModal,
        });
      }, 100);
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ proposalId, approved }: { proposalId: number; approved: boolean }) =>
      groupService.castRemovalVote(groupId, proposalId, approved),
    onSuccess: (updatedProposal) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['removals', groupId] });
      if (updatedProposal.status === 'passed') {
        queryClient.invalidateQueries({ queryKey: ['members', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      }
    },
    onError: () => feedback('error'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupService.leaveGroup(groupId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.replace('/home' as any);
    },
    onError: () => feedback('error'),
  });

  const closeModal = () => setConfirmModal((prev) => ({ ...prev, visible: false }));

  const handleApprove = (m: Membership) => {
    setConfirmModal({
      visible: true,
      title: 'Approve member',
      message: `Approve ${m.user.first_name} ${m.user.last_name} to join this group?`,
      confirmLabel: 'Approve',
      destructive: false,
      onConfirm: () => { closeModal(); reviewMutation.mutate({ membershipId: m.id, action: 'approve' }); },
    });
  };

  const handleReject = (m: Membership) => {
    setConfirmModal({
      visible: true,
      title: 'Reject request',
      message: `Reject ${m.user.first_name} ${m.user.last_name}'s join request?`,
      confirmLabel: 'Reject',
      destructive: true,
      onConfirm: () => { closeModal(); reviewMutation.mutate({ membershipId: m.id, action: 'reject' }); },
    });
  };

  const handleProposeRemoval = (m: Membership) => {
    const streak = m.consecutive_default_streak ?? 0;
    const streakNote = streak >= 3
      ? `\n\nNote: This member has defaulted ${streak} cycles in a row.`
      : '';
    setConfirmModal({
      visible: true,
      title: 'Start a removal vote',
      message: `This will notify all members to vote on removing ${m.user.first_name} ${m.user.last_name}. They will be removed only if more than 50% of members vote yes.${streakNote}`,
      confirmLabel: 'Start vote',
      destructive: true,
      onConfirm: () => { closeModal(); proposeMutation.mutate(m.id); },
    });
  };

  const pending  = members?.filter((m) => m.status === 'pending')  ?? [];
  const approved = members?.filter((m) => m.status === 'approved') ?? [];
  const rejected = members?.filter((m) => m.status === 'rejected') ?? [];

  const myMembership = members?.find((m) => m.user.id === user?.id && m.status === 'approved');
  const canLeave = !!myMembership && !isGroupAdmin;

  const isBusy = reviewMutation.isPending || proposeMutation.isPending || leaveMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={isBusy} message={proposeMutation.isPending ? 'Starting vote…' : 'Updating member…'} />

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmDestructive={confirmModal.destructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Members</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Active removal votes */}
        {proposals.length > 0 && (
          <>
            <Text style={sectionLabel(colors)}>Active Removal Votes ({proposals.length})</Text>
            {proposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                currentUserId={user?.id}
                onVote={(proposalId, approved) => voteMutation.mutate({ proposalId, approved })}
                voting={voteMutation.isPending}
                colors={colors}
              />
            ))}
          </>
        )}

        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[s.memberRow, { borderBottomColor: colors.border }]}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                  <Skeleton width="50%" height={14} radius={4} />
                  <Skeleton width="70%" height={11} radius={4} />
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            {/* Pending requests */}
            {isGroupAdmin && pending.length > 0 && (
              <>
                <Text style={sectionLabel(colors)}>Pending Requests ({pending.length})</Text>
                <View style={[s.sectionCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                  {pending.map((m) => (
                    <MemberRow key={m.id} membership={m} isAdmin={isGroupAdmin} onApprove={handleApprove} onReject={handleReject} onProposeRemoval={handleProposeRemoval} />
                  ))}
                </View>
              </>
            )}

            {/* Approved members */}
            <Text style={sectionLabel(colors)}>Members ({approved.length})</Text>
            {approved.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                  No approved members yet
                </Text>
              </View>
            ) : (
              <View style={[s.sectionCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                {approved.map((m) => (
                  <MemberRow key={m.id} membership={m} isAdmin={isGroupAdmin} onApprove={handleApprove} onReject={handleReject} onProposeRemoval={handleProposeRemoval} />
                ))}
              </View>
            )}

            {/* Rejected (admin only) */}
            {isGroupAdmin && rejected.length > 0 && (
              <>
                <Text style={sectionLabel(colors)}>Rejected ({rejected.length})</Text>
                <View style={[s.sectionCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                  {rejected.map((m) => (
                    <MemberRow key={m.id} membership={m} isAdmin={isGroupAdmin} onApprove={handleApprove} onReject={handleReject} onProposeRemoval={handleProposeRemoval} />
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Leave group — non-admin approved members only */}
        {canLeave && (
          <TouchableOpacity
            onPress={() =>
              setConfirmModal({
                visible: true,
                title: 'Leave group',
                message: 'Are you sure you want to leave this group? You will need to request to join again.',
                confirmLabel: 'Leave',
                destructive: true,
                onConfirm: () => { closeModal(); leaveMutation.mutate(); },
              })
            }
            style={[s.leaveBtn, { borderColor: colors.error }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Leave group"
          >
            <Ionicons name="exit-outline" size={16} color={colors.error} />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.error, marginLeft: 8 }}>
              Leave Group
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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
  sectionCard: {
    borderRadius: Radius.lg,
    marginBottom: 24,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  proposalCard: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  proposalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  voteBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  voteBarFill: {
    height: 6,
    borderRadius: 3,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
});

const sectionLabel = (colors: any) => ({
  fontSize: FontSize.xs,
  fontWeight: '700' as const,
  color: colors.textTertiary,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  marginBottom: 10,
});
