import { z } from 'zod';

export const LocationName = z.string();
export const CharacterName = z.string();
export const ItemName = z.string();
export const QuestName = z.string();

export const LocationId = z.string().describe('uniquely identifies an location in the game');
export type LocationId = z.infer<typeof LocationId>

export const CharacterId = z.string().describe('uniquely identifies an location in the game');
export type CharacterId = z.infer<typeof CharacterId>

export const ItemId = z.string().describe('uniquely identifies an location in the game');
export type ItemId = z.infer<typeof ItemId>;

export const QuestId = z.string().describe('uniquely identifies an location in the game');
export type QuestId = z.infer<typeof QuestId>;

export const StateKey = z.string().describe(
  "the name of a state property"
);
export type StateKey = z.infer<typeof StateKey>;

export const StateValue = z.union([z.string(), z.number(), z.boolean(), z.undefined()]).describe(
  "the value of a state property"
);
export type StateValue = z.infer<typeof StateValue>;

export const State = z.record(StateValue).describe(
  "encapsulates game state"
);
export type State = z.infer<typeof State>;

export const StateChangeTrigger = z.object({
  type: z.literal('CHANGE').describe(
    "identifies this object as a state change trigger"
  ),
  keys: z.array(StateKey).describe(
    "action is triggered if the value of any of these state keys change"
  ),
}).describe(
  "triggers an action when game state is changed"
);
export type StateChangeTrigger = z.infer<typeof StateChangeTrigger>;

const PlayerInputTrigger = z.object({
  type: z.literal('INPUT').describe(
    "identifies this object as a player input trigger"
  ),
  phrase: z.string().describe(
    "action is triggered if this word or phrase is input, players can choose from the inputs that are currently enabled"
  ),
}).describe(
  "triggers an action when player input is received"
);
export type PlayerInputTrigger = z.infer<typeof PlayerInputTrigger>;

export const Trigger = z.union([
  StateChangeTrigger,
  PlayerInputTrigger,
]).describe(
  "describes how an action is triggered"
);
export type Trigger = z.infer<typeof Trigger>;

export const ComparisonOperators = z.enum(['==', '!=', '>', '<', '>=', '<=']);

export type ComparisonOperators = z.infer<typeof ComparisonOperators>;

export const Condition = z.object({
  test: ComparisonOperators.describe(
    "comparison operation that is performed"
  ),
  key: StateKey.describe(
    "name of the game state property to which value is compared"
  ),
  value: StateValue.describe(
    "value to which game state property is compared, use a value of the form '{{<key>}}' to compare to another state property"
  ),
}).describe(
  "describes comparison of a game state property value to a constant value or another game state property value"
);

export type Condition = z.infer<typeof Condition>;

export type Expression = SetExpression | BranchExpression | OutputExpression | CompoundExpression;

export const Expression: z.ZodType<Expression> = z.lazy(() =>
  z.union([
    SetExpression,
    BranchExpressionSchema,
    OutputExpression,
    CompoundExpression,
  ]).describe(
    "describes an expression that is evaluated to perform an action"
  ),
);

export const SetExpression = z.object({
  type: z.literal('SET').describe(
    "identifies this object as a state property set expression"
  ),
  key: StateKey.describe(
    "the name of the state property that will be set"
  ),
  value: StateValue.describe(
    "the value to which the state property will be set, use '{{<key>}}' to set to the value of another state property"
  ),
}).describe(
  "an expression that sets a state property value"
);

export type SetExpression = z.infer<typeof SetExpression>;

export type BranchExpression = {
  type: 'BRANCH',
  conditions: Array<Condition>,
  ifTrue?: Expression,
  ifFalse?: Expression,
}

export const BranchExpressionSchema: z.ZodType<BranchExpression> = z.object({
  type: z.literal('BRANCH').describe(
    "identifies this object as a branch expression"
  ),
  conditions: z.array(Condition).describe(
    "conditions that are evaluated to determine the branch taken"
  ),
  ifTrue: Expression.optional().describe(
    "expression that is evaluated if all conditions are true"
  ),
  ifFalse: Expression.optional().describe(
    "expression that is evaluated if any condition is false"
  ),
}).describe(
  "an expression that executes sub-expressions depending on the evaluation of conditions"
);

export const OutputExpression = z.object({
  type: z.literal('OUTPUT').describe(
    "identifies this object as an output expression"
  ),
  content: z.string().describe(
    "content that will be shown to the player"
  ),
}).describe(
  "an expression that produces output that is shown to the player"
);

export type OutputExpression = z.infer<typeof OutputExpression>;

export type CompoundExpression = {
  type: 'COMPOUND',
  expressions: Array<Expression>
};

export const CompoundExpression = z.object({
  type: z.literal('COMPOUND').describe(
    "identifies this object as an compound expression"
  ),
  expressions: z.array(Expression).describe(
    "the sub-expressions that are executed in sequence"
  ),
}).describe(
  "an expression that executes a sequence of sub-expressions"
);

export const Action = z.object({
  trigger: Trigger.describe(
    "describes how the action is triggered"
  ),
  conditions: z.array(Condition).describe(
    "determines if the action is executed"
  ),
  expression: Expression.describe(
    "operations performed if the conditions are met"
  ),
}).describe(
  "describes an action that can occur while playing the game"
);

export type Action = z.infer<typeof Action>

export const Direction = z.enum([
  'North',
  'East',
  'South',
  'West',
  'NorthEast',
  'NorthWest',
  'SouthEast',
  'SouthWest',
  'Up',
  'Down',
]).describe(
  "directions used to describe how one location relates to another"
);

export type Direction = z.infer<typeof Direction>;

export const Connection = z.tuple([
  Direction.describe('identifies the direction traveled'), 
  LocationId.describe('id of the location reached')
]).describe(
  "describes the direction traveled to reach a location"
);

export type Connection = z.infer<typeof Connection>;

export const Location = z.object({
  name: LocationName.describe(
    "name of the location, used as a title when showing game status to the player"
  ),
  overview: z.string().describe(
    "an overview of the location, used only during game development and debugging"
  ),
  connections: z.array(Connection).describe(
    "indicates how the location is connected to other locations"
  ),
  detail: z.string().describe(
    "a detailed description of the location shown to players when they first visits the location"
  ),
  summary: z.string().describe(
    "a short description of the location shown to players after they have first visited the location"
  ),
  actions: z.array(Action).describe(
    "actions that are enabled while the player is at the location"
  )
}).describe(
  "content related to a location in a game"
);

export type Location = z.infer<typeof Location>;

export const Character = z.object({
  name: CharacterName.describe(
    "name of the character, used as a title when showing game status to the player"
  ),
  overview: z.string().describe(
    "an overview of the character, used only during game development and debugging"
  ),
  starting_location: LocationId.describe(
    "identifies the character's location at the start of the game"
  ),
  detail: z.string().describe(
    "a detailed description of the character shown to players when they first encounter the character"
  ),
  summary: z.string().describe(
    "a short description of the character shown to players after they have first encountered the character"
  ),
  actions: z.array(Action).describe(
    "actions that are enabled while the character is in the same location as the player"
  ),
}).describe(
  "content related to a character in a game"
);

export type Character = z.infer<typeof Character>;

export const Item = z.object({
  name: ItemName.describe(
    "name of the item, used as a title when showing game status to the player"
  ),
  overview: z.string().describe(
    'an overview of the item, used only during game development and debugging'
  ),
  starting_location: z.union([LocationId, CharacterId]).describe(
    'is a location id or character id that identifies where the item is initially located'
  ),
  detail: z.string().describe(
    'a detailed description of the item shown to players when they first encounter the item'
  ),
  summary: z.string().describe(
    'a short description of the item shown to players after they have first encountered the item'
  ),
  actions: z.array(Action).describe(
    'actions that are enabled while the player is carrying the item or is in the same location as the item'
  ),
}).describe('content related to an item in a game');

export type Item = z.infer<typeof Item>

export const Quest = z.object({
  name: QuestName.describe(
    "name of the quest, used as a title when showing game status to the player"
  ),
  detail: z.string().describe(
    'detailed description of quest show to the player after completing the quest,' +
    'can be used to tell the story of the quest as experienced by the player'
  ),
  overview: z.string().describe(
    'an overview of the quest, used only during game development and debugging'
  ),
  quest_giver: CharacterId.describe(
    'id of character the player has to interact with to start the quest'
  ),
  items_involved: z.array(ItemId).describe(
    'ids of the items involved in the quest'
  ),
  summary: z.string().describe(
    'a brief summary of the quest show to players while the quest is active'
  ),
  actions: z.array(Action).describe(
    'actions that are enabled while the quests is active'
  ),
}).describe('content related to a quest in a game');

export type Quest = z.infer<typeof Quest>;

export const Content = z.object({
  title: z.string().describe(
    "title of the game"
  ),
  introduction: z.string().describe(
    "shown to the player at the start of the game, sets the stage for the game"
  ),
  locations: z.record(LocationId, Location).describe(
    "the game's locations, indexed by location id"
  ),
  playerStartLocation: LocationId.describe(
    "the id of the player's location at the start of a game"
  ),
  characters: z.record(CharacterId, Character).describe(
    "the game's characters, indexed by character id"
  ),
  items: z.record(ItemId, Item).describe(
    "the game's items, indexed by item id"
  ),
  quests: z.record(QuestId, Quest).describe(
    "the game's quests, indexed by quest id"
  ),
  actions: z.array(Action).describe(
    "actions that are always enabled"
  ),
  style: z.string().describe(
    "a writing style guide that should be used for all content in the game"
  ),
  state: State.describe(
    "contains the initial state to be used for new games"
  )
}).describe(
  "content for a simple text adventure game"
);

export type Locations = z.infer<typeof Content['shape']['locations']>
export type Characters = z.infer<typeof Content['shape']['characters']>
export type Items = z.infer<typeof Content['shape']['items']>
export type Quests = z.infer<typeof Content['shape']['quests']>

export type Content = z.infer<typeof Content>;

export const Game = z.object({
  content: Content.describe(
    "static game content"
  ),
  state: State.describe(
    "dynamic game state"
  ),
}).describe(
  'encapsulates a game that is in progress'
);

export type Game = z.infer<typeof Game>;