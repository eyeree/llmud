import * as dotenv from "dotenv";
import { inspect } from "util";
import { OutlineSession, Outline } from "./OutlineSession.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { LocationSession } from "LocationSession.js";
import { chooseInput, getInput } from "console.js";
import { State } from "model.js";
import { log } from "log.js";


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

const TEST_THEME_4 = `
something set on the moon
`

async function createNewOutline() {
    
    let theme = await chooseInput(
        "Theme?", 
        TEST_THEME_1, TEST_THEME_2, TEST_THEME_3, TEST_THEME_4, "(other)"
    );
    if(theme === '(other)') {
        theme = await getInput(':');
    }
    
    let size = await chooseInput(
        "Size?", 
        OutlineSession.SIZE_SMALL, OutlineSession.SIZE_MEDIUM, OutlineSession.SIZE_LARGE
    );

    const outline = await OutlineSession.createOutline(theme, size);

    let path = getPathForTitle(outline.title);
    log.info({path}, "creating path");
    console.log("creating output path:", path);
    mkdirSync(path);

    const outlineJSON = JSON.stringify(outline, undefined, 4);
    writeFileSync(path + '/outline.json', outlineJSON);
    return [ outlineJSON, outline, path ] as const;

}

function getPathForTitle(title:string) {
    let path = './output/' + title.replace(/[/\\?%*:|"<>]/g, '-');
    if (existsSync(path)) {
        let n = 1;
        while (existsSync(path + `-${n}`)) {
            n += 1;
        }
        path = path + `-${n}`;
    }
    return path;
}

function loadExistingOutline(path: string) {
    log.info({path}, "using path");
    console.log("using output path:", path);
    const outlineJSON = readFileSync(path + '/outline.json').toString();
    const outline = JSON.parse(outlineJSON) as Outline;
    return [ outlineJSON, outline, path ] as const;
}

async function main() {

    const [ outlineJSON, outline, path ] = process.argv[2] 
        ? loadExistingOutline(process.argv[2]) 
        : await createNewOutline();

    const initialState:State = {};

    for(const [locationId, location] of Object.entries(outline.locations)) {
        const {state, ...details} = await LocationSession.getLocationDetails(outlineJSON, locationId);
        Object.assign(initialState, state);
        Object.assign(location,  details);
        writeFileSync(path + `/location ${locationId}.json`, JSON.stringify(details, undefined, 2));
        // console.log('LOCATION DETAILS', locationId, inspect(details, false, 10));
    };

    const content = {...outline, state: initialState};

    writeFileSync(path + '/content.json', JSON.stringify(content, undefined, 2));
    
}

main();

