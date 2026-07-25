import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, Image, Alert, TextInput, Modal, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { userService } from '../src/services/userService';
import { groupService } from '../src/services/groupService';
import { thriftService } from '../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../src/theme';
import { LoadingOverlay, Skeleton } from '../src/components';

// ─── Confirm modal ─────────────────────────────────────────────────────────────
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
      <Pressable style={s.overlay} onPress={onCancel}>
        <Pressable style={[s.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
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
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[s.modalBtn, { backgroundColor: destructive ? colors.error : colors.primary }]}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function ProfileRoute() {
  const { colors, isDark } = useTheme();
  const { user, updateUser, logout } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [phone, setPhone] = useState(user?.phone_number ?? '');
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; message: string;
    confirmLabel: string; destructive: boolean; onConfirm: () => void;
  }>({ visible: false, title: '', message: '', confirmLabel: '', destructive: false, onConfirm: () => {} });

  // Org admin detection
  const { data: myOrgs } = useQuery({
    queryKey: ['my-orgs'],
    queryFn: thriftService.getOrgs,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const isOrgAdmin = (myOrgs ?? []).length > 0;
  const firstOrg   = myOrgs?.[0] ?? null;

  const { data: orgDashboard, isLoading: orgLoading } = useQuery({
    queryKey: ['thrift-org', firstOrg?.id],
    queryFn: () => thriftService.getOrgDashboard(firstOrg!.id),
    enabled: isOrgAdmin && !!firstOrg,
    staleTime: 2 * 60 * 1000,
  });

  // Ajo payment history — only relevant for non-org-admin
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: groupService.getPaymentHistory,
    enabled: !!user && !isOrgAdmin,
  });

  const totalApproved = (history ?? [])
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + parseFloat(p.amount_entered), 0);

  const totalPending = (history ?? [])
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount_entered), 0);

  const approvedCount = (history ?? []).filter((p) => p.status === 'approved').length;
  const pendingCount  = (history ?? []).filter((p) => p.status === 'pending').length;

  // Org stats
  const activeCollectors  = (orgDashboard?.collectors ?? []).filter((c) => c.status === 'active').length;
  const totalGroups       = orgDashboard?.groups.length ?? 0;
  const pendingReports    = (orgDashboard?.recent_reports ?? []).filter((r) => r.status === 'pending').length;
  const totalPayers       = (orgDashboard?.groups ?? []).reduce((sum, g) => sum + g.member_count, 0);

  const fmtAmount = (n: number) =>
    `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const updateMutation = useMutation({
    mutationFn: () => userService.updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phone.trim(),
    }),
    onSuccess: (updated) => {
      updateUser({ first_name: updated.first_name, last_name: updated.last_name, phone_number: updated.phone_number });
      setEditing(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.phone_number?.[0]
        ?? err.response?.data?.detail
        ?? 'Could not update profile. Please try again.';
      Alert.alert('Update failed', msg);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: userService.deleteAccount,
    onSuccess: () => {
      logout();
      queryClient.clear();
      router.replace('/login');
    },
    onError: () => Alert.alert('Error', 'Could not delete account. Please try again.'),
  });

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access in your device settings to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const data = await userService.uploadProfilePhoto(asset.uri, asset.mimeType ?? 'image/jpeg');
      updateUser({ profile_photo: data.profile_photo });
    } catch {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    setConfirmModal({
      visible: true,
      title: 'Log out',
      message: 'Are you sure you want to log out?',
      confirmLabel: 'Log out',
      destructive: false,
      onConfirm: () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        logout();
        queryClient.clear();
        router.replace('/login');
      },
    });
  };

  const handleDeleteAccount = () => {
    setConfirmModal({
      visible: true,
      title: 'Delete account',
      message: 'This will permanently deactivate your account. Your payment history will be preserved for group records. This cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
      onConfirm: () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        deleteAccountMutation.mutate();
      },
    });
  };

  const startEditing = () => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setPhone(user?.phone_number ?? '');
    setEditing(true);
  };

  const isBusy = uploading || updateMutation.isPending || deleteAccountMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay
        visible={isBusy}
        message={uploading ? 'Uploading photo…' : updateMutation.isPending ? 'Saving…' : 'Deleting account…'}
      />

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        destructive={confirmModal.destructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, visible: false }))}
      />

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <TouchableOpacity onPress={pickAndUpload} style={s.avatarWrap} activeOpacity={0.8}>
          {user?.profile_photo ? (
            <Image source={{ uri: user.profile_photo }} style={[s.avatar, { borderColor: colors.primaryBorder }]} />
          ) : (
            <View style={[s.avatarPlaceholder, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
              <Ionicons name="person" size={44} color={colors.primary} />
            </View>
          )}
          <View style={[s.cameraBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={14} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Name, email, phone — view or edit */}
        {!editing ? (
          <>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginTop: 16, marginBottom: 2 }}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 4 }}>
              {user?.email}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>
              {user?.phone_number}
            </Text>
            <TouchableOpacity
              onPress={startEditing}
              style={[s.editBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="pencil-outline" size={15} color={colors.primary} />
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.primary, marginLeft: 6 }}>
                Edit profile
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[s.editForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>
              Edit profile
            </Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: colors.textSecondary }]}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  style={[s.input, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  style={[s.input, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 12 }]}>Phone number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[s.input, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholderTextColor={colors.textTertiary}
            />
            <View style={[s.row, { marginTop: 16, gap: 10 }]}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={[s.formBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                style={[s.formBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* No photo warning */}
        {!user?.profile_photo && (
          <View style={[s.banner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.warningDark} />
            <Text style={{ fontSize: FontSize.sm, color: colors.warningDark, flex: 1, marginLeft: 8, lineHeight: 18 }}>
              A profile photo is required to create or join groups. Tap your avatar above to upload one.
            </Text>
          </View>
        )}

        {/* Balance / overview card */}
        {isOrgAdmin ? (
          <>
            <View style={[s.balanceCard, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Organisation
              </Text>
              {orgLoading ? (
                <Skeleton width={180} height={28} radius={8} style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              ) : (
                <Text style={{ fontSize: FontSize.xl, fontWeight: '900', color: '#fff', marginTop: 4, letterSpacing: -0.3 }} numberOfLines={1}>
                  {firstOrg?.name ?? '—'}
                </Text>
              )}
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                {activeCollectors} active collector{activeCollectors !== 1 ? 's' : ''} · {totalGroups} group{totalGroups !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={s.statsRow}>
              <View style={[s.statCard, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 6 }}>
                  {orgLoading ? '—' : totalPayers}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Total payers</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
                <Ionicons name="flag-outline" size={20} color={pendingReports > 0 ? colors.warning : colors.textTertiary} />
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: pendingReports > 0 ? colors.warning : colors.textPrimary, marginTop: 6 }}>
                  {orgLoading ? '—' : pendingReports}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Pending reports</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={[s.balanceCard, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Total Contributions
              </Text>
              {historyLoading ? (
                <Skeleton width={160} height={36} radius={8} style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              ) : (
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4, letterSpacing: -0.5 }}>
                  {fmtAmount(totalApproved)}
                </Text>
              )}
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                {approvedCount} approved payment{approvedCount !== 1 ? 's' : ''} across all groups
              </Text>
            </View>

            <View style={s.statsRow}>
              <View style={[s.statCard, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
                <Ionicons name="time-outline" size={20} color={colors.warning} />
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 6 }}>
                  {historyLoading ? '—' : fmtAmount(totalPending)}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                  Pending ({pendingCount})
                </Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
                <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 6 }}>
                  {historyLoading ? '—' : (history?.length ?? 0)}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                  Total payments
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Account actions */}
        <View style={[s.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.push('/account/privacy' as any)} style={s.actionRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textPrimary} />
            <Text style={{ fontSize: FontSize.base, color: colors.textPrimary, marginLeft: 14, flex: 1 }}>Privacy Policy & Terms</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <TouchableOpacity onPress={handleLogout} style={s.actionRow}>
            <Ionicons name="log-out-outline" size={20} color={colors.textPrimary} />
            <Text style={{ fontSize: FontSize.base, color: colors.textPrimary, marginLeft: 14, flex: 1 }}>Log out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <TouchableOpacity onPress={handleDeleteAccount} style={s.actionRow}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={{ fontSize: FontSize.base, color: colors.error, marginLeft: 14, flex: 1 }}>Delete account</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 20, paddingBottom: 120 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 2 },
  avatarPlaceholder: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  editForm: { width: '100%', marginTop: 20, borderRadius: Radius.lg, borderWidth: 1, padding: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: FontSize.sm },
  formBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: Radius.md, borderWidth: 1, marginTop: 20, width: '100%' },
  balanceCard: { width: '100%', borderRadius: Radius.xl, padding: 20, marginTop: 28, alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: 16, alignItems: 'flex-start' },
  actionsCard: { width: '100%', borderRadius: Radius.lg, borderWidth: 1, marginTop: 24, overflow: 'hidden' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { width: '100%', borderRadius: Radius.xl, padding: 24 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
});
