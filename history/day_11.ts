import * as Utils from "../utils";
import { Logger, Part, run, Type } from "../day_utils"

interface Monkey {
    nbProcessedItems: number,
    items: number[],
    operation: (input: number) => number,
    test: (input: number) => number,
    condModulus: number;
}

function parseOperation(line: string): (i: number) => number {
    const match = Utils.forcePresent(line.match(/^\s*Operation: new = old (\*|\+) (\w+)/));
    if (match[2] === "old") {
        return match[1] === "*" ? ((i: number) => i * i) : ((i: number) => i + i);
    }
    else {
        const v = parseInt(match[2]);
        return match[1] === "*" ? ((i: number) => i * v) : ((i: number) => i + v);
    }
}

function parseTest(condition: string, ifTrue: string, ifFalse: string): [number, (input: number) => number] {
    const ifTrueV: number = parseInt(Utils.forcePresent(ifTrue.match(/.*monkey (\d+)/))[1]);
    const ifFalseV: number = parseInt(Utils.forcePresent(ifFalse.match(/.*monkey (\d+)/))[1]);
    const divCondV: number = parseInt(Utils.forcePresent(condition.match(/.*divisible by (\d+)/))[1]);

    return [divCondV, (i: number) => (i % divCondV) === 0 ? ifTrueV : ifFalseV];
}

function parse(lines: string[]): Monkey[] {
    return lines.pack(line => line.trim() === "", Utils.PackMatchAction.SKIP_AND_CHANGE)
        .map((monckeyData) => {
            const [condModulus, testCond] = parseTest(monckeyData[3], monckeyData[4], monckeyData[5]);
            return {
                nbProcessedItems: 0,
                items: monckeyData[1].split(": ")[1].split(", ").map(v => parseInt(v)),
                operation: parseOperation(monckeyData[2]),
                test: testCond,
                condModulus: condModulus,
            } satisfies Monkey
        });
}



function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const startMonkeys = parse(lines);
    const nbLoop = (part === Part.PART_1) ? 20 : 10000;
    const mergedModulus = startMonkeys.map(m => m.condModulus).reduce((a, b) => a * b);
    const finalMonkeys = [...Utils.generator(nbLoop)].reduce(monkeys => {
        return monkeys.map(monkey => {
            const items = monkey.items;
            monkey.items = [];
            items.forEach(item => {
                monkey.nbProcessedItems++;
                const monkeyProcessing = monkey.operation(item);
                const newWorryLevel = ((part === Part.PART_1) ? Math.floor(monkeyProcessing / 3) : monkeyProcessing) % mergedModulus;
                const targetMonkey = monkey.test(newWorryLevel);
                monkeys[targetMonkey].items.push(newWorryLevel);
            })
            return monkey;
        });
    }, startMonkeys);
    finalMonkeys.sort(Utils.reverseSort(Utils.genericSort((a) => a.nbProcessedItems)));
    if (part === Part.PART_1) {
        logger.result(finalMonkeys[0].nbProcessedItems * finalMonkeys[1].nbProcessedItems, [10605, 117640])
    }
    else {
        logger.result(BigInt(finalMonkeys[0].nbProcessedItems) * BigInt(finalMonkeys[1].nbProcessedItems), [2713310158n, 30616425600n])
    }
}

run(11, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])