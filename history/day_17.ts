import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { generator } from "../utils";

type Form = number[];

const FORMS_STR: string[][] = [
    [
        "####"
    ], [
        ".#.",
        "###",
        ".#."
    ], [
        "..#",
        "..#",
        "###"
    ], [
        "#",
        "#",
        "#",
        "#"
    ], [
        "##",
        "##"
    ]
];
const SIZE = 9;
const DELTA_FROM_LEFT = 2;

function parseForm(def: string[]): Form {
    return def
        .map(line => "..." + line + ".".repeat(SIZE - (DELTA_FROM_LEFT + 1) - line.length - 1) + ".")
        .map(line => line
            .split("")
            .reduce((a, b) =>
                (a << 1) + (b === "#" ? 1 : 0
                ), 0
            )
        );
}


const FORMS: Form[] = FORMS_STR.map(parseForm);
enum DIRECTION {
    LEFT,
    RIGHT
}

function parse(lines: string[]): DIRECTION[] {
    return [...lines[0]].map(char => char === "<" ? DIRECTION.LEFT : DIRECTION.RIGHT);
}


function towerLineToString(line: number): string {
    let result = "";
    for (let pos = 0; pos < 9; ++pos, (line = line >> 1)) {
        if (pos === 0 || pos === 8) {
            result = "|" + result;
        }
        else {
            result = (((line & 1) === 1) ? "#" : ".") + result
        }
    }
    return result
}

function towerToString(tower: Tower, pendingFormInfo?: { form: Form, offset: number }): string {
    return tower.lines.map((line, pos) => {
        if (pos === 0) {
            return BASE_LINE_STR
        }
        else if (pendingFormInfo !== undefined && pos > pendingFormInfo.offset - pendingFormInfo.form.length && pos <= pendingFormInfo.offset) {
            return towerLineToString(line | pendingFormInfo.form[pendingFormInfo.offset - pos])
        } else {
            return towerLineToString(line);
        }
    }).reverse().join("\n")
}


const DEFAULT_LINE_STR = "|.......|";
const BASE_LINE_STR = "+-------+";
const DEFAULT_LINE = [...DEFAULT_LINE_STR].reduce((a, b) => (a << 1) + (b === "." ? 0 : 1), 0);
const BASE_LINE = [...BASE_LINE_STR].reduce((a, _) => (a << 1) + 1, 0);;

interface Tower {
    last_form_pos: number;
    last_wind_pos: number;
    highest_pos: number;
    lines: number[]
}

function hasHit(form: Form, tower: Tower, towerLineOffset: number): boolean {
    return form.reduce(
        (hits, line, form_offset) =>
            hits + (tower.lines[towerLineOffset - form_offset] & line)
        , 0
    ) > 0
}

function logTower(logger: Logger, tower: Tower, pendingFormInfo?: { form: Form, offset: number }): void {
    if (logger.isdebug()) {
        logger.debug("\n" + towerToString(tower, pendingFormInfo));
    }
}

const MAP_OF_MASK: number[] = [1 << 7, 1 << 6, 1 << 5, 1 << 4, 1 << 3, 1 << 2, 1 << 1]

function moveTower(tower: Tower, winds: DIRECTION[], logger: Logger): DIRECTION[] {
    tower.last_form_pos = (tower.last_form_pos + 1) % FORMS.length
    let form = [...FORMS[tower.last_form_pos]];
    let curr_offset = tower.highest_pos + (form.length + 3);
    while (curr_offset > tower.lines.length - 1) {
        tower.lines.push(DEFAULT_LINE);
    }
    const windsUsed: DIRECTION[] = []
    while (true) {
        logTower(logger, tower, { form: form, offset: curr_offset });
        tower.last_wind_pos = (tower.last_wind_pos + 1) % winds.length
        const next_wind_direction = winds[tower.last_wind_pos];
        windsUsed.push(next_wind_direction);
        const moved_form = form.map(line => next_wind_direction === DIRECTION.LEFT ? (line << 1) : (line >> 1));
        if (!hasHit(moved_form, tower, curr_offset)) {
            form = moved_form;
            logTower(logger, tower, { form: form, offset: curr_offset });
        }
        if (hasHit(form, tower, curr_offset - 1)) {
            break;
        }
        curr_offset--;
    }
    form.forEach((line, form_offset) => tower.lines[curr_offset - form_offset] |= line);
    tower.highest_pos = Math.max(curr_offset, tower.highest_pos);
    logTower(logger, tower);
    return windsUsed;
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);

    if (part === Part.PART_1) {
        const tower: Tower = {
            last_form_pos: -1,
            last_wind_pos: -1,
            highest_pos: 0,
            lines: [BASE_LINE]
        }
        for (const id of generator(2022)) {
            moveTower(tower, data, logger);
        }
        logger.result(tower.highest_pos, [3068, 3161])
    }
    else {
        const tower: Tower = {
            last_form_pos: -1,
            last_wind_pos: -1,
            highest_pos: 0,
            lines: [BASE_LINE]
        }

        const hashMap = new ExtendedMap<string, { height: number, id: number }>();
        let result: bigint = 0n;
        const expectedMax = 1000000000000n;
        for (const id of generator(250000)) {
            moveTower(tower, data, logger);
            const relativeHeights = calcRelativeHeights(tower);
            const key = [tower.last_form_pos, tower.last_wind_pos, relativeHeights.join(",")].join("|")
            if (hashMap.has(key)) {
                const lastInfo = hashMap.get(key)!;
                const periodicity = BigInt(id - lastInfo.id);
                const diffHeight = (tower.highest_pos - lastInfo.height);
                const nbLoop = (expectedMax - BigInt(id)) / periodicity;
                let remaining = Number(expectedMax - nbLoop * periodicity - BigInt(id) - 1n);
                while ((remaining--) > 0) {
                    moveTower(tower, data, logger);
                }
                result = nbLoop * BigInt(diffHeight) + BigInt(tower.highest_pos);
                break;
            } else {
                hashMap.set(key, { height: tower.highest_pos, id: id });
            }

        }

        logger.result(result, [1514285714288n, 1575931232076n])
    }
}

run(17, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2], { debug: false })

function calcRelativeHeights(tower: Tower) {
    const relativeHeights = [-1, -1, -1, -1, -1, -1, -1];
    let currPos = tower.highest_pos;
    let heights_to_found = relativeHeights.length;
    do {
        const value = tower.lines[currPos];
        for (let i = 0; i < relativeHeights.length; i++) {
            if (relativeHeights[i] !== -1) {
                continue;
            }
            if ((value & MAP_OF_MASK[i]) !== 0) {
                relativeHeights[i] = tower.highest_pos - currPos;
                heights_to_found--;
            }
        }
        currPos--;
    } while (heights_to_found > 0);
    return relativeHeights;
}
