import { Session } from "./Session.js";
import { 
    Location, Character, Item, Quest, Content,
    CharacterName, ItemName, LocationName, QuestName,
    Direction,
    LocationId
} from './model.js';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const InverseDirection:Record<Direction,Direction> = {
    North: "South",
    East: "West",
    South: "North",
    West: "East",
    NorthEast: "SouthWest",
    NorthWest: "SouthEast",
    SouthEast: "NorthWest",
    SouthWest: "NorthEast",
    Up: "Down",
    Down: "Up"
};

export const OutlineLocation = Location.pick({
    name: true,
    overview: true,
    connections: true,
    isStartLocation: true
}).describe(
    "outline content for a location in a game"
);

export const OutlineCharacter = Character.pick({
    name: true,
    overview: true,
    starting_location: true
}).describe(
    "outline content for a character in a game"
);

export const OutlineItem = Item.pick({
    name: true,
    overview: true,
    starting_location: true,
}).describe(
    "outline content for an item in a game"
);

export const OutlineQuest = Quest.pick({
    name: true,
    overview: true,
    quest_giver: true,
    items_involved: true
}).describe(
    "outline content for a quest in a game"
);

export const Outline = Content.pick({
    style: true,
    playerStartLocation: true
}).extend({
    locations: z.record(LocationName, OutlineLocation).describe(
        "outline content the locations in a game"
    ),
    characters: z.record(CharacterName, OutlineCharacter).describe(
        "outline content the characters in a game"
    ),
    items: z.record(ItemName, OutlineItem).describe(
        "outline content the items in a game"
    ),
    quests: z.record(QuestName, OutlineQuest).describe(
        "outline content the quests in a game"
    )
}).describe(
    "content outline for a simple text adventure game"
);

export type Outline = z.infer<typeof Outline>

const OutlineSchema = JSON.stringify(zodToJsonSchema(Outline, "Outline"), undefined, 2);

export class OutlineSession extends Session {

    public static SIZE_SMALL = `3-5 locations, 1-2 items, 1-2 characters, and 1-2 quests`;
    public static SIZE_MEDIUM = `4-8 locations, 2-3 items, 2-3 characters, and 2-3 quests`;
    public static SIZE_LARGE = `7-10 locations, 3-5 items, 3-5 characters, and 3-5 quests`;

    private static readonly OUTLINE_TEMPERATURE = 1;

    private OUTLINE_FORMAT_JSON = 
`
Use the following JSON format for the outline: 
    
${OutlineSchema}
`

    private PRODUCE_OUTLINE = (theme: string, size: string) => `
You are going to create a simple text adventure game. You will fill in the details later, but start with an outline that includes a list of locations, significant items, characters, quests that you want to include in the adventure and writing style guide for the adventure content. For the outline, include only an overview of each location, character, item, and quest. You will provide the detailed descriptions players see, and instructions for implementing quests, in subsequent steps.

Be sure to describe how locations are connected together as this will allow the player to travel from location to location. Use the directions north, east, south, west, north-east, south-east, north-west, south-west, up and down to describe how locations are connected. Also be sure to set the player's start location.

Items and characters will be able to respond to player input, so it will be possible to make puzzles and quests. 

Include a detailed style guide for this particular adventure. It will be used when generating the detailed content later. The style guide can include themes, establish atmosphere, set common terminology, identify a literary style, etc., as needed to create an unique adventure with a consistent writing style. 

Be creative and include some unexpected and unique content. A good text-based adventure game requires engaging and immersive content that is descriptive, consistent, dynamic, interactive, detailed, and includes engaging dialogue. Keep these elements in mind as you create content for the game world.

${this.OUTLINE_FORMAT_JSON}

I would like the outline for a simple text adventure game with ${size} and the following theme and/or content:

${theme}
`;

    private REVISE_OUTLINE = (error: any) => `
The previous outline contains the following errors. Please correct the errors and output the complete outline again.

${error} 

Ensure that there are no unreachable locations and that all connections target existing locations. Ensure that connections are symmetric, e.g. if the player goes south and then north they are back where they started. Ensure that the Initial Location given for each character is a location in the revised outline. Ensure that the Initial Location given for each item is a location or character that is included in the revised outline. Ensure that the player start location is set. Output only the complete revised outline using correct JSON syntax.
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

        const result = await this.send(this.PRODUCE_OUTLINE(theme, size));
        const outline = await this.loadOutline(result);

        return outline;

    }

    private validateOutline(outline: Outline, errors: Array<string>) {
        Object.entries(outline.locations).forEach(([locationId, location]) => {
            location.connections.forEach(([direction, target]) => {
                if (!(target in outline.locations)) {
                    errors.push(
                        `location "${locationId}" connection "${direction}" target location "${target}" is invalid.`
                    );
                    return;
                }
                const inverseConnections = outline.locations[target].connections.filter(
                    connection => connection[1] === locationId
                );
                if(inverseConnections.length !== 1 || inverseConnections[0][0] !== InverseDirection[direction]) {
                    errors.push(
                        `location "${locationId}" connection "${direction}" target location "${target}" does not have a symmetric connection`
                    );
                    return;
                }
            });
        });
        if(!(outline.playerStartLocation in outline.locations)) {
            errors.push(
                "the playerStartLocation property does not identify a valid location"
            )
        }
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
        let loadAttempt = 3;
        while (loadAttempt--) {
            try {
                const raw = JSON.parse(result.trim());
                const outline = Outline.parse(raw);
                const errors = new Array<string>();
                this.validateOutline(outline, errors);
                if (errors.length > 0) {
                    console.log("LOAD ERRORS", errors);
                    if(loadAttempt > 0) {
                        result = await this.revise(this.REVISE_OUTLINE(errors.join('\n')));
                    }
                } else {
                    return outline;
                }
            } catch (e) {
                console.log("PARSE ERROR", e);
                if(loadAttempt > 0) {
                    result = await this.revise(this.REVISE_OUTLINE(e));
                }
            }
        }
        throw new Error("did not load successfully");
    }
}
