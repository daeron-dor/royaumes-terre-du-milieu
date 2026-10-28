import type { Campaign } from './types.ts';
export function log(s: Campaign, text: string, at: number, audience?: string) {
  s.logs.unshift({ text, at, audience });
  s.logs = s.logs.slice(0, 200);
}
