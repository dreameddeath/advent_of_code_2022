import * as Utils from "./utils";
import { Part, run, Type } from "./day_utils"

type Crate = string
type WareHouse = Crate[][];

interface Instruction {
    quantity: number;
    source: number;
    destination: number;
}


function parse(lines: string[]): [WareHouse, Instruction[]] {
    const instructions: Instruction[] = [];
    const warehouse: WareHouse = [];
    lines.forEach(line => {
        if (line.indexOf("[") >= 0) {
            parseWareHouseLine(line, warehouse);
        } else if (line.startsWith("move")) {
            instructions.push(parseInstruction(line));
        }
    });

    return [
        warehouse,
        instructions
    ]
}

function parseInstruction(line: string): Instruction {
    const parsed = Utils.forcePresent(line.match(/move (\d+) from (\d+) to (\d+)/));
    return {
        quantity: parseInt(parsed[1]),
        source: parseInt(parsed[2]),
        destination: parseInt(parsed[3]),
    };
}

function parseWareHouseLine(line: string, warehouse: WareHouse) {
    const nb = (line.length - 3) / 4 + 1;
    for (let pos = 0; pos < nb; pos++) {
        const item = line.charAt(1 + 4 * pos);
        if (item === " ") continue;
        if (warehouse[pos] === undefined) {
            warehouse[pos] = [];
        }
        warehouse[pos].unshift(item);
    }
}

function applyInstructions(warehouse: WareHouse, instructions: Instruction[], reverse: boolean): string {
    for (const instruction of instructions) {
        const source = warehouse[instruction.source - 1];
        const destination = warehouse[instruction.destination - 1];
        const moved = source.splice(source.length - instruction.quantity, instruction.quantity);
        (reverse ? moved.reverse() : moved).forEach(v => destination.push(v));
    }
    return warehouse.map(stack => stack.pop()).join("");
}

function solve(lines: string[], part: Part): void {
    const [warehouse, instructions] = parse(lines);
    if (part === Part.PART_1) {
        const result = applyInstructions(warehouse, instructions, true);
        console.log(`Result ${result}`)
    }
    else {
        const result = applyInstructions(warehouse, instructions, false);
        console.log(`Result ${result}`);
    }
}

run(5, [Type.TEST, Type.RUN], solve, [Part.PART_1, Part.PART_2]);