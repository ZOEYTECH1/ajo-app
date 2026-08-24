import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getCategories,
  getBranchProductRequestsPage,
  createBranchProductRequest,
  reviewBranchProductRequest,
  type BranchProductRequest,
} from '../../src/services/inventoryService';
import ErrorBanner from '../../src/components/ErrorBanner';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

function statusBadge(s: BranchProductRequest['status']) {
  if (s === 'approved') return { label: 'Approved', bg: '#E8F5E9', color: '#2E7D32' };
  if (s === 'rejected') return { label: 'Rejected', bg: '#FFEBEE', color: '#C62828' };
  return { label: 'Pending', bg: '#FFF3E0', color: INV };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProductRequestsScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const { selectedBusinessId, selectedBusinessMode, selectedBusinessRole } = useInventoryStore();
  const bizId = selectedBusinessId ?? 0;

  const isBranch    = selectedBusinessMode === 'branch';
  const canReview   = !isBranch && (selectedBusinessRole === 'owner' || selectedBusinessRole === 'manager');
  const canRequest  = isBranch && (selectedBusinessRole === 'branch_admin' || selectedBusinessRole === 'owner' || selectedBusinessRole === 'manager');

  const [filter, setFilter] = useState<StatusFilter>(canReview ? 'pending' : 'all');

  // New request modal
  const [modal, setModal]             = useState(false);
  const [categoryId, setCategoryId]   = useState<number | null>(null);
  const [productName, setProductName] = useState('');
  const [note, setNote]               = useState('');
  const [catOpen, setCatOpen]         = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories', bizId],
    queryFn: () => getCategories(bizId),
    enabled: canRequest && !!bizId,
  });

  const {
    data: requestsData, isLoading, isError, error, isRefetching, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['product-requests', bizId, filter],
    queryFn: ({ pageParam }) =>
      getBranchProductRequestsPage(bizId, filter === 'all' ? undefined : filter, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? (lastPageParam as number) + 1 : undefined,
    enabled: !!bizId,
  });

  const requests = requestsData?.pages.flatMap(p => p.results) ?? [];

  const { mutate: submitRequest, isPending: submitting } = useMutation({
    mutationFn: () => createBranchProductRequest(bizId, {
      category: categoryId!,
      product_name: productName.trim(),
      note: note.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-requests', bizId] });
      closeModal();
      Alert.alert('Submitted', 'Your product request has been sent to the business owner.');
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.response?.data?.detail || 'Could not submit request. Try again.'),
  });

  const { mutate: doReview, isPending: reviewing } = useMutation({
    mutationFn: ({ reqId, status }: { reqId: number; status: 'approved' | 'rejected' }) =>
      reviewBranchProductRequest(reqId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-requests', bizId] });
    },
    onError: () => Alert.alert('Error', 'Could not update request. Try again.'),
  });

  const closeModal = () => {
    setModal(false);
    setCategoryId(null);
    setProductName('');
    setNote('');
    setCatOpen(false);
  };

  const handleSubmit = () => {
    if (!categoryId) return Alert.alert('Required', 'Please select a category.');
    if (!productName.trim()) return Alert.alert('Required', 'Please enter the product name.');
    submitRequest();
  };

  const confirmReview = (req: BranchProductRequest, newStatus: 'approved' | 'rejected') => {
    const verb = newStatus === 'approved' ? 'Approve' : 'Reject';
    Alert.alert(
      `${verb} Request`,
      `${verb} "${req.product_name}" from ${req.branch_name}?${newStatus === 'approved' ? '\n\nThe product will be added to the branch automatically.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: verb, style: newStatus === 'rejected' ? 'destructive' : 'default', onPress: () => doReview({ reqId: req.id, status: newStatus }) },
      ],
    );
  };

  const selectedCat = categories?.find(c => c.id === categoryId);

  const FILTERS: StatusFilter[] = canReview ? ['pending', 'all', 'approved', 'rejected'] : ['all', 'pending', 'approved', 'rejected'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          accessibilityRole="button" accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            {canReview ? 'Branch Requests' : 'My Product Requests'}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {canReview ? 'Review product requests from branches' : 'Request new products from the owner'}
          </Text>
        </View>
        {canRequest && (
          <TouchableOpacity
            onPress={() => setModal(true)}
            style={{ backgroundColor: '#FFF3E0', borderRadius: Radius.md, padding: 8 }}
            accessibilityRole="button" accessibilityLabel="New product request"
          >
            <Ionicons name="add" size={22} color={INV} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}
      >
        {FILTERS.map(f => {
          const active = filter === f;
          const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[s.filterTab, { backgroundColor: active ? INV : colors.background, borderColor: active ? INV : colors.border }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
      >
        {isError && <ErrorBanner error={error} onRetry={refetch} />}
        {isLoading ? (
          <ActivityIndicator size="large" color={INV} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textSecondary, marginTop: 16 }}>
              No requests{filter !== 'all' ? ` (${filter})` : ''}
            </Text>
            {canRequest && (
              <Text style={{ fontSize: FontSize.sm, color: colors.textTertiary, textAlign: 'center', marginTop: 8, maxWidth: 260 }}>
                Tap the + button to request a product from the business owner.
              </Text>
            )}
          </View>
        ) : (
          <>
          {requests.map(req => {
            const badge = statusBadge(req.status);
            return (
              <View
                key={req.id}
                style={[s.card, {
                  backgroundColor: colors.surface,
                  borderColor: req.status === 'pending' ? colors.border : req.status === 'approved' ? '#C8E6C9' : '#FFCDD2',
                  ...Shadow.card(colors.black),
                }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                      {req.product_name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <View style={[s.badge, { backgroundColor: badge.bg }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{req.category_name}</Text>
                      </View>
                    </View>
                    {canReview && (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
                        From: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{req.branch_name}</Text>
                      </Text>
                    )}
                    {req.note ? (
                      <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }} numberOfLines={2}>
                        "{req.note}"
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 6 }}>
                      {req.requested_by_name ? `By ${req.requested_by_name} · ` : ''}{fmtDate(req.created_at)}
                    </Text>
                    {req.reviewed_by_name && req.reviewed_at && (
                      <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                        Reviewed by {req.reviewed_by_name} · {fmtDate(req.reviewed_at)}
                      </Text>
                    )}
                  </View>
                </View>

                {canReview && req.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      onPress={() => confirmReview(req, 'rejected')}
                      disabled={reviewing}
                      style={[s.reviewBtn, { borderColor: '#C62828', flex: 1 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Reject ${req.product_name}`}
                    >
                      <Ionicons name="close-outline" size={16} color="#C62828" />
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#C62828', marginLeft: 4 }}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmReview(req, 'approved')}
                      disabled={reviewing}
                      style={[s.reviewBtn, { backgroundColor: '#2E7D32', borderColor: '#2E7D32', flex: 1 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Approve ${req.product_name}`}
                    >
                      <Ionicons name="checkmark-outline" size={16} color="#fff" />
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff', marginLeft: 4 }}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          {hasNextPage && (
            <TouchableOpacity
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{ alignItems: 'center', paddingVertical: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Load more requests"
            >
              {isFetchingNextPage
                ? <ActivityIndicator color={INV} />
                : <Text style={{ color: INV, fontWeight: '700', fontSize: FontSize.sm }}>Load More</Text>
              }
            </TouchableOpacity>
          )}
          </>
        )}
      </ScrollView>

      {/* New request modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeModal} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
              Request a Product
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
              The owner will be notified and can approve or reject this request.
            </Text>

            {/* Category picker */}
            <Text style={[s.label, { color: colors.textSecondary }]}>Category</Text>
            <TouchableOpacity
              onPress={() => setCatOpen(o => !o)}
              style={[s.input, { borderColor: colors.border, backgroundColor: colors.background }]}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: FontSize.sm, color: categoryId ? colors.textPrimary : colors.textTertiary, flex: 1 }}>
                {selectedCat?.name ?? 'Select a category'}
              </Text>
              <Ionicons name={catOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {catOpen && (
              <View style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(categories ?? []).map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => { setCategoryId(c.id); setCatOpen(false); }}
                    style={[s.dropdownItem, c.id === categoryId && { backgroundColor: '#FFF3E0' }]}
                  >
                    <Text style={{ fontSize: FontSize.sm, color: c.id === categoryId ? INV : colors.textPrimary, fontWeight: c.id === categoryId ? '700' : '400' }}>
                      {c.name}
                    </Text>
                    {c.id === categoryId && <Ionicons name="checkmark" size={16} color={INV} />}
                  </TouchableOpacity>
                ))}
                {(categories ?? []).length === 0 && (
                  <Text style={{ fontSize: FontSize.sm, color: colors.textTertiary, padding: 12 }}>No categories yet.</Text>
                )}
              </View>
            )}

            {/* Product name */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 14 }]}>Product Name</Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Indomie Chicken Flavour"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            />

            {/* Note (optional) */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 14 }]}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Any extra details for the owner…"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              style={[s.input, s.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[s.submitBtn, { backgroundColor: INV, opacity: submitting ? 0.6 : 1, marginTop: 20 }]}
              accessibilityRole="button"
              accessibilityLabel="Submit product request"
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Send Request</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full ?? 100, borderWidth: 1,
  },
  card: {
    borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  label: {
    fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, flexDirection: 'row', alignItems: 'center',
  },
  textArea: {
    height: 90, textAlignVertical: 'top',
  },
  dropdown: {
    borderWidth: 1, borderRadius: Radius.md,
    marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  submitBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
});
