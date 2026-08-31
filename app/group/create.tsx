import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, StyleSheet, KeyboardAvoidingView, Platform,
  Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { groupService, type CreateGroupPayload } from '../../src/services/groupService';
import { FontSize, Radius } from '../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../src/components';

// ─── Types ────────────────────────────────────────────────────────────────────
type Frequency = 'daily' | 'weekly' | 'monthly';

// ─── Constants ────────────────────────────────────────────────────────────────
const FREQ_OPTIONS: { value: Frequency; label: string; icon: string }[] = [
  { value: 'daily',   label: 'Daily',   icon: 'sunny-outline' },
  { value: 'weekly',  label: 'Weekly',  icon: 'calendar-outline' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-number-outline' },
];

const WEEKDAYS = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
];

const MONTHDAYS = Array.from({ length: 28 }, (_, i) => {
  const n = i + 1;
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return { label: `${n}${suffix}`, value: n };
});

const toISO = (d: Date) => d.toISOString().split('T')[0];

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Day select modal (for monthly) ──────────────────────────────────────────
const MonthDayModal: React.FC<{
  visible: boolean;
  selected: number | null;
  onSelect: (v: number) => void;
  onClose: () => void;
}> = ({ visible, selected, onSelect, onClose }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={lay.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Pressable style={[lay.monthModal, { backgroundColor: colors.surface }]} onPress={() => {}} accessible={false}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>
            Collection Day
          </Text>
          <View style={lay.monthGrid}>
            {MONTHDAYS.map((d) => {
              const active = selected === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => { onSelect(d.value); onClose(); feedback('light'); }}
                  style={[
                    lay.monthCell,
                    { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={d.label}
                  accessibilityState={{ checked: active }}
                >
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: active ? '#FFF' : colors.textSecondary }}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', marginTop: 16 }} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Date picker field ────────────────────────────────────────────────────────
const DateField: React.FC<{
  label: string;
  value: Date;
  minDate?: Date;
  onChange: (d: Date) => void;
  error?: string;
}> = ({ label, value, minDate, onChange, error }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          lay.dateBtn,
          {
            backgroundColor: colors.surfaceInput,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${fmtDate(value)}`}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 10, flex: 1 }}>
          {fmtDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
      {!!error && (
        <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 4 }} accessibilityRole="alert" accessibilityLiveRegion="assertive">{error}</Text>
      )}
      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minDate}
          onChange={(_, selected) => {
            if (selected) onChange(selected);
            if (Platform.OS !== 'ios') setOpen(false);
          }}
        />
      )}
      {Platform.OS === 'ios' && open && (
        <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems: 'flex-end', marginTop: 4 }} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Create Group Screen ──────────────────────────────────────────────────────
export default function CreateGroupRoute() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setMonth(defaultEnd.getMonth() + 3);

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [frequency, setFrequency]     = useState<Frequency>('monthly');
  const [collectionDay, setCollectionDay] = useState<number | null>(null);
  const [gracePeriod, setGracePeriod]     = useState('7');
  const [startDate, setStartDate]     = useState<Date>(today);
  const [endDate, setEndDate]         = useState<Date>(defaultEnd);
  const [monthDayOpen, setMonthDayOpen] = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim())                      e.name   = 'Group name is required';
    if (name.trim().length > 100)          e.name   = 'Group name must be 100 characters or fewer';
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid contribution amount';
    if (endDate <= startDate)              e.endDate = 'End date must be after start date';
    if (frequency !== 'daily' && collectionDay === null)
      e.collectionDay = 'Select a collection day';
    setErrors(e);
    if (Object.keys(e).length > 0) feedback('error');
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateGroupPayload) => groupService.createGroup(payload),
    onSuccess: (group) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.replace(`/group/${group.id}` as any);
    },
    onError: (err: any) => {
      feedback('error');
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const mapped: Record<string, string> = {};
        for (const [key, val] of Object.entries(data)) {
          mapped[key] = Array.isArray(val) ? (val[0] as string) : String(val);
        }
        setErrors(mapped);
      }
    },
  });

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: CreateGroupPayload = {
      name: name.trim(),
      contribution_amount: amount.trim(),
      contribution_frequency: frequency,
      start_date: toISO(startDate),
      end_date: toISO(endDate),
    };
    if (description.trim()) payload.description = description.trim();
    if (frequency !== 'daily' && collectionDay !== null) {
      payload.collection_day = collectionDay;
    }
    const gp = parseInt(gracePeriod, 10);
    if (!isNaN(gp) && gp >= 0) payload.grace_period_days = gp;
    mutation.mutate(payload);
  };

  const monthdayLabel = collectionDay !== null
    ? MONTHDAYS.find((d) => d.value === collectionDay)?.label ?? ''
    : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <LoadingOverlay visible={mutation.isPending} message="Creating your group…" />

        <MonthDayModal
          visible={monthDayOpen}
          selected={collectionDay}
          onSelect={(v) => { setCollectionDay(v); setErrors((e) => ({ ...e, collectionDay: '' })); }}
          onClose={() => setMonthDayOpen(false)}
        />

        {/* Header */}
        <View style={[lay.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
            Create Group
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={lay.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Group Identity ── */}
          <Text style={sectionLabel(colors)}>Group Identity</Text>

          <Input
            label="Group Name"
            placeholder="e.g. Lagos Savings Circle"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="words"
            leftIcon={<Ionicons name="people-outline" size={18} color={colors.primary} />}
          />

          <Input
            label="Description (optional)"
            placeholder="What is this group about?"
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
          />

          {/* ── Contribution ── */}
          <Text style={[sectionLabel(colors), { marginTop: 8 }]}>Contribution</Text>

          <Input
            label="Amount per Contribution (₦)"
            placeholder="e.g. 5000"
            value={amount}
            onChangeText={setAmount}
            error={errors.amount}
            keyboardType="numeric"
            leftIcon={<Ionicons name="cash-outline" size={18} color={colors.primary} />}
          />

          {/* Frequency */}
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
            Frequency
          </Text>
          <View style={lay.freqRow}>
            {FREQ_OPTIONS.map((opt) => {
              const active = frequency === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setFrequency(opt.value);
                    setCollectionDay(null);
                    feedback('light');
                  }}
                  activeOpacity={0.8}
                  style={[
                    lay.freqBtn,
                    { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: active }}
                >
                  <Ionicons name={opt.icon as any} size={18} color={active ? '#FFF' : colors.textSecondary} />
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: active ? '#FFF' : colors.textSecondary, marginTop: 4 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Collection day — weekly: chip row; monthly: modal picker */}
          {frequency === 'weekly' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Collection Day
              </Text>
              <View style={lay.weekRow}>
                {WEEKDAYS.map((d) => {
                  const active = collectionDay === d.value;
                  return (
                    <TouchableOpacity
                      key={d.value}
                      onPress={() => { setCollectionDay(d.value); setErrors((e) => ({ ...e, collectionDay: '' })); feedback('light'); }}
                      style={[
                        lay.weekChip,
                        { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : (errors.collectionDay ? colors.error : colors.border) },
                      ]}
                      accessibilityRole="radio"
                      accessibilityLabel={d.label}
                      accessibilityState={{ checked: active }}
                    >
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: active ? '#FFF' : colors.textSecondary }}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!errors.collectionDay && (
                <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 4 }}>{errors.collectionDay}</Text>
              )}
            </View>
          )}

          {frequency === 'monthly' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Collection Day
              </Text>
              <TouchableOpacity
                onPress={() => setMonthDayOpen(true)}
                style={[
                  lay.dateBtn,
                  { backgroundColor: colors.surfaceInput, borderColor: errors.collectionDay ? colors.error : colors.border },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={monthdayLabel ? `Collection day: ${monthdayLabel}` : 'Select collection day of month'}
              >
                <Ionicons name="calendar-number-outline" size={18} color={colors.primary} />
                <Text style={{ fontSize: FontSize.sm, color: monthdayLabel ? colors.textPrimary : colors.textTertiary, marginLeft: 10, flex: 1 }}>
                  {monthdayLabel ?? 'Select day of month'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              {!!errors.collectionDay && (
                <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 4 }}>{errors.collectionDay}</Text>
              )}
            </View>
          )}

          {/* Grace period — only meaningful for non-daily groups */}
          {frequency !== 'daily' && (
            <Input
              label="Grace Period (days)"
              placeholder="e.g. 7"
              value={gracePeriod}
              onChangeText={setGracePeriod}
              keyboardType="numeric"
              leftIcon={<Ionicons name="timer-outline" size={18} color={colors.primary} />}
            />
          )}

          {/* ── Schedule ── */}
          <Text style={[sectionLabel(colors), { marginTop: 8 }]}>Schedule</Text>

          <DateField
            label="Start Date"
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              if (d >= endDate) {
                const newEnd = new Date(d);
                newEnd.setMonth(newEnd.getMonth() + 1);
                setEndDate(newEnd);
              }
              setErrors((e) => ({ ...e, endDate: '' }));
            }}
          />

          <DateField
            label="End Date"
            value={endDate}
            minDate={startDate}
            onChange={(d) => { setEndDate(d); setErrors((e) => ({ ...e, endDate: '' })); }}
            error={errors.endDate}
          />

          <View style={{ marginTop: 16 }}>
            <Button label="Create Group" onPress={handleSubmit} loading={mutation.isPending} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const lay = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  monthModal: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: 20,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});

const sectionLabel = (colors: any) => ({
  fontSize: FontSize.xs,
  fontWeight: '700' as const,
  color: colors.textTertiary,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  marginBottom: 16,
});
