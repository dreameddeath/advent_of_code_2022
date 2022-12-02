import { Part, run, Type } from "./day_utils"

function parse(lines: string[]): string[] {
    return lines;
}



function puzzle(lines: string[], part: Part): void {
    const data=parse(lines);
    if (part === Part.PART_1) {
        const result = "toto"
        console.log(`Result ${result}`)
    }
    else {
        const result = "toto";
        console.log(`Result ${result}`);
    }
}

run(3, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])