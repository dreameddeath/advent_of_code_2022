import * as Utils from "./utils";
import { Logger, Part, run, Type } from "./day_utils"
import { ExtendsMap } from "./mapUtils";

type Direction = "L" | "U" | "D" | "R";
const allDirections: Direction[] = ["L", "U", "R", "D"];

type Coord = { x: number, y: number }
type Command = { dir: Direction, count: number }

type Rope = Coord[]

type VisitedMap = ExtendsMap<string, boolean>;
function parse(lines: string[]): Command[] {
    return lines.map(line => {
        const parsed = Utils.forcePresent(line.match(/(\w) (\d+)/));
        return {
            dir: parsed[1] as Direction,
            count: parseInt(parsed[2], 10)
        }
    });
}

function key(c: Coord): string {
    return c.x + "|" + c.y;
}

function applyDirectionCoor(coord: Coord, dir: Direction): Coord {
    switch (dir) {
        case "D": return { x: coord.x, y: coord.y - 1 };
        case "U": return { x: coord.x, y: coord.y + 1 };
        case "L": return { x: coord.x - 1, y: coord.y };
        case "R": return { x: coord.x + 1, y: coord.y };
    }
}

function moveTail(h: Coord, t: Coord): Coord {
    const offset = { x: h.x - t.x, y: h.y - t.y };
    const absOffsetX = Math.abs(offset.x);
    const absOffsetY = Math.abs(offset.y);

    if (absOffsetX > 2 || absOffsetY > 2) {
        throw new Error("Shouldn't occurs");
    }
    if (absOffsetX < 2 && absOffsetY < 2) {
        return t;
    }
    const x = t.x + ((absOffsetX === 2) ? (offset.x / 2) : offset.x);
    const y = t.y + ((absOffsetY === 2) ? (offset.y / 2) : offset.y);
    return { x, y };
}

function applyDirectionOnce(currRope: Rope, dir: Direction, visited: VisitedMap): Rope {
    const newRope = [applyDirectionCoor(currRope[0], dir)];
    let last = newRope[0];
    for (const middle of currRope.slice(1)) {
        last = moveTail(last, middle);
        newRope.push(last);
    }
    visited.cache(key(newRope[newRope.length - 1]), () => true);
    return newRope;
}

function applyDirection(startRope: Rope, dir: Direction, startCount: number, visited: VisitedMap): Rope {
    let currRope = startRope;
    let count = startCount;
    while (count > 0) {
        currRope = applyDirectionOnce(currRope, dir, visited);
        count--;
    }
    return currRope;
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const mapVisited: VisitedMap = new ExtendsMap();
    const startPos = { x: 0, y: 0 };
    const nbKnots = (part === Part.PART_1) ? 2 : 10;
    const startRope: Rope = [...("0".repeat(nbKnots))].map(_ => startPos);
    mapVisited.cache(key(startRope[0]), () => true);
    data.reduce((currRope, cmd) => applyDirection(currRope, cmd.dir, cmd.count, mapVisited), startRope);

    if (part === Part.PART_1) {
        logger.result(mapVisited.size, [13, 6190])
    }
    else {
        logger.result(mapVisited.size, [36, 2516])
    }
}

run(9, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])