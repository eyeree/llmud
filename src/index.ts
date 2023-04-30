import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import { inspect } from "util";
import * as diff from "diff";

const MODEL = 'gpt-3.5-turbo'

const STYLE = `
A good text-based adventure game requires engaging and immersive content that is descriptive, consistent, dynamic, interactive, detailed, and includes engaging dialogue. Keep these elements in mind as you create content for the game world. Here are some key elements to keep in mind:

- Descriptive language: The use of descriptive language is essential to creating immersive content. The writer should strive to paint a vivid picture of the environment, characters, and objects within the game world.

- Consistent tone and style: To maintain immersion, it is important for the writer to establish a consistent tone and style throughout the game. This means that the writing should match the mood and setting of the game, whether it be dark and foreboding or lighthearted and whimsical.

- Dynamic storytelling: A great text game requires engaging and dynamic storytelling. This means that the writer should be able to weave compelling narratives and create interesting characters that players can interact with.

- Interactive content: The writer should be mindful of creating interactive content that allows players to engage with the game world in meaningful ways. This can include puzzles, challenges, and quests that require players to use their problem-solving skills and creativity.

- Attention to detail: A good text game requires attention to detail, both in terms of the writing and the game mechanics. The writer should be meticulous in their descriptions and ensure that the game world is consistent and believable.

- Engaging dialogue: Dialogue is a key element of a good text-based adventure game. The writer should be able to create interesting and believable dialogue that allows players to interact with NPCs and other characters within the game world.
`

const OUTLINE_PREFIXES = `
Use the prefixes LOCATION: <name>, ITEM: <name>, CHARACTER: <name>, or STYLE: as appropriate when generating the outline, where <name> represents an unique name for the location, item, or character.
`

const OUTLINE_FORMAT_TEXT = `
Use the following format for the outline:

LOCATION: <name>
* Description: <description of location>
* Connections: [<direction>](<location-name>), ...

ITEM: <name>
* Description: <description of item>
* Initial Location: <location-name> OR <character-name>

CHARACTER: <name>
* Description: <description of character>
* Initial Location: <location-name>

QUEST: <name>
* Description: <description of quest>
* Quest Giver: <name-of-character>
* Items Involved: <item-name>, ...

STYLE: <style-guide>
`

const OUTLINE_FORMAT_JSON = `
Use the following JSON format for the outline:

{
    "locations": [
        {
            "name": "<location-name>",
            "description": "<location-description>",
            "connections": [ [ "<direction>", "<location-name>"], ... ],
        },
        ...
    ],
    "items": [
        {
            "name": "<item-name>",
            "description": "<item-description>",
            "starting_location": "<location-name> OR <character-name>"
        },
        ...
    ],
    "characters": [
        {
            "name": "<character-name>",
            "description": "<character-description>",
            "starting_location": "<location-name>"
        },
        ...
    ],
    "quests": [
        {
            "name": "<quest-name>",
            "description": "<quest-description>",
            "quest_giver": "<character-name>",
            "items_involved": ["<item-name>", ...]
        },
        ...
    ],
    "style": "<style-guide>"
}
`

const OUTLINE_DRAFT = (theme:string, size:string) => `
You are going to create a simple text adventure game. You will fill in the details later, but start with an outline that includes a list of locations, significant items, characters, quests that you want to include in the adventure and writing style guide for the adventure content.

Be sure Describe how locations are connected together as this will allow the player to travel from location to location. Use the directions north, east, south, west, north-east, south-east, north-west, south-west, up and down to describe how locations are connected. 

Items and characters will be able to respond to player input, so it will be possible to make puzzles and quests. 

Be creative and include some unexpected and unique content. Include a detailed style guide for this particular adventure that will be used when generating the detailed content later. The style guide can include themes, establish atmosphere, set common terminology, identify a literary style, etc., as needed to create an unique adventure with a consistent writing style.

${OUTLINE_FORMAT_JSON}

${STYLE}

I would like the outline for a simple text adventure game with ${size} and the following theme and/or content:

${theme}
`;

const SIZE_SMALL = `3-5 locations, 1-2 items, 1-2 characters, and 1-2 quests`;
const SIZE_MEDIUM = `4-8 locations, 2-3 items, 2-3 characters, and 2-3 quests`;
const SIZE_LARGE = `7-10 locations, 3-5 items, 3-5 characters, and 3-5 quests`;

const TEST_THEME_1 = `
A magical fairy garden with cleverly hidden paths, mysterious statues, and magnificent plants and animals.
`;

const TEST_THEME_2 = `
A funny adventure that takes place on a derelict space craft, much like Red Dwarf (not not using any Red Dwarf characters). It should involve aliens and a small moon made of curry.
`;

const OUTLINE_REVISE = `
Revise the outline above to ensure that there are no unreachable locations and that all connections target existing locations. Ensure that connections are symmetric, e.g. if the player goes south and then north they are back where they started. Ensure that the Initial Location given for each character is a location in the revised outline. Ensure that the Initial Location given for each item is a location or character that is included in the revised outline. Output the complete revised outline (include all the locations, characters, items, quests, and the style guide).
`

const OUTLINE_JSON_PARSE_ERROR = `
The previous outline could not be parsed as JSON data. Please correct the errors and output the complete outline again. Just output the corrected outline and no other text.
`;

const OUTLINE_LOAD_ERRORS = (errors:Array<string>) => `
The outline has the following inconsistencies, please correct the errors and output the complete outline again. 

${errors.join(' ')}

Just output the corrected outline and no other text.
`

const OUTLINE_TEMP = 1;

dotenv.config();

const traceMessage = (message:ChatCompletionRequestMessage) => `${message.role}:\n${message.content}`;
const traceMessages = (messages:Array<ChatCompletionRequestMessage>) => messages.map(traceMessage).join('\n');

class Session {

    private readonly openai;
    private readonly messages = new Array<ChatCompletionRequestMessage>();
    public trace:boolean = false;

    constructor() {

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        this.openai = new OpenAIApi(configuration);
        
    }

    async send(content:string) {
        this.messages.push({
            role: 'user',
            content: content
        });
        if(this.trace) {
            console.log('>>>>>', '\n', traceMessages(this.messages));
        }
        const result = await this.openai.createChatCompletion({
            model: MODEL,
            temperature: OUTLINE_TEMP,
            messages: this.messages
        });
        if(result.data.choices.length !== 1) {
            console.log('!!!!! choices.length', result.data.choices.length);
        }
        const choice = result.data.choices[0];
        if(choice.finish_reason !== 'stop') {
            console.log('!!!!! finish_reason', choice.finish_reason);
        }
        if(choice.message) {
            this.messages.push(choice.message);
            if(this.trace) {
                console.log('<<<<<', inspect(result.data.usage), '\n', traceMessage(choice.message));
            }
            return choice.message.content;
        } else {
            console.log(choice);
            throw new Error('no message');
        }
    }

}

const session = new Session();
session.trace = true;

const draft = await session.send(OUTLINE_DRAFT(TEST_THEME_2, SIZE_MEDIUM));
let result = await session.send(OUTLINE_REVISE);

// console.log("==== diffs ====");

// const changes = diff.diffWords(draft, result);
// changes.forEach(change => {
//     if(change.removed) {
//         console.log("<<<<", change.value);
//     }
//     if(change.added) {
//         console.log(">>>>", change.value);
//     }
// });

const safeIndex = (a:Record<any, any>, i:any, errors:Array<string>):any => {
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

const loadOutline = async (result:string) => {
    let loadAttempt = 2;
    while(loadAttempt--) {
        try {
            const outline = JSON.parse(result.trim());
            const errors = new Array<string>();
            try {
                const locations = outline.locations.reduce((a:any, i:any) => safeIndex(a, i, errors), {});
                const items = outline.items.reduce((a:any, i:any) => safeIndex(a, i, errors), {});
                const characters = outline.characters.reduce((a:any, i:any) => safeIndex(a, i, errors), {});
                const quests = outline.quests.reduce((a:any, i:any) => safeIndex(a, i, errors), {});
                const style = outline.style;
                if(errors.length > 0) {
                    console.log("LOAD ERRORS", errors);
                    result = await session.send(OUTLINE_LOAD_ERRORS(errors));
                } else {
                    return {locations, items, characters, quests, style};
                }
            } catch(e) {
                console.log("LOAD ERROR", e, errors);
                errors.push("some other problem");
                result = await session.send(OUTLINE_LOAD_ERRORS(errors));
            }
        } catch(e) {
            console.log("PARSE ERROR", e);
            result = await session.send(OUTLINE_JSON_PARSE_ERROR);
        }
    }
    throw new Error("did not load successfully")
}

const outline = await loadOutline(result);

console.log("LOADED OK", inspect(outline, false, 6));