import { Logger, Part, run, Type, PartialBy } from "../day_utils"
import { generator } from "../utils";

interface LinkedListItem {
    value: number,
    originNext: LinkedListItem,
}


type LinkedListItemBuilder = PartialBy<LinkedListItem, 'originNext'>

function parse(lines: string[]): LinkedListItem[] {
    const values: LinkedListItemBuilder[] = lines.map((line, index) => {
        return {
            value: parseInt(line, 10),
        }
    });
    values.forEach((item, index, all) => {
        item.originNext = (index === all.length - 1 ? all[0] : all[index + 1]) as LinkedListItem;
    });

    return values as LinkedListItem[];
}


function moveValue(item: LinkedListItem, currPos: number, all: LinkedListItem[]) {
    all.splice(currPos, 1);
    const newIndex = (currPos + item.value) % all.length;
    all.splice(newIndex, 0, item);
}


function mix(initValue: LinkedListItem, values: LinkedListItem[]): LinkedListItem[] {
    let currItem = initValue;
    do {
        moveValue(currItem, values.indexOf(currItem), values);
        currItem = currItem.originNext;
    } while (currItem !== initValue)
    return values;
}

function calcResult(values: LinkedListItem[]): number {
    const zeroIndex = values.findIndex(item => item.value === 0);
    const coordinates = [1000, 2000, 3000].map(offset => values[(zeroIndex + offset) % values.length].value);
    return coordinates.reduce((a, b) => a + b);
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const mixed = mix(data[0], data);
        const result = calcResult(mixed);
        logger.result(result, [3, 988])
    }
    else {
        data.forEach(item => item.value *= 811589153);
        const initValue = data[0];
        [...generator(10)].forEach((_) => mix(initValue, data))
        const result = calcResult(data);
        logger.result(result, [1623178306, 7768531372516])
    }
}

run(20, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])