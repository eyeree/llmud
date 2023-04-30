import { ChatCompletionRequestMessage, Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import { inspect } from "util";
import * as diff from "diff";


dotenv.config();


const TEST_THEME_1 = `
A magical fairy garden with cleverly hidden paths, mysterious statues, and magnificent plants and animals.
`;

const TEST_THEME_2 = `
Something funny that takes place on a derelict space craft, much like Red Dwarf (but not using any Red Dwarf characters). It should feature an alien invasion and some curry.
`;

async function main() {

    const outline = await OutlineSession.createOutline(TEST_THEME_2, OutlineSession.SIZE_LARGE);

    console.log("LOADED OK", inspect(outline, false, 6));
    
}

function showDiff(older:string, newer:string) {
    console.log("==== diffs ====");

    const changes = diff.diffWords(older, newer);
    changes.forEach(change => {
        if(change.removed) {
            console.log("-----", change.value);
        }
        if(change.added) {
            console.log("+++++", change.value);
        }
    });

}


class Session {
    
    static readonly DEFAULT_MODEL = 'gpt-3.5-turbo'
    static readonly DEFAULT_TEMPERATURE = 1;

    private readonly openai;
    private readonly messages = new Array<ChatCompletionRequestMessage>();
    private readonly request:CreateChatCompletionRequest = {
        model: Session.DEFAULT_MODEL,
        temperature: Session.DEFAULT_TEMPERATURE,
        messages: this.messages
    };

    public trace:boolean = false;


    constructor(options:Partial<Omit<CreateChatCompletionRequest, "messages">> = {}) {

        Object.assign(this.request, options);

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        this.openai = new OpenAIApi(configuration);
        
    }

    /**
     * Asks for revision. Expects message stack to contains:
     * 
     *   - human <- "generate prompt"
     *   - agent -> "original"
     * 
     * Will prompt as follows:
     * 
     *   - human <- "generate prompt"
     *   - agent -> "original"
     *   - human <- "revise prompt A"
     *   - agent -> "revision A"
     * 
     * And then modify the message stack to be:
     * 
     *   - human <- "generate prompt"
     *   - agent -> "revision A"
     * 
     * @param prompt 
     */
    async revise(prompt:string) {
        const result = await this.send(prompt);
        const revision = this.pop();
        this.pop(); // prompt
        const original = this.pop(); // original
        this.push(revision);
        if(this.trace) {
            showDiff(original.content, revision.content);
        }
        return result;
    }

    private push(message:ChatCompletionRequestMessage) {
        this.messages.push(message);
    }

    private pop():ChatCompletionRequestMessage {
        const result = this.messages.pop();
        if(!result) throw new Error("nothing on stack!");
        return result;
    }

    async send(prompt:string) {
        this.push({
            role: 'user',
            content: prompt
        });
        if(this.trace) {
            console.log('>>>>>', 'temperature:', this.request.temperature, '\n', this.traceMessages());
        }
        const result = await this.openai.createChatCompletion(this.request);
        if(result.data.choices.length !== 1) {
            console.log('!!!!! choices.length', result.data.choices.length);
        }
        const choice = result.data.choices[0];
        if(choice.finish_reason !== 'stop') {
            console.log('!!!!! finish_reason', choice.finish_reason);
        }
        if(choice.message) {
            this.push(choice.message);
            if(this.trace) {
                console.log('<<<<<', inspect(result.data.usage), '\n', this.traceMessage(choice.message));
            }
            return choice.message.content;
        } else {
            console.log(choice);
            throw new Error('no message');
        }
    }

    private traceMessage(message:ChatCompletionRequestMessage) { 
        return `${message.role}:\n${message.content}`
    }
    
    private traceMessages() {
        return this.messages.map(message => this.traceMessage(message)).join('\n');
    }

}

type State = Record<string, string>;

type Connection = [ string, string ];

type LocationName = string
type OutlineLocation = {
    name: LocationName,
    overview: string,
    connections: Array<Connection>
}

type Location = OutlineLocation & {
    summary: string,
    description: string,
    state: State,
    actions: Record<string, Action>
}

type CharacterName = string
type OutlineCharacter = {
    name: CharacterName,
    overview: string,
    initial_location: LocationName
}

type Character = OutlineCharacter & {
    summary: string,
    description: string,
    state: State,
    actions: Record<string, Action>
}

type ItemName = string
type OutlineItem = {
    name: ItemName,
    overview: string,
    initial_location: LocationName | CharacterName
}

type Item = OutlineItem & {
    summary: string,
    description: string,
    state: State,
    actions: Record<string, Action>
}

type QuestName = string;
type OutlineQuest = {
    name: QuestName,
    overview: string,
    quest_giver: CharacterName,
    items_involved: Array<ItemName>
}

type Quest = OutlineQuest & {
    summary: string,
    description: string,
    state: State,
    actions: Record<string, Action>
}

type Outline = {
    locations: Record<string, OutlineLocation>,
    characters: Record<string, OutlineCharacter>,
    items: Record<string, OutlineItem>,
    quests: Record<string, OutlineQuest>,
    style: string
}

type GameSpec = {
    locations: Record<string, Location>,
    characters: Record<string, Character>,
    items: Record<string, Item>,
    quests: Record<string, Quest>,
    style: string
}

type Player = {
    state: State
}

type Game = {
    spec: GameSpec,
    player: Player
}

type Action = {
    trigger: ActionTrigger,
    expression: ActionExpression
}

type ActionTrigger = StateChangeTrigger | InputTrigger;

type StateChangeTrigger = {
    type: 'STATE-CHANGE',
    tags: Array<string>
}

type InputTrigger = {
    type: 'INPUT',
    phrases: Array<string>
}

type ActionExpression = ActionSetState | ActionIfState | ActionSay | ActionDescribe;

type ActionSetState = {
    type: 'SET',
    target: 'PLAYER' | 'OWNER'
    tag: string,
    value: string
}

type ActionIfState = {
    type: 'IF',
    conditions: Array<StateCondition>,
    true: ActionExpression,
    false: ActionExpression
}

type StateCondition = {
    target: 'PLAYER' | 'OWNER',
    test: '=' | '!=' | '>' | '<' | '>=' | '<=',
    tag: string,
    value: string
}

type ActionSay = {
    source: 'PLAYER' | 'OWNER',
    content: string
}

type ActionDescribe = {
    source: 'PLAYER' | 'OWNER',
    content: string
}

class OutlineSession extends Session {

    public static SIZE_SMALL = `3-5 locations, 1-2 items, 1-2 characters, and 1-2 quests`;
    public static SIZE_MEDIUM = `4-8 locations, 2-3 items, 2-3 characters, and 2-3 quests`;
    public static SIZE_LARGE = `7-10 locations, 3-5 items, 3-5 characters, and 3-5 quests`;
    
    private static readonly OUTLINE_TEMPERATURE = 0.2;

    private OUTLINE_FORMAT_JSON = `
Use the following JSON format for the outline:

{
    "locations": [
        {
            "name": "<location-name>",
            "overview": "<location-overview>",
            "connections": [ [ "<direction>", "<location-name>"], ... ],
        },
        ...
    ],
    "items": [
        {
            "name": "<item-name>",
            "overview": "<item-overview>",
            "starting_location": "<location-name> OR <character-name>"
        },
        ...
    ],
    "characters": [
        {
            "name": "<character-name>",
            "overview": "<character-overview>",
            "starting_location": "<location-name>"
        },
        ...
    ],
    "quests": [
        {
            "name": "<quest-name>",
            "overview": "<quest-overview>",
            "quest_giver": "<character-name>",
            "items_involved": ["<item-name>", ...]
        },
        ...
    ],
    "style": "<style-guide>"
}
`;
    
    private OUTLINE_DRAFT = (theme:string, size:string) => `
You are going to create a simple text adventure game. You will fill in the details later, but start with an outline that includes a list of locations, significant items, characters, quests that you want to include in the adventure and writing style guide for the adventure content. For the outline, include only an overview of each location, character, item, and quest. You will provide the detailed descriptions players see, and instructions for implementing quests, in subsequent steps.

Be sure to describe how locations are connected together as this will allow the player to travel from location to location. Use the directions north, east, south, west, north-east, south-east, north-west, south-west, up and down to describe how locations are connected. 

Items and characters will be able to respond to player input, so it will be possible to make puzzles and quests. 

Include a detailed style guide for this particular adventure. It will be used when generating the detailed content later. The style guide can include themes, establish atmosphere, set common terminology, identify a literary style, etc., as needed to create an unique adventure with a consistent writing style. 

${this.OUTLINE_FORMAT_JSON}

Be creative and include some unexpected and unique content. A good text-based adventure game requires engaging and immersive content that is descriptive, consistent, dynamic, interactive, detailed, and includes engaging dialogue. Keep these elements in mind as you create content for the game world.

I would like the outline for a simple text adventure game with ${size} and the following theme and/or content:

${theme}
`;
    
    private OUTLINE_REVISION_RULES = `
Ensure that there are no unreachable locations and that all connections target existing locations. Ensure that connections are symmetric, e.g. if the player goes south and then north they are back where they started. Ensure that the Initial Location given for each character is a location in the revised outline. Ensure that the Initial Location given for each item is a location or character that is included in the revised outline. Output only the complete revised outline using correct JSON syntax.
`;
    
    private OUTLINE_REVISE = `
Revise the outline above. ${this.OUTLINE_REVISION_RULES}
`;
    
    private OUTLINE_JSON_PARSE_ERROR = `
The previous outline could not be parsed as JSON data. Please correct the errors and output the complete outline again. ${this.OUTLINE_REVISION_RULES}
`;
    
    private OUTLINE_LOAD_ERRORS = (errors:Array<string>) => `
The outline has the following inconsistencies, please correct the errors and output the complete outline again. 

${errors.join(' ')}

${this.OUTLINE_REVISION_RULES}
`

    public static async createOutline(theme:string, size:string) {
        const session = new OutlineSession();
        return session.createOutline(theme, size);
    }

    constructor() {
        super({temperature: OutlineSession.OUTLINE_TEMPERATURE})
    }
    
    private async createOutline(theme:string, size:string) {

        this.trace = true;

        const result = await this.send(this.OUTLINE_DRAFT(theme, size));
        // let result = await this.revise(this.OUTLINE_REVISE);
    
        const outline = await this.loadOutline(result);

        return outline;

    }

    private safeIndex(a:Record<any, any>, i:any, errors:Array<string>):any {
        if(!('name' in i)) {
            errors.push(`missing name property in ${inspect(i)}`);
            return;
        }
        if(i.name in a) {
            errors.push(`duplicate name ${i.name}`);
            return;
        }
        a[i.name] = i;
        return a;
    }

    private safeIndexArray<T>(raw:any, prop:string, errors:Array<string>):Record<string,T> {
        const value = this.safeGet(raw, prop);
        if(!Array.isArray(value)) throw new Error(`outline property "${prop}" is not an array`);
        return value.reduce((a:any, i:any) => this.safeIndex(a, i, errors), {});
    }

    private safeGet<T>(raw:any, prop:string):T {
        if(!(prop in raw)) throw new Error(`outline does not contain "${prop}" property`);
        return raw[prop];
    }

    private validateOutline(outline:Outline, errors:Array<string>) {
        Object.values(outline.locations).forEach(location => {
            location.connections.forEach(([direction, target]) => {
                if(!(target in outline.locations)) {
                    throw new Error()
                }
            })
        });
        Object.values(outline.characters).forEach(character => {
            if(!(character.initial_location in outline.locations)) {
                errors.push(`character "${character.name}" initial location "${character.initial_location}" is invalid.`)
            }
        });
        Object.values(outline.items).forEach(item => {
            if(!(item.initial_location in outline.locations) && !(item.initial_location in outline.characters)) {
                errors.push(`item "${item.name}" initial location "${item.initial_location}" is invalid.`)
            }
        });
        Object.values(outline.quests).forEach(quest => {
            if(!(quest.quest_giver in outline.characters)) {
                errors.push(`quest "${quest.name}" quest giver "${quest.quest_giver}" is invalid.`)
            }
            quest.items_involved.forEach(item_name => {
                if(!(item_name in outline.items)) {
                    errors.push(`quest "${quest.name}" involved item "${item_name}" is invalid.`)
                }
            })
        });
    }
    
    private async loadOutline(result:string) {
        let loadAttempt = 2;
        while(loadAttempt--) {
            try {
                const raw = JSON.parse(result.trim());
                const errors = new Array<string>();
                try {
                    const outline:Outline = {
                        locations: this.safeIndexArray(raw, 'locations', errors),
                        items: this.safeIndexArray(raw, 'items', errors),
                        characters: this.safeIndexArray(raw, 'characters', errors),
                        quests:this.safeIndexArray(raw, 'quests', errors),
                        style: this.safeGet(raw, 'style')
                    };
                    this.validateOutline(outline, errors);
                    if(errors.length > 0) {
                        console.log("LOAD ERRORS", errors);
                        result = await this.revise(this.OUTLINE_LOAD_ERRORS(errors));
                    } else {
                        return outline;
                    }
                } catch(e) {
                    console.log("LOAD ERROR", e, errors);
                    errors.push("some other problem");
                    result = await this.revise(this.OUTLINE_LOAD_ERRORS(errors));
                }
            } catch(e) {
                console.log("PARSE ERROR", e);
                result = await this.revise(this.OUTLINE_JSON_PARSE_ERROR);
            }
        }
        throw new Error("did not load successfully")
    }    
}

main();