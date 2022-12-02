import { Part, run, Type } from "./day_utils"
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

function gain(round: Play[]): number {
    const roundRes = getResult(round[0], round[1]);
    const res = round[1] + roundRes;
    return res;
}

const allPlays = [Play.PAPER, Play.ROCK, Play.SCISSORS];
const allResults = [Result.DRAW, Result.LOSS, Result.WIN];
const mapRequestedPlay:Map<Play,Map<Result,Play>>=new Map();
allPlays.forEach(other=>{
    const mapResults = new Map<Result,Play>(); 
    mapRequestedPlay.set(other,mapResults);
    allResults.forEach(expected=>
         mapResults.set(expected,allPlays.filter(play => getResult(other, play) === expected)[0])
    )
    });
/*function findRequestedPlay(other: Play, expectedResult: Result): Play {
    return [Play.PAPER, Play.ROCK, Play.SCISSORS].filter(play => getResult(other, play) === expectedResult)[0];
}*/


function parsePart1(lines: string[]): Play[][] {
    return lines.map(line => line.split(" ")
        .map(v => parseMap[v as keyof typeof parseMap])
    ).filter(round => round.length === 2);
}

function parsePart2(lines: string[]): [Play, Result][] {
    return lines.map(line => {
        const parts = line.split(" ");
        return [
            parseMap[parts[0] as keyof typeof parseMap],
            parseMapPart2[parts[1] as keyof typeof parseMapPart2]
        ] as [Play, Result];
    });
}


function puzzle(lines: string[], part: Part): void {
    if (part === Part.PART_1) {
        const result = parsePart1(lines).map(round => gain(round)).reduce((a, b) => a + b)
        console.log(`Result ${result}`)
    }
    else {
        const result = parsePart2(lines)
            .map(round => [round[0], mapRequestedPlay.get(round[0])?.get(round[1]) as Play])
            .map(round => gain(round)).reduce((a, b) => a + b);
        console.log(`Result ${result}`);
    }
}

run(2, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])