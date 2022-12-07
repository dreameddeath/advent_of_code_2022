import { packStrict } from "./utils";
import { Logger, Part, run, Type } from "./day_utils"

function parse(lines: string[]): string[] {
    return lines;
}

function commonChar(first: string, second: string): string {
    return [...first]
        .filter(char => second.indexOf(char) >= 0)
        .join("");
}
const [a, z] = ["a".charCodeAt(0), "z".charCodeAt(0)];
const [A, Z] = ["A".charCodeAt(0), "Z".charCodeAt(0)];
function priority(char: string): number {
    const pos = char.charCodeAt(0);
    if (pos >= a && pos <= z) {
        return (pos - a) + 1;
    }
    return (pos - A) + 27;
}



function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data
            .map(rumstack => [
                rumstack.substring(0, rumstack.length / 2),
                rumstack.substring(rumstack.length / 2)
            ])
            .map(([left, right]) => commonChar(left, right)).map(priority).reduce((a, b) => a + b)
        logger.result(result, [157, 8123])
    }
    else {
        const result = data.reduce(packStrict(3), [])
            .map(([line1, line2, line3]) => commonChar(commonChar(line1, line2), line3))
            .flatMap(priority).reduce((a, b) => a + b)
        logger.result(result, [70, 2620])
    }
}

run(3, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2]);