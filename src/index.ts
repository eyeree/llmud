import * as dotenv from "dotenv";
import { Session } from "./Session.js";
import { inspect } from "util";
import { OutlineSession } from "./OutlineSession.js";
import { writeFileSync } from "fs";


dotenv.config();


const TEST_THEME_1 = `
A magical fairy garden with cleverly hidden paths, mysterious statues, and magnificent plants and animals.
`;

const TEST_THEME_2 = `
Something funny that takes place on a derelict space craft, much like Red Dwarf (but not using any Red Dwarf characters). It should feature an alien invasion and some curry.
`;

const TEST_THEME_3 = `
A dark and scary dungeon in an old vampire castle.
`

async function main() {

    const content = await OutlineSession.createOutline(TEST_THEME_3, OutlineSession.SIZE_LARGE);

    const contentJSON = JSON.stringify(content, undefined, 4);
    writeFileSync('./outline.json', contentJSON);

    // const content:Content = {
    //     locations: {},
    //     characters: {},
    //     items: {},
    //     quests: {},
    //     actions: [],
    //     state: {}
    // };

    for(const [name, location] of Object.entries(content.locations)) {
        const session = new Session();
        const details = await session.send(`
You are creating a simple text adventure game. You created the outline below and are now writing the content for the location "${name}".

${contentJSON}

Please produce an output in the following JSON format.

{
    "summary": "<summary-content>",
    "detail": "<detail-content>
}

<detail-content> provides the detailed description of the location that players will see when they first enter the location. Take into account the full game outline when creating this description, the location should be consistent with the other game content.

<summary-content> is a phrase or sentence that describes the location for players when they visit the location after the first time.

Be creative and include some unexpected and unique content. A good text-based adventure game requires engaging and immersive content that is descriptive, consistent, dynamic, interactive, detailed, and includes engaging dialogue. Keep these elements in mind as you create content for the game world. However, remember to follow the style guide provided in the outline. Consistency of writing style throughout the game is important.

You are producing content for the "${name}" location now, the content for the other locations will be generated separately.
        `);
        writeFileSync(`location ${name}.json`, details);
        console.log('DETAILS', details);

    };

    console.log("LOADED OK", inspect(content, false, 6));
    
}

main();