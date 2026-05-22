import type { ClipEvent, ClipEventType } from './types';

const EVENT_STORE_KEY = 'clipcard-lab-events-v2';

function createEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readEvents(): ClipEvent[] {
  try {
    const raw = localStorage.getItem(EVENT_STORE_KEY);
    return raw ? (JSON.parse(raw) as ClipEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: ClipEvent[]) {
  localStorage.setItem(EVENT_STORE_KEY, JSON.stringify(events));
}

export function recordEvent(input: Omit<ClipEvent, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: string }) {
  const event: ClipEvent = {
    ...input,
    eventId: input.eventId ?? createEventId(),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  writeEvents([event, ...readEvents()].slice(0, 500));
  return event;
}

export function getEvents() {
  return readEvents();
}

export function getEventsByType(eventType: ClipEventType) {
  return readEvents().filter((event) => event.eventType === eventType);
}

export function clearEvents() {
  writeEvents([]);
}
