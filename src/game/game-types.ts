export type LocationName = string
export type CharacterName = string
export type ItemName = string
export type QuestName = string;

// Any unique string can be used as a state property key. The documentation below
// describes some engine defined properties.
export type StateKey = string;

// state property value types
export type StateValue = string | number;

// contains game state
// use SetExpression to set a state value
// use Condition to change behavior based on the current state
export type State = Record<StateKey, StateValue>; 

// represents an action that is performed by the game
export type Action = {
    trigger: Trigger, // indicates how the action is triggered
    conditions: Array<Condition>, // action is enabled only when all conditions are true
    expression: Expression // expression that is evaluated to handle the action
}

// all action triggers
export type Trigger = StateChangeTrigger | PlayerInputTrigger;

// indicates action is triggered when game state is changed
export type StateChangeTrigger = {
    type: 'CHANGE', // type of trigger
    keys: Array<StateKey>, // state keys that are monitored for changes
}

// indicates action is triggered when player input is received
export type PlayerInputTrigger = {
    type: 'INPUT', // type of trigger
    phrases: Array<string> // input words or phrases that trigger the action
}

// expression that is executed when an action is triggered
export type Expression = SetExpression | BranchExpression | OutputExpression | CompoundExpression;

// expression that sets a state property to a specified value
export type SetExpression = {
    type: 'SET', // expression type
    key: StateKey, // key of property to set
    value: StateValue // value assigned to property
}

// expression used to branch execution
export type BranchExpression = {
    type: 'BRANCH', // expression type
    conditions: Array<Condition>, // conditions evaluated to determine branch taken
    ifTrue: Expression, // expression evaluated if all conditions are true
    ifFalse: Expression // expression evaluated if any condition is false
}

// represents a comparison against a state value
export type Condition = {
    test: '=' | '!=' | '>' | '<' | '>=' | '<=', // operation performed
    key: StateKey, // state key that identifies value to which operand is compared
    operand: StateValue // value compared to the state value identified by key
}

// expression used to output a value to the player
export type OutputExpression = {
    type: 'OUTPUT', // expression type
    content: string // string that is output
}

// expression that contains a sequence of sub-expressions
export type CompoundExpression = {
    type: 'COMPOUND', // expression type
    expressions: Array<Expression> // sequence of expressions to execute
}

export type Direction = 
    'north' | 'east' | 'south' | 'west' | 
    'north-east' | 'north-west' | 'south-east' | 'south-west' | 
    'up' | 'down';

export type Connection = [ Direction, LocationName ];

// game location content
//
// Player's current location is indicated by the PLAYER.location state property. The value of this property
// must be the name of a location defined in the game's content. This property must be set in the Content.state
// used to initialize the game state.
//
// The <location>.visited state property is set to "true" when a player visits the location during a game. Otherwise
// the property value will be undefined.
//
export type Location = {
    name: LocationName, // the location's unique name
    overview: string,
    connections: Array<Connection>,
    description: string, // full description shown when players first enter a location
    summary: string, // short description shown when players return to a location
    actions: Array<Action> // actions enabled when player is at location
}

// game character content
//
// The <character>.location state property indicates the current location of a character. The value must be the name of
// a location. If no location is specified for a character, it currently doesn't exist in the game. To set a
// character's initial location, set this property in the Content.state used to initialize the game state.
//
// The <character>.visited state property is set to "true" when the player first meets a character during the game.
// Otherwise the property value will be undefined.
//
export type Character = {
    name: CharacterName, // the character's unique name
    overview: string,
    starting_location: LocationName
    description: string, // full description shown when players first encounter the character
    summary: string, // short description shown when players subsequently encounter the character
    actions: Array<Action> // actions enabled when player is at same location as character
}

// game item content
//
// The <item>.location state property indicates the current location of an item. The value must be the name of a
// location, the name of a character, or PLAYER if the player has the item. If no location is specified for an item,
// it currently doesn't exist in the game. To set an item's initial location, set this property in the Content.state
// used to initialize the game state.
//
export type Item = {
    name: ItemName, // the item's unique name
    overview: string,
    starting_location: LocationName | CharacterName
    description: string, // full description shown when players first encounter the item
    summary: string, // short description shown when players subsequently encounter the character
    actions: Array<Action> // actions enabled when player is at same location as item or item's location is PLAYER
}

// game quest content
//
// The <quite>.active state property should be set to "true" when a quest is active. Otherwise, the property value
// will be undefined or "false". This property can be set in the Content.state property to start the game with the
// quest active.
export type Quest = {
    description: string, // full description shown when the quest becomes active
    overview: string,
    quest_giver: CharacterName,
    items_involved: Array<ItemName>
    summary: string, // short description shown after the quest becomes active
    actions: Array<Action> // actions enabled when the quest is active
}

// all of a game's content
export type Content = {
    locations: Record<LocationName, Location>, // game locations indexed by name
    characters: Record<CharacterName, Character>, // game characters indexed by name
    items: Record<ItemName, Item>, // game items indexed by name
    quests: Record<QuestName, Quest>, // game quests indexed by name
    actions: Array<Action>, // global actions that are alway enabled
    state: State, // the game's initial state,
    style: string
}

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type DraftContent = DeepPartial<Content>;