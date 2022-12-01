import { Part, run, Type } from "./day_utils"
const testData = ``

function parse(lines: string[]): (number | undefined)[] {
    return lines.map(line => line === "" ? undefined : parseInt(line, 10));
}


function puzzle(lines: string[], part: Part): void {
    const data = parse(lines);
    
    if (part === Part.PART_1) {
        const result = "toto"
        console.log(`Result ${result}`)

    }
    else {
        const result = "toto";
        console.log(`Result ${result}`);
    }
}

run(1, testData, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])