import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

dotenv.config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const result = await openai.listModels();
const names = result.data.data.map((item:any) => item.id);
names.sort();
names.forEach((name:string) => console.log(name));
