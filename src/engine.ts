import { timeStamp } from "console";
import { 
    Action, Expression, SetExpression, BranchExpression, OutputExpression, CompoundExpression, Condition, Character, Content, Item, Quest, PlayerInputTrigger, StateChangeTrigger, Trigger, State, StateValue, StateKey, ComparisonOperators, LocationId, Locations, ItemId, CharacterId, QuestId, Location, 
} from "model.js";
import { inspect } from "util";

// class StateManager { 

//     private values;

//     constructor(state:State) {
//         this.values = new Map<StateKey, StateValue>(Object.entries(state));
//     }

//     public get(key:StateKey):StateValue {
//         return this.values.get(key);
//     }

//     public set(key:StateKey, value:StateValue) {
//         this.set(key, value);
//     }

// }

function isPlayerInputTrigger(value:Trigger): value is PlayerInputTrigger {
    return value.type === 'INPUT';
}

function isStateChangeTrigger(value:Trigger): value is StateChangeTrigger {
    return value.type === 'CHANGE';
}

export type OutputHandler = (output:string) => void;

const PLAYER_LOCATION = 'player_location';
const LOCATION_VISITED = (locationId:LocationId) => `${locationId}_visited`;
const ITEM_LOCATION = (itemId:ItemId) => `${itemId}_location`;
const CHARACTER_LOCATION = (characterId:CharacterId) => `${characterId}_location`;
const QUEST_ACTIVE = (questId:QuestId) => `${questId}_active`;

type StateChange = [StateKey, StateValue];
type StateChanges = Array<StateChange>;

export class Engine {

    private state:State;
    private actions = new Array<Action>();

    public trace = false;

    constructor(
        private readonly content:Content,
        private readonly onOutput:OutputHandler 
    ) {
        this.compile(content);
        this.reset();
    }

    private compile(content:Content) {
        this.actions.length = 0;
        this.compileLocations(content.locations);
    }

    private compileLocations(locations:Locations) {

        this.actions.push({
            trigger: { type: 'CHANGE', keys: [PLAYER_LOCATION] },
            conditions: [],
            expression: { type: 'OUTPUT', content: '=============================='}
        });

        Object.entries(locations).forEach(([locationId, location]) => {
            
            this.actions.push({
                trigger: { type: 'CHANGE', keys: [PLAYER_LOCATION] },
                conditions: [{ test: '==', key: PLAYER_LOCATION, value: locationId }],
                expression: { 
                    type: 'BRANCH',
                    conditions: [{ test: '==', key: LOCATION_VISITED(locationId), value: true }],
                    ifTrue: { type: 'OUTPUT', content: `${location.name}: ${location.summary.trim()}` },
                    ifFalse: {
                        type: 'COMPOUND',
                        expressions: [
                            { type: 'SET', key: LOCATION_VISITED(locationId), value: true },
                            { type: 'OUTPUT', content: `${location.name}: ${location.detail.trim()}` }
                        ]
                    }
                }
            });

            location.actions.forEach(action => {
                this.actions.push({ 
                    ...action,
                    conditions: [ { test: '==', key: PLAYER_LOCATION, value: locationId }, ...action.conditions ],
                });
            });

            location.connections.forEach(([direction, targetLocationId]) => {
                const targetLocation = locations[targetLocationId];
                this.actions.push({
                    trigger: { type: 'INPUT', phrase: `Go ${direction} (${targetLocation.name})` },
                    conditions: [ { test: '==', key: PLAYER_LOCATION, value: locationId } ],
                    expression: {
                        type: 'SET',
                        key: PLAYER_LOCATION,
                        value: targetLocationId
                    }
                })
            });

        });

    }

    public reset() {
        if(this.content.title && this.content.introduction) {
            this.onOutput(`${this.content.title}\n\n${this.content.introduction}\n`);
        }
        this.state = { ...this.content.state };
        this.state[PLAYER_LOCATION] = this.content.playerStartLocation;
        this.executeTriggeredActions({ type: 'CHANGE', keys: [PLAYER_LOCATION] });
        if(this.trace) console.log('INITIAL STATE', inspect(this.state))
    }

    public input(value:string) {
        this.executeTriggeredActions({ type: 'INPUT', phrase: value });
    }

    private executeTriggeredActions(trigger: Trigger): void {
        if(this.trace) console.log('STATE BEFORE', inspect(this.state));
        const actions = this.getCurrentActions();
        const stateChanges:StateChanges = new Array<[StateKey, StateValue]>();
        let iterations = 3;
        do {
            if(this.trace) console.log('TRIGGER', iterations, inspect(trigger));
            stateChanges.length = 0;
            actions.forEach((action) => {
                if(this.trace) console.log('  CHECK', inspect(action.trigger, false, 2));
                if (this.shouldExecuteAction(action, trigger)) {
                    if(this.trace) console.log('  EXECUTE', inspect(action, false, 2));
                    this.executeExpression(action.expression, stateChanges);
                }
            });
            if(stateChanges.length > 0) {
                Object.assign(this.state, Object.fromEntries(stateChanges));
                trigger = {type: 'CHANGE', keys: stateChanges.map(([key, ]) => key)};
            }
        } while(stateChanges.length > 0 && iterations-- > 0);
        if(iterations === 0) {
            throw new Error('max iterations reached')
        }
        if(this.trace) console.log('STATE AFTER', inspect(this.state));
    }

    public getCurrentInputs() {
        const actions = this.getCurrentActions();
        const inputs = actions
            .filter(action => isPlayerInputTrigger(action.trigger))
            .filter(action => this.evaluateConditions(action.conditions))
            .map(action => (action.trigger as PlayerInputTrigger).phrase);
        return inputs;
    }

    private getCurrentActions() {
        return this.actions;
        // return [
        //     ...this.content.actions,
        //     ...this.getLocationActions(),
        //     ...this.getCharacterActions(),
        //     ...this.getItemActions(),
        //     ...this.getQuestActions(),
        // ];
    }

    private shouldExecuteAction(action: Action, trigger: Trigger): boolean {
        if (action.trigger.type !== trigger.type) return false;

        if (isStateChangeTrigger(trigger)) {
            if(!(action.trigger as StateChangeTrigger).keys.some((key) => trigger.keys.includes(key))) {
                return false;
            };
        } else if (isPlayerInputTrigger(trigger)) {
            if(!((action.trigger as PlayerInputTrigger).phrase === trigger.phrase)) {
                return false;
            };
        }

        if(!this.evaluateConditions(action.conditions)) {
            return false;
        }

        return true;
    }

    private executeExpression(expression: Expression, stateChanges:StateChanges): void {
        switch (expression.type) {
            case 'SET':
                this.executeSetExpression(expression, stateChanges);
                break;
            case 'BRANCH':
                this.executeBranchExpression(expression, stateChanges);
                break;
            case 'OUTPUT':
                this.executeOutputExpression(expression);
                break;
            case 'COMPOUND':
                this.executeCompoundExpression(expression, stateChanges);
                break;
        }
    }

    private executeCompoundExpression(expression: CompoundExpression, stateChanges: StateChanges) {
        expression.expressions.forEach((expr) => this.executeExpression(expr, stateChanges));
    }

    private executeOutputExpression(expression: OutputExpression) {
        this.onOutput(expression.content);
    }

    private executeSetExpression(expression: SetExpression, stateChanges: StateChanges) {
        stateChanges.push([expression.key, this.resolveValue(expression.value)]);
    }

    private executeBranchExpression(expression: BranchExpression, stateChanges: StateChanges) {
        const conditionsMet = this.evaluateConditions(expression.conditions);
        const branchTaken = conditionsMet ? expression.ifTrue : expression.ifFalse;
        if (branchTaken) {
            this.executeExpression(branchTaken, stateChanges);
        }
    }

    private resolveValue(value:StateValue):StateValue {

        if(typeof value !== 'string') return value;
        
        const match = value.match(/{{(.*)}}/);
        if(!match) return value;

        return this.state[match[1]];

    }

    private evaluateConditions(conditions:Array<Condition>) {
        return conditions.every((condition) => this.evaluateCondition(condition))
    }

    private evaluateCondition(condition: Condition): boolean {
        const a = this.state[condition.key];
        const b = this.resolveValue(condition.value);
        if(this.trace) console.log(
            "COMPARE TYPE", 
            condition.test, condition.key, condition.value, 
            a, b, typeof a, typeof b, typeof a === typeof b
        );
        if(typeof a !== typeof b) return false;
        const result = this.compareValues(condition.test, a, b);
        if(this.trace) console.log("  COMPARE VALUE", result);
        return result;
    }

    private compareValues<T>(test:ComparisonOperators, a:T, b:T) {
        switch (test) {
            case '==':
                return a === b;
            case '!=':
                return a !== b;
            case '>':
                return a > b;
            case '<':
                return a < b;
            case '>=':
                return a >= b;
            case '<=':
                return a <= b;
            default:
                return false;
        }
    }

    private getLocationActions(): Array<Action> {
        const playerLocation = this.state[PLAYER_LOCATION] as string;
        return this.content.locations[playerLocation]?.actions ?? [];
    }

    private getCharacterActions(): Array<Action> {
        return Object.entries(this.content.characters)
            .filter(
                ([characterId, ]) => this.state[`${characterId}_location`] === this.state[PLAYER_LOCATION]
            )
            .flatMap(([, character]) => character.actions);
    }

    private getItemActions(): Array<Action> {
        return Object.entries(this.content.items)
            .filter(
                ([itemId, item]) => 
                    this.state[`${itemId}_location`] === this.state[PLAYER_LOCATION] ||
                    this.state[`${itemId}_location`] === 'player'
            )
            .flatMap(([itemId, item]) => item.actions);
    }

    private getQuestActions(): Array<Action> {
        return Object.entries(this.content.quests)
            .filter(([questId, ]) => this.state[`${questId}_active`])
            .flatMap(([, quest]) => quest.actions);
    }    

}

