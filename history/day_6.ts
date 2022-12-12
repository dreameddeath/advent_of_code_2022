import * as Utils from "../utils";
import { Logger, Part, run, Type } from "../day_utils"
import { FrequencyMap } from "../frequencyMap";

function parse(lines: string[]): string[] {
    return lines[0].split("");
}

function solve(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const nbDistinct = part === Part.PART_1 ? 4 : 14;
    const frequencyMap = new FrequencyMap<string>();
    for (let pos = 0; pos < data.length; pos++) {
        if (frequencyMap.getTotalItemsCount() === nbDistinct) {
            frequencyMap.remove(data[pos - nbDistinct]);
        }
        frequencyMap.add(data[pos]);
        if (frequencyMap.getDistinctItemsCount() === nbDistinct) {
            logger.result(pos + 1, part === Part.PART_1 ? [7, 1300] : [19, 3986]);
            break;
        }
    }
}

run(6, [Type.TEST, Type.RUN], solve, [Part.PART_1, Part.PART_2]);