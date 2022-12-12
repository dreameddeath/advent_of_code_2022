import * as Utils from "../utils";
import { Logger, Part, run, Type } from "../day_utils"
import { ExtendsMap } from "../mapUtils";



interface MapData {
    size: number;
    heights: number[];
}

function parse(lines: string[]): MapData {
    return {
        size: lines.length,
        heights: lines.flatMap(line => line.split("").map(char => parseInt(char)))
    }
}

type Direction = "left" | "right" | "top" | "bottom";
const allDirections: Direction[] = ["left", "bottom", "right", "top"];

type Coord = { x: number, y: number }
function getCoord(distance: number, offset: number, dir: Direction, size: number): Coord {
    switch (dir) {
        case "left":
            return {
                x: distance,
                y: offset,
            }
        case "right": return {
            x: size - distance - 1,
            y: offset,
        }
        case "top":
            return {
                x: offset,
                y: distance,
            }
        case "bottom":
            return {
                x: size - offset - 1,
                y: size - distance - 1,
            }
    }
}

function getHeight(mapData: MapData, coord: Coord): number {
    return mapData.heights[coord.x + coord.y * mapData.size];
}

function getInit(mapData: MapData): number[] {
    return [..."0".repeat(mapData.size)].map(c => -1);
}

type VisibilityMap = ExtendsMap<string, boolean>;

function calcVisibility(mapData: MapData, distance: number, dir: Direction, currMax: number[], res: VisibilityMap) {
    for (let pos = 0; pos < mapData.size; ++pos) {
        const coords = getCoord(distance, pos, dir, mapData.size);
        const height = getHeight(mapData, coords);
        if (height > currMax[pos]) {
            res.set(`${coords.x}|${coords.y}`, true);
            currMax[pos] = height;
        }
    }
}

function calcVisibilityDirection(mapData: MapData, dir: Direction, res: VisibilityMap) {
    const visibilityVector = getInit(mapData);
    for (let pos = 0; pos < mapData.size; ++pos) {
        calcVisibility(mapData, pos, dir, visibilityVector, res);
    }
}

type MoveNextFct = (coord: Coord) => Coord | undefined;
type MoveNextMap = { [key: string]: MoveNextFct };

function buildMoveNext(dir: Direction, size: number): MoveNextFct {
    switch (dir) {
        case "left": return (c) => c.x === 0 ? undefined : { x: c.x - 1, y: c.y };
        case "right": return (c) => c.x + 1 >= size ? undefined : { x: c.x + 1, y: c.y };
        case "top": return (c) => c.y === 0 ? undefined : { x: c.x, y: c.y - 1 };
        case "bottom": return (c) => c.y + 1 >= size ? undefined : { x: c.x, y: c.y + 1 };

    }
}

function buildMoveNextAll(size: number): MoveNextMap {
    return {
        "left": buildMoveNext("left", size),
        "right": buildMoveNext("right", size),
        "bottom": buildMoveNext("bottom", size),
        "top": buildMoveNext("top", size)
    }
}

function calcNbVisibleTree(map: MapData, next: MoveNextFct, coord: Coord, refHeight: number): number {
    let currCoord: Coord | undefined = coord;
    let count = 0;
    while ((currCoord = next(currCoord)) !== undefined) {
        ++count;
        if (getHeight(map, currCoord) >= refHeight) {
            break;
        }
    }
    return count;
}

function calcScenicRange(mapData: MapData, coord: Coord, fcts: MoveNextMap): number {
    const refHeight = getHeight(mapData, coord);
    return allDirections.map(dir => calcNbVisibleTree(mapData, fcts[dir], coord, refHeight)).reduce((a, b) => a * b);
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const mapVisible: VisibilityMap = new ExtendsMap<string, boolean>();
        allDirections.forEach(
            dir => calcVisibilityDirection(data, dir, mapVisible)
        )
        const result = mapVisible.size;
        logger.result(result, [21, 1690])
    }
    else {
        const result = data.heights.length;
        let max = 0;
        const fcts = buildMoveNextAll(data.size);
        for (let x = 0; x < data.size; ++x) {
            for (let y = 0; y < data.size; ++y) {
                const range = calcScenicRange(data, { x, y }, fcts);
                if (range > max) {
                    max = range;
                }
            }
        }
        logger.result(max, [8, 535680])
    }
}

run(8, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])