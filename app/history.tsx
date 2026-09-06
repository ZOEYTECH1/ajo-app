import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/hooks/useTheme';
import { groupService, type Payment, type PaymentStatus } from '../src/services/groupService';
import { thriftService, type ThriftHistoryPayment } from '../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../src/theme';
import { Skeleton } from '../src/components';

// ─── Shared helpers ───────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtAmt = (v: string | number) => `₦${Number(v).toLocaleString()}`;

// ─── Top tab bar (Ajo / Thrift) ───────────────────────────────────────────────
type TopTab = 'ajo' | 'thrift';

function TopTabBar({ active, showAjo, showThrift, onChange }: {
  active: TopTab; showAjo: boolean; showThrift: boolean; onChange: (t: TopTab) => void;
}) {
  const { colors } = useTheme();
  if (!showAjo || !showThrift) return null; // only render when user has both
  return (
    <View accessibilityRole="tablist" style={[ts.topTabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {showAjo && (
        <TouchableOpacity
          style={[ts.topTab, { borderBottomColor: active === 'ajo' ? colors.primary : 'transparent' }]}
          onPress={() => onChange('ajo')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Ajo tab"
          accessibilityState={{ selected: active === 'ajo' }}
        >
          <Text style={[ts.topTabLabel, { color: active === 'ajo' ? colors.primary : colors.textSecondary }]}>
            Ajo
          </Text>
        </TouchableOpacity>
      )}
      {showThrift && (
        <TouchableOpacity
          style={[ts.topTab, { borderBottomColor: active === 'thrift' ? colors.success : 'transparent' }]}
          onPress={() => onChange('thrift')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Contributions tab"
          accessibilityState={{ selected: active === 'thrift' }}
        >
          <Text style={[ts.topTabLabel, { color: active === 'thrift' ? colors.success : colors.textSecondary }]}>
            Contributions
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Filter pill row (All / Pending / Approved / Rejected) ───────────────────
type AjoFilter = 'all' | PaymentStatus;

function FilterRow({ filter, counts, onChange }: {
  filter: AjoFilter; counts: Record<AjoFilter, number>; onChange: (f: AjoFilter) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[ts.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {(['all', 'pending', 'approved', 'rejected'] as AjoFilter[]).map((f) => {
        const active = filter === f;
        return (
          <TouchableOpacity
            key={f}
            onPress={() => onChange(f)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={`${f.charAt(0).toUpperCase() + f.slice(1)} filter`}
            accessibilityState={{ selected: active }}
            style={[ts.filterTab, { borderBottomColor: active ? colors.primary : 'transparent' }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[ts.filterLabel, { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {counts[f] > 0 && (
                <View style={[ts.countDot, { backgroundColor: active ? colors.primaryTint : colors.background }]}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: active ? colors.primary : colors.textTertiary, lineHeight: 14 }}>
                    {counts[f]}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Thrift sub-tab (As Collector / As Payer) ─────────────────────────────────
type ThriftRole = 'collector' | 'payer';

function ThriftRoleBar({ active, showCollector, showPayer, onChange }: {
  active: ThriftRole; showCollector: boolean; showPayer: boolean; onChange: (r: ThriftRole) => void;
}) {
  const { colors } = useTheme();
  if (!showCollector || !showPayer) return null;
  return (
    <View accessibilityRole="tablist" style={[ts.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {showCollector && (
        <TouchableOpacity
          style={[ts.filterTab, { borderBottomColor: active === 'collector' ? colors.success : 'transparent' }]}
          onPress={() => onChange('collector')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="As Collector tab"
          accessibilityState={{ selected: active === 'collector' }}
        >
          <Text style={[ts.filterLabel, { color: active === 'collector' ? colors.success : colors.textSecondary, fontWeight: active === 'collector' ? '700' : '500' }]}>
            As Collector
          </Text>
        </TouchableOpacity>
      )}
      {showPayer && (
        <TouchableOpacity
          style={[ts.filterTab, { borderBottomColor: active === 'payer' ? colors.success : 'transparent' }]}
          onPress={() => onChange('payer')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="My Payments tab"
          accessibilityState={{ selected: active === 'payer' }}
        >
          <Text style={[ts.filterLabel, { color: active === 'payer' ? colors.success : colors.textSecondary, fontWeight: active === 'payer' ? '700' : '500' }]}>
            My Payments
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Ajo payment card ─────────────────────────────────────────────────────────
function AjoPaymentCard({ payment, onPress }: { payment: Payment; onPress: () => void }) {
  const { colors } = useTheme();
  const statusColor = payment.status === 'approved' ? colors.success : payment.status === 'rejected' ? colors.error : colors.warning;
  const statusBg    = payment.status === 'approved' ? colors.successLight : payment.status === 'rejected' ? colors.errorLight : colors.warningLight;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Payment of ${fmtAmt(payment.amount_entered)} to ${payment.group_name}, status ${payment.status}, submitted ${fmtDate(payment.submitted_at)}`}
      style={[ts.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}
    >
      <View style={ts.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
            {payment.group_name}
          </Text>
          {payment.cycle_number != null && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Cycle #{payment.cycle_number}</Text>
          )}
        </View>
        <View style={[ts.badge, { backgroundColor: statusBg }]}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: statusColor, textTransform: 'capitalize' }}>{payment.status}</Text>
        </View>
      </View>
      <View style={ts.cardBottom}>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>{fmtAmt(payment.amount_entered)}</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{fmtDate(payment.submitted_at)}</Text>
      </View>
      {payment.rejection_reason ? (
        <View style={[ts.alertBox, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.error, marginLeft: 6 }} numberOfLines={2}>{payment.rejection_reason}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Thrift payment card (works for both collector + payer views) ─────────────
function ThriftPaymentCard({ payment, role }: { payment: ThriftHistoryPayment; role: ThriftRole }) {
  const { colors } = useTheme();

  const statusColor =
    payment.status === 'confirmed' ? colors.success :
    payment.status === 'disputed'  ? colors.error :
    colors.warning;
  const statusBg =
    payment.status === 'confirmed' ? colors.successLight :
    payment.status === 'disputed'  ? colors.errorLight :
    colors.warningLight;
  const statusLabel =
    payment.status === 'confirmed' ? 'Confirmed' :
    payment.status === 'disputed'  ? 'Disputed'  :
    'Awaiting confirmation';

  return (
    <View style={[ts.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
      <View style={ts.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
            {role === 'collector' ? payment.member_name : payment.group_name}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {role === 'collector' ? payment.group_name : `Marked by collector · ${fmtDate(payment.marked_at)}`}
          </Text>
        </View>
        <View style={[ts.badge, { backgroundColor: statusBg }]}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
        </View>
      </View>

      <View style={ts.cardBottom}>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>{fmtAmt(payment.amount)}</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{fmtDate(payment.period_date)}</Text>
      </View>

      {payment.status === 'disputed' && !!payment.dispute_reason && (
        <View style={[ts.alertBox, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.error, marginLeft: 6 }} numberOfLines={2}>
            {payment.dispute_reason}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={ts.empty}>
      <Ionicons name={icon as any} size={56} color={colors.primaryTint} />
      <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginTop: 16 }}>{title}</Text>
      <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>{body}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HistoryRoute() {
  const { colors, isDark } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [topTab,     setTopTab]     = useState<TopTab>('ajo');
  const [thriftRole, setThriftRole] = useState<ThriftRole>('collector');
  const [ajoFilter,  setAjoFilter]  = useState<AjoFilter>('all');

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: ajoData, isLoading: ajoLoading, isError: ajoError,
    refetch: refetchAjo, isFetching: ajoFetching,
    fetchNextPage: fetchMoreAjo, hasNextPage: ajoHasMore, isFetchingNextPage: ajoFetchingMore,
  } = useInfiniteQuery({
    queryKey: ['payment-history', ajoFilter],
    queryFn: ({ pageParam }) => groupService.getPaymentHistoryPage(pageParam as string | null, ajoFilter),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
  });

  const {
    data: collectorData, isLoading: collectorLoading,
    refetch: refetchCollector, isFetching: collectorFetching,
    fetchNextPage: fetchMoreCollector, hasNextPage: collectorHasMore, isFetchingNextPage: collectorFetchingMore,
  } = useInfiniteQuery({
    queryKey: ['thrift-ph-collector'],
    queryFn: ({ pageParam }) => thriftService.getMyPaymentHistoryPage('collector', pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
  });

  const {
    data: payerData, isLoading: payerLoading,
    refetch: refetchPayer, isFetching: payerFetching,
    fetchNextPage: fetchMorePayer, hasNextPage: payerHasMore, isFetchingNextPage: payerFetchingMore,
  } = useInfiniteQuery({
    queryKey: ['thrift-ph-payer'],
    queryFn: ({ pageParam }) => thriftService.getMyPaymentHistoryPage('payer', pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
  });

  // ── Determine which top tabs to show ──────────────────────────────────────
  const ajoPayments       = ajoData?.pages.flatMap(p => p.results) ?? [];
  const ajoTotal          = ajoData?.pages[0]?.count ?? 0;
  const collectorPayments = collectorData?.pages.flatMap(p => p.results) ?? [];
  const payerPayments     = payerData?.pages.flatMap(p => p.results) ?? [];

  const hasAjo    = ajoTotal > 0 || ajoPayments.length > 0;
  const hasThrift = (collectorData?.pages[0]?.count ?? 0) > 0 || collectorPayments.length > 0
                 || (payerData?.pages[0]?.count ?? 0) > 0 || payerPayments.length > 0;
  const showBothTabs = hasAjo && hasThrift;

  const effectiveTopTab: TopTab = showBothTabs ? topTab : (hasThrift ? 'thrift' : 'ajo');

  const hasCollector = collectorPayments.length > 0 || (collectorData?.pages[0]?.count ?? 0) > 0;
  const hasPayer     = payerPayments.length > 0 || (payerData?.pages[0]?.count ?? 0) > 0;
  const effectiveRole: ThriftRole = (hasCollector && hasPayer) ? thriftRole : (hasCollector ? 'collector' : 'payer');

  const ajoFiltered = ajoPayments;
  const ajoCounts: Record<AjoFilter, number> = {
    all:      ajoFilter === 'all' ? ajoPayments.length : 0,
    pending:  ajoFilter === 'pending' ? ajoPayments.length : 0,
    approved: ajoFilter === 'approved' ? ajoPayments.length : 0,
    rejected: ajoFilter === 'rejected' ? ajoPayments.length : 0,
  };

  const thriftDisplayList = effectiveRole === 'collector' ? collectorPayments : payerPayments;
  const thriftHasMore = effectiveRole === 'collector' ? collectorHasMore : payerHasMore;
  const thriftFetchingMore = effectiveRole === 'collector' ? collectorFetchingMore : payerFetchingMore;
  const fetchMoreThrift = effectiveRole === 'collector' ? fetchMoreCollector : fetchMorePayer;

  const isLoading    = ajoLoading || collectorLoading || payerLoading;
  const isRefreshing = (ajoFetching && !ajoLoading)
                    || (collectorFetching && !collectorLoading)
                    || (payerFetching && !payerLoading);
  const refetchAll = () => { refetchAjo(); refetchCollector(); refetchPayer(); };

  const headerSubtitle =
    effectiveTopTab === 'thrift' && effectiveRole === 'collector'
      ? 'Payments you have collected across your groups'
      : effectiveTopTab === 'thrift'
      ? 'Payments your collectors have marked for you'
      : 'Your contribution submissions across Ajo groups';

  return (
    <View style={[ts.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[ts.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <Text accessibilityRole="header" style={[ts.title, { color: colors.textPrimary }]}>History</Text>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>{headerSubtitle}</Text>
      </View>

      {/* Top tab bar — only visible when user has both Ajo + Thrift activity */}
      <TopTabBar
        active={effectiveTopTab}
        showAjo={showBothTabs}
        showThrift={showBothTabs}
        onChange={(t) => { setTopTab(t); }}
      />

      {/* Ajo filter row */}
      {effectiveTopTab === 'ajo' && (
        <FilterRow filter={ajoFilter} counts={ajoCounts} onChange={setAjoFilter} />
      )}

      {/* Thrift sub-role tab */}
      {effectiveTopTab === 'thrift' && (
        <ThriftRoleBar
          active={effectiveRole}
          showCollector={hasCollector}
          showPayer={hasPayer}
          onChange={setThriftRole}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <ScrollView contentContainerStyle={ts.body}>
          {[1,2,3,4].map((i) => <Skeleton key={i} width="100%" height={88} radius={Radius.lg} style={{ marginBottom: 12 }} />)}
        </ScrollView>
      ) : ajoError && effectiveTopTab === 'ajo' ? (
        <Empty icon="wifi-outline" title="Couldn't load history" body="Pull down to retry." />
      ) : effectiveTopTab === 'ajo' && ajoFiltered.length === 0 ? (
        <Empty
          icon="time-outline"
          title={ajoFilter === 'all' ? 'No payments yet' : `No ${ajoFilter} payments`}
          body={ajoFilter === 'all' ? 'Payments you submit to any Ajo group will appear here.' : `You have no ${ajoFilter} payments right now.`}
        />
      ) : effectiveTopTab === 'thrift' && thriftDisplayList.length === 0 ? (
        <Empty
          icon="wallet-outline"
          title="No payments yet"
          body={effectiveRole === 'collector'
            ? 'Payments you mark for your payers will appear here.'
            : 'Payments your collector marks for you will appear here.'}
        />
      ) : (
        <ScrollView
          contentContainerStyle={ts.body}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {effectiveTopTab === 'ajo'
            ? ajoFiltered.map((p) => (
                <AjoPaymentCard key={p.id} payment={p} onPress={() => router.push(`/group/${p.group_id}` as any)} />
              ))
            : thriftDisplayList.map((p) => (
                <ThriftPaymentCard key={p.id} payment={p} role={effectiveRole} />
              ))
          }
          {effectiveTopTab === 'ajo' && ajoHasMore && (
            <TouchableOpacity
              onPress={() => fetchMoreAjo()}
              disabled={ajoFetchingMore}
              style={{ alignItems: 'center', paddingVertical: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Load more payments"
            >
              {ajoFetchingMore
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>Load More</Text>
              }
            </TouchableOpacity>
          )}
          {effectiveTopTab === 'thrift' && thriftHasMore && (
            <TouchableOpacity
              onPress={() => fetchMoreThrift()}
              disabled={thriftFetchingMore}
              style={{ alignItems: 'center', paddingVertical: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Load more payments"
            >
              {thriftFetchingMore
                ? <ActivityIndicator color={colors.success} />
                : <Text style={{ color: colors.success, fontWeight: '700', fontSize: FontSize.sm }}>Load More</Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ts = StyleSheet.create({
  root:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title:  { fontSize: FontSize.xl, fontWeight: '800' },

  topTabRow:  { flexDirection: 'row', borderBottomWidth: 1 },
  topTab:     { flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 2.5 },
  topTabLabel:{ fontSize: FontSize.sm, fontWeight: '600' },

  filterRow:  { flexDirection: 'row', borderBottomWidth: 1 },
  filterTab:  { flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 2.5 },
  filterLabel:{ fontSize: FontSize.xs },
  countDot:   { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  card:     { borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardBottom:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginLeft: 8 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, padding: 8, borderRadius: Radius.sm },

  eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
});
