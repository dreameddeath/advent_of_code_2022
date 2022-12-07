import * as Utils from "./utils";
import { Logger, Part, run, Type } from "./day_utils"

interface Range {
    x: number,
    y: number
}

interface Pair {
    range1: Range,
    range2: Range
}

const pattern = /(\d+)-(\d+),(\d+)-(\d+)/;
function parse(lines: string[]): Pair[] {
    return lines.map(line => {
        const match = Utils.forcePresent(pattern.exec(line));
        return {
            range1: {
                x: parseInt(match[1]),
                y: parseInt(match[2]),
            },
            range2: {
                x: parseInt(match[3]),
                y: parseInt(match[4]),
            }
        }
    });
}

function isFirstInside(a: Range, b: Range): boolean {
    return a.x >= b.x && a.y <= b.y
}

function isOverlapping(a: Range, b: Range): boolean {
    return !(a.y < b.x || a.x > b.y)
}


function solve(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data.filter(pair => isFirstInside(pair.range1, pair.range2) || isFirstInside(pair.range2, pair.range1));
        logger.result(result.length, [2, 540])
    }
    else {
        const result = data.filter(pair => isOverlapping(pair.range1, pair.range2));
        logger.result(result.length, [4, 872]);
    }
}

run(4, [Type.TEST, Type.RUN], solve, [Part.PART_1, Part.PART_2]);