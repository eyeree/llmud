import { Content, State } from "./game-types.js"

// represents an active game
export class GameEngine {
    state: State;

    constructor(private readonly content:Content) {
        this.state = { ...content.state };
    }    
}
