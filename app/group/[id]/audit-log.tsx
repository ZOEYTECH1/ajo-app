import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { groupService, type AuditLogEntry } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Skeleton } from '../../../src/components';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function summarizeExtraData(data: Record<string, unknown>): string | null {
  const skip = new Set(['group_name']); // already shown by the header context
  const parts = Object.entries(data)
    .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
  return parts.length ? parts.join(' · ') : null;
}

function EntryCard({ entry }: { entry: AuditLogEntry }) {
  const { colors } = useTheme();
  const actorName = entry.actor
    ? `${entry.actor.first_name} ${entry.actor.last_name}`.trim()
    : 'System';
  const detail = summarizeExtraData(entry.extra_data);

  return (
    <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={[s.icon, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            {entry.action_display}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            By {actorName} · {fmtDateTime(entry.timestamp)}
          </Text>
          {!!detail && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 4 }}>
              {detail}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function AuditLogRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const {
    data, isLoading, isError, isRefetching,
    refetch, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['group-audit-log', groupId],
    queryFn: ({ pageParam }) => groupService.getAuditLogPage(groupId, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    enabled: !!groupId,
  });

  const entries = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
            Audit Log
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>
            This group's full activity trail
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={s.body}>
          <Skeleton width="100%" height={72} radius={Radius.lg} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={72} radius={Radius.lg} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={72} radius={Radius.lg} />
        </ScrollView>
      ) : isError ? (
        <View style={s.empty}>
          <Ionicons name="wifi-outline" size={56} color={colors.primaryTint} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginTop: 16 }}>
            Couldn't load the audit log
          </Text>
          <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
            Pull down to retry.
          </Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="document-text-outline" size={56} color={colors.primaryTint} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginTop: 16 }}>
            No activity yet
          </Text>
          <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
            Every action taken in this group will be recorded here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
          {hasNextPage && (
            <TouchableOpacity
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{ alignItems: 'center', paddingVertical: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Load more entries"
            >
              {isFetchingNextPage
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>Load More</Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  body: { padding: 20, paddingBottom: 60 },
  card: { borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
});
