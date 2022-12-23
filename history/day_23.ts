import fi from "date-fns/esm/locale/fi/index.js";
import { el } from "date-fns/locale";
import { boolean, number } from "yargs";
import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { generator } from "../utils";

interface Coord {
    x: number,
    y: number
}

interface Elf {
    id: string,
    coord: Coord
}


type World = ExtendedMap<string, Elf>

function calcKeyFromCoords(x: number, y: number): string {
    return `${x}|${y}`;
}


function calcKey(elf: Elf): string {
    return calcKeyFromCoords(elf.coord.x, elf.coord.y);
}

function parse(lines: string[]): World {
    let id: number = 0;
    const world: World = new ExtendedMap();
    lines.flatMap((line, y) => line.split("")
        .map((v, x) => {
            if (v === ".") {
                return undefined;
            }
            else
                return {
                    id: "E" + (++id),
                    coord: {
                        x,
                        y
                    }
                } satisfies Elf
        }).filter((v): v is Elf => v !== undefined))
        .forEach(elf => world.set(calcKey(elf), elf));
    return world;
}

type Direction = "north" | "south" | "east" | "west";
type Predicate = (coord: readonly [number, number]) => boolean;
const allDirections: Direction[] = ["north", "south", "west", "east"];

const allPossibleOffsets = [-1, 0, 1].flatMap(yOffset => [-1, 0, 1].filter(xOffset => !(xOffset === 0 && yOffset === 0)).map(xOffset => [xOffset, yOffset] as const));
const northSlotPredicate: Predicate = ([x, y]) => (y === -1)
const southSlotPredicate: Predicate = ([x, y]) => (y === 1)
const westSlotPredicate: Predicate = ([x, y]) => (x === -1)
const eastSlotPredicate: Predicate = ([x, y]) => (x === 1)

type PriorityStep = {
    direction: Direction,
    predicate: Predicate,
    xOffset: -1 | 0 | 1,
    yOffset: -1 | 0 | 1
}

const listOrderedDirections: PriorityStep[] =
    [
        {
            direction: "north",
            predicate: northSlotPredicate,
            xOffset: 0,
            yOffset: -1
        },
        {
            direction: "south",
            predicate: southSlotPredicate,
            xOffset: 0,
            yOffset: 1
        },
        {
            direction: "west",
            predicate: westSlotPredicate,
            xOffset: -1,
            yOffset: 0
        },
        {
            direction: "east",
            predicate: eastSlotPredicate,
            xOffset: 1,
            yOffset: 0
        }
    ]

function findMoveDirection(elf: Elf, world: World, orderedDirection: PriorityStep[]): { direction: Direction, coord: Coord } | undefined {
    const emptySlots = allPossibleOffsets
        .filter(([xOffset, yOffset]) =>
            !world.has(calcKeyFromCoords(elf.coord.x + xOffset, elf.coord.y + yOffset))
        );

    if (emptySlots.length <= 2 || emptySlots.length === 8) {
        return undefined;
    }

    for (const step of orderedDirection) {
        if (emptySlots.filter(step.predicate).length === 3) {
            return {
                direction: step.direction,
                coord: {
                    x: elf.coord.x + step.xOffset,
                    y: elf.coord.y + step.yOffset
                }
            }
        }
    }

    return undefined;
}

function iterate(world: World, priorityList: PriorityStep[]): [World, number] {
    const newWorld: World = new ExtendedMap();
    const targets = new ExtendedMap<string, { old: { key: string, elf: Elf }, newElf: Elf }[]>();

    for (const [key, elf] of world.entries()) {
        const direction = findMoveDirection(elf, world, priorityList);
        if (direction === undefined) {
            newWorld.set(key, elf);
        } else {
            let newElf: Elf = {
                id: elf.id,
                coord: { ...direction.coord }
            }
            targets.apply(calcKey(newElf), (list) => { list.push({ old: { key, elf }, newElf }); return list; }, () => []);
        }
    }
    let nbMoves = 0;
    for (const [key, targetElfs] of targets.entries()) {
        if (targetElfs.length === 1) {
            newWorld.set(key, targetElfs[0].newElf);
            nbMoves++;
        } else {
            targetElfs.forEach(target => newWorld.set(target.old.key, target.old.elf));
        }
    }

    return [newWorld, nbMoves];
}

function calcMinMax(world: World): [{ min: number, max: number }, { min: number, max: number }] {
    const minMaxX = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER };
    const minMaxY = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER };
    for (const elf of world.values()) {
        minMaxX.min = Math.min(minMaxX.min, elf.coord.x);
        minMaxX.max = Math.max(minMaxX.max, elf.coord.x);
        minMaxY.min = Math.min(minMaxY.min, elf.coord.y);
        minMaxY.max = Math.max(minMaxY.max, elf.coord.y);
    }
    return [minMaxX, minMaxY];
}

function calcResult(world: World): number {
    const [minMaxX, minMaxY] = calcMinMax(world);
    return (minMaxX.max - minMaxX.min + 1) * (minMaxY.max - minMaxY.min + 1) - world.size;
}

function print(world: World, logger: Logger, type: Type) {
    if (!logger.isdebug() || type !== Type.TEST) {
        return;
    }

    const [minMaxX, minMaxY] = calcMinMax(world);
    const lines: string[] = [""];
    for (let y = minMaxY.min; y <= minMaxY.max; ++y) {
        let line = "";
        for (let x = minMaxX.min; x <= minMaxX.max; ++x) {
            const key = calcKeyFromCoords(x, y);
            line += world.has(key) ? "#" : "."
        }
        lines.push(line);
    }

    logger.debug(lines.join("\n"));

}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    print(data, logger, type);
    if (part === Part.PART_1) {
        const priorityList = [...listOrderedDirections];
        const finalMap = [...generator(10)].reduce((world, i) => {
            const [newWorld] = iterate(world, priorityList);
            const item = priorityList.shift()!;
            priorityList.push(item);
            print(newWorld, logger, type);
            return newWorld;
        }, data);
        logger.result(calcResult(finalMap), [110, 4172])
    }
    else {
        let nbTotalMoves = 0;
        let nbMoves = 0;
        let count = 0;
        let currWorld = data;
        const priorityList = [...listOrderedDirections];
        do {
            count++;
            [currWorld, nbMoves] = iterate(currWorld, priorityList);
            nbTotalMoves += nbMoves;
            const item = priorityList.shift()!;
            priorityList.push(item);
        } while (nbMoves > 0)
        logger.log("Nb total moves " + nbTotalMoves)
        logger.result(count, [20, 942])
    }
}

run(23, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2], { debug: false })