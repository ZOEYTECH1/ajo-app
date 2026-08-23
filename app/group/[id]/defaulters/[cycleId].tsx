import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/hooks/useTheme';
import { groupService, type Defaulter } from '../../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../../src/theme';
import { Skeleton } from '../../../../src/components';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

const daysUntil = (iso: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

// ─── Defaulter row ────────────────────────────────────────────────────────────
const DefaulterRow: React.FC<{ item: Defaulter; index: number }> = ({ item, index }) => {
  const { colors } = useTheme();
  const initials = `${item.user.first_name?.[0] ?? ''}${item.user.last_name?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={[s.row, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      <View style={[s.avatar, { backgroundColor: colors.errorLight }]}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: colors.error }}>
          {initials || '?'}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
          {item.user.first_name} {item.user.last_name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>Paid so far</Text>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
          ₦{Number(item.total_approved).toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

// ─── Grace period banner ──────────────────────────────────────────────────────
const GraceBanner: React.FC<{ visibleFrom: string }> = ({ visibleFrom }) => {
  const { colors } = useTheme();
  const days = daysUntil(visibleFrom);
  return (
    <View style={[s.graceBanner, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
      <Ionicons name="time-outline" size={28} color={colors.primary} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.primary }}>
          Grace period active
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: colors.primary, marginTop: 4, lineHeight: 20 }}>
          Members have until{' '}
          <Text style={{ fontWeight: '700' }}>{fmtDate(visibleFrom)}</Text>
          {' '}to make their payment.
          {days > 0 && ` That's ${days} day${days === 1 ? '' : 's'} from now.`}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.primary, marginTop: 8, opacity: 0.75 }}>
          Defaulters will be revealed once the grace period ends.
        </Text>
      </View>
    </View>
  );
};

// ─── Skeleton list ────────────────────────────────────────────────────────────
const RowSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[s.row, { backgroundColor: colors.surface }]}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="55%" height={14} radius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="75%" height={12} radius={4} />
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DefaultersScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id, cycleId } = useLocalSearchParams<{ id: string; cycleId: string }>();

  const groupId  = Number(id);
  const cycleNum = Number(cycleId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['defaulters', groupId, cycleNum],
    queryFn: () => groupService.getDefaulters(groupId, cycleNum),
  });

  const title = data ? `Cycle ${data.cycle_number} Defaulters` : 'Defaulters';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}

        {isError && (
          <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: FontSize.sm, marginLeft: 8, flex: 1 }}>
              Could not load defaulters. Pull down to retry.
            </Text>
            <TouchableOpacity onPress={() => refetch()} accessibilityRole="button" accessibilityLabel="Retry">
              <Text style={{ color: colors.error, fontWeight: '700', fontSize: FontSize.sm }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && data.grace_period_active && (
          <GraceBanner visibleFrom={data.visible_from} />
        )}

        {data && !data.grace_period_active && (
          <>
            {/* Summary strip */}
            <View style={[s.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.summaryItem}>
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.error }}>
                  {data.defaulters.length}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                  {data.defaulters.length === 1 ? 'Defaulter' : 'Defaulters'}
                </Text>
              </View>
              <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={s.summaryItem}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                  {fmtDate(data.end_date)}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                  Cycle end date
                </Text>
              </View>
              <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={s.summaryItem}>
                <Text style={[
                  { fontSize: FontSize.sm, fontWeight: '700' },
                  data.status === 'active' ? { color: colors.success } : { color: colors.textSecondary },
                ]}>
                  {data.status === 'active' ? 'Active' : 'Closed'}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                  Cycle status
                </Text>
              </View>
            </View>

            {data.defaulters.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>
                  No defaulters
                </Text>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Every member has made at least one approved payment this cycle.
                </Text>
              </View>
            ) : (
              data.defaulters.map((d, i) => (
                <DefaulterRow key={d.id} item={d} index={i} />
              ))
            )}
          </>
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
    paddingTop: 20,
    paddingBottom: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 8,
  },
  summaryStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
});
