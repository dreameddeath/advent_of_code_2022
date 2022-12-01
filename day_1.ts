import { Part, run, Type } from "./day_utils"

function parse(lines: string[]): (number | undefined)[] {
    return lines.map(line => line === "" ? undefined : parseInt(line, 10));
}


function puzzle(lines: string[], part: Part): void {
    const data = parse(lines);
    const groups = data.reduce(
        (list, newValue) => {
            if (newValue === undefined) {
                list.push(0);
            } else {
                list[list.length - 1] += newValue;
            }
            return list;
        },
        [0]
    );

    groups.sort((a, b) => b - a);
    if (part === Part.PART_1) {
        const result = groups[0]
        console.log(`Best: ${result}`)

    }
    else {
        const result = groups[0] + groups[1] + groups[2];
        console.log(`Best 3: ${result}`);
    }
}

run(1, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])