import { z } from 'zod';

const LocationName = z.string();
const CharacterName = z.string();
const ItemName = z.string();
const QuestName = z.string();

const StateKey = z.string();
const StateValue = z.union([z.string(), z.number()]);
const State = z.record(StateValue);

const Trigger = z.union([
  z.object({
    type: z.literal('CHANGE'),
    keys: z.array(StateKey),
  }),
  z.object({
    type: z.literal('INPUT'),
    phrases: z.array(z.string()),
  }),
]);

const Condition = z.object({
  test: z.enum(['=', '!=', '>', '<', '>=', '<=']),
  key: StateKey,
  operand: StateValue,
});

const Expression = z.lazy(() =>
  z.union([
    SetExpression,
    BranchExpression,
    OutputExpression,
    CompoundExpression,
  ]),
);

const SetExpression = z.object({
  type: z.literal('SET'),
  key: StateKey,
  value: StateValue,
});

const BranchExpression = z.object({
  type: z.literal('BRANCH'),
  conditions: z.array(Condition),
  ifTrue: Expression,
  ifFalse: Expression,
});

const OutputExpression = z.object({
  type: z.literal('OUTPUT'),
  content: z.string(),
});

const CompoundExpression = z.object({
  type: z.literal('COMPOUND'),
  expressions: z.array(Expression),
});

const Action = z.object({
  trigger: Trigger,
  conditions: z.array(Condition),
  expression: Expression,
});

const Direction = z.enum([
  'north',
  'east',
  'south',
  'west',
  'north-east',
  'north-west',
  'south-east',
  'south-west',
  'up',
  'down',
]);

const Connection = z.tuple([Direction, LocationName]);

const Location = z.object({
  name: LocationName,
  overview: z.string(),
  connections: z.array(Connection),
  description: z.string(),
  summary: z.string(),
  actions: z.array(Action),
});

const Character = z.object({
  name: CharacterName,
  overview: z.string(),
  starting_location: LocationName,
  description: z.string(),
  summary: z.string(),
  actions: z.array(Action),
});

const Item = z.object({
  name: ItemName,
  overview: z.string(),
  starting_location: z.union([LocationName, CharacterName]),
  description: z.string(),
  summary: z.string(),
  actions: z.array(Action),
});

const Quest = z.object({
  description: z.string(),
  overview: z.string(),
  quest_giver: CharacterName,
  items_involved: z.array(ItemName),
  summary: z.string(),
  actions: z.array(Action),
});

const Content = z.object({
  locations: z.record(Location),
  characters: z.record(Character),
  items: z.record(Item),
  quests: z.record(Quest),
  actions: z.array(Action),
  state: State,
  style: z.string(),
});