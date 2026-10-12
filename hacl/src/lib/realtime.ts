import { useEffect, useState } from 'react';

export type RealtimePayload = {
  type: string;
  payload?: any;
  timestamp: string;
};

export type Listener = (event: RealtimePayload) => void;
export type StatusListener = (connected: boolean) => void;

class RealtimeManager {
  private eventSource: EventSource | null = null;
  private listeners: Set<Listener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private isConnected = false;
  private reconnectTimer: any = null;

  constructor() {
    this.connect();
  }

  private emitStatus(connected: boolean) {
    for (const listener of this.statusListeners) {
      try {
        listener(connected);
      } catch (err) {
        console.error('[Realtime] Status listener error:', err);
      }
    }
  }

  private connect() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.emitStatus(true);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: RealtimePayload = JSON.parse(event.data);
          this.emit(data);
        } catch (err) {
          console.error('[Realtime] Failed to parse SSE event data:', err);
        }
      };

      this.eventSource.onerror = () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        if (wasConnected) {
          this.emitStatus(false);
        }
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 3000);
      };
    } catch (err) {
      console.warn('[Realtime] EventSource initialization failed:', err);
    }
  }

  private emit(data: RealtimePayload) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('[Realtime] Error executing subscriber callback:', err);
      }
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public get connected(): boolean {
    return this.isConnected;
  }
}

export const realtime = new RealtimeManager();

export function useRealtimeStatus(): boolean {
  const [connected, setConnected] = useState<boolean>(realtime.connected);

  useEffect(() => {
    const unsubscribe = realtime.onStatusChange((status) => {
      setConnected(status);
    });
    return unsubscribe;
  }, []);

  return connected;
}

