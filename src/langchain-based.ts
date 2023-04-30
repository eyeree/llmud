import * as dotenv from "dotenv";
import { 
  ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, PromptTemplate, SystemMessagePromptTemplate 
} from "langchain/prompts";
import { ChatOpenAI } from "langchain/chat_models";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { LLMChain } from "langchain";
import { ConversationChain, SequentialChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";


dotenv.config();

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

const OUTLINE_FORMAT = `
Use the following format for the outline:

LOCATION: <name>
* Description: <description of location>
* Connections: [<direction>](<location-name>)

ITEM: <name>
* Description: <description of item>
* Initial Location: <location-name> OR <character-name>

CHARACTER: <name>
* Description: <description of character>
* Initial Location: <location-name>

QUEST: <name>
* Description: <description of quest>
* Quest Giver: <name-of-character>

STYLE: <style-guide>
`

const OUTLINE_PRODUCE = `
You are going to create a simple text adventure game. You will fill in the details later, but start with an outline that includes a list of locations, significant items, characters, quests that you want to include in the adventure and writing style guide for the adventure content.

Be sure Describe how locations are connected together as this will allow the player to travel from location to location. Use the directions north, east, south, west, north-east, south-east, north-west, south-west, up and down to describe how locations are connected. 

Items and characters will be able to respond to player input, so it will be possible to make puzzles and quests. 

Be creative and include some unexpected and unique content. Also include a short style guide for this particular adventure that will be used when generating the detailed content later.

${OUTLINE_FORMAT}

${STYLE}

I would like the outline for a simple text adventure game with {size} and the following theme and/or content:

{theme}
`

const SIZE_SMALL = ` 3-5 locations, 1-2 items, 1-2 characters, and 1-2 quests`;
const SIZE_MEDIUM = `4-8 locations, 2-3 items, 2-3 characters, and 2-3 quests`;
const SIZE_LARGE = `7-10 locations, 3-5 items, 3-5 characters, and 3-5 quests`;

const TEST_THEME_1 = `
A magical fairy garden with cleverly hidden paths, mysterious statues, and magnificent plants and animals.
`

const OUTLINE_TEMP = 1;

const outlineChat = new ChatOpenAI({ 
  modelName: "gpt-3.5-turbo",
  temperature: OUTLINE_TEMP,
  openAIApiKey: process.env.OPENAI_API_KEY,
  streaming: true,
  callbacks: [
    {
      handleLLMNewToken(token: string) {
        process.stdout.write(token);
      },
      handleLLMStart(llm, prompts, runId, parentRunId) {
        console.log("===== LLM START =====");
        prompts.forEach(prompt => console.log(prompt));
        console.log(">>>>>");
      },
      handleLLMError(err, runId, parentRunId) {
        console.log("!!!!! ERROR", err);
      },
      handleLLMEnd(output, runId, parentRunId) {
        console.log("\n===== LLM END =====");
        // console.log(output);
      },
    },
  ],
}, {});

const outlineDraftPrompt = ChatPromptTemplate.fromPromptMessages([
  // SystemMessagePromptTemplate.fromTemplate(
  //   "You are a helpful assistant that translates {input_language} to {output_language}."
  // ),
  HumanMessagePromptTemplate.fromTemplate(OUTLINE_PRODUCE),
]);

const outlineDraftChain = new LLMChain({
  prompt: outlineDraftPrompt,
  llm: outlineChat,
  outputKey: 'outline_draft'
});

const outlineRevisionPrompt = ChatPromptTemplate.fromPromptMessages([
  // SystemMessagePromptTemplate.fromTemplate(
  //   "You are a helpful assistant that translates {input_language} to {output_language}."
  // ),
  HumanMessagePromptTemplate.fromTemplate(OUTLINE_PRODUCE),
]);

const outlineRevisionChain = new LLMChain({
  prompt: outlineRevisionPrompt,
  llm: outlineChat,
  outputKey: 'outline_revision'
});

const outlineChain = new SequentialChain({
  chains: [outlineDraftChain, outlineRevisionChain],
  inputVariables: ["size", "theme"],
  // Here we return multiple variables
  outputVariables: ["outline_draft", "outline_revision"],
  verbose: true,
})

const response = outlineDraftChain.call({
  size: SIZE_LARGE, 
  theme: TEST_THEME_1
});

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);



console.log(response);

// const prompt = await promptOutlineProduce.formatPromptValue({
//   size: SIZE_SMALL, theme: TEST_THEME_1
// });



// const response = await outlineChat.generatePrompt(
//   [prompt]
// );

// console.log(">>>>>>", response.llmOutput);

// const promptOutlineProduce = PromptTemplate.fromTemplate(OUTLINE_PRODUCE);

// const model = new OpenAI({
//   modelName: "gpt-3.5-turbo",
//   openAIApiKey: process.env.OPENAI_API_KEY,
//   streaming: true,
//   callbacks: [
//     {
//       handleLLMStart(llm, prompts, runId, parentRunId) {
//         console.log("===== LLM START =====");
//         prompts.forEach(prompt => console.log(prompt));
//         console.log(">>>>>");
//       },
//       handleLLMError(err, runId, parentRunId) {
//         console.log("!!!!! ERROR", err);
//       },
//       handleLLMEnd(output, runId, parentRunId) {
//         console.log("===== LLM END =====");
//         console.log(output);
//       },
//       handleLLMNewToken(token: string) {
//         process.stdout.write(token);
//       },
//     },
//   ],
// });

// const res = await model.call(
//   await promptOutlineProduce.format({ size: SIZE_SMALL, theme: TEST_THEME_1 })
// );

// console.log("RES");
// console.log(res);
