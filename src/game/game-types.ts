export type LocationName = string
export type CharacterName = string
export type ItemName = string
export type QuestName = string;

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

// game location content
export type Location = {
    name: LocationName, // the location's unique name
    description: string, // full description shown when players first enter a location
    summary: string, // short description shown when players return to a location
    events: Array<Action> // events handled for the location
}

// game character content
export type Character = {
    name: CharacterName, // the character's unique name
    description: string, // full description shown when players first encounter the character
    summary: string, // short description shown when players subsequently encounter the character
    events: Array<Action> // events handled for the character
}

// game item content
export type Item = {
    name: ItemName, // the item's unique name
    description: string, // full description when when players first encounter the item
    summary: string, // short description shown when players subsequently encounter the character
    events: Array<Action> // events handled for the item
}

// game quest content
export type Quest = {
    summary: string, // a short description of the quest shown in player status
    events: Array<Action> // events handled for the item
}

// all game content
export type Content = {
    locations: Record<LocationName, Location>, // game locations indexed by name
    characters: Record<CharacterName, Character>, // game characters indexed by name
    items: Record<ItemName, Item>, // game items indexed by name
    quests: Record<QuestName, Quest>, // game quests indexed by name
    events: Array<Action>, // 
    state: State, // the game's initial state
}

// Any unique string can be used as a state property key. The following keys are used by the game engine:
//
// * PLAYER.location - Value indicates where player is currently located. Value must be the name of a location defined 
//   in the game's content. This property must be set in the Content.state used to initialize the game state.
//
// * <item>.location - <item> represents an item's name. Value indicates where an item currently is. The value must be
//   the name of a location, the name of a character, or PLAYER if the player has the item. If no location is specified
//   for an item, it currently doesn't exist in the game. To set an item's initial location, set this property in the 
//   Content.state used to initialize the game state.
//
// * <character>.location - <character> represents a character's name. Value indicates where the character currently is.
//   The value must be the name of a location. If no location is specified for a character, it currently doesn't exist
//   in the game. To set an item's initial location, set this property in the Content.state used to initialize the game
//   state.
//
// * <location>.visited - <location> represents a location's name. Value is "true" if the player has visited the 
//   location during the game. If the property is not set or has the value "false" it indicates the player has not
//   yet visited the location during the game.
//
// * <character>.visited - <character> represents a character's name. Value is "true" if the player has met the 
//   character during the game. If the property is not set or has the value "false" it indicates the player has not
//   yet visited the location during the game.
export type StateKey = string;
export type StateValue = string | number;

// contains game state
// use SetExpression to set a state value
// use Condition to change behavior based on the current state
export type State = Record<StateKey, StateValue>; 

// implement this class
export class Engine {

    constructor(
        content:Content, // defines the game to be played
        onOutput:(output:string)=>void // function called when output is generated
    ) {
        // implement
    }

    // called to provide input from the user
    public input(value:string) {
        // implement
    }

}