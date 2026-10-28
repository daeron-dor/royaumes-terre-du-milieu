import {
  buildingBalanceSchema,
  unitBalanceSchema,
  factionBalanceSchema,
} from './balance-settings.ts';
import { z } from 'zod';
const id = z.string().min(1).max(100);
const quantity = z.number().int().positive().max(100000);
export const gameActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('balanceBuilding'),
    id,
    revision: z.number().int().nonnegative(),
    value: buildingBalanceSchema.nullable(),
  }),
  z.object({
    type: z.literal('balanceUnit'),
    id,
    revision: z.number().int().nonnegative(),
    value: unitBalanceSchema.nullable(),
  }),
  z.object({
    type: z.literal('balanceFaction'),
    id,
    revision: z.number().int().nonnegative(),
    value: factionBalanceSchema.nullable(),
  }),
  z.object({
    type: z.literal('upgrade'),
    city: id,
    building: z.enum(['keep', 'farm', 'market', 'lumber', 'quarry', 'mine', 'barracks', 'walls']),
  }),
  z.object({ type: z.literal('cancelQueuedBuild'), city: id, id }),
  z.object({ type: z.literal('recruit'), city: id, unit: id, count: quantity }),
  z.object({ type: z.literal('deliver'), id }),
  z.object({ type: z.literal('rejectOrder'), id }),
  z.object({ type: z.literal('loss'), city: id, unit: id, count: quantity }),
  z.object({ type: z.literal('transfer'), city: id, to: id, unit: id, count: quantity }),
  z.object({ type: z.literal('legendary'), enabled: z.boolean() }),
  z.object({
    type: z.literal('encounter'),
    unit: id,
    location: z.string().trim().min(1).max(70).optional(),
  }),
  z.object({ type: z.literal('defeatEncounter'), id }),
  z.object({
    type: z.literal('period'),
    age: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    year: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('deposit'),
    resource: z.enum(['gold', 'wood', 'stone', 'iron', 'food']),
    amount: quantity,
  }),
  z.object({ type: z.literal('reviewDeposit'), id, accept: z.boolean() }),
  z.object({ type: z.literal('found'), name: z.string().trim().min(2).max(40) }),
]);
export type GameAction = z.infer<typeof gameActionSchema>;
export function parseGameAction(value: unknown): GameAction {
  const result = gameActionSchema.safeParse(value);
  if (!result.success) throw Error('Action ou quantité invalide.');
  return result.data;
}

export const campaignSetupSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create'),
    name: z.string().trim().min(1).max(70).optional(),
    era: z.string().max(70).optional(),
    playerName: z.string().trim().min(1).max(40).optional(),
    faction: z.string().min(1).max(60),
  }),
  z.object({
    type: z.literal('join'),
    code: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{16}$/),
    playerName: z.string().trim().min(1).max(40).optional(),
    faction: z.string().min(1).max(60),
  }),
]);
export type CampaignSetupAction = z.infer<typeof campaignSetupSchema>;
export type CampaignAction = GameAction | CampaignSetupAction;
export function parseCampaignAction(input: unknown): CampaignAction {
  const result = z.union([gameActionSchema, campaignSetupSchema]).safeParse(input);
  if (!result.success) throw Error('Action ou quantité invalide.');
  return result.data;
}
