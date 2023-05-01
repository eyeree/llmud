import { LocationName, CharacterName, ItemName, QuestName } from "./game-types.js";

export type Direction = 
    'north' | 'east' | 'south' | 'west' | 
    'north-east' | 'north-west' | 'south-east' | 'south-west' | 
    'up' | 'down';

export type Connection = [ Direction, LocationName ];

export type OutlineLocation = {
    name: LocationName,
    overview: string,
    connections: Array<Connection>
}

export type OutlineCharacter = {
    name: CharacterName,
    overview: string,
    initial_location: LocationName
}

export type OutlineItem = {
    name: ItemName,
    overview: string,
    initial_location: LocationName | CharacterName
}

export type OutlineQuest = {
    name: QuestName,
    overview: string,
    quest_giver: CharacterName,
    items_involved: Array<ItemName>
}

export type GameOutline = {
    locations: Record<string, OutlineLocation>,
    characters: Record<string, OutlineCharacter>,
    items: Record<string, OutlineItem>,
    quests: Record<string, OutlineQuest>,
    style: string
}
