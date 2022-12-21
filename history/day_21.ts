import { ro } from "date-fns/locale";
import { Logger, Part, PartialBy, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";

interface YellingMonckey {
    type: "yelling",
    name: string,
    value: number,
    cache?: ComputingMonckeyCache
}

interface ComputingMonckeyCache {
    value: number
}

type MonckeyOperation = (v: number, v2: number) => number;

enum HumanIn {
    NONE,
    LEFT,
    RIGHT,
    BOTH,
    UNKNOWN
}

enum OperationType {
    ADD,
    DIV,
    MUL,
    SUB,
}

interface ComputingMonckey {
    type: "computing",
    name: string;
    operationType: OperationType,
    operation: MonckeyOperation;
    dependancies: [string, string],
    cache?: ComputingMonckeyCache,
    dependanciesRef: [Monckey, Monckey],
    hasHumanIn: HumanIn
}

type Monckey = ComputingMonckey | YellingMonckey;

type MonckeyUniverse = ExtendedMap<string, Monckey>;

function buildOperation(operator: string): [OperationType, MonckeyOperation] {
    switch (operator) {
        case "+": return [OperationType.ADD, (v1, v2) => v1 + v2];
        case "-": return [OperationType.SUB, (v1, v2) => v1 - v2];
        case "*": return [OperationType.MUL, (v1, v2) => v1 * v2];
        case "/": return [OperationType.DIV, (v1, v2) => v1 / v2];
        default:
            throw new Error("unkown operation " + operator)
    }
}

function parse(lines: string[]): MonckeyUniverse {
    const map = new ExtendedMap<string, YellingMonckey | PartialBy<ComputingMonckey, "dependanciesRef">>();
    lines.forEach(line => {
        const parsed = line.match(/(\w+): (?:(\d+)|(?:(\w+) (.) (\w+)))/)!;
        const name = parsed[1];
        if (parsed[2] !== undefined) {
            map.set(name, {
                type: "yelling",
                name,
                value: parseInt(parsed[2]!, 10)
            })
        } else {
            const [opType, op] = buildOperation(parsed[4])
            map.set(name, {
                type: "computing",
                name,
                operationType: opType,
                operation: op,
                dependancies: [parsed[3], parsed[5]],
                hasHumanIn: HumanIn.UNKNOWN,
            })
        }
    });

    [...map.values()].forEach(m => {
        if (m.type === "computing") {
            m.dependanciesRef = [map.get(m.dependancies[0])! as Monckey, map.get(m.dependancies[1])! as Monckey]
        }
    })

    return map as MonckeyUniverse
}

function evaluate(monckey: Monckey, isPart2: boolean): number {
    if (monckey.cache !== undefined) {
        return monckey.cache.value;
    }
    if (monckey.type === "yelling") {
        monckey.cache = { value: monckey.value };
        return monckey.cache.value;
    } else {
        if (isPart2 && monckey.hasHumanIn !== HumanIn.NONE) {
            throw new Error("Shouldn't occurs");
        }
        const left = evaluate(monckey.dependanciesRef[0], isPart2);
        const right = evaluate(monckey.dependanciesRef[1], isPart2);
        const value = monckey.operation(left, right);
        monckey.cache = { value: value };
        return value;
    }
}

function updateHumanTag(monckey: Monckey): HumanIn {
    if (monckey.name === "humn") {
        return HumanIn.BOTH;
    } else if (monckey.type === "yelling") {
        return HumanIn.NONE;
    } else {
        if (monckey.hasHumanIn !== HumanIn.UNKNOWN) {
            return monckey.hasHumanIn;
        }
        const left = updateHumanTag(monckey.dependanciesRef[0]);
        const right = updateHumanTag(monckey.dependanciesRef[1]);
        if (left !== HumanIn.NONE && right !== HumanIn.NONE) {
            monckey.hasHumanIn = HumanIn.BOTH;
        } else if (left !== HumanIn.NONE) {
            monckey.hasHumanIn = HumanIn.LEFT;
        } else if (right !== HumanIn.NONE) {
            monckey.hasHumanIn = HumanIn.RIGHT;
        } else {
            monckey.hasHumanIn = HumanIn.NONE;
        }
        return monckey.hasHumanIn
    }
}

function evaluateConstrainted(monckey: Monckey, expectedValue: number): number {
    if (monckey.name === "humn") {
        return expectedValue;
    } else if (monckey.type === "yelling") {
        throw new Error("Shouldn't occurs");
    }

    let otherValue: number;
    let isUnknownInLeft = monckey.hasHumanIn === HumanIn.LEFT;
    let constrainedIndex = isUnknownInLeft ? 0 : 1;
    if (isUnknownInLeft) {
        otherValue = evaluate(monckey.dependanciesRef[1], true);
    } else {
        otherValue = evaluate(monckey.dependanciesRef[0], true);
    }
    const otherAsInt = Number(otherValue);
    switch (monckey.operationType) {
        case OperationType.ADD:
            return evaluateConstrainted(monckey.dependanciesRef[constrainedIndex], expectedValue - otherValue);
        case OperationType.SUB:
            return evaluateConstrainted(monckey.dependanciesRef[constrainedIndex], isUnknownInLeft ? (expectedValue + otherValue) : (otherValue - expectedValue));
        case OperationType.MUL:
            return evaluateConstrainted(monckey.dependanciesRef[constrainedIndex], expectedValue / otherValue);
        case OperationType.DIV:
            return evaluateConstrainted(monckey.dependanciesRef[constrainedIndex], isUnknownInLeft ? (expectedValue * otherValue) : (otherValue / expectedValue));
    }
}

function evaluatePart2(rootMonkey: ComputingMonckey): number {
    if (rootMonkey.hasHumanIn === HumanIn.LEFT) {
        const left = rootMonkey.dependanciesRef[0];
        const rightSide = evaluate(rootMonkey.dependanciesRef[1], true)
        return evaluateConstrainted(left, rightSide);
    } else {
        const right = rootMonkey.dependanciesRef[1];
        const leftSide = evaluate(rootMonkey.dependanciesRef[1], true)
        return evaluateConstrainted(right, leftSide);
    }
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    updateHumanTag(data.get("root")!);
    if (part === Part.PART_1) {
        const result = evaluate(data.get("root")!, false)
        logger.result(result, [152, 54703080378102])
    }
    else {
        const result = evaluatePart2(data.get("root")! as ComputingMonckey)
        logger.result(result, [301, 3952673930912])
    }
}

run(21, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])