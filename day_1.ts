import { genericSort, reduceList, reverseSort } from "./utils";
import { Logger, Part, run, Type } from "./day_utils"

function parse(lines: string[]): (number | undefined)[] {
    return lines.map(line => line === "" ? undefined : parseInt(line, 10));
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines).reduce(
        reduceList(
            (list: number[], newValue) => (newValue === undefined) ? list.push(0) : list[list.length - 1] += newValue
        ),
        []
    );

    data.sort(reverseSort(genericSort()));
    if (part === Part.PART_1) {
        const result = data[0]
        logger.result(result, [24000, 74394])

    }
    else {
        const result = data[0] + data[1] + data[2];
        logger.result(result, [45000, 212836]);
    }
}

run(1, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])