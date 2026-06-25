'use client';

import { useEffect, useState } from 'react';
import {
  isVdbgEnabled,
  vdbgEvents,
  vdbgNetInfo,
  vdbgSubscribe,
  type VdbgEvent,
} from './feedPerfDebug';

// On-screen overlay for video debug events. Mounts only when vdbg is on.
// Tappable header collapses the body so it doesn't block interaction.
export function FeedPerfDebugPanel({ activeIndex }: { activeIndex: number }) {
  const [, force] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const enabled = isVdbgEnabled();

  useEffect(() => {
    if (!enabled) return;
    const unsub = vdbgSubscribe(() => force((n) => n + 1));
    return unsub;
  }, [enabled]);

  if (!enabled) return null;

  const events = vdbgEvents();
  const recent = events.slice(-30);
  const net = vdbgNetInfo();

  return (
    <div
      className="pointer-events-auto fixed top-2 right-2 left-2 z-[9999] rounded-lg bg-black/85 font-mono text-[10px] text-green-300 shadow-2xl"
      style={{ maxHeight: '50dvh' }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 border-green-300/30 border-b px-2 py-1 text-left"
      >
        <span>
          VDBG · active=i{activeIndex} · ev={events.length}
          {net ? ` · ${String(net.effectiveType ?? '?')}` : ''}
        </span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="overflow-y-auto px-2 py-1" style={{ maxHeight: '45dvh' }}>
          {recent.map((ev, i) => (
            <EventRow key={`${ev.t}-${ev.type}-${i}`} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ ev }: { ev: VdbgEvent }) {
  const color =
    ev.type.includes('error') || ev.type.includes('stall')
      ? 'text-red-400'
      : ev.type === 'playing' || ev.type === 'first-frame'
        ? 'text-cyan-300'
        : ev.type.startsWith('hls')
          ? 'text-amber-300'
          : 'text-green-300';
  return (
    <div className={`whitespace-pre ${color}`}>
      {`+${String(ev.t).padStart(5)} i${ev.idx} ${ev.cfId.slice(0, 6)} ${ev.type}`}
      {ev.data ? ` ${JSON.stringify(ev.data)}` : ''}
    </div>
  );
}
