import * as Utils from "./utils";
import { Logger, Part, run, Type } from "./day_utils"
import { PriorityQueue } from "./priority_queue";

interface Coord {
    x: number,
    y: number,
}

interface Map {
    start: Coord,
    end: Coord,
    heights: string;
    width: number,
    height: number,
}

type Direction = "D" | "U" | "L" | "R";
const allDirections: Direction[] = ["D", "U", "L", "R"];

function applyDirectionCoor(coord: Coord, dir: Direction): Coord {
    switch (dir) {
        case "D": return { x: coord.x, y: coord.y - 1 };
        case "U": return { x: coord.x, y: coord.y + 1 };
        case "L": return { x: coord.x - 1, y: coord.y };
        case "R": return { x: coord.x + 1, y: coord.y };
    }
}

function parse(lines: string[]): Map {
    const map = lines.join("")
    const start = map.indexOf("S");
    const end = map.indexOf("E");
    const width = lines[0].length;
    const height = lines.length;

    return {
        start: { x: start % width, y: Math.floor(start / width) },
        end: { x: end % width, y: Math.floor(end / width) },
        heights: map.replace("S", "a").replace("E", "z"),
        height,
        width
    };
}

interface Pos {
    curr: Coord,
    nbSteps: number,
    height: string,
    previous?: Pos | undefined;
}


function findPath(map: Map): number {
    const startPos: Pos = {
        curr: map.start,
        nbSteps: 0,
        height: 'a'
    }

    const queue = new PriorityQueue<Pos>((p) => p.nbSteps, true);
    const key = (p: Pos) => `${p.curr.x}|${p.curr.y}`;
    const insert = (p: Pos) => { queue.put(p, `${key(p)}`) };

    insert(startPos);
    while (queue.isNotEmpty()) {
        const nextNode = queue.pop();
        if (nextNode === undefined) {
            throw new Error("Shouldn't occurs");
        }
        if (nextNode.item.curr.x === map.end.x && nextNode.item.curr.y === map.end.y) {
            return nextNode.item.nbSteps;
        }
        for (const direction of allDirections) {
            const nextCoord = applyDirectionCoor(nextNode.item.curr, direction);
            if (nextCoord.x < 0 || nextCoord.x >= map.width || nextCoord.y < 0 || nextCoord.y >= map.height) {
                continue;
            }
            const nextHeight = map.heights.charAt(nextCoord.y * map.width + nextCoord.x);
            const diffHeight = nextHeight.charCodeAt(0) - nextNode.item.height.charCodeAt(0);
            if (diffHeight <= 1) {
                insert({
                    curr: nextCoord,
                    height: nextHeight,
                    nbSteps: nextNode.item.nbSteps + 1
                })
            }
        }
    }

    throw new Error("Not found");
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = findPath(data);
        logger.result(result, [31, 528])
    }
    else {
        const results: number[] = []
        for (const [index, char] of [...data.heights].entries()) {
            if (char === "a") {
                try {
                    results.push(findPath({
                        heights: data.heights,
                        start: { x: index % data.width, y: Math.floor(index / data.width) },
                        end: data.end,
                        height: data.height,
                        width: data.width
                    }))
                } catch (e) {
                    //ignore
                }
            }
        }

        results.sort(Utils.genericSort(a => a));
        logger.result(results[0], [29, 522])
    }
}

run(12, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])