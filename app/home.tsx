import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { groupService, type Group } from '../src/services/groupService';
import { thriftService, type ThriftGroup } from '../src/services/thriftService';
import { getCategories, getBusinesses, type InventoryCategory } from '../src/services/inventoryService';
import { getCategoryEmoji } from '../src/utils/inventoryHelpers';
import { useInventoryStore } from '../src/store/useAppStore';
import { FontSize, Radius, Shadow } from '../src/theme';
import { Skeleton, Pill } from '../src/components';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FREQ: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

// ─── Ajo Group Card ───────────────────────────────────────────────────────────
const GroupCard: React.FC<{ group: Group; isAdmin: boolean; onPress: () => void }> = ({ group, isAdmin, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${group.name} group`}
      accessibilityHint="Opens group details"
      style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
    >
      <View style={s.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 }} numberOfLines={1}>
            {group.name}
          </Text>
          {!!group.description && (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={2}>
              {group.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
      <View style={s.cardMeta}>
        <View style={s.metaItem}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            ₦{Number(group.contribution_amount).toLocaleString()} / {FREQ[group.contribution_frequency]}
          </Text>
        </View>
        {isAdmin && <Pill label="Admin" bg={colors.primaryTint} color={colors.primary} style={{ marginLeft: 'auto' }} />}
      </View>
    </TouchableOpacity>
  );
};

// ─── Thrift Group Card ────────────────────────────────────────────────────────
const ThriftCard: React.FC<{ group: ThriftGroup; isCollector: boolean; onPress: () => void }> = ({ group, isCollector, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${group.name} contribution group`}
      accessibilityHint="Opens contribution group details"
      style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
    >
      <View style={s.cardTop}>
        <View style={[s.thriftBadge, { backgroundColor: colors.successLight }]}>
          <Ionicons name="wallet-outline" size={18} color={colors.success} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 }} numberOfLines={1}>
            {group.name}
          </Text>
          {!!group.description && (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }} numberOfLines={1}>
              {group.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
      <View style={s.cardMeta}>
        <View style={s.metaItem}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            {group.member_count} {group.member_count === 1 ? 'payer' : 'payers'}
          </Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            {FREQ[group.frequency]}
          </Text>
        </View>
        {isCollector && <Pill label="Collector" bg={colors.successLight} color={colors.success} style={{ marginLeft: 'auto' }} />}
      </View>
    </TouchableOpacity>
  );
};

// ─── Inventory Category Card ──────────────────────────────────────────────────
const CategoryCard: React.FC<{ cat: InventoryCategory; onPress: () => void }> = ({ cat, onPress }) => {
  const { colors } = useTheme();
  const emoji = getCategoryEmoji(cat.name);
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cat.name} category`}
      accessibilityHint="Opens inventory category"
      style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
    >
      <View style={s.cardTop}>
        <View style={[s.thriftBadge, { backgroundColor: '#FFF3E0' }]}>
          <Text style={{ fontSize: 18 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
            {cat.name}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {cat.product_count} {cat.product_count === 1 ? 'product' : 'products'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Skeletons ────────────────────────────────────────────────────────────────
const CardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      <Skeleton width="70%" height={16} radius={6} style={{ marginBottom: 8 }} />
      <Skeleton width="90%" height={12} radius={4} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Skeleton width={80} height={12} radius={4} />
        <Skeleton width={110} height={12} radius={4} />
      </View>
    </View>
  );
};

const SectionTitle: React.FC<{ label: string }> = ({ label }) => {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
      {label}
    </Text>
  );
};

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeRoute() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'ajo' | 'thrift' | 'inventory'>('thrift');

  const { data: groups, isLoading: ajoLoading, isError: ajoError, refetch: refetchAjo, isRefetching: ajoRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getGroups,
  });

  const { data: thriftGroups, isLoading: thriftLoading, isError: thriftError, refetch: refetchThrift, isRefetching: thriftRefetching } = useQuery({
    queryKey: ['thrift-groups'],
    queryFn: thriftService.getGroups,
  });

  const { data: myOrgs } = useQuery({
    queryKey: ['thrift-orgs'],
    queryFn: thriftService.getOrgs,
  });

  const { data: collectorQueue } = useQuery({
    queryKey: ['thrift-collector-queue'],
    queryFn:  thriftService.getCollectorQueue,
    enabled:  !!user,
  });
  const queueCount = (collectorQueue?.pending_members.length ?? 0) + (collectorQueue?.disputed_payments.length ?? 0);

  const {
    selectedBusinessId,
    selectedBusinessMode,
    selectedBusinessRole,
    selectedBusinessName,
    setSelectedBusiness,
  } = useInventoryStore();

  const { data: businesses, refetch: refetchBusinesses } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
    enabled: tab === 'inventory',
  });

  const { data: categories, isLoading: invLoading, isError: invError, refetch: refetchInv, isRefetching: invRefetching } = useQuery({
    queryKey: ['inventory-categories', selectedBusinessId],
    queryFn: () => getCategories(selectedBusinessId),
    enabled: tab === 'inventory' && !!selectedBusinessId,
  });

  // Auto-select the single business when the user has exactly one location.
  React.useEffect(() => {
    if (!businesses) return;
    if (businesses.length === 1 && !selectedBusinessId) {
      const b = businesses[0];
      setSelectedBusiness(b.id, b.mode, b.my_role, b.name);
    }
  }, [businesses]);

  const handleLogout = () => { logout(); router.replace('/login'); };

  const requirePhoto = (action: () => void) => {
    if (!user?.profile_photo) {
      Alert.alert(
        'Profile Photo Required',
        'Upload a profile photo before creating or joining groups.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/profile') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    action();
  };

  // Ajo
  const adminGroups  = groups?.filter((g) => g.admin.id === user?.id) ?? [];
  const joinedGroups = groups?.filter((g) => g.admin.id !== user?.id) ?? [];

  // Thrift
  const myThriftGroups    = thriftGroups?.filter((g) => g.collector.id === user?.id) ?? [];
  const joinedThriftGroups = thriftGroups?.filter((g) => g.collector.id !== user?.id) ?? [];
  const isOrgAdmin = (myOrgs ?? []).length > 0;
  // Users with any thrift involvement (collector or payer) only see Contributions — no Ajo tab

  const isLoading    = tab === 'ajo' ? ajoLoading    : tab === 'thrift' ? thriftLoading : invLoading;
  const isError      = tab === 'ajo' ? ajoError      : tab === 'thrift' ? thriftError   : invError;
  const isRefreshing = tab === 'ajo' ? ajoRefetching : tab === 'thrift' ? thriftRefetching : invRefetching;
  // For inventory: refetch() bypasses enabled, so guard it — reload businesses when
  // no business is selected so auto-select can run; refetch categories otherwise.
  const refetchInventory = React.useCallback(() => {
    if (!selectedBusinessId) return refetchBusinesses();
    return refetchInv();
  }, [selectedBusinessId, refetchBusinesses, refetchInv]);
  const onRefresh    = tab === 'ajo' ? refetchAjo    : tab === 'thrift' ? refetchThrift : refetchInventory;

  const handleFab = () => {
    if (tab === 'ajo') {
      requirePhoto(() => router.push('/group/create' as any));
    } else if (tab === 'thrift') {
      requirePhoto(() => router.push('/thrift/create' as any));
    } else {
      router.push('/inventory/create-category' as any);
    }
  };

  // ── Org admin home ─────────────────────────────────────────────────────────
  if (isOrgAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 }}>Welcome back</Text>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
              {user?.first_name ?? 'there'} {user?.last_name ?? ''}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.headerIcon} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} accessibilityRole="button" accessibilityLabel="Log out">
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          <SectionTitle label={(myOrgs ?? []).length === 1 ? 'My Organisation' : 'My Organisations'} />
          {(myOrgs ?? []).map((org) => (
            <TouchableOpacity
              key={org.id}
              onPress={() => router.push(`/thrift/org/${org.id}` as any)}
              style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`${org.name} organisation`}
              accessibilityHint="Opens organisation dashboard"
            >
              <View style={s.cardTop}>
                <View style={[s.thriftBadge, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                    {org.name}
                  </Text>
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
                    {org.org_type.toUpperCase()}{org.is_verified ? ' · Verified' : ''}
                  </Text>
                </View>
                {org.is_verified && (
                  <Ionicons name="shield-checkmark" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
              <View style={s.cardMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
                    {org.member_count} {org.member_count === 1 ? 'collector' : 'collectors'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 }}>Welcome back</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            {user?.first_name ?? 'there'} {user?.last_name ?? ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.headerIcon} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} accessibilityRole="button" accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Tab Row ── */}
      <View accessibilityRole="tablist" style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {([
          { key: 'ajo', label: 'Ajo Groups' },
          { key: 'thrift', label: 'Contributions' },
          { key: 'inventory', label: 'Inventory' },
        ] as const).map(({ key, label }) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={s.tabBtn} activeOpacity={0.8} accessibilityRole="tab" accessibilityLabel={`${label} tab`} accessibilityState={{ selected: tab === key }}>
            <Text style={[s.tabLabel, { color: tab === key ? colors.primary : colors.textSecondary, fontWeight: tab === key ? '700' : '400' }]}>
              {label}
            </Text>
            {tab === key && <View style={[s.tabUnderline, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Body ── */}
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isError && (
          <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: colors.error, fontSize: FontSize.sm, marginLeft: 8 }}>Could not load. Pull down to retry.</Text>
          </View>
        )}

        {isLoading ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : tab === 'ajo' ? (
          /* ── Ajo content ── */
          <>
            {adminGroups.length > 0 && (
              <>
                <SectionTitle label="My Groups" />
                {adminGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isAdmin onPress={() => router.push(`/group/${g.id}` as any)} />
                ))}
              </>
            )}
            {joinedGroups.length > 0 && (
              <>
                {adminGroups.length > 0 && <View style={s.sectionDivider} />}
                <SectionTitle label="Groups I've Joined" />
                {joinedGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isAdmin={false} onPress={() => router.push(`/group/${g.id}` as any)} />
                ))}
              </>
            )}
            {adminGroups.length === 0 && joinedGroups.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-circle-outline" size={64} color={colors.primaryTint} />
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>No groups yet</Text>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Create your first Ajo group or join one with an invite code.
                </Text>
              </View>
            )}
            {!isLoading && (
              <TouchableOpacity
                onPress={() => requirePhoto(() => router.push('/group/join' as any))}
                style={[s.joinCodeBtn, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Join an Ajo Group"
                accessibilityHint="Enter an invite code to join a group"
              >
                <View style={[s.joinCodeIcon, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="key-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>Join an Ajo Group</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Enter an invite code from your group admin</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </>
        ) : tab === 'thrift' ? (
          /* ── Thrift content ── */
          <>
            {/* Approval queue banner — shown when collector has pending items */}
            {myThriftGroups.length > 0 && queueCount > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/thrift/queue' as any)}
                style={[s.billsBanner, { backgroundColor: colors.errorLight, borderColor: colors.error, marginBottom: 10 }]}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`${queueCount} item${queueCount !== 1 ? 's' : ''} need your attention`}
                accessibilityHint="Opens approval queue"
              >
                <View style={[s.billsIcon, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="time-outline" size={20} color={colors.error} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.error }}>
                    {queueCount} item{queueCount !== 1 ? 's' : ''} need your attention
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 1, opacity: 0.8 }}>
                    Pending approvals or disputed payments
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.error} />
              </TouchableOpacity>
            )}

            {/* Bills banner — shown to collectors only */}
            {myThriftGroups.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/thrift/billing' as any)}
                style={[s.billsBanner, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="My Platform Bills"
                accessibilityHint="View and pay monthly fee invoices"
              >
                <View style={[s.billsIcon, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>My Platform Bills</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>View and pay your monthly fee invoices</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}

            {myThriftGroups.length > 0 && (
              <>
                <SectionTitle label="My Contribution Groups" />
                {myThriftGroups.map((g) => (
                  <ThriftCard key={g.id} group={g} isCollector onPress={() => router.push(`/thrift/${g.id}` as any)} />
                ))}
              </>
            )}
            {joinedThriftGroups.length > 0 && (
              <>
                {myThriftGroups.length > 0 && <View style={s.sectionDivider} />}
                <SectionTitle label="Contributions I've Joined" />
                {joinedThriftGroups.map((g) => (
                  <ThriftCard key={g.id} group={g} isCollector={false} onPress={() => router.push(`/thrift/${g.id}` as any)} />
                ))}
              </>
            )}
            {!thriftError && myThriftGroups.length === 0 && joinedThriftGroups.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="wallet-outline" size={64} color={colors.successLight} />
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>No contribution groups yet</Text>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Create a contribution group to start collecting, or join one with an invite code from your collector.
                </Text>
              </View>
            )}
            {!isLoading && !thriftError && (
              <TouchableOpacity
                onPress={() => requirePhoto(() => router.push('/thrift/join' as any))}
                style={[s.joinCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Join a Contribution Group"
                accessibilityHint="Enter the invite code from your collector"
              >
                <View style={[s.joinCodeIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="key-outline" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>Join a Contribution Group</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Enter the invite code from your collector</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* ── Inventory content ── */
          <>
            {/* Location switcher — only visible when user has 2+ businesses */}
            {(businesses ?? []).length > 1 && (
              <TouchableOpacity
                onPress={() => router.push('/inventory/locations' as any)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`Current location: ${selectedBusinessName ?? 'Select a location'}`}
                accessibilityHint="Switch business location"
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: '#FFF3E0', borderRadius: Radius.lg,
                  paddingHorizontal: 14, paddingVertical: 12,
                  marginBottom: 16, gap: 10,
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFE0B2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons
                    name={selectedBusinessMode === 'warehouse' ? 'cube-outline' : 'storefront-outline'}
                    size={18} color="#E65100"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600' }}>CURRENT LOCATION</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#E65100', marginTop: 1 }}>
                    {selectedBusinessName ?? 'Select a location'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#E65100" />
              </TouchableOpacity>
            )}

            {/* Quick-action bar — role & mode aware */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {(() => {
                const isWarehouse = selectedBusinessMode === 'warehouse';
                const isStaff     = selectedBusinessRole === 'staff';
                const isOwnerOrMgr = selectedBusinessRole === 'owner' || selectedBusinessRole === 'manager';

                const actions: { icon: string; label: string; route: string }[] = [
                  { icon: 'bar-chart-outline',  label: 'Dashboard',      route: '/inventory/dashboard' },
                  ...(!isWarehouse ? [
                    { icon: 'cart-outline',      label: 'Record Sale',    route: '/inventory/new-sale' },
                    { icon: 'time-outline',      label: 'Sales',          route: '/inventory/sales' },
                    { icon: 'people-outline',    label: 'Customers',      route: '/inventory/customers' },
                  ] : []),
                  ...(isWarehouse ? [
                    { icon: 'arrow-down-circle-outline', label: 'Receive Goods',  route: '/inventory/warehouse-receive' },
                    { icon: 'arrow-up-circle-outline',   label: 'Dispatch Stock', route: '/inventory/warehouse-dispatch' },
                  ] : []),
                  { icon: 'receipt-outline',     label: 'Expenses',       route: '/inventory/expenses' },
                  ...(!isStaff ? [
                    { icon: 'podium-outline',    label: 'Best Sellers',   route: '/inventory/best-sellers' },
                    { icon: 'trending-up-outline', label: 'Analytics',    route: '/inventory/analytics' },
                  ] : []),
                  ...(isOwnerOrMgr ? [
                    { icon: 'swap-horizontal-outline', label: 'Transfer',         route: '/inventory/transfer' },
                    { icon: 'git-compare-outline',     label: 'Transfer History', route: '/inventory/transfers' },
                    { icon: 'people-outline',          label: 'Staff',            route: '/inventory/staff' },
                    { icon: 'business-outline',        label: 'My Business',      route: '/inventory/business' },
                  ] : []),
                  ...((businesses ?? []).length > 1 ? [
                    { icon: 'location-outline',  label: 'Locations',      route: '/inventory/locations' },
                  ] : []),
                ];

                return actions.map(({ icon, label, route }) => (
                  <TouchableOpacity
                    key={route}
                    onPress={() => router.push(route as any)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={{ backgroundColor: '#FFF3E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', gap: 6 }}
                  >
                    <Ionicons name={icon as any} size={16} color="#E65100" />
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#E65100' }}>{label}</Text>
                  </TouchableOpacity>
                ));
              })()}
            </View>

            {(categories ?? []).length > 0 ? (
              <>
                <SectionTitle label="My Inventory Categories" />
                {(categories ?? []).map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    onPress={() => router.push(`/inventory/${cat.id}` as any)}
                  />
                ))}
              </>
            ) : (
              !invLoading && !invError && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="cube-outline" size={64} color="#FFF3E0" />
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>No inventory yet</Text>
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                    Create a category to start tracking your products and stock movements.
                  </Text>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={handleFab}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={tab === 'ajo' ? 'Create Ajo group' : tab === 'thrift' ? 'Create contribution group' : 'Create inventory category'}
        style={[s.fab, { backgroundColor: tab === 'ajo' ? colors.primary : tab === 'thrift' ? colors.success : '#E65100', ...Shadow.strong(tab === 'ajo' ? colors.primary : tab === 'thrift' ? colors.success : '#E65100') }]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

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
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tabBtn: {
    marginRight: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabLabel: { fontSize: FontSize.sm },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  card: { borderRadius: Radius.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  thriftBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionDivider: { height: 1, marginVertical: 24 },
  fab: { position: 'absolute', bottom: 92, right: 24, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  joinCodeBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1, marginTop: 8 },
  joinCodeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, marginBottom: 16 },
  billsBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.lg, borderWidth: 1, marginBottom: 20 },
  billsIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
