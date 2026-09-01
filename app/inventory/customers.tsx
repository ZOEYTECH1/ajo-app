import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer, adjustCredit,
  type InventoryCustomer,
} from '../../src/services/inventoryService';
import { useDebounce } from '../../src/hooks/useDebounce';
import ErrorBanner from '../../src/components/ErrorBanner';

const INV = '#E65100';

export default function CustomersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: customers, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-customers'],
    queryFn: getCustomers,
  });

  // Edit / add customer modal
  const [editModal, setEditModal]   = useState(false);
  const [editing, setEditing]       = useState<InventoryCustomer | null>(null);
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [notes, setNotes]           = useState('');

  // Credit modal
  const [creditModal, setCreditModal]     = useState(false);
  const [creditCustomer, setCreditCustomer] = useState<InventoryCustomer | null>(null);
  const [creditDirection, setCreditDirection] = useState<'charge' | 'payment'>('charge');
  const [creditAmount, setCreditAmount]   = useState('');
  const [creditNote, setCreditNote]       = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const openAdd = () => {
    setEditing(null);
    setName(''); setPhone(''); setNotes('');
    setEditModal(true);
  };

  const openEdit = (c: InventoryCustomer) => {
    setEditing(c);
    setName(c.name); setPhone(c.phone); setNotes(c.notes);
    setEditModal(true);
  };

  const openCredit = (c: InventoryCustomer, direction: 'charge' | 'payment') => {
    setCreditCustomer(c);
    setCreditDirection(direction);
    setCreditAmount('');
    setCreditNote('');
    setCreditModal(true);
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      editing
        ? updateCustomer(editing.id, { name: name.trim(), phone: phone.trim(), notes: notes.trim() })
        : createCustomer({ name: name.trim(), phone: phone.trim(), notes: notes.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-customers'] });
      setEditModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save customer.'),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-customers'] }),
    onError: () => Alert.alert('Error', 'Could not delete customer.'),
  });

  const { mutate: doCredit, isPending: creditPending } = useMutation({
    mutationFn: () =>
      adjustCredit(creditCustomer!.id, creditDirection, parseFloat(creditAmount), creditNote.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-customers'] });
      setCreditModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not update credit balance.'),
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Customer name is required.');
    save();
  };

  const handleCredit = () => {
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) return Alert.alert('Invalid', 'Enter a valid amount.');
    doCredit();
  };

  const confirmDelete = (c: InventoryCustomer) => {
    Alert.alert('Delete Customer', `Remove "${c.name}" from your database?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del(c.id) },
    ]);
  };

  const filtered = (customers ?? []).filter(c =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.phone.includes(debouncedSearch),
  );

  const totalOwed = (customers ?? []).reduce((s, c) => s + parseFloat(c.credit_balance || '0'), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Customers</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {(customers ?? []).length} contacts
          </Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: INV }]} accessibilityRole="button" accessibilityLabel="Add new customer">
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface }}>
        <View style={[s.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or phone…"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary }}
            accessibilityLabel="Search customers"
          />
        </View>
      </View>

      {/* Total credit owed banner */}
      {totalOwed > 0 && (
        <View style={[s.creditBanner, { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' }]}>
          <Ionicons name="wallet-outline" size={16} color={INV} />
          <Text style={{ fontSize: FontSize.sm, color: INV, fontWeight: '700', marginLeft: 8 }}>
            Total credit outstanding: ₦{totalOwed.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
          showsVerticalScrollIndicator={false}
        >
          {isError && <ErrorBanner error={error} onRetry={refetch} />}
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>
                {debouncedSearch ? 'No results' : 'No customers yet'}
              </Text>
              {!debouncedSearch && (
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                  Add customers to link them to sales and track credit balances.
                </Text>
              )}
            </View>
          ) : (
            filtered.map((c) => {
              const balance = parseFloat(c.credit_balance || '0');
              const hasCredit = balance > 0;
              return (
                <View
                  key={c.id}
                  style={[s.card, { backgroundColor: colors.surface, borderColor: hasCredit ? '#FFCC80' : colors.border,
                    borderWidth: hasCredit ? 1.5 : 1, ...Shadow.card(colors.black) }]}
                >
                  <TouchableOpacity onPress={() => openEdit(c)} activeOpacity={0.8} style={s.cardRow} accessibilityRole="button" accessibilityLabel={`Customer: ${c.name}`}>
                    <View style={[s.avatar, { backgroundColor: hasCredit ? '#FFF3E0' : colors.background }]}>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: hasCredit ? INV : colors.textSecondary }}>
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{c.name}</Text>
                      {!!c.phone && (
                        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{c.phone}</Text>
                      )}
                      {hasCredit && (
                        <View style={[s.creditBadge, { backgroundColor: '#FFF3E0' }]}>
                          <Ionicons name="alert-circle-outline" size={11} color={INV} />
                          <Text style={{ fontSize: 11, color: INV, fontWeight: '700', marginLeft: 3 }}>
                            Owes ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => confirmDelete(c)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} accessibilityRole="button" accessibilityLabel={`Delete ${c.name}`} accessibilityHint="Double tap to permanently delete this customer">
                      <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Credit actions */}
                  <View style={[s.creditActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={() => openCredit(c, 'charge')}
                      style={[s.creditBtn, { backgroundColor: '#FFEBEE' }]}
                      accessibilityRole="button" accessibilityLabel={`Charge credit for ${c.name}`}
                    >
                      <Ionicons name="add-circle-outline" size={14} color="#C62828" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#C62828', marginLeft: 4 }}>Charge credit</Text>
                    </TouchableOpacity>
                    {hasCredit && (
                      <TouchableOpacity
                        onPress={() => openCredit(c, 'payment')}
                        style={[s.creditBtn, { backgroundColor: '#E8F5E9' }]}
                        accessibilityRole="button" accessibilityLabel={`Record payment from ${c.name}`}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#2E7D32" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E7D32', marginLeft: 4 }}>Record payment</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 }}>
              {editing ? 'Edit Customer' : 'New Customer'}
            </Text>
            <Text style={[s.label, { color: colors.textPrimary }]}>Name *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Customer name"
              placeholderTextColor={colors.textTertiary} autoFocus
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Customer name" />
            <Text style={[s.label, { color: colors.textPrimary }]}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+234…" keyboardType="phone-pad"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Phone number" />
            <Text style={[s.label, { color: colors.textPrimary }]}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Optional note" multiline
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
              accessibilityLabel="Notes" />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={[s.modalBtn, { backgroundColor: colors.background, flex: 1 }]} accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.modalBtn, { backgroundColor: INV, flex: 1 }]} accessibilityRole="button" accessibilityLabel="Save customer">
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credit Modal */}
      <Modal visible={creditModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
              {creditDirection === 'charge' ? 'Charge Credit' : 'Record Payment'}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 20 }}>
              {creditDirection === 'charge'
                ? `${creditCustomer?.name} is buying on credit — add to their outstanding balance.`
                : `${creditCustomer?.name} is paying off their credit — reduce their balance.`}
            </Text>

            {creditDirection === 'payment' && !!creditCustomer && (
              <View style={[s.currentBalance, { backgroundColor: '#FFF3E0' }]}>
                <Text style={{ fontSize: FontSize.xs, color: INV, fontWeight: '600' }}>Current balance</Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: INV }}>
                  ₦{parseFloat(creditCustomer.credit_balance || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <Text style={[s.label, { color: colors.textPrimary, marginTop: 12 }]}>Amount (₦)</Text>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, marginRight: 6, fontSize: FontSize.md }}>₦</Text>
              <TextInput
                value={creditAmount}
                onChangeText={setCreditAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                autoFocus
                style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
                accessibilityLabel="Credit amount"
                accessibilityHint="Enter amount in Naira"
              />
            </View>

            <Text style={[s.label, { color: colors.textPrimary, marginTop: 12 }]}>Note (optional)</Text>
            <View style={[s.input, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                value={creditNote}
                onChangeText={setCreditNote}
                placeholder="e.g. Bread x2"
                placeholderTextColor={colors.textTertiary}
                style={{ fontSize: FontSize.sm, color: colors.textPrimary }}
                accessibilityLabel="Credit note"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setCreditModal(false)} style={[s.modalBtn, { backgroundColor: colors.background, flex: 1 }]} accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCredit}
                disabled={creditPending}
                style={[s.modalBtn, { backgroundColor: creditDirection === 'charge' ? '#C62828' : '#2E7D32', flex: 1 }]}
                accessibilityRole="button"
                accessibilityLabel={creditDirection === 'charge' ? 'Charge' : 'Record'}
              >
                {creditPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>
                      {creditDirection === 'charge' ? 'Charge' : 'Record'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  creditBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  card: { borderRadius: Radius.lg, marginBottom: 10, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  creditBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, marginTop: 4,
  },
  creditActions: {
    flexDirection: 'row', gap: 8, padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  creditBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  currentBalance: {
    borderRadius: Radius.md, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.sm, marginBottom: 8 },
  modalBtn: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
