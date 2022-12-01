import { Part, run, Type } from "./day_utils"
const testData = `1000
2000
3000

4000

5000
6000

7000
8000
9000

10000`

function parse(lines: string[]): (number | undefined)[] {
    return lines.map(line => line === "" ? undefined : parseInt(line, 10));
}


function puzzle(lines: string[], part: Part): void {
    const data = parse(lines);
    const groups = data.reduce((list, newValue) => {
        if (newValue === undefined) {
            list.push(0);
        } else {
            list[list.length - 1] += newValue;
        }
        return list;
    }
        , [0] as number[]
    );

    groups.sort((a, b) => b - a);
    if (part === Part.PART_1) {
        const result = groups[0]
        console.log(`Best ${result}`)

    }
    else {
        const result = groups[0] + groups[1] + groups[2];
        console.log(`Results ${result}`);
    }
}

run(1, testData, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])