import * as Utils from "./utils";
import { Logger, Part, run, Type } from "./day_utils"

function parse(lines: string[]): string[] {
    return lines;
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data.length;
        logger.result(result)
    }
    else {
        const result = data.length;
        logger.result(result)
    }
}

run(99, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])