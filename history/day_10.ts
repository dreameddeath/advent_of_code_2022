import { Logger, Part, run, Type } from "../day_utils"

const result_2_test = `
##..##..##..##..##..##..##..##..##..##..
###...###...###...###...###...###...###.
####....####....####....####....####....
#####.....#####.....#####.....#####.....
######......######......######......####
#######.......#######.......#######.....`;

const result_2 = `
####.###..#..#.###..#..#.####..##..#..#.
#....#..#.#..#.#..#.#..#....#.#..#.#..#.
###..###..#..#.#..#.####...#..#....####.
#....#..#.#..#.###..#..#..#...#....#..#.
#....#..#.#..#.#.#..#..#.#....#..#.#..#.
#....###...##..#..#.#..#.####..##..#..#.`



interface CommandAddx {
    type: "addx",
    value: number
}

interface CommandNoop {
    type: "noop"
}

type Command = CommandAddx | CommandNoop

function parse(lines: string[]): Command[] {
    return lines.flatMap(line => {
        const parts = line.split(" ");
        if (parts[0] === "addx") {
            return [{
                type: "noop"
            }, {
                type: "addx",
                value: parseInt(parts[1])
            }]
        } else {
            return [{
                type: "noop"
            }]
        }
    });
}

interface State<T> {
    x: number,
    aggr: T;
    cycles: number;
}


function manageCumulX(state: State<number>) {
    const rankNext = (state.cycles + 1) - 20;
    if (rankNext % 40 === 0) {
        state.aggr += (state.cycles + 1) * state.x;
    }
}


function manageCrt(state: State<string>) {
    if ((state.cycles) % 40 === 0) {
        state.aggr += "\n";
    }

    const currCtrPosition = (state.cycles) % 40;
    const currSpriteStartPos = state.x - 1;
    if (currSpriteStartPos <= currCtrPosition && currSpriteStartPos + 2 >= currCtrPosition) {
        state.aggr += "#"
    } else {
        state.aggr += ".";
    }
}

function applyCommand<T>(state: State<T>, cmd: Command, aggrApply: (s: State<T>) => void): State<T> {
    aggrApply(state);
    state.cycles += 1;
    if (cmd.type === "addx") {
        state.x += cmd.value;
    }
    return state
}
function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const start: State<number> = { x: 1, aggr: 0, cycles: 0 };
        const result = data.reduce((state, cmd) => applyCommand(state, cmd, manageCumulX), start);
        logger.result(result.aggr, [13140, 13720])
    }
    else {
        const start: State<string> = { x: 1, aggr: "", cycles: 0 };
        const result = data.reduce((state, cmd) => applyCommand(state, cmd, manageCrt), start);
        logger.debug(result.aggr)
        logger.result(result.aggr, [result_2_test, result_2])
    }
}

run(10, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])