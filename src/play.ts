import { chooseInput, wrapOutput } from "console.js";
import { Engine } from "engine.js";
import { existsSync, readFileSync } from "fs";
import { Content } from "model.js";
import { join } from "path";

export async function run(content:Content) {
    const outputHandler = (output:string) => {
        wrapOutput('\n' + output.trim());
    }

    const engine = new Engine(content, outputHandler);
    // engine.trace = true;

    while(true) {
        const choices = engine.getCurrentInputs();
        const input = await chooseInput('Action?', 'Quit Game', 'Reset Game', ...choices);
        if(input === 'Quit Game') {
            process.exit(0);
        } else if(input === 'Reset Game') {
            engine.reset();
        } else {
            engine.input(input);
        }
    }
}

async function main() {

    const path = process.argv[2];
    if(!path) throw new Error(`path not provided on command line`)
    const contentPath = join(path, 'content.json');
    if(!existsSync(contentPath)) throw new Error(`path "${contentPath}" does not exist`);

    const contentString = readFileSync(contentPath).toString();
    const content = JSON.parse(contentString) as Content;

    run(content);

}

main()