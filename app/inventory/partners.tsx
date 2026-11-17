import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, TextInput, RefreshControl, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getPartnerLinks, invitePartner, respondToPartnerInvite, getBusinesses,
  type BusinessPartnerLink,
} from '../../src/services/inventoryService';
import ErrorBanner from '../../src/components/ErrorBanner';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PartnersScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const { selectedBusinessId, selectedBusinessName, selectedBusinessRole } = useInventoryStore();
  const bizId = selectedBusinessId ?? 0;
  const canManage = selectedBusinessRole === 'owner' || selectedBusinessRole === 'manager';

  const [code, setCode] = useState('');

  const {
    data: links, isLoading, isError, error, isRefetching, refetch,
  } = useQuery({
    queryKey: ['inventory-partners', bizId],
    queryFn: () => getPartnerLinks(bizId),
    enabled: !!bizId,
  });

  // Same cache key home.tsx already populates -- just reading it here for
  // this business's own partner_code, not a duplicate fetch in practice.
  const { data: businesses } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
  });
  const ownCode = businesses?.find((b) => b.id === bizId)?.partner_code;

  const { mutate: sendInvite, isPending: inviting } = useMutation({
    mutationFn: () => invitePartner(bizId, code.trim().toUpperCase()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-partners', bizId] });
      setCode('');
      Alert.alert('Invite sent', 'The business will be notified of your request to connect.');
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.response?.data?.partner_code || e?.response?.data?.detail || 'Could not send invite.'),
  });

  const { mutate: respond, isPending: responding } = useMutation({
    mutationFn: ({ linkId, status }: { linkId: number; status: 'accepted' | 'rejected' }) =>
      respondToPartnerInvite(linkId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-partners', bizId] }),
    onError: () => Alert.alert('Error', 'Could not update this invite. Try again.'),
  });

  const handleInvite = () => {
    if (!code.trim()) return Alert.alert('Required', 'Enter a partner code.');
    sendInvite();
  };

  const confirmRespond = (link: BusinessPartnerLink, status: 'accepted' | 'rejected') => {
    const verb = status === 'accepted' ? 'Accept' : 'Decline';
    Alert.alert(
      `${verb} Invite`,
      `${verb} the partner invite from ${link.requesting_business.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: verb, style: status === 'rejected' ? 'destructive' : 'default', onPress: () => respond({ linkId: link.id, status }) },
      ],
    );
  };

  const all = links ?? [];
  const sentPending = all.filter((l) => l.status === 'pending' && l.requesting_business.id === bizId);
  const receivedPending = all.filter((l) => l.status === 'pending' && l.partner_business.id === bizId);
  const accepted = all.filter((l) => l.status === 'accepted');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          accessibilityRole="button" accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Business Partners</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Connect with another business to request stock
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
      >
        {isError && <ErrorBanner error={error} onRetry={refetch} />}

        {/* My own code, to share */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textSecondary }}>Your partner code</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2, marginBottom: 12 }}>
            Share this with another business so they can invite {selectedBusinessName ?? 'your business'}
          </Text>
          <TouchableOpacity
            onPress={() => ownCode && Share.share({ message: `Connect with ${selectedBusinessName} on Scribe using partner code: ${ownCode}` })}
            style={[s.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Share partner code"
          >
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', letterSpacing: 2, color: INV, fontFamily: 'monospace' }}>
              {ownCode ?? '········'}
            </Text>
            <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Invite form */}
        {canManage && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 }}>
              Invite a business by their code
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                placeholder="e.g. 7K2PX9QM"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                maxLength={8}
                style={[s.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, flex: 1, fontFamily: 'monospace' }]}
              />
              <TouchableOpacity
                onPress={handleInvite}
                disabled={inviting}
                style={[s.sendBtn, { backgroundColor: INV, opacity: inviting ? 0.6 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Send partner invite"
              >
                {inviting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>Invite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={INV} style={{ marginTop: 40 }} />
        ) : (
          <>
            {receivedPending.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Invites Received</Text>
                {receivedPending.map((l) => (
                  <View key={l.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }}>{l.requesting_business.name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2, textTransform: 'capitalize' }}>{l.requesting_business.mode}</Text>
                    {canManage ? (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                        <TouchableOpacity
                          onPress={() => confirmRespond(l, 'rejected')}
                          disabled={responding}
                          style={[s.actionBtn, { borderColor: '#C62828', flex: 1 }]}
                          accessibilityRole="button" accessibilityLabel={`Decline ${l.requesting_business.name}`}
                        >
                          <Ionicons name="close-outline" size={16} color="#C62828" />
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#C62828', marginLeft: 4 }}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmRespond(l, 'accepted')}
                          disabled={responding}
                          style={[s.actionBtn, { backgroundColor: '#2E7D32', borderColor: '#2E7D32', flex: 1 }]}
                          accessibilityRole="button" accessibilityLabel={`Accept ${l.requesting_business.name}`}
                        >
                          <Ionicons name="checkmark-outline" size={16} color="#fff" />
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff', marginLeft: 4 }}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 10 }}>Awaiting a manager's response</Text>
                    )}
                  </View>
                ))}
              </>
            )}

            {sentPending.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Invites Sent</Text>
                {sentPending.map((l) => (
                  <View key={l.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }}>{l.partner_business.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2, textTransform: 'capitalize' }}>{l.partner_business.mode}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: INV }}>Pending</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Connected Partners</Text>
            {accepted.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-circle-outline" size={48} color={colors.textTertiary} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center', maxWidth: 260 }}>
                  No connected partners yet. Share your code above or invite one.
                </Text>
              </View>
            ) : (
              accepted.map((l) => {
                const other = l.requesting_business.id === bizId ? l.partner_business : l.requesting_business;
                return (
                  <View key={l.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }}>{other.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2, textTransform: 'capitalize' }}>{other.mode}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E7D32' }}>Connected</Text>
                      </View>
                    </View>
                    {l.responded_at && (
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 8 }}>Since {fmtDate(l.responded_at)}</Text>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  card: {
    borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, marginBottom: 12,
  },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.sm,
  },
  sendBtn: {
    borderRadius: Radius.md, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 8, marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
});
