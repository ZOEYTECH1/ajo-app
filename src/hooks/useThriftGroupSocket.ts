import { useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAppStore';

export type ThriftGroupEvent =
  | {
      event: 'payment_marked' | 'payment_confirmed' | 'payment_disputed';
      payment: {
        id: number;
        member: number;
        member_name: string;
        amount: string;
        period_date: string;
        status: 'pending' | 'confirmed' | 'disputed';
      };
    }
  | { event: 'cycle_ended'; cycle_number: number }
  | { event: 'cycle_end_blocked'; cycle_number: number; scheduled_end_date: string; collector_name: string };

function wsUrlFor(groupUuid: string, token: string): string {
  const httpBase = api.defaults.baseURL ?? '';
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}/ws/thrift-groups/${groupUuid}/?token=${encodeURIComponent(token)}`;
}

/**
 * Subscribes to real-time payment events (marked/confirmed/disputed) for a
 * thrift group. Reconnects automatically on an unexpected close.
 */
export function useThriftGroupSocket(groupUuid: string | undefined, onEvent: (e: ThriftGroupEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!groupUuid) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    function connect() {
      socket = new WebSocket(wsUrlFor(groupUuid!, token!));
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
  }, [groupUuid]);
}
