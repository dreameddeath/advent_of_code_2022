import * as Utils from "./utils";
import { Part, run, Type } from "./day_utils"

function parse(lines: string[]): string[] {
    return lines;
}


function solve(lines: string[], part: Part): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data.length;
        console.log(`Result ${result}`)
    }
    else {
        const result = data.length;
        console.log(`Result ${result}`);
    }
}

run(5, [Type.TEST, Type.RUN], solve, [Part.PART_1, Part.PART_2]);