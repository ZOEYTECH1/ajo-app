import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getBusinesses, createBusiness, createBranch,
  type InventoryBusinessFull, type BusinessMode,
} from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

type CreationMode = 'retail' | 'warehouse' | 'branch';

export default function LocationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBusinessId, setSelectedBusiness } = useInventoryStore();

  const [addModal, setAddModal]             = useState(false);
  const [newName, setNewName]               = useState('');
  const [creationMode, setCreationMode]     = useState<CreationMode>('retail');
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
  });

  // Businesses the user owns (eligible as parent for a new branch)
  const ownedParents = useMemo(
    () => (businesses ?? []).filter(
      (b) => b.my_role === 'owner' && b.mode !== 'branch'
    ),
    [businesses],
  );

  const selectedParent = useMemo(
    () => ownedParents.find((b) => b.id === selectedParentId) ?? null,
    [ownedParents, selectedParentId],
  );

  const { mutate: doCreate, isPending: creating } = useMutation({
    mutationFn: () => {
      if (creationMode === 'branch') {
        if (!selectedParentId) throw new Error('Select a parent business first.');
        return createBranch({ name: newName.trim(), parent_business_id: selectedParentId });
      }
      return createBusiness({ name: newName.trim(), mode: creationMode });
    },
    onSuccess: (biz) => {
      qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      setSelectedBusiness(biz.id, biz.mode, biz.my_role, biz.name);
      closeModal();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.detail || 'Could not create location. Try again.'),
  });

  const closeModal = () => {
    setAddModal(false);
    setNewName('');
    setCreationMode('retail');
    setSelectedParentId(null);
    setParentPickerOpen(false);
  };

  const selectBusiness = (biz: InventoryBusinessFull) => {
    setSelectedBusiness(biz.id, biz.mode, biz.my_role, biz.name);
    qc.invalidateQueries({ queryKey: ['inventory-categories'] });
    qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    router.back();
  };

  // Group businesses: parent → its branches
  const grouped = useMemo(() => {
    const list = businesses ?? [];
    const parents = list.filter((b) => !b.parent_business);
    return parents.map((p) => ({
      parent: p,
      branches: list.filter((b) => b.parent_business === p.id),
    }));
  }, [businesses]);

  const modeBadge = (mode: BusinessMode) => {
    if (mode === 'warehouse') return { label: 'Warehouse', bg: '#E3F2FD', color: '#1565C0', icon: 'cube-outline' as const };
    if (mode === 'branch')    return { label: 'Branch',    bg: '#F3E5F5', color: '#6A1B9A', icon: 'git-branch-outline' as const };
    return                           { label: 'Retail',    bg: '#E8F5E9', color: '#2E7D32', icon: 'storefront-outline' as const };
  };

  const roleBadge = (role: string) =>
    role === 'owner'        ? { label: 'Owner',        bg: '#FFF3E0', color: INV }
    : role === 'manager'    ? { label: 'Manager',      bg: '#F3E5F5', color: '#6A1B9A' }
    : role === 'branch_admin' ? { label: 'Branch Admin', bg: '#E8EAF6', color: '#283593' }
    :                           { label: 'Staff',        bg: '#ECEFF1', color: '#455A64' };

  const subBadge = (biz: InventoryBusinessFull) => {
    if (biz.mode === 'branch') return null; // branches are always free
    if (biz.is_on_trial) {
      const daysLeft = biz.trial_end
        ? Math.max(0, Math.ceil((new Date(biz.trial_end).getTime() - Date.now()) / 86400000))
        : 0;
      return { label: `Trial — ${daysLeft}d left`, bg: '#E8F5E9', color: '#2E7D32' };
    }
    if (biz.is_subscription_active) {
      return { label: 'Active', bg: '#E8F5E9', color: '#2E7D32' };
    }
    return { label: 'Expired', bg: '#FFEBEE', color: '#C62828' };
  };

  const renderCard = (biz: InventoryBusinessFull, indented = false) => {
    const mode = modeBadge(biz.mode);
    const role = roleBadge(biz.my_role);
    const sub  = subBadge(biz);
    const isSelected = biz.id === selectedBusinessId;
    const isExpired = biz.mode !== 'branch' && !biz.is_subscription_active;

    return (
      <TouchableOpacity
        key={biz.id}
        onPress={() => selectBusiness(biz)}
        activeOpacity={0.82}
        style={[
          s.card,
          indented && s.cardIndented,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? INV : isExpired ? '#FFCDD2' : colors.border,
            borderWidth: isSelected ? 2 : 1,
            ...Shadow.card(colors.black),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${biz.name}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[s.modeIcon, { backgroundColor: mode.bg }]}>
            <Ionicons name={mode.icon} size={22} color={mode.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
              {biz.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <View style={[s.badge, { backgroundColor: mode.bg }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: mode.color }}>{mode.label}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: role.bg }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: role.color }}>{role.label}</Text>
              </View>
              {biz.branch_count > 0 && (
                <View style={[s.badge, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: INV }}>
                    {biz.branch_count} {biz.branch_count === 1 ? 'branch' : 'branches'}
                  </Text>
                </View>
              )}
              {sub && (
                <View style={[s.badge, { backgroundColor: sub.bg }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: sub.color }}>{sub.label}</Text>
                </View>
              )}
            </View>
            {isExpired && biz.my_role === 'owner' && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); router.push(`/inventory/subscription?bizId=${biz.id}`); }}
                style={[s.renewBtn]}
                accessibilityRole="button"
                accessibilityLabel={`Renew subscription for ${biz.name}`}
              >
                <Ionicons name="refresh-outline" size={13} color="#fff" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', marginLeft: 4 }}>Renew Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={22} color={INV} style={{ marginLeft: 8 }} />}
        </View>
      </TouchableOpacity>
    );
  };

  const modeOptions: { key: CreationMode; label: string; desc: string; icon: string; bg: string; color: string }[] = [
    {
      key: 'retail',
      label: 'Retail Store',
      desc: 'Sells to customers, tracks revenue and daily P&L.',
      icon: 'storefront-outline',
      bg: '#E8F5E9',
      color: '#2E7D32',
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      desc: 'Tracks bulk stock, receives goods, dispatches to branches.',
      icon: 'cube-outline',
      bg: '#E3F2FD',
      color: '#1565C0',
    },
    {
      key: 'branch',
      label: 'Branch Shop',
      desc: 'A branch of an existing business — inherits products, independent inventory.',
      icon: 'git-branch-outline',
      bg: '#F3E5F5',
      color: '#6A1B9A',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">My Locations</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Select the location you're working at
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddModal(true)}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          style={{ backgroundColor: '#FFF3E0', borderRadius: Radius.md, padding: 8 }}
          accessibilityRole="button" accessibilityLabel="Add new business location"
        >
          <Ionicons name="add" size={22} color={INV} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {grouped.map(({ parent, branches }) => (
            <View key={parent.id}>
              {renderCard(parent, false)}
              {branches.map((branch) => (
                <View key={branch.id} style={s.branchRow}>
                  <View style={s.branchLine} />
                  {renderCard(branch, true)}
                </View>
              ))}
            </View>
          ))}

          {(businesses ?? []).length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="business-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
                No locations yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Tap + to create your first business location.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add location modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={closeModal}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeModal} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Add a Location</Text>

          <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Location name</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={creationMode === 'branch' ? 'e.g. Ikeja Branch' : 'e.g. Main Store, Surulere Warehouse'}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            accessibilityLabel="Location name"
          />

          <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 16 }]}>Type</Text>
          <View style={{ gap: 8, marginBottom: 4 }}>
            {modeOptions.map((opt) => {
              const active = creationMode === opt.key;
              const disabled = opt.key === 'branch' && ownedParents.length === 0;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    if (disabled) {
                      Alert.alert('No businesses yet', 'Create a retail store or warehouse first before adding a branch.');
                      return;
                    }
                    setCreationMode(opt.key);
                    if (opt.key !== 'branch') setSelectedParentId(null);
                  }}
                  style={[s.modeBtn, {
                    backgroundColor: active ? opt.bg : colors.background,
                    borderColor: active ? opt.color : colors.border,
                    opacity: disabled ? 0.4 : 1,
                  }]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={opt.icon as any} size={18} color={active ? opt.color : colors.textSecondary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? opt.color : colors.textPrimary }}>
                      {opt.label}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                      {opt.desc}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={opt.color} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Parent business picker (only when branch mode selected) */}
          {creationMode === 'branch' && (
            <View style={{ marginTop: 12, marginBottom: 4 }}>
              <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Parent Business</Text>
              <TouchableOpacity
                onPress={() => setParentPickerOpen(!parentPickerOpen)}
                style={[s.parentPickerBtn, {
                  backgroundColor: colors.background,
                  borderColor: selectedParent ? INV : colors.border,
                }]}
                accessibilityRole="button"
                accessibilityLabel="Select parent business"
              >
                <Text style={{ fontSize: FontSize.sm, color: selectedParent ? colors.textPrimary : colors.textTertiary, flex: 1 }}>
                  {selectedParent?.name ?? 'Select a business…'}
                </Text>
                <Ionicons name={parentPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {parentPickerOpen && (
                <View style={[s.parentDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {ownedParents.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setSelectedParentId(p.id); setParentPickerOpen(false); }}
                      style={[s.parentOption, { borderBottomColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={p.name}
                    >
                      <Ionicons
                        name={p.mode === 'warehouse' ? 'cube-outline' : 'storefront-outline'}
                        size={16}
                        color={INV}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, flex: 1 }}>{p.name}</Text>
                      {selectedParentId === p.id && <Ionicons name="checkmark" size={16} color={INV} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={() => {
              if (!newName.trim()) return Alert.alert('Required', 'Enter a name for this location.');
              if (creationMode === 'branch' && !selectedParentId) return Alert.alert('Required', 'Select a parent business.');
              doCreate();
            }}
            disabled={creating}
            style={[s.saveBtn, { backgroundColor: INV, opacity: creating ? 0.6 : 1, marginTop: 20 }]}
            accessibilityRole="button" accessibilityLabel="Create location"
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Create Location</Text>
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
    borderRadius: Radius.lg, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  cardIndented: {
    marginLeft: 0,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  branchLine: {
    width: 2,
    backgroundColor: '#E65100',
    opacity: 0.25,
    marginLeft: 20,
    marginRight: 10,
    borderRadius: 1,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  modeIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
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
  modeBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md, padding: 12,
  },
  parentPickerBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  parentDropdown: {
    borderWidth: 1, borderRadius: Radius.md,
    marginTop: 4, overflow: 'hidden',
  },
  parentOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg, alignItems: 'center',
  },
  renewBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#C62828', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginTop: 8,
  },
});
