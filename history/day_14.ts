import { Logger, Part, run, Type } from "../day_utils"
import { generator } from "../utils";

interface Coord {
    x: number,
    y: number
}

interface Space {
    minX: number,
    maxX: number,
    maxY: number,
}

enum MapItem {
    NOTHING = ".",
    ROCK = "X",
    SAND = "o"
}

interface SandMap {
    height: number,
    width: number,
    minX: number,
    maxX: number,
    infiniteFloor: boolean,
    items: MapItem[]
}

function key(coord: Coord, map: SandMap): number {
    return (coord.x - map.minX) + coord.y * map.width;
}

function get(map: SandMap, coord: Coord): MapItem {
    return map.items[key(coord, map)];
}

function set(map: SandMap, coord: Coord, mapItem: MapItem) {
    if (coord.x < map.minX || coord.y > map.maxX) {
        return;
    }
    map.items[key(coord, map)] = mapItem;
}

function drawLine(map: SandMap, start: Coord, end: Coord) {
    if (start.x === end.x) {
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        for (let pos = minY; pos <= maxY; pos++) {
            set(map, { x: start.x, y: pos }, MapItem.ROCK);
        }
    } else if (start.y === end.y) {
        const y = start.y;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        for (let pos = minX; pos <= maxX; pos++) {
            set(map, { x: pos, y: start.y }, MapItem.ROCK);
        }
    } else {
        throw new Error("Cannot draw line");
    }
}

function parse(lines: string[]): Coord[][] {
    return lines.map(line => line.split(" -> ").map(coord => {
        const [x, y] = coord.split(",");
        return {
            x: parseInt(x),
            y: parseInt(y)
        }
    }));
}

function buildSandMap(paths: Coord[][], hasFloor: boolean): SandMap {
    const minMax = paths.flatMap(coords => coords)
        .reduce(
            (space, coord) => {
                return {
                    minX: Math.min(space.minX, coord.x),
                    maxX: Math.max(space.maxX, coord.x),
                    maxY: Math.max(space.maxY, coord.y)
                } satisfies Space
            },
            { minX: 500, maxX: 500, maxY: 0 } satisfies Space
        );
    const height = minMax.maxY + 1 + 2;
    const fullMaxX = 500 + (height + 1);
    const fullMinX = 500 - (height + 1);
    const width = fullMaxX - fullMinX + 2;

    const map = {
        items: [...generator((height) * (width))].map((_) => MapItem.NOTHING),
        height: height,
        minX: fullMinX,
        maxX: fullMaxX,
        width,
        infiniteFloor: hasFloor
    } satisfies SandMap;

    for (const path of paths) {
        for (let pos = 1; pos < path.length; pos++) {
            drawLine(map, path[pos - 1], path[pos]);
        }
    }
    if (hasFloor) {
        drawLine(map, { x: map.minX, y: map.height - 1 }, { x: map.maxX, y: map.height - 1 })
    }

    return map;
}

function displaySandMap(map: SandMap, logger: Logger): void {
    if (!logger.isdebug()) {
        return;
    }

    logger.debug("\n" +
        [...generator(map.height)].map((y) => [...generator(map.maxX - map.minX + 1)].map((x) => get(map, { x: x + map.minX, y }) ?? MapItem.NOTHING).join("")).join("\n")
    );
}

enum DropResult {
    LEAVE,
    STOPPED,
    BLOCKED
}

function dropSand(map: SandMap, startCoord: Coord, logger: Logger): DropResult {
    if (get(map, startCoord) === MapItem.SAND) {
        return DropResult.BLOCKED;
    }
    const currCoord = { ...startCoord };
    while (currCoord.y < map.height - 1) {
        if (get(map, { x: currCoord.x, y: currCoord.y + 1 }) === MapItem.NOTHING) {
            currCoord.y++;
        } else if (get(map, { x: currCoord.x - 1, y: currCoord.y + 1 }) === MapItem.NOTHING) {
            currCoord.y++;
            currCoord.x--;
        } else if (get(map, { y: currCoord.y + 1, x: currCoord.x + 1 }) === MapItem.NOTHING) {
            currCoord.y++;
            currCoord.x++;
        } else {
            set(map, currCoord, MapItem.SAND);
            displaySandMap(map, logger);
            return DropResult.STOPPED;
        }
    }

    return DropResult.LEAVE;
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const map = buildSandMap(parse(lines), part === Part.PART_2);
    displaySandMap(map, logger);
    let count = 0;
    while (true) {
        const dropResult = dropSand(map, { x: 500, y: 0 }, logger);
        if (dropResult !== DropResult.STOPPED) {
            break;
        }
        count++
    }
    if (part === Part.PART_1) {
        logger.result(count, [24, 961])
    }
    else {
        logger.result(count, [93, 26375])
    }
}

run(14, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2], { debug: false })