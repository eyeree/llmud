import { Content, State } from "./game-types.js"

// represents an active game
export class GameEngine {
    state: State = {};

    constructor(private readonly content:Content) {
        this.reset();
    }

    public reset() {
        this.state = { ...this.content.state };
        this.onEnter();
    }

    private onEnter()
}

// player's current location status
export type LocationStatus = {
    location:Location, // the player's current location
    seen:boolean, // true if the player has seen this location before
    outputs:Array<string>, // outputs produced by running the location's actions
    inputs:Array<string> // input action trigger phrases defined by the location
}

// item's current status
export type ItemStatus = {
    item:Item, // item at the player's current location or carried by the player
    seen:boolean, // true if the player has seen this item before
    outputs:Array<string>, // outputs produced by running the item's actions
    inputs:Array<string> // input action trigger phrases defined by the item
}

export type CharacterStatus = {
    character:Character,
    seen:boolean,
    outputs:Array<string>,
    inputs:Array<string>
}

export type QuestStatus = {
    quest:Quest,
    outputs:Array<string>,
    inputs:Array<string>
}

export type GameStatus = {
    outputs:Array<string>,
    inputs:Array<string>
}

export type Status = {
    game: GameStatus,
    location: LocationStatus,
    characters: Array<CharacterStatus>,
    items: Array<ItemStatus>
    quests: Array<QuestStatus>
}

// implement this class
export class Engine {
    private state: State;

    constructor(
        private readonly content:Content // defines the game to be played
    ) {
        this.reset();
    }

    public reset() {
        this.state = { ...this.content.state };
        this.executeTriggeredActions({ type: 'CHANGE', keys: ['PLAYER.location'] });
    }

    public input(value:string) {
        // implement
    }

    public getStatus():Status {
        // implement
    } 

    private executeTriggeredActions(trigger: Trigger): void {
        const actions = [
            ...this.content.actions,
            ...this.getLocationActions(),
            ...this.getCharacterActions(),
            ...this.getItemActions(),
            ...this.getQuestActions(),
        ];

        actions.forEach((action) => {
            if (this.shouldExecuteAction(action, trigger)) {
                this.executeExpression(action.expression);
            }
        });
    }

    private shouldExecuteAction(action: Action, trigger: Trigger): boolean {
        if (action.trigger.type !== trigger.type) return false;

        if (trigger.type === 'CHANGE') {
            return (action.trigger as StateChangeTrigger).keys.some((key) => trigger.keys.includes(key));
        } else if (trigger.type === 'INPUT') {
            return (action.trigger as PlayerInputTrigger).phrases.some((phrase) =>
                trigger.phrases.includes(phrase),
            );
        }

        return false;
    }

    private executeExpression(expression: Expression): void {
        switch (expression.type) {
            case 'SET':
                this.state[(expression as SetExpression).key] = (expression as SetExpression).value;
                this.executeTriggeredActions({ type: 'CHANGE', keys: [(expression as SetExpression).key] });
                break;
            case 'BRANCH':
                const branchExpr = expression as BranchExpression;
                const conditionsMet = branchExpr.conditions.every((condition) =>
                    this.evaluateCondition(condition),
                );
                this.executeExpression(conditionsMet ? branchExpr.ifTrue : branchExpr.ifFalse);
                break;
            case 'OUTPUT':
                this.onOutput((expression as OutputExpression).content);
                break;
            case 'COMPOUND':
                (expression as CompoundExpression).expressions.forEach((expr) => this.executeExpression(expr));
                break;
        }
    }

    private evaluateCondition(condition: Condition): boolean {
        const stateValue = this.state[condition.key];
        const operand = condition.operand;

        switch (condition.test) {
            case '=':
                return stateValue === operand;
            case '!=':
                return stateValue !== operand;
            case '>':
                return stateValue > operand;
            case '<':
                return stateValue < operand;
            case '>=':
                return stateValue >= operand;
            case '<=':
                return stateValue <= operand;
            default:
                return false;
        }
    }

    private getLocationActions(): Array<Action> {
        const playerLocation = this.state['PLAYER.location'];
        return this.content.locations[playerLocation]?.actions ?? [];
    }

    private getCharacterActions(): Array<Action> {
        return Object.values(this.content.characters)
            .filter((character) => character.location === this.state['PLAYER.location'])
            .flatMap((character) => character.events);
    }

    private getItemActions(): Array<Action> {
        return Object.values(this.content.items)
            .filter((item) => item.location === this.state['PLAYER.location'])
            .flatMap((item) => item.events);
    }

}

export class Engine2 {
    private state: State;

    constructor(
        private readonly content: Content, 
        private readonly onOutput: (output: string) => void
    ) {
        this.content = content;
        this.onOutput = onOutput;
        this.reset();
    }

    public reset() {
        this.state = { ...this.content.state };
        this.executeTriggeredActions({ type: 'CHANGE', keys: ['PLAYER.location'] });
    }

    public input(value: string): void {
        this.executeTriggeredActions({ type: 'INPUT', phrases: [value.toLocaleLowerCase()] });
    }

    private executeTriggeredActions(trigger: Trigger): void {
        const actions = [
            ...this.content.actions,
            ...this.getLocationActions(),
            ...this.getCharacterActions(),
            ...this.getItemActions(),
            ...this.getQuestActions(),
        ];

        actions.forEach((action) => {
            if (this.shouldExecuteAction(action, trigger)) {
                this.executeExpression(action.expression);
            }
        });
    }

    private shouldExecuteAction(action: Action, trigger: Trigger): boolean {
        if (action.trigger.type !== trigger.type) return false;

        if (trigger.type === 'CHANGE') {
            return (action.trigger as StateChangeTrigger).keys.some((key) => trigger.keys.includes(key));
        } else if (trigger.type === 'INPUT') {
            return (action.trigger as PlayerInputTrigger).phrases.some((phrase) =>
                trigger.phrases.includes(phrase),
            );
        }

        return false;
    }

    private executeExpression(expression: Expression): void {
        switch (expression.type) {
            case 'SET':
                this.state[(expression as SetExpression).key] = (expression as SetExpression).value;
                this.executeTriggeredActions({ type: 'CHANGE', keys: [(expression as SetExpression).key] });
                break;
            case 'BRANCH':
                const branchExpr = expression as BranchExpression;
                const conditionsMet = branchExpr.conditions.every((condition) =>
                    this.evaluateCondition(condition),
                );
                this.executeExpression(conditionsMet ? branchExpr.ifTrue : branchExpr.ifFalse);
                break;
            case 'OUTPUT':
                this.onOutput((expression as OutputExpression).content);
                break;
            case 'COMPOUND':
                (expression as CompoundExpression).expressions.forEach((expr) => this.executeExpression(expr));
                break;
        }
    }

    private evaluateCondition(condition: Condition): boolean {
        const stateValue = this.state[condition.key];
        const operand = condition.operand;

        switch (condition.test) {
            case '=':
                return stateValue === operand;
            case '!=':
                return stateValue !== operand;
            case '>':
                return stateValue > operand;
            case '<':
                return stateValue < operand;
            case '>=':
                return stateValue >= operand;
            case '<=':
                return stateValue <= operand;
            default:
                return false;
        }
    }

    private getLocationActions(): Array<Action> {
        const playerLocation = this.state['PLAYER.location'];
        return this.content.locations[playerLocation]?.actions ?? [];
    }

    private getCharacterActions(): Array<Action> {
        return Object.values(this.content.characters)
            .filter((character) => character.location === this.state['PLAYER.location'])
            .flatMap((character) => character.events);
    }

    private getItemActions(): Array<Action> {
        return Object.values(this.content.items)
            .filter((item) => item.location === this.state['PLAYER.location'])
            .flatMap((item) => item.events);
    }

    private getQuestActions(): Array<Action> {
        return Object.values(this.content.quests).flatMap((quest)
