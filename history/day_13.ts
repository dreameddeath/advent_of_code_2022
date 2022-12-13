import * as Utils from "../utils";
import { Logger, Part, run, Type } from "../day_utils"

type List = List[] | number

function parseList(s: string): List {
    return s.split(/([\[,\]])/).reduce((stack, token) => {
        if (token === "[") {
            const newList = [] as List[];
            (stack[stack.length - 1] as List[]).push(newList)
            stack.push(newList);
        } else if (token === "]") {
            stack.pop();
        } else if (token !== "," && token !== "") {
            (stack[stack.length - 1] as List[]).push(parseInt(token));
        }
        return stack;
    }, [[]] as List[][])[0][0]
}

function parse(lines: string[]): [List, List][] {
    return lines
        .pack(item => item.trim() === "", Utils.PackMatchAction.SKIP_AND_CHANGE)
        .map(unparsed => unparsed.map(line => parseList(line)))
        .map(pair =>
            [pair[0], pair[1]]
        );
}


enum CompRes {
    LOWER = -1,
    EQUAL = 0,
    HIGHER = 1
}

function compareNumber(left: number, right: number): CompRes {
    if (left > right) {
        return CompRes.HIGHER;
    } else if (left < right) {
        return CompRes.LOWER;
    } else {
        return CompRes.EQUAL;
    }
}

function compare(left: List, right: List): CompRes {
    if (typeof left === "number" && typeof right === "number") {
        return compareNumber(left, right);
    }
    const effectiveLeft = typeof left === "number" ? [left] : left;
    const effectiveRight = typeof right === "number" ? [right] : right;
    const maxPos = Math.max(effectiveLeft.length, effectiveRight.length);
    for (let pos = 0; pos < maxPos; ++pos) {
        const leftSubVal = effectiveLeft[pos];
        const rightSubVal = effectiveRight[pos];
        if (rightSubVal === undefined) {
            return CompRes.HIGHER;
        } else if (leftSubVal === undefined) {
            return CompRes.LOWER
        }

        const subCompare = compare(leftSubVal, rightSubVal);
        if (subCompare !== CompRes.EQUAL) {
            return subCompare;
        }
    }
    return CompRes.EQUAL;
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const pairs = parse(lines);
    if (part === Part.PART_1) {
        const result = pairs
            .mapNonNull((p, pos) => compare(p[0], p[1]) !== CompRes.HIGHER ? pos + 1 : undefined)
            .reduce((a, b) => a + b);
        logger.result(result, [13, 5806])
    }
    else {
        const divider2 = parseList("[[2]]");
        const divider6 = parseList("[[6]]");
        pairs.push([divider2, divider6]);
        const result = pairs.flatMap(item => item)
            .sort((a, b) => compare(a, b))
            .mapNonNull((item, pos) =>
                (compare(item, divider2) === CompRes.EQUAL || compare(item, divider6) === CompRes.EQUAL) ?
                    pos + 1 :
                    undefined
            )
            .reduce((sum, v) => sum * v)
            ;
        logger.result(result, [140, 23600])
    }
}

run(13, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])