import { Session } from "./Session.js";
import { z, ZodError } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { LocationId, Location, State } from "model.js";
import { generateErrorMessage } from 'zod-error';

const LocationDetail = Location.pick({
    summary: true,
    detail: true,
    actions: true
}).extend({
    state: State.describe(
        "used to initialize game state when starting a new game"
    )
});

type LocationDetail = z.infer<typeof LocationDetail>;

const LOCATION_DETAIL_JSON_SCHEMA = JSON.stringify(zodToJsonSchema(LocationDetail), undefined, 2);

const DETAIL_TEMPERATURE = 1;

const CREATE_LOCATION_DETAILS = (outlineJSON:string, locationId:LocationId) => `
You are creating a simple text adventure game. You created the outline below and are now writing the content for each location in turn.

${outlineJSON}

Please produce JSON output that conforms to the following schema:

${LOCATION_DETAIL_JSON_SCHEMA}

Be creative and include some unexpected and unique content. A good text-based adventure game requires engaging and immersive content that is descriptive, consistent, dynamic, interactive, detailed, and includes engaging dialogue. Keep these elements in mind as you create content for the game world. However, remember to follow the style guide provided in the outline. Consistency of writing style throughout the game is important.

You are producing content for the "${locationId}" location now, the content for the other locations will be generated separately. Be sure to create the summary and detail content. You can also define actions to make the location interactive. For example, if the location has some flowers, you could use an input trigger "examine flowers" to produce output that describes the flowers in more detail.

You can execute actions when the player enters a location using a state property change trigger with the "player_location" state property. However, it is not necessary to add conditions on this property to each of the location's actions. The "player_location" condition is implicit and is checked automatically by the game engine, so only the actions defined for the player's current location will be enabled.

Do not generate any actions relating to items, characters, or quests at this time. Actions for those things will be generated later, and they will be able to respond to their location and the player's location.

Game state is global, so to avoid name collisions state properties that are specific to this location should be prefixed using the location id. e.g. "${locationId}_LightOn". Note that the "player_location" property is global. Note that the output can include the initial value for any game state properties used by the location.
`;

const REVISE_LOCATION_DETAILS = (error:any) => `
The previous output contains the following errors, please correct the errors and output complete location details again. Output only the JSON format data, do not include any other text.

${error}
`;

export class LocationSession extends Session {

    public static async getLocationDetails(outlineJSON:string, locationId:LocationId) {
        const session = new LocationSession();
        return session.getLocationDetails(outlineJSON, locationId);
    }

    constructor() {
        super({ temperature: DETAIL_TEMPERATURE });
    }

    private async getLocationDetails(outlineJSON:string, locationId:LocationId) {

        // this.trace = true;

        console.log(`creating details for location ${locationId}`);
        const result = await this.send(CREATE_LOCATION_DETAILS(outlineJSON, locationId))

        const details = await this.loadDetails(result);

        return details;

    }

    // private validateOutline(outline: Content, errors: Array<string>) {
    //     Object.entries(outline.locations).forEach(([name, location]) => {
    //         location.connections.forEach(([direction, target]) => {
    //             if (!(target in outline.locations)) {
    //                 errors.push(
    //                     `location "${name}" connection "${direction}" target location "${target}" is invalid.`
    //                 );
    //             }
    //         });
    //     });
    //     Object.entries(outline.characters).forEach(([name, character]) => {
    //         if (!(character.starting_location in outline.locations)) {
    //             errors.push(
    //                 `character "${name}" initial location "${character.starting_location}" is invalid.`
    //             );
    //         }
    //     });
    //     Object.entries(outline.items).forEach(([name, item]) => {
    //         if (!(item.starting_location in outline.locations) && !(item.starting_location in outline.characters)) {
    //             errors.push(`item "${name}" initial location "${item.starting_location}" is invalid.`);
    //         }
    //     });
    //     Object.entries(outline.quests).forEach(([name, quest]) => {
    //         if (!(quest.quest_giver in outline.characters)) {
    //             errors.push(`quest "${name}" quest giver "${quest.quest_giver}" is invalid.`);
    //         }
    //         quest.items_involved.forEach(item_name => {
    //             if (!(item_name in outline.items)) {
    //                 errors.push(`quest "${name}" involved item "${item_name}" is invalid.`);
    //             }
    //         });
    //     });
    // }

    private async loadDetails(result: string) {
        let loadAttempt = 3;
        while (loadAttempt--) {
            try {
                const raw = JSON.parse(result.trim());
                const details = LocationDetail.parse(raw);
                // const errors = new Array<string>();
                // this.validateOutline(outline, errors);
                // if (errors.length > 0) {
                //     console.log("LOAD ERRORS", errors);
                //     result = await this.revise(this.OUTLINE_LOAD_ERRORS(errors));
                // } else {
                //     return outline;
                // }
                return details;
            } catch (e) {
                this.log.error({err: e});
                const msg = (e instanceof ZodError) 
                    ? generateErrorMessage(e.issues)
                    : e instanceof Error ? e.toString() : e;
                if(loadAttempt > 0) {
                    console.log('requesting revision of location details')
                    result = await this.revise(REVISE_LOCATION_DETAILS(msg));
                }
            }
        }
        throw new Error("did not load successfully");
    }
}
