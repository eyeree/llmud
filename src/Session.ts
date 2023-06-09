import { log } from "log.js";
import { ChatCompletionRequestMessage, Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { inspect } from "util";
import { showDiff } from "./showDiff.js";

export class Session {

    static readonly DEFAULT_MODEL = 'gpt-4'; 
    // static readonly DEFAULT_MODEL = 'gpt-3.5-turbo';
    static readonly DEFAULT_TEMPERATURE = 1;

    private static nextSessionId = 1;

    private readonly sessionId = Session.nextSessionId++;
    protected readonly log = log.child({
        sessionId: this.sessionId,
        sessionClass: this.constructor.name
    });

    private readonly openai;
    private readonly messages = new Array<ChatCompletionRequestMessage>();
    private readonly request: CreateChatCompletionRequest = {
        model: Session.DEFAULT_MODEL,
        temperature: Session.DEFAULT_TEMPERATURE,
        messages: this.messages
    };

    public trace: boolean = false;

    constructor(options: Partial<Omit<CreateChatCompletionRequest, "messages">> = {}) {

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
    async revise(prompt: string) {
        const result = await this.send(prompt);
        const revision = this.pop();
        this.pop(); // prompt
        const original = this.pop(); // original
        this.push(revision);
        if (this.trace) {
            showDiff(original.content, revision.content);
        }
        return result;
    }

    private push(message: ChatCompletionRequestMessage) {
        this.messages.push(message);
    }

    private pop(): ChatCompletionRequestMessage {
        const result = this.messages.pop();
        if (!result)
            throw new Error("nothing on stack!");
        return result;
    }

    async send(prompt: string) {
        this.push({
            role: 'user',
            content: prompt
        });
        if (this.trace) {
            console.log('>>>>>', 'temperature:', this.request.temperature, '\n', this.traceMessages());
        }
        let attempts = 3;
        while(attempts--) {
            try {
                this.log.info({request: this.request, attempts: attempts});
                const result = await this.openai.createChatCompletion(this.request);
                this.log.info({response: result.data});
                if (result.data.choices.length !== 1) {
                    console.log('!!!!! choices.length', result.data.choices.length);
                }
                const choice = result.data.choices[0];
                if (choice.finish_reason !== 'stop') {
                    console.log('!!!!! finish_reason', choice.finish_reason);
                }
                if (choice.message) {
                    this.push(choice.message);
                    if (this.trace) {
                        console.log('<<<<<', inspect(result.data.usage), '\n', this.traceMessage(choice.message));
                    }
                    return choice.message.content;
                } else {
                    console.log(choice);
                    throw new Error('no message');
                }
            } catch(e) {
                this.log.error({err: e});
                console.error("REQUEST FAILED", e);
                if(attempts) await delay(200);
            }
        }
        this.log.error("REQUEST FAILED MULTIPLE ATTEMPTS");
        console.error("REQUEST FAILED MULTIPLE ATTEMPTS");
        process.exit(1);
    }

    private traceMessage(message: ChatCompletionRequestMessage) {
        return `${message.role}:\n${message.content}`;
    }

    private traceMessages() {
        return this.messages.map(message => this.traceMessage(message)).join('\n');
    }

}

function delay(ms:number) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}