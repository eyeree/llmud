import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
// @ts-ignore
import { default as smartwrap } from 'smartwrap';

function getConsoleWidth() {
    return stdout.columns > 100 ? 100 : stdout.columns;
}

function wrapAtConsoleWidth(value:string) {
    return smartwrap(value, {width: getConsoleWidth()});
}

export async function chooseInput(prompt:string, ...options:Array<string>) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {

        let index = Number.NaN;
        do {

            const prefixed = options.map((option, index) => `[${index+1}] ${option.trim()}`);
            const line = prefixed.join('  ');
            const formatted = line.length < getConsoleWidth() 
                ? line 
                : wrapAtConsoleWidth(prefixed.join('\n\n'));

            const answer = await rl.question(`\n${formatted}\n\n${prompt} `);

            index = Number.parseInt(answer);

        } while(index === Number.NaN || index < 1 || index > options.length);

        const input = options[index-1];
        return input;

    } finally {
        rl.close();
    }
}

export async function getInput(prompt:string) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
        const answer = await rl.question(`\n${prompt} `);
        return answer;
    } finally {
        rl.close();
    }
}

export async function wrapOutput(...outputs:Array<string>) {
    console.log(wrapAtConsoleWidth(outputs.join('\n')));
}