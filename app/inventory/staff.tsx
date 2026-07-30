/**
 * Staff Management
 * Owner/manager can view members, invite by email+role, and remove staff.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getMembers, inviteStaff, removeStaff,
  type InventoryMember, type MemberRole,
} from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

const ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: 'staff',   label: 'Staff',   description: 'Can record sales, receive & dispatch goods' },
  { value: 'manager', label: 'Manager', description: 'All staff permissions + can invite staff' },
  { value: 'owner',   label: 'Owner',   description: 'Full access including business settings' },
];

function roleBadge(role: MemberRole) {
  if (role === 'owner')   return { label: 'Owner',   bg: '#FFF3E0', color: INV };
  if (role === 'manager') return { label: 'Manager', bg: '#F3E5F5', color: '#6A1B9A' };
  return                         { label: 'Staff',   bg: '#ECEFF1', color: '#455A64' };
}

export default function StaffScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBusinessId, selectedBusinessRole } = useInventoryStore();

  const [inviteModal, setInviteModal] = useState(false);
  const [email, setEmail]             = useState('');
  const [role, setRole]               = useState<MemberRole>('staff');

  const canManage = selectedBusinessRole === 'owner' || selectedBusinessRole === 'manager';

  const { data: members, isLoading } = useQuery({
    queryKey: ['inventory-members', selectedBusinessId],
    queryFn: () => getMembers(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  const { mutate: doInvite, isPending: inviting } = useMutation({
    mutationFn: () => inviteStaff(selectedBusinessId!, email.trim().toLowerCase(), role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-members', selectedBusinessId] });
      setInviteModal(false);
      setEmail('');
      setRole('staff');
      Alert.alert('Invited', 'Team member has been added to this location.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.email
        || err?.response?.data?.detail
        || 'Could not invite. Make sure the email is registered on Ajo.';
      Alert.alert('Error', msg);
    },
  });

  const handleRemove = (member: InventoryMember) => {
    Alert.alert(
      'Remove member',
      `Remove ${member.user_name} (${member.role}) from this location?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () =>
            removeStaff(selectedBusinessId!, member.id)
              .then(() => qc.invalidateQueries({ queryKey: ['inventory-members', selectedBusinessId] }))
              .catch(() => Alert.alert('Error', 'Could not remove member. Try again.')),
        },
      ],
    );
  };

  const handleInvite = () => {
    if (!email.trim()) return Alert.alert('Required', 'Enter the staff member\'s email address.');
    doInvite();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Team Members</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Manage who has access to this location
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            onPress={() => setInviteModal(true)}
            style={{ backgroundColor: '#FFF3E0', borderRadius: Radius.md, padding: 8 }}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            accessibilityRole="button" accessibilityLabel="Invite team member"
          >
            <Ionicons name="person-add-outline" size={20} color={INV} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {(members ?? []).map((member) => {
            const badge = roleBadge(member.role);
            return (
              <View
                key={member.id}
                style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}
              >
                <View style={s.memberAvatar}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: INV }}>
                    {member.user_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                    {member.user_name}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {member.user_email}
                  </Text>
                  <View style={[s.roleBadge, { backgroundColor: badge.bg, marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                  </View>
                </View>
                {canManage && member.role !== 'owner' && (
                  <TouchableOpacity
                    onPress={() => handleRemove(member)}
                    hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                    style={{ padding: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.user_name}`}
                    accessibilityHint="Double tap to remove this team member"
                  >
                    <Ionicons name="person-remove-outline" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {(members ?? []).length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="people-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
                No team members yet
              </Text>
              {canManage && (
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                  Tap the + button to invite staff to this location.
                </Text>
              )}
            </View>
          )}

          <View style={[s.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 8, flex: 1, lineHeight: 17 }}>
              Team members must already have an Ajo account. Invite them by the email they registered with.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Invite modal */}
      <Modal visible={inviteModal} transparent animationType="slide" onRequestClose={() => setInviteModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setInviteModal(false)} />
        <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Invite Team Member</Text>

          <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="their-email@example.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            style={[s.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            accessibilityLabel="Staff member email address"
          />

          <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 16 }]}>Role</Text>
          {ROLES.map((r) => {
            const isOwnerOnly = r.value === 'owner';
            const canAssignOwner = selectedBusinessRole === 'owner';
            const disabled = isOwnerOnly && !canAssignOwner;
            const active = role === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                onPress={() => { if (!disabled) setRole(r.value); }}
                activeOpacity={disabled ? 1 : 0.7}
                style={[s.roleOption, {
                  borderColor: active ? INV : colors.border,
                  backgroundColor: active ? '#FFF3E0' : colors.background,
                  opacity: disabled ? 0.4 : 1,
                }]}
                accessibilityRole="button"
                accessibilityLabel={`Role: ${r.label}`}
                accessibilityState={{ selected: active, disabled }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? INV : colors.textPrimary }}>
                    {r.label}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                    {r.description}
                  </Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={INV} />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={handleInvite}
            disabled={inviting}
            style={[s.saveBtn, { backgroundColor: INV, opacity: inviting ? 0.6 : 1, marginTop: 20 }]}
            accessibilityRole="button" accessibilityLabel="Send invite"
          >
            {inviting
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Send Invite</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1,
    padding: 14, marginBottom: 10,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderRadius: Radius.md,
    padding: 12, marginTop: 16,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 44,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 20 },
  modalLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.md,
  },
  roleOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    padding: 12, marginBottom: 8,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg, alignItems: 'center',
  },
});
