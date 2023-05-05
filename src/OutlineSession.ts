import { inspect } from "util";
import { DraftContent } from "game/index.js";
import { Session } from "./Session.js";
import { z } from 'zod';

const LocationName = z.string();
const CharacterName = z.string();
const ItemName = z.string();
const QuestName = z.string();

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
    overview: z.string(),
    connections: z.array(Connection),
  });
  
  const Character = z.object({
    overview: z.string(),
    starting_location: LocationName,
  });
  
  const Item = z.object({
    overview: z.string(),
    starting_location: z.union([LocationName, CharacterName]),
  });
  
  const Quest = z.object({
    overview: z.string(),
    quest_giver: CharacterName,
    items_involved: z.array(ItemName),
  });
  
  const Content = z.object({
    locations: z.record(LocationName, Location),
    characters: z.record(CharacterName, Character),
    items: z.record(ItemName, Item),
    quests: z.record(QuestName, Quest),
    style: z.string(),
  });

  type Content = z.infer<typeof Content>;


export class OutlineSession extends Session {

    public static SIZE_SMALL = `3-5 locations, 1-2 items, 1-2 characters, and 1-2 quests`;
    public static SIZE_MEDIUM = `4-8 locations, 2-3 items, 2-3 characters, and 2-3 quests`;
    public static SIZE_LARGE = `7-10 locations, 3-5 items, 3-5 characters, and 3-5 quests`;

    private static readonly OUTLINE_TEMPERATURE = 0.2;

    private OUTLINE_FORMAT_JSON = `
Use the following JSON format for the outline:

{
    "locations": {
        "<location-name>":         {
            "overview": "<location-overview>",
            "connections": [ [ "<direction>", "<location-name>"], ... ],
        },
        ...
    },
    "items": {
        "<item-name>": {
            "overview": "<item-overview>",
            "starting_location": "<location-name> OR <character-name>"
        },
        ...
    },
    "characters": {
        "<character-name>": {
            "overview": "<character-overview>",
            "starting_location": "<location-name>"
        },
        ...
    },
    "quests": {
        "<quest-name>" : {
            "overview": "<quest-overview>",
            "quest_giver": "<character-name>",
            "items_involved": ["<item-name>", ...]
        },
        ...
    ],
    "style": "<style-guide>"
}
`;

    private OUTLINE_DRAFT = (theme: string, size: string) => `
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

    private OUTLINE_PARSE_ERROR = (error:any) => `
The previous outline could not be parsed. ${error} Please correct the errors and output the complete outline again. ${this.OUTLINE_REVISION_RULES}
`;

    private OUTLINE_LOAD_ERRORS = (errors: Array<string>) => `
The outline has the following inconsistencies, please correct the errors and output the complete outline again. 

${errors.join(' ')}

${this.OUTLINE_REVISION_RULES}
`;

    public static async createOutline(theme: string, size: string) {
        const session = new OutlineSession();
        return session.createOutline(theme, size);
    }

    constructor() {
        super({ temperature: OutlineSession.OUTLINE_TEMPERATURE });
    }

    private async createOutline(theme: string, size: string) {

        this.trace = true;

        const result = await this.send(this.OUTLINE_DRAFT(theme, size));
        // let result = await this.revise(this.OUTLINE_REVISE);
        const outline = await this.loadOutline(result);

        return outline;

    }

    private validateOutline(outline: Content, errors: Array<string>) {
        Object.entries(outline.locations).forEach(([name, location]) => {
            location.connections.forEach(([direction, target]) => {
                if (!(target in outline.locations)) {
                    errors.push(
                        `location "${name}" connection "${direction}" target location "${target}" is invalid.`
                    );
                }
            });
        });
        Object.entries(outline.characters).forEach(([name, character]) => {
            if (!(character.starting_location in outline.locations)) {
                errors.push(
                    `character "${name}" initial location "${character.starting_location}" is invalid.`
                );
            }
        });
        Object.entries(outline.items).forEach(([name, item]) => {
            if (!(item.starting_location in outline.locations) && !(item.starting_location in outline.characters)) {
                errors.push(`item "${name}" initial location "${item.starting_location}" is invalid.`);
            }
        });
        Object.entries(outline.quests).forEach(([name, quest]) => {
            if (!(quest.quest_giver in outline.characters)) {
                errors.push(`quest "${name}" quest giver "${quest.quest_giver}" is invalid.`);
            }
            quest.items_involved.forEach(item_name => {
                if (!(item_name in outline.items)) {
                    errors.push(`quest "${name}" involved item "${item_name}" is invalid.`);
                }
            });
        });
    }

    private async loadOutline(result: string) {
        let loadAttempt = 2;
        while (loadAttempt--) {
            try {
                const raw = JSON.parse(result.trim());
                const outline = Content.parse(raw);
                const errors = new Array<string>();
                this.validateOutline(outline, errors);
                if (errors.length > 0) {
                    console.log("LOAD ERRORS", errors);
                    result = await this.revise(this.OUTLINE_LOAD_ERRORS(errors));
                } else {
                    return outline;
                }
            } catch (e) {
                console.log("PARSE ERROR", e);
                result = await this.revise(this.OUTLINE_PARSE_ERROR(e));
            }
        }
        throw new Error("did not load successfully");
    }
}
