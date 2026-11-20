import { useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAppStore';

export type AjoGroupEvent =
  | { event: 'payment_submitted'; payment_id: number; submitted_by: string; amount: string }
  | { event: 'payment_approved' | 'payment_rejected'; payment_id: number; reviewed_by: string }
  | { event: 'join_request'; membership_id: number; applicant_name: string }
  | { event: 'membership_approved' | 'membership_rejected'; membership_id: number; member_name: string }
  | { event: 'sub_admin_assigned'; sub_admin_id: number; sub_admin_name: string };

function wsUrlFor(groupId: string | number, token: string): string {
  const httpBase = api.defaults.baseURL ?? '';
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}/ws/groups/${groupId}/?token=${encodeURIComponent(token)}`;
}

/**
 * Subscribes to real-time Ajo group events (join requests, membership
 * decisions, payment submissions/reviews) so an admin's already-open group
 * screen updates immediately instead of only finding out on their next
 * manual reload. Reconnects automatically on an unexpected close.
 *
 * Same shape as useThriftGroupSocket.ts -- the backend's GroupConsumer
 * (ws/groups/<id>/) only admits approved members and the group's admin
 * (see core/consumers.py), so a pending applicant never connects here.
 */
export function useGroupSocket(groupId: string | number | undefined, onEvent: (e: AjoGroupEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!groupId) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    function connect() {
      socket = new WebSocket(wsUrlFor(groupId!, token!));
      socket.onmessage = (msg) => {
        try {
          onEventRef.current(JSON.parse(msg.data));
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        if (!closedByCleanup) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [groupId]);
}
