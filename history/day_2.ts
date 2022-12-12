import { applyMapOnItem, forcePresent } from "../utils";
import { Logger, Part, run, Type } from "../day_utils"
enum Play {
    ROCK = 1,
    PAPER = 2,
    SCISSORS = 3
}
enum Result {
    LOSS = 0,
    DRAW = 3,
    WIN = 6
}


const parseMap = {
    "A": Play.ROCK,
    "B": Play.PAPER,
    "C": Play.SCISSORS,
    "X": Play.ROCK,
    "Y": Play.PAPER,
    "Z": Play.SCISSORS,
}

type KEYS = keyof typeof parseMap;

const parseMapPart2 = {
    "X": Result.LOSS,
    "Y": Result.DRAW,
    "Z": Result.WIN,
}


function getResult(other: Play, me: Play): Result {
    if (me === other) {
        return Result.DRAW;
    }
    if (me === Play.ROCK && other === Play.SCISSORS) {
        return Result.WIN;
    } else if (me === Play.SCISSORS && other === Play.ROCK) {
        return Result.LOSS;
    }

    return (other < me) ? Result.WIN : Result.LOSS;
}

function gain(round: [Play, Play]): number {
    const roundRes = getResult(round[0], round[1]);
    const res = round[1] + roundRes;
    return res;
}

const allPlays = [Play.PAPER, Play.ROCK, Play.SCISSORS];
const allResults = [Result.DRAW, Result.LOSS, Result.WIN];
const mapRequestedPlay: Map<Play, Map<Result, Play>> = new Map();
allPlays.forEach(other => {
    const mapResults = new Map<Result, Play>();
    mapRequestedPlay.set(other, mapResults);
    allResults.forEach(expected =>
        mapResults.set(expected, allPlays.filter(play => getResult(other, play) === expected)[0])
    )
});

function parsePart1(lines: string[]): [Play, Play][] {
    return lines.map(line => [applyMapOnItem(line[0], parseMap), applyMapOnItem(line[2], parseMap)]);
}

function parsePart2(lines: string[]): [Play, Result][] {
    return lines.map(line => {
        return [
            applyMapOnItem(line[0], parseMap),
            applyMapOnItem(line[2], parseMapPart2)
        ];
    });
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    if (part === Part.PART_1) {
        const result = parsePart1(lines)
            .map(round => gain(round))
            .reduce((a, b) => a + b)
        logger.result(result, [15, 11841])
    }
    else {
        const result = parsePart2(lines)
            .map(round => [
                round[0],
                forcePresent(mapRequestedPlay.get(round[0])?.get(round[1]))
            ] as [Play, Play])
            .map(round => gain(round))
            .reduce((a, b) => a + b);
        logger.result(result, [12, 13022]);
    }
}

run(2, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])