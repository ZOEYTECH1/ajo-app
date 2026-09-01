import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
  StyleSheet, RefreshControl, Modal, TextInput, Share, Image, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import {
  thriftService,
  type ThriftMember,
  type ThriftPayment,
} from '../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Skeleton, feedback } from '../../src/components';

const WARNING = '#F59E0B';
const WARNING_LIGHT = '#FEF3C7';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  amount_pending: 'Amount Flagged',
};

function statusColors(colors: any, status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:        { bg: WARNING_LIGHT,        text: WARNING },
    approved:       { bg: colors.successLight,  text: colors.success },
    rejected:       { bg: colors.errorLight,    text: colors.error },
    amount_pending: { bg: WARNING_LIGHT,        text: WARNING },
  };
  return map[status] ?? { bg: colors.primaryTint, text: colors.primary };
}

function StatusPill({ status, colors }: { status: string; colors: any }) {
  const { bg, text } = statusColors(colors, status);
  return (
    <View style={[pill.wrap, { backgroundColor: bg }]}>
      <Text style={[pill.label, { color: text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  label: { fontSize: FontSize.xs, fontWeight: '700' },
});

// ─── Flag Amount Modal ────────────────────────────────────────────────────────
function FlagAmountModal({
  visible, member, groupId, onClose,
}: { visible: boolean; member: ThriftMember | null; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.reviewMember(groupId, member!.id, { action: 'flag_amount', reason: reason.trim() || undefined }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      setReason('');
      onClose();
    },
    onError: () => feedback('error'),
  });

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={m.handle} />
          <Text style={[m.title, { color: colors.textPrimary }]} accessibilityRole="header">Flag Amount</Text>
          <Text style={[m.sub, { color: colors.textSecondary }]}>
            Tell {member.user.first_name} why their amount of ₦{Number(member.personal_amount).toLocaleString()} is incorrect.
          </Text>
          <Text style={[m.lbl, { color: colors.textSecondary }]}>Reason (optional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. We agreed ₦1,000 not ₦500"
            multiline
            style={[m.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, height: 80 }]}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Reason for flagging"
          />
          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={[m.btn, { backgroundColor: WARNING, marginTop: 20 }]}
            accessibilityRole="button"
            accessibilityLabel="Flag and notify payer"
          >
            <Text style={m.btnText}>{mutation.isPending ? 'Flagging…' : 'Flag & Notify Payer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[m.btn, { backgroundColor: colors.background, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Correct Amount Modal ─────────────────────────────────────────────────────
function CorrectAmountModal({
  visible, member, groupId, onClose,
}: { visible: boolean; member: ThriftMember | null; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [err, setErr]       = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.updateMyAmount(groupId, member!.id, amount.trim()),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      setAmount(''); setErr('');
      onClose();
    },
    onError: (e: any) => {
      feedback('error');
      setErr(e.response?.data?.personal_amount?.[0] ?? 'Failed to update amount.');
    },
  });

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={m.handle} />
          <Text style={[m.title, { color: colors.textPrimary }]} accessibilityRole="header">Correct Your Amount</Text>
          <Text style={[m.sub, { color: colors.textSecondary }]}>
            Current: ₦{Number(member.personal_amount).toLocaleString()}/period
            {member.flag_reason ? `\nCollector's note: ${member.flag_reason}` : ''}
          </Text>
          <Text style={[m.lbl, { color: colors.textSecondary }]}>New contribution amount (₦)</Text>
          <TextInput
            value={amount}
            onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setErr(''); }}
            keyboardType="decimal-pad"
            placeholder="e.g. 1000"
            style={[m.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="New contribution amount"
          />
          {!!err && <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 6 }}>{err}</Text>}
          <TouchableOpacity
            onPress={() => {
              if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
                setErr('Enter a valid amount.'); return;
              }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            style={[m.btn, { backgroundColor: colors.primary, marginTop: 20 }]}
            accessibilityRole="button"
            accessibilityLabel="Submit correction"
          >
            <Text style={m.btnText}>{mutation.isPending ? 'Submitting…' : 'Submit Correction'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[m.btn, { backgroundColor: colors.background, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dispute Payment Modal ────────────────────────────────────────────────────
function DisputePaymentModal({
  visible, payment, groupId, onClose,
}: { visible: boolean; payment: ThriftPayment | null; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [reason, setReason]         = useState('');
  const [err, setErr]               = useState('');
  const [recording, setRecording]   = useState<import('expo-av').Audio.Recording | null>(null);
  const [audioUri, setAudioUri]     = useState<string | null>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [sound, setSound]           = useState<import('expo-av').Audio.Sound | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startRecording = async () => {
    try {
      const { Audio } = await import('expo-av');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setErr('Microphone permission denied.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          const next = s + 1;
          if (next >= 60) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            rec.stopAndUnloadAsync().then(() => {
              const uri = rec.getURI();
              setAudioUri(uri ?? null);
              setRecording(null);
            }).catch(() => setRecording(null));
          }
          return next;
        });
      }, 1000);
    } catch (e: any) {
      if (e?.message?.includes('native module') || e?.message?.includes('ExponentAV')) {
        setErr('Voice recording requires a development build. Type your dispute instead.');
      } else {
        setErr('Could not start recording.');
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    stopTimer();
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri ?? null);
    } catch {
      setErr('Failed to save recording.');
    }
    setRecording(null);
  };

  const playAudio = async () => {
    if (!audioUri) return;
    try {
      const { Audio } = await import('expo-av');
      if (sound) { await sound.replayAsync(); return; }
      const { sound: s } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(s);
      setIsPlaying(true);
      s.setOnPlaybackStatusUpdate((st) => { if (st.isLoaded && st.didJustFinish) setIsPlaying(false); });
      await s.playAsync();
    } catch {
      setErr('Could not play recording.');
    }
  };

  const deleteAudio = async () => {
    if (sound) { await sound.unloadAsync(); setSound(null); }
    setAudioUri(null);
    setIsPlaying(false);
    setRecSeconds(0);
  };

  const handleClose = async () => {
    if (recording) { stopTimer(); try { await recording.stopAndUnloadAsync(); } catch {} setRecording(null); }
    if (sound) { try { await sound.unloadAsync(); } catch {} setSound(null); }
    setAudioUri(null); setReason(''); setErr(''); setRecSeconds(0); setIsPlaying(false);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => thriftService.disputePayment(groupId, payment!.id, reason.trim(), audioUri ?? undefined),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      setReason(''); setErr(''); setAudioUri(null); setRecSeconds(0);
      onClose();
    },
    onError: (e: any) => {
      feedback('error');
      setErr(e.response?.data?.reason?.[0] ?? e.response?.data?.detail ?? 'Failed to submit dispute.');
    },
  });

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!payment) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={m.handle} />
          <Text style={[m.title, { color: colors.textPrimary }]} accessibilityRole="header">Dispute Payment</Text>
          <Text style={[m.sub, { color: colors.textSecondary }]}>
            ₦{Number(payment.amount).toLocaleString()} recorded for {payment.period_date}. Tell us why this is incorrect.
          </Text>

          <Text style={[m.lbl, { color: colors.textSecondary }]}>Reason (optional if voice note recorded)</Text>
          <TextInput
            value={reason}
            onChangeText={(v) => { setReason(v); setErr(''); }}
            placeholder="e.g. I paid ₦2,000 not ₦1,000, or I didn't pay this period."
            multiline
            style={[m.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, height: 90 }]}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Dispute reason"
          />

          {/* Voice note */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginHorizontal: 10 }}>or record a voice note</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {!recording && !audioUri && (
            <TouchableOpacity
              onPress={startRecording}
              style={[m.voiceBtn, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Start recording voice note"
            >
              <Ionicons name="mic-outline" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm, marginLeft: 8 }}>Start Recording</Text>
            </TouchableOpacity>
          )}

          {!!recording && (
            <View style={{ gap: 4 }}>
              <View style={[m.voiceBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA', justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 }} />
                  <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: FontSize.sm }}>
                    Recording  {fmt(recSeconds)}  ({60 - recSeconds}s left)
                  </Text>
                </View>
              <TouchableOpacity onPress={stopRecording} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Stop recording">
                <Ionicons name="stop-circle-outline" size={20} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: FontSize.sm, marginLeft: 4 }}>Stop</Text>
              </TouchableOpacity>
            </View>
            {(60 - recSeconds) <= 10 && (
              <Text style={{ color: '#EF4444', fontSize: FontSize.xs, fontWeight: '600', marginLeft: 4 }}>
                Stops automatically in {60 - recSeconds}s
              </Text>
            )}
            </View>
          )}

          {!recording && !!audioUri && (
            <View style={[m.voiceBtn, { backgroundColor: colors.successLight, borderColor: colors.success, justifyContent: 'space-between' }]}>
              <TouchableOpacity onPress={playAudio} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}>
                <Ionicons name={isPlaying ? 'pause-circle-outline' : 'play-circle-outline'} size={22} color={colors.success} />
                <Text style={{ color: colors.success, fontWeight: '700', fontSize: FontSize.sm, marginLeft: 6 }}>
                  {isPlaying ? 'Playing…' : `Play  (${fmt(recSeconds)})`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteAudio} accessibilityRole="button" accessibilityLabel="Delete voice note">
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}

          {!!err && <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 8 }}>{err}</Text>}

          <TouchableOpacity
            onPress={() => {
              if (!reason.trim() && !audioUri) { setErr('Please describe the issue or record a voice note.'); return; }
              mutation.mutate();
            }}
            disabled={mutation.isPending || !!recording}
            style={[m.btn, { backgroundColor: WARNING, marginTop: 20, opacity: (mutation.isPending || !!recording) ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Submit dispute"
          >
            <Text style={m.btnText}>{mutation.isPending ? 'Submitting…' : 'Submit Dispute'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={[m.btn, { backgroundColor: colors.background, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Report Collector Modal ───────────────────────────────────────────────────
function ReportCollectorModal({
  visible, groupId, onClose,
}: { visible: boolean; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [err, setErr]       = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.reportCollector(groupId, reason.trim()),
    onSuccess: () => {
      feedback('success');
      setReason(''); setErr('');
      onClose();
    },
    onError: (e: any) => {
      feedback('error');
      setErr(e.response?.data?.reason?.[0] ?? e.response?.data?.detail ?? 'Failed to submit report.');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={m.handle} />
          <Text style={[m.title, { color: colors.textPrimary }]} accessibilityRole="header">Report Collector</Text>
          <Text style={[m.sub, { color: colors.textSecondary }]}>
            Describe your concern. This will be reviewed by our team.
          </Text>
          <Text style={[m.lbl, { color: colors.textSecondary }]}>Reason (min 10 characters)</Text>
          <TextInput
            value={reason}
            onChangeText={(v) => { setReason(v); setErr(''); }}
            placeholder="e.g. Collector is not recording my payments…"
            multiline
            style={[m.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, height: 100 }]}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Report reason"
            accessibilityHint="Minimum 10 characters"
          />
          {!!err && <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 6 }}>{err}</Text>}
          <TouchableOpacity
            onPress={() => {
              if (reason.trim().length < 10) { setErr('Reason must be at least 10 characters.'); return; }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            style={[m.btn, { backgroundColor: colors.error, marginTop: 20 }]}
            accessibilityRole="button"
            accessibilityLabel="Submit report"
          >
            <Text style={m.btnText}>{mutation.isPending ? 'Submitting…' : 'Submit Report'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[m.btn, { backgroundColor: colors.background, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── End Cycle Modal ──────────────────────────────────────────────────────────
function EndCycleModal({
  visible, groupId, onClose,
}: { visible: boolean; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => thriftService.endCycle(groupId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      onClose();
    },
    onError: () => feedback('error'),
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={m.handle} />
          <View style={[m.iconWrap, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="stop-circle-outline" size={32} color={colors.error} />
          </View>
          <Text style={[m.title, { color: colors.textPrimary, marginTop: 12 }]} accessibilityRole="header">End Current Cycle?</Text>
          <Text style={[m.sub, { color: colors.textSecondary }]}>
            This will mark the active cycle as completed. You can restart a new cycle afterwards.
          </Text>
          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={[m.btn, { backgroundColor: colors.error, marginTop: 20 }]}
            accessibilityRole="button"
            accessibilityLabel="End cycle"
          >
            <Text style={m.btnText}>{mutation.isPending ? 'Ending…' : 'End Cycle'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[m.btn, { backgroundColor: colors.background, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Restart Cycle Modal ──────────────────────────────────────────────────────
function RestartCycleModal({
  visible, groupId, isFixed, onClose,
}: { visible: boolean; groupId: number; isFixed: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [err, setErr]             = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.restartCycle(groupId, {
      start_date: startDate.trim() || undefined,
      end_date: isFixed ? (endDate.trim() || null) : undefined,
    }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      setStartDate(''); setEndDate(''); setErr('');
      onClose();
    },
    onError: (e: any) => {
      feedback('error');
      const d = e.response?.data;
      setErr(d?.detail ?? d?.start_date?.[0] ?? d?.end_date?.[0] ?? 'Failed to restart cycle.');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={m.handle} />
          <Text style={[m.title, { color: colors.textPrimary }]} accessibilityRole="header">Restart Cycle</Text>
          <Text style={[m.sub, { color: colors.textSecondary }]}>
            Start a new contribution cycle. Leave dates blank to use today.
          </Text>

          <Text style={[m.lbl, { color: colors.textSecondary }]}>Start date (optional)</Text>
          <TextInput
            value={startDate}
            onChangeText={(v) => { setStartDate(v); setErr(''); }}
            placeholder="YYYY-MM-DD (leave blank for today)"
            style={[m.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Start date"
            accessibilityHint="Enter date in YYYY-MM-DD format, leave blank for today"
          />

          {isFixed && (
            <>
              <Text style={[m.lbl, { color: colors.textSecondary, marginTop: 14 }]}>End date (optional)</Text>
              <TextInput
                value={endDate}
                onChangeText={(v) => { setEndDate(v); setErr(''); }}
                placeholder="YYYY-MM-DD"
                style={[m.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="End date"
                accessibilityHint="Enter date in YYYY-MM-DD format"
              />
            </>
          )}

          {!!err && <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 8 }}>{err}</Text>}

          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={[m.btn, { backgroundColor: colors.success, marginTop: 20 }]}
            accessibilityRole="button"
            accessibilityLabel="Restart cycle"
          >
            <Text style={m.btnText}>{mutation.isPending ? 'Restarting…' : 'Restart Cycle'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[m.btn, { backgroundColor: colors.background, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dispute Detail Sheet ─────────────────────────────────────────────────────
function DisputeDetailSheet({
  payment, onClose,
}: { payment: ThriftPayment; onClose: () => void }) {
  const { colors } = useTheme();
  const [sound, setSound]       = useState<import('expo-av').Audio.Sound | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [audioErr, setAudioErr] = useState('');

  const playAudio = async () => {
    if (!payment.dispute_audio) return;
    try {
      const { Audio } = await import('expo-av');
      if (sound) {
        if (playing) { await sound.pauseAsync(); setPlaying(false); }
        else          { await sound.playAsync();  setPlaying(true); }
        return;
      }
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: payment.dispute_audio },
        { shouldPlay: true },
        (status) => { if ('didJustFinish' in status && status.didJustFinish) setPlaying(false); },
      );
      setSound(s);
      setPlaying(true);
    } catch {
      setAudioErr('Could not play voice note.');
    }
  };

  const stopAudio = async () => {
    if (!sound) return;
    await sound.stopAsync();
    await sound.unloadAsync();
    setSound(null);
    setPlaying(false);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>Dispute Details</Text>

          {/* Payment info row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>Member</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{payment.member_name}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>Amount</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>₦{Number(payment.amount).toLocaleString()}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>Period</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{payment.period_date}</Text>
            </View>
            {payment.disputed_at && (
              <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>Disputed</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                  {new Date(payment.disputed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>

          {/* Reason */}
          <View>
            <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Dispute Reason
            </Text>
            <View style={{ backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FFB74D44' }}>
              <Text style={{ fontSize: 14, color: '#BF360C', lineHeight: 20 }}>
                {payment.dispute_reason || 'No reason provided.'}
              </Text>
            </View>
          </View>

          {/* Voice note */}
          {payment.dispute_audio ? (
            <View>
              <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Voice Note
              </Text>
              {audioErr ? (
                <Text style={{ fontSize: 13, color: '#C62828' }}>{audioErr}</Text>
              ) : (
                <TouchableOpacity
                  onPress={playing ? stopAudio : playAudio}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: playing ? '#FFF3E0' : colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: playing ? '#FFB74D' : colors.border }}
                  accessibilityRole="button"
                  accessibilityLabel={playing ? 'Stop voice note' : 'Play voice note'}
                >
                  <Ionicons name={playing ? 'stop-circle' : 'play-circle'} size={28} color="#E65100" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#E65100' }}>
                    {playing ? 'Stop' : 'Play voice note'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textTertiary, fontStyle: 'italic' }}>No voice note attached.</Text>
          )}

          <TouchableOpacity
            onPress={() => { stopAudio(); onClose(); }}
            style={{ backgroundColor: colors.background, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
            accessibilityRole="button"
            accessibilityLabel="Close dispute details"
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ThriftGroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab]         = useState<'pending' | 'payments'>('pending');
  const [approvingMemberId, setApprovingMemberId] = useState<number | null>(null);
  const [approveAmount, setApproveAmount]         = useState('');
  const [flagTarget, setFlagTarget]       = useState<ThriftMember | null>(null);
  const [correctOpen, setCorrectOpen]     = useState(false);
  const [reportOpen, setReportOpen]       = useState(false);
  const [endCycleOpen, setEndCycleOpen]   = useState(false);
  const [restartOpen, setRestartOpen]     = useState(false);
  const [kebabOpen, setKebabOpen]         = useState(false);
  const [disputeTarget, setDisputeTarget]           = useState<ThriftPayment | null>(null);
  const [viewDisputeTarget, setViewDisputeTarget]   = useState<ThriftPayment | null>(null);
  const [expandedMembers, setExpandedMembers]       = useState<Set<number>>(new Set());

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['thrift-group', groupId],
    queryFn: () => thriftService.getGroup(groupId),
  });

  const isCollector = group?.is_collector ?? false;

  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
    isRefetching,
  } = useQuery({
    queryKey: ['thrift-members', groupId],
    queryFn: () => thriftService.getMembers(groupId),
    enabled: !!group,
  });

  const {
    data: payments,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['thrift-payments', groupId],
    queryFn: () => thriftService.getPayments(groupId),
    enabled: !!group,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: 'approve' | 'reject' }) =>
      thriftService.reviewMember(groupId, memberId, { action }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
    },
    onError: () => feedback('error'),
  });

  const unmarkMutation = useMutation({
    mutationFn: (paymentId: number) => thriftService.unmarkPayment(groupId, paymentId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
    },
    onError: () => feedback('error'),
  });

  const quickApproveMutation = useMutation({
    mutationFn: ({ memberId, amount }: { memberId: number; amount: string }) =>
      thriftService.markPayment(groupId, {
        member_id: memberId,
        period_date: new Date().toISOString().slice(0, 10),
        amount,
      }),
    onSuccess: () => {
      feedback('success');
      setApprovingMemberId(null);
      setApproveAmount('');
      queryClient.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
    },
    onError: () => feedback('error'),
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: number) => thriftService.confirmPayment(groupId, paymentId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
    },
    onError: () => feedback('error'),
  });

  const kycMutation = useMutation({
    mutationFn: ({ memberId, value }: { memberId: number; value: boolean }) =>
      thriftService.toggleMemberKyc(groupId, memberId, value),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
    },
    onError: () => feedback('error'),
  });

  const toggleKyc = (mem: ThriftMember) => {
    const nextValue = !mem.user.is_kyc_verified;
    const name = `${mem.user.first_name} ${mem.user.last_name}`;
    Alert.alert(
      nextValue ? 'Mark as KYC Verified' : 'Remove KYC Verification',
      nextValue
        ? `Mark ${name} as KYC verified? This confirms the bank has verified their identity externally.`
        : `Remove KYC verification for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: nextValue ? 'Verify' : 'Remove', style: nextValue ? 'default' : 'destructive',
          onPress: () => kycMutation.mutate({ memberId: mem.id, value: nextValue }) },
      ],
    );
  };

  const shareInvite = async () => {
    if (!group) return;
    await Share.share({
      message: `Join my thrift group "${group.name}" on Ajo!\nInvite code: ${group.invite_code}`,
    });
  };

  const onRefresh = () => {
    refetchMembers();
    refetchPayments();
  };

  if (groupLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ padding: 24 }}>
          <Skeleton width="60%" height={24} radius={6} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={16} radius={4} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={100} radius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} radius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} radius={12} />
        </View>
      </View>
    );
  }

  if (!group) return null;

  const isOrgAdmin     = !!group.is_org_admin;
  const ownMember      = members?.find((m) => m.user.id === user?.id) ?? null;
  const pendingMembers = members?.filter((m) => m.status === 'pending' || m.status === 'amount_pending') ?? [];
  const approvedMembers = members?.filter((m) => m.status === 'approved') ?? [];
  const cycle          = group.active_cycle;

  const cycleStatusLabel = cycle
    ? cycle.status === 'active' ? 'Active' : 'Completed'
    : 'No active cycle';

  const cycleEndLabel = cycle
    ? cycle.end_date ? cycle.end_date : 'Open-ended'
    : '—';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary, flex: 1, marginHorizontal: 12 }}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {group.name}
        </Text>
        {isOrgAdmin ? (
          <View style={{ width: 22 }} />
        ) : isCollector ? (
          <TouchableOpacity onPress={shareInvite} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Share invite code">
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setKebabOpen(true)} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="More options">
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Kebab menu for payer */}
      <Modal visible={kebabOpen} transparent animationType="fade" onRequestClose={() => setKebabOpen(false)}>
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setKebabOpen(false)} accessibilityRole="button" accessibilityLabel="Dismiss">
          <View style={[s.kebabMenu, { backgroundColor: colors.surface, ...Shadow.strong(colors.black) }]}>
            <TouchableOpacity
              style={s.kebabItem}
              onPress={() => { setKebabOpen(false); setReportOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel="Report collector"
            >
              <Ionicons name="flag-outline" size={18} color={colors.error} />
              <Text style={{ fontSize: FontSize.sm, color: colors.error, marginLeft: 10, fontWeight: '600' }}>
                Report Collector
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Organization badge */}
        {!!group.organization && (
          <View style={[s.orgCard, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {group.organization.logo ? (
                <Image
                  source={{ uri: group.organization.logo }}
                  style={s.orgLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={[s.orgLogo, { backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                  {group.organization.name}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1, textTransform: 'capitalize' }}>
                  {group.organization.org_type}
                </Text>
              </View>
            </View>
            {group.organization.is_verified && (
              <View style={[s.verifiedBadge, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginLeft: 3 }}>Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* Cycle info card */}
        <View style={[s.cycleCard, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="refresh-circle-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, marginLeft: 6 }}>
                {cycle ? `Cycle #${cycle.cycle_number}` : 'No Cycle'}
              </Text>
            </View>
            {cycle && (
              <View style={[pill.wrap, { backgroundColor: cycle.status === 'active' ? colors.successLight : colors.primaryTint }]}>
                <Text style={[pill.label, { color: cycle.status === 'active' ? colors.success : colors.primary }]}>
                  {cycleStatusLabel}
                </Text>
              </View>
            )}
          </View>

          {cycle ? (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
              {cycle.start_date} → {cycleEndLabel}
            </Text>
          ) : (
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>Start a new cycle to begin collecting.</Text>
          )}

          {isCollector && (
            <View style={{ marginTop: 12 }}>
              {cycle && cycle.status === 'active' ? (
                <TouchableOpacity
                  onPress={() => setEndCycleOpen(true)}
                  style={[s.cycleBtn, { backgroundColor: colors.errorLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="End cycle"
                >
                  <Ionicons name="stop-circle-outline" size={15} color={colors.error} />
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.error, marginLeft: 5 }}>End Cycle</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setRestartOpen(true)}
                  style={[s.cycleBtn, { backgroundColor: colors.successLight }]}
                  accessibilityRole="button"
                  accessibilityLabel={cycle ? 'Restart cycle' : 'Start cycle'}
                >
                  <Ionicons name="play-circle-outline" size={15} color={colors.success} />
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.success, marginLeft: 5 }}>
                    {cycle ? 'Restart Cycle' : 'Start Cycle'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── ORG ADMIN VIEW (read-only oversight) ── */}
        {isOrgAdmin ? (
          <>
            <View style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
              <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.primary, marginLeft: 6 }}>
                  Organisation Oversight
                </Text>
              </View>
            </View>

            {membersLoading || paymentsLoading ? (
              <>
                <Skeleton width="100%" height={110} radius={12} style={{ marginBottom: 10 }} />
                <Skeleton width="100%" height={110} radius={12} />
              </>
            ) : approvedMembers.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={48} color={colors.border} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  No approved payers yet.
                </Text>
              </View>
            ) : (
              approvedMembers.map((mem) => {
                const memberPayments = (payments ?? []).filter((p) => p.member === mem.id);
                const isExpanded     = expandedMembers.has(mem.id);
                const visiblePayments = isExpanded ? memberPayments : memberPayments.slice(0, 1);
                const toggleExpand   = () => setExpandedMembers((prev) => {
                  const next = new Set(prev);
                  next.has(mem.id) ? next.delete(mem.id) : next.add(mem.id);
                  return next;
                });

                return (
                  <View key={mem.id} style={[s.memberCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                    {/* Payer header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[s.avatar, { backgroundColor: colors.successLight }]}>
                        <Text style={{ fontWeight: '800', color: colors.success, fontSize: FontSize.sm }}>
                          {mem.user.first_name?.[0]}{mem.user.last_name?.[0]}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                            {mem.user.first_name} {mem.user.last_name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => toggleKyc(mem)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 99,
                              backgroundColor: mem.user.is_kyc_verified ? colors.successLight : colors.border }}
                            accessibilityRole="button"
                            accessibilityLabel={mem.user.is_kyc_verified ? `Remove KYC verification for ${mem.user.first_name} ${mem.user.last_name}` : `Mark ${mem.user.first_name} ${mem.user.last_name} as KYC verified`}
                          >
                            <Ionicons
                              name={mem.user.is_kyc_verified ? 'shield-checkmark' : 'shield-outline'}
                              size={9}
                              color={mem.user.is_kyc_verified ? colors.success : colors.textTertiary}
                            />
                            <Text style={{ fontSize: 9, fontWeight: '700', marginLeft: 2,
                              color: mem.user.is_kyc_verified ? colors.success : colors.textTertiary }}>
                              KYC
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                          ₦{Number(mem.personal_amount).toLocaleString()}/period · saved ₦{Number(mem.total_saved).toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: colors.primaryTint }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                          {memberPayments.length} payment{memberPayments.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Payment rows with dual confirmation */}
                    {memberPayments.length === 0 ? (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, paddingTop: 2 }}>
                        No payments recorded yet.
                      </Text>
                    ) : (
                      <>
                        {visiblePayments.map((p, idx) => {
                          const payerConfirmed = p.payer_confirmed || p.status === 'confirmed';
                          const isDisputed     = p.status === 'disputed';
                          return (
                            <View
                              key={p.id}
                              style={[
                                s.paymentRow,
                                { borderTopColor: colors.border, flexDirection: 'column', alignItems: 'flex-start', paddingTop: 10, marginTop: idx === 0 ? 0 : 4 },
                                idx === 0 && { borderTopWidth: 1 },
                              ]}
                            >
                              {/* Date + amount */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 7 }}>
                                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textPrimary }}>
                                  {p.period_date}
                                </Text>
                                <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: colors.success }}>
                                  ₦{Number(p.amount).toLocaleString()}
                                </Text>
                              </View>

                              {/* Dual confirmation chips */}
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                                  <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginLeft: 4 }}>Collector marked</Text>
                                </View>

                                {payerConfirmed ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                                    <Ionicons name="checkmark-done-circle" size={11} color={colors.success} />
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginLeft: 4 }}>Payer confirmed</Text>
                                  </View>
                                ) : isDisputed ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: WARNING_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                                    <Ionicons name="alert-circle" size={11} color={WARNING} />
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: WARNING, marginLeft: 4 }}>Payer disputed</Text>
                                  </View>
                                ) : (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1, borderColor: colors.border }}>
                                    <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textTertiary, marginLeft: 4 }}>Awaiting payer</Text>
                                  </View>
                                )}
                              </View>

                              {isDisputed && (
                                <TouchableOpacity
                                  onPress={() => setViewDisputeTarget(p)}
                                  hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                                  accessibilityRole="button"
                                  accessibilityLabel="View dispute details"
                                >
                                  <Text style={{ fontSize: FontSize.xs, color: WARNING, marginTop: 5, lineHeight: 16 }} numberOfLines={2}>
                                    {p.dispute_reason ? `"${p.dispute_reason}"` : 'Disputed'}{' '}
                                    <Text style={{ textDecorationLine: 'underline' }}>View</Text>
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}

                        {/* Expand / collapse toggle */}
                        {memberPayments.length > 1 && (
                          <TouchableOpacity
                            onPress={toggleExpand}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.background }}
                            accessibilityRole="button"
                            accessibilityLabel={isExpanded ? 'Show fewer payments' : `View all ${memberPayments.length} payments`}
                          >
                            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.primary }}>
                              {isExpanded ? 'Show less' : `View all ${memberPayments.length} payments`}
                            </Text>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : isCollector ? (
          <>
            {/* Tabs */}
            <View style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[s.tab, activeTab === 'pending' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab('pending')}
                accessibilityRole="button"
                accessibilityLabel={`Pending (${pendingMembers.length})`}
                accessibilityState={{ selected: activeTab === 'pending' }}
              >
                <Text style={[s.tabText, { color: activeTab === 'pending' ? colors.primary : colors.textSecondary }]}>
                  Pending ({pendingMembers.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, activeTab === 'payments' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab('payments')}
                accessibilityRole="button"
                accessibilityLabel="Payments"
                accessibilityState={{ selected: activeTab === 'payments' }}
              >
                <Text style={[s.tabText, { color: activeTab === 'payments' ? colors.primary : colors.textSecondary }]}>
                  Payments
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'pending' ? (
              <>
                {membersLoading ? (
                  <>
                    <Skeleton width="100%" height={100} radius={12} style={{ marginBottom: 10 }} />
                    <Skeleton width="100%" height={100} radius={12} />
                  </>
                ) : pendingMembers.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.border} />
                    <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                      No pending requests. Share the invite code to get started.
                    </Text>
                  </View>
                ) : (
                  pendingMembers.map((mem) => (
                    <View key={mem.id} style={[s.memberCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={[s.avatar, { backgroundColor: colors.primaryTint }]}>
                          <Text style={{ fontWeight: '800', color: colors.primary, fontSize: FontSize.sm }}>
                            {mem.user.first_name?.[0]}{mem.user.last_name?.[0]}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                            {mem.user.first_name} {mem.user.last_name}
                          </Text>
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                            ₦{Number(mem.personal_amount).toLocaleString()} / period
                          </Text>
                        </View>
                        <StatusPill status={mem.status} colors={colors} />
                      </View>

                      {mem.status === 'amount_pending' && !!mem.flag_reason && (
                        <View style={[s.alertBox, { backgroundColor: WARNING_LIGHT, marginBottom: 10 }]}>
                          <Ionicons name="flag-outline" size={14} color={WARNING} />
                          <Text style={{ flex: 1, fontSize: FontSize.xs, color: WARNING, marginLeft: 6 }}>
                            {mem.flag_reason}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => reviewMutation.mutate({ memberId: mem.id, action: 'approve' })}
                          disabled={reviewMutation.isPending}
                          style={[s.actionBtn, { backgroundColor: colors.successLight, flex: 1 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Approve ${mem.user.first_name} ${mem.user.last_name}`}
                        >
                          <Ionicons name="checkmark" size={15} color={colors.success} />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.success, marginLeft: 4 }}>Approve</Text>
                        </TouchableOpacity>

                        {mem.status === 'pending' && (
                          <TouchableOpacity
                            onPress={() => setFlagTarget(mem)}
                            style={[s.actionBtn, { backgroundColor: WARNING_LIGHT, flex: 1 }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Flag amount for ${mem.user.first_name} ${mem.user.last_name}`}
                          >
                            <Ionicons name="flag-outline" size={15} color={WARNING} />
                            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: WARNING, marginLeft: 4 }}>Flag Amount</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => reviewMutation.mutate({ memberId: mem.id, action: 'reject' })}
                          disabled={reviewMutation.isPending}
                          style={[s.actionBtn, { backgroundColor: colors.errorLight, flex: 1 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Reject ${mem.user.first_name} ${mem.user.last_name}`}
                        >
                          <Ionicons name="close" size={15} color={colors.error} />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.error, marginLeft: 4 }}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                {membersLoading || paymentsLoading ? (
                  <>
                    <Skeleton width="100%" height={110} radius={12} style={{ marginBottom: 10 }} />
                    <Skeleton width="100%" height={110} radius={12} />
                  </>
                ) : approvedMembers.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="people-outline" size={48} color={colors.border} />
                    <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                      No approved payers yet.
                    </Text>
                  </View>
                ) : (
                  approvedMembers.map((mem) => {
                    const memberPayments = (payments ?? []).filter((p) => p.member === mem.id);
                    return (
                      <View key={mem.id} style={[s.memberCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <View style={[s.avatar, { backgroundColor: colors.successLight }]}>
                            <Text style={{ fontWeight: '800', color: colors.success, fontSize: FontSize.sm }}>
                              {mem.user.first_name?.[0]}{mem.user.last_name?.[0]}
                            </Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                              {mem.user.first_name} {mem.user.last_name}
                            </Text>
                            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                              Total saved: ₦{Number(mem.total_saved).toLocaleString()}
                            </Text>
                          </View>
                          {approvingMemberId === mem.id ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <TextInput
                                value={approveAmount}
                                onChangeText={setApproveAmount}
                                keyboardType="decimal-pad"
                                placeholder="Amount"
                                placeholderTextColor={colors.textTertiary}
                                style={{
                                  width: 90, fontSize: FontSize.xs, borderWidth: 1,
                                  borderColor: colors.border, borderRadius: 8,
                                  paddingHorizontal: 8, paddingVertical: 4,
                                  backgroundColor: colors.background, color: colors.textPrimary,
                                }}
                                autoFocus
                              />
                              <TouchableOpacity
                                onPress={() => {
                                  if (!approveAmount || Number(approveAmount) <= 0) return;
                                  quickApproveMutation.mutate({ memberId: mem.id, amount: approveAmount });
                                }}
                                disabled={quickApproveMutation.isPending}
                                style={[s.markBtn, { backgroundColor: colors.success }]}
                                accessibilityRole="button"
                              >
                                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#fff' }}>
                                  {quickApproveMutation.isPending ? '…' : 'OK'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => { setApprovingMemberId(null); setApproveAmount(''); }}>
                                <Ionicons name="close" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => { setApprovingMemberId(mem.id); setApproveAmount(String(mem.personal_amount)); }}
                              style={[s.markBtn, { backgroundColor: colors.success }]}
                              accessibilityRole="button"
                              accessibilityLabel={`Approve payment for ${mem.user.first_name} ${mem.user.last_name}`}
                            >
                              <Ionicons name="checkmark" size={14} color="#fff" />
                              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#fff', marginLeft: 3 }}>Approve</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {memberPayments.slice(0, 3).map((p) => {
                          const confIcon = p.status === 'confirmed' ? 'checkmark-done' : p.status === 'disputed' ? 'alert-circle-outline' : 'time-outline';
                          const confColor = p.status === 'confirmed' ? colors.success : p.status === 'disputed' ? WARNING : colors.textTertiary;
                          return (
                            <View key={p.id} style={[s.paymentRow, { borderTopColor: colors.border }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Ionicons name={confIcon as any} size={13} color={confColor} />
                                <Text style={{ fontSize: FontSize.xs, color: colors.textPrimary, marginLeft: 5, fontWeight: '600' }}>
                                  {p.period_date}
                                </Text>
                                {!!p.notes && (
                                  <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginLeft: 6 }} numberOfLines={1}>
                                    · {p.notes}
                                  </Text>
                                )}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Text style={{ fontSize: FontSize.xs, color: colors.success, fontWeight: '700' }}>
                                  ₦{Number(p.amount).toLocaleString()}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => unmarkMutation.mutate(p.id)}
                                  disabled={unmarkMutation.isPending}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityRole="button"
                                  accessibilityLabel="Delete payment record"
                                >
                                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}

                        {memberPayments.length === 0 && (
                          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, paddingTop: 8 }}>
                            No payments marked yet.
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}
          </>
        ) : (
          /* ── PAYER VIEW ── */
          <>
            {ownMember && (
              <View style={[s.memberCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>My Membership</Text>
                  <StatusPill status={ownMember.status} colors={colors} />
                </View>
                <View style={s.metaRow}>
                  <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginLeft: 6 }}>
                    ₦{Number(ownMember.personal_amount).toLocaleString()} / period
                  </Text>
                </View>
                <View style={[s.metaRow, { marginTop: 4 }]}>
                  <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginLeft: 6 }}>
                    Total saved: ₦{Number(ownMember.total_saved).toLocaleString()}
                  </Text>
                </View>

                {ownMember.status === 'amount_pending' && (
                  <View style={{ marginTop: 12 }}>
                    <View style={[s.alertBox, { backgroundColor: WARNING_LIGHT }]}>
                      <Ionicons name="warning-outline" size={16} color={WARNING} />
                      <Text style={{ flex: 1, fontSize: FontSize.xs, color: WARNING, marginLeft: 8, lineHeight: 18 }}>
                        The collector flagged your contribution amount.
                        {ownMember.flag_reason ? ` Reason: ${ownMember.flag_reason}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setCorrectOpen(true)}
                      style={[s.actionBtn, { backgroundColor: colors.primary, marginTop: 10, justifyContent: 'center' }]}
                      accessibilityRole="button"
                      accessibilityLabel="Correct my amount"
                    >
                      <Ionicons name="create-outline" size={16} color="#fff" />
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff', marginLeft: 6 }}>Correct My Amount</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {ownMember.status === 'pending' && (
                  <View style={[s.alertBox, { backgroundColor: colors.primaryTint, marginTop: 12 }]}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.primary, marginLeft: 8, lineHeight: 18 }}>
                      Waiting for the collector to approve your membership.
                    </Text>
                  </View>
                )}

                {ownMember.status === 'rejected' && (
                  <View style={[s.alertBox, { backgroundColor: colors.errorLight, marginTop: 12 }]}>
                    <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                    <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.error, marginLeft: 8, lineHeight: 18 }}>
                      Your membership request was rejected. Contact the collector for details.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>My Payment History</Text>

            {paymentsLoading ? (
              <>
                <Skeleton width="100%" height={60} radius={10} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={60} radius={10} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={60} radius={10} />
              </>
            ) : (payments ?? []).length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="receipt-outline" size={48} color={colors.border} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
                  No payments recorded yet. Once you pay and the collector marks it, it will appear here.
                </Text>
              </View>
            ) : (
              (payments ?? []).map((p) => {
                const isConfirmed = p.status === 'confirmed';
                const isDisputed  = p.status === 'disputed';
                const badgeBg     = isConfirmed ? colors.successLight : isDisputed ? WARNING_LIGHT : colors.primaryTint;
                const badgeColor  = isConfirmed ? colors.success      : isDisputed ? WARNING       : colors.primary;
                const badgeIcon   = isConfirmed ? 'checkmark-done'    : isDisputed ? 'alert-circle-outline' : 'time-outline';
                const badgeLabel  = isConfirmed ? 'Confirmed'         : isDisputed ? 'Disputed'    : 'Pending confirmation';
                return (
                  <View key={p.id} style={[s.paymentCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[s.iconBadge, { backgroundColor: badgeBg }]}>
                        <Ionicons name={badgeIcon as any} size={18} color={badgeColor} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{p.period_date}</Text>
                        {!!p.notes && (
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{p.notes}</Text>
                        )}
                        <Text style={{ fontSize: FontSize.xs, color: badgeColor, marginTop: 3, fontWeight: '600' }}>{badgeLabel}</Text>
                        {isDisputed && (
                          <TouchableOpacity
                            onPress={() => setViewDisputeTarget(p)}
                            hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel="View dispute details"
                          >
                            <Text style={{ fontSize: FontSize.xs, color: WARNING, marginTop: 2 }} numberOfLines={2}>
                              {p.dispute_reason ? `"${p.dispute_reason}"` : 'Disputed'}{' '}
                              <Text style={{ textDecorationLine: 'underline' }}>View</Text>
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.success }}>
                        ₦{Number(p.amount).toLocaleString()}
                      </Text>
                    </View>

                    {!isConfirmed && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                        <TouchableOpacity
                          onPress={() => confirmMutation.mutate(p.id)}
                          disabled={confirmMutation.isPending}
                          style={[s.actionBtn, { backgroundColor: colors.successLight, flex: 1, justifyContent: 'center' }]}
                          accessibilityRole="button"
                          accessibilityLabel="Confirm payment"
                        >
                          <Ionicons name="checkmark-done" size={14} color={colors.success} />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.success, marginLeft: 4 }}>
                            Confirm
                          </Text>
                        </TouchableOpacity>
                        {!isDisputed && (
                          <TouchableOpacity
                            onPress={() => setDisputeTarget(p)}
                            style={[s.actionBtn, { backgroundColor: WARNING_LIGHT, flex: 1, justifyContent: 'center' }]}
                            accessibilityRole="button"
                            accessibilityLabel="Dispute payment"
                          >
                            <Ionicons name="alert-circle-outline" size={14} color={WARNING} />
                            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: WARNING, marginLeft: 4 }}>
                              Dispute
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <FlagAmountModal
        visible={!!flagTarget}
        member={flagTarget}
        groupId={groupId}
        onClose={() => setFlagTarget(null)}
      />
      <CorrectAmountModal
        visible={correctOpen}
        member={ownMember}
        groupId={groupId}
        onClose={() => setCorrectOpen(false)}
      />
      <ReportCollectorModal
        visible={reportOpen}
        groupId={groupId}
        onClose={() => setReportOpen(false)}
      />
      <DisputePaymentModal
        visible={!!disputeTarget}
        payment={disputeTarget}
        groupId={groupId}
        onClose={() => setDisputeTarget(null)}
      />
      {viewDisputeTarget && (
        <DisputeDetailSheet
          payment={viewDisputeTarget}
          onClose={() => setViewDisputeTarget(null)}
        />
      )}
      <EndCycleModal
        visible={endCycleOpen}
        groupId={groupId}
        onClose={() => setEndCycleOpen(false)}
      />
      <RestartCycleModal
        visible={restartOpen}
        groupId={groupId}
        isFixed={group.cycle_type === 'fixed'}
        onClose={() => setRestartOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  orgCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radius.lg, borderWidth: 1, padding: 12, marginBottom: 12,
  },
  orgLogo: { width: 36, height: 36, borderRadius: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  cycleCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  cycleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md, alignSelf: 'flex-start',
  },
  tabBar: {
    flexDirection: 'row', borderWidth: 1, borderRadius: Radius.lg,
    marginBottom: 16, overflow: 'hidden',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  tabText: { fontSize: FontSize.sm, fontWeight: '700' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  memberCard: { borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md,
  },
  markBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.md,
  },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 8, marginTop: 8,
  },
  paymentCard: { borderRadius: Radius.md, padding: 14, marginBottom: 8 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: Radius.md },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  kebabMenu: {
    position: 'absolute', top: 100, right: 20,
    borderRadius: Radius.md, paddingVertical: 4, minWidth: 180,
  },
  kebabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 4 },
  sub: { fontSize: FontSize.sm, marginBottom: 20, lineHeight: 20 },
  lbl: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: 12, fontSize: FontSize.sm },
  btn: { padding: 14, borderRadius: Radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, borderWidth: 1, marginTop: 8 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
