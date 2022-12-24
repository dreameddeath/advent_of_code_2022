import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { PriorityQueue, QueuedItem } from "../priority_queue";

enum ObjectType {
    BLIZZARD_DOWN = "v",
    BLIZZARD_UP = "^",
    BLIZZARD_LEFT = "<",
    BLIZZARD_RIGHT = ">",
    WALL = "#",
}

type CellContent = ObjectType | undefined;


interface World {
    width: number;
    height: number;
    cells: CellContent[][]
}



function parse(lines: string[]): World {
    const cells = lines.map((line, y) => {
        const cells = line.split("").map((char, x) => {
            if (char === ".") {
                return undefined
            }
            return char as ObjectType
        });
        cells.shift();
        cells.pop();
        return cells;
    });
    cells.shift();
    cells.pop();
    return {
        width: cells[0].length,
        height: cells.length,
        cells
    };
}

interface Coord {
    x: number,
    y: number
}

function isOccupied(coord: Coord, min: number, world: World): boolean {
    if (coord.y < 0 || coord.y >= world.height) {
        return false;
    }
    let effectiveXRight = (coord.x - min) % world.width;
    if (effectiveXRight < 0) { effectiveXRight += world.width; }
    const effectiveXLeft = (coord.x + min) % world.width;
    let effectiveYDown = (coord.y - min) % world.height;
    if (effectiveYDown < 0) { effectiveYDown += world.height; }
    const effectiveYUp = (coord.y + min) % world.height;

    return world.cells[coord.y][effectiveXLeft] === ObjectType.BLIZZARD_LEFT ||
        world.cells[coord.y][effectiveXRight] === ObjectType.BLIZZARD_RIGHT ||
        world.cells[effectiveYDown][coord.x] === ObjectType.BLIZZARD_DOWN ||
        world.cells[effectiveYUp][coord.x] === ObjectType.BLIZZARD_UP;
}

interface State {
    coord: Coord,
    mins: number
}

const offsets = [
    {
        offsetX: -1,
        offsetY: 0
    },
    {
        offsetX: 1,
        offsetY: 0
    },
    {
        offsetX: 0,
        offsetY: -1
    },
    {
        offsetX: 0,
        offsetY: 1
    }, {
        offsetX: 0,
        offsetY: 0
    }
]

function nextPossibleStates(state: State, world: World): State[] {
    const newMinutes = state.mins + 1;
    const newStates: State[] = [];
    for (const { offsetX, offsetY } of offsets) {
        const newCoord: Coord = { x: state.coord.x + offsetX, y: state.coord.y + offsetY };
        const isInternalCoord = newCoord.x >= 0 && newCoord.x < world.width &&
            newCoord.y >= 0 && newCoord.y < world.height;
        const isStartingCoord = (newCoord.x === 0 && newCoord.y === -1) ||
            (newCoord.y === world.height && newCoord.x === world.width - 1);
        if ((isInternalCoord || isStartingCoord) &&
            !isOccupied(newCoord, newMinutes, world)) {
            newStates.push({
                mins: newMinutes,
                coord: newCoord
            })
        }
    }
    return newStates;
}

function findMinPath(world: World, start: Coord, target: Coord, startMin: number): number {
    const priorityQueue = new PriorityQueue<State>((s) => s.mins + Math.abs(target.x - s.coord.x) + Math.abs(target.y - s.coord.y));
    const calcKey = (s: State) => `${s.coord.x}:${s.coord.y}|${s.mins}`;
    const initState = {
        coord: start,
        mins: startMin
    }
    priorityQueue.put(initState, calcKey(initState));
    let queuedItemToExplore: QueuedItem<State> | undefined;
    while ((queuedItemToExplore = priorityQueue.pop()) !== undefined) {
        const state = queuedItemToExplore.item;
        if (state.coord.x === target.x && state.coord.y === target.y) {
            return state.mins;
        }
        const newStates = nextPossibleStates(state, world);
        for (const newState of newStates) {
            priorityQueue.put(newState, calcKey(newState));
        }
    }

    throw new Error("Shouldn't occurs");
}



function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const world = parse(lines);
    const start = { x: 0, y: -1 };
    const end = { x: world.width - 1, y: world.height };
    const firstTrip = findMinPath(world, start, end, 0);
    const secondTrip = findMinPath(world, end, start, firstTrip);
    const thirdTrip = findMinPath(world, start, end, secondTrip);
    logger.result([firstTrip, thirdTrip], [18, 292, 54, 816])
}

run(24, [Type.TEST, Type.RUN], puzzle, [Part.ALL])