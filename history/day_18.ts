import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";

type Coord = [number, number, number]


function parse(lines: string[]): Coord[] {
    return lines.map(line => {
        const parts = line.split(",");
        return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
    });
}

const SIDE_OFFSETS: Coord[] = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];

function toSide(n: number, o: number): number {
    return (n + 1) * 2 + o
}

function toNeightbourgsSides(cube: Coord): Coord[] {
    return SIDE_OFFSETS.map(o =>
        [
            toSide(cube[0], o[0]),
            toSide(cube[1], o[1]),
            toSide(cube[2], o[2])
        ]
    )
}

function toNeightbourgs(cube: Coord): Coord[] {
    return SIDE_OFFSETS.map(o =>
        [
            cube[0] + o[0],
            cube[1] + o[1],
            cube[2] + o[2]
        ]
    )
}

const MAX_SIZE = 64;
function coordToKey(coord: Coord) {
    return ((coord[0] * MAX_SIZE) + coord[1]) * MAX_SIZE + coord[2];
}

function keyToCoord(v: number): Coord {
    return [
        Math.floor((v / MAX_SIZE) / MAX_SIZE),
        Math.floor(v / MAX_SIZE) % MAX_SIZE,
        v % MAX_SIZE
    ];
}

function sideToCube(s: Coord): Coord {
    return [
        Math.round(s[0] / 2) - 1,
        Math.round(s[1] / 2) - 1,
        Math.round(s[2] / 2) - 1
    ]
}


enum State {
    LAVA,
    TRAPPED,
    FREE,
    UNKOWN
}

function calcCubeStateMap(data: Coord[], mapCube: ExtendedMap<number, State>): Coord[] {
    data.forEach(cube => mapCube.set(coordToKey(cube), State.LAVA));
    const maxCoord = data.flatMap(coord => coord).reduce((a, b) => Math.max(a, b));
    const minCoord = data.flatMap(coord => coord).reduce((a, b) => Math.min(a, b));;
    let unknownCubes: Coord[] = [];

    for (let x = minCoord; x <= maxCoord; ++x) {
        const isXExterior = x === minCoord || x === maxCoord;
        for (let y = minCoord; y <= maxCoord; ++y) {
            const isYExterior = y === minCoord || y === maxCoord;
            const isXYExterior = isXExterior && isYExterior;
            for (let z = minCoord; z <= maxCoord; ++z) {
                const cubeCoord: Coord = [x, y, z];
                const cubeKey = coordToKey([x, y, z]);
                if (mapCube.has(cubeKey)) {
                    continue;
                }
                const isExterior = isXYExterior || ((isXExterior || isYExterior) && (z === minCoord || z === maxCoord))
                if (isExterior ||
                    mapCube.get(coordToKey([x, y, z - 1])) === State.FREE ||
                    ((x > minCoord) && mapCube.get(coordToKey([x - 1, y, z])) === State.FREE) ||
                    ((y > minCoord) && mapCube.get(coordToKey([x, y - 1, z])) === State.FREE)
                ) {
                    mapCube.set(cubeKey, State.FREE);
                }
                else {
                    unknownCubes.push(cubeCoord);
                    mapCube.set(cubeKey, State.UNKOWN);
                }
            }
        }
    }
    while (unknownCubes.length > 0) {
        const unknownCubesForPass: Coord[] = [];
        let nbChanged = 0;
        unknownCubes.forEach(coord => {
            const isTouchingFree = toNeightbourgs(coord).find(coord => mapCube.get(coordToKey(coord)) === State.FREE) !== undefined;
            if (isTouchingFree) {
                nbChanged++;
                mapCube.set(coordToKey(coord), State.FREE);
            } else {
                unknownCubesForPass.push(coord);
            }
        })
        unknownCubes = unknownCubesForPass;
        if (nbChanged === 0) {
            break;
        }
    }
    for (const coord of unknownCubes) {
        mapCube.set(coordToKey(coord), State.TRAPPED);
    }
    return unknownCubes;
}

interface SideInfo {
    count: number,
    origCube: Coord[],
    badCube: Coord[]
}

function initSideInfo(): SideInfo {
    return { count: 0, origCube: [], badCube: [] };
}
//function countSides(cubes:Coord[],sideMap:new ExtendedMap<number, SideInfo>();)

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const mapSides = new ExtendedMap<number, SideInfo>();
    data.forEach(cube => {
        toNeightbourgsSides(cube)
            .forEach(side => {
                mapSides.apply(coordToKey(side), (info) => {
                    info.count++;
                    info.origCube.push(cube);
                    return info
                }, initSideInfo)
            })
    })

    if (part === Part.PART_1) {
        let totalSidesNotConnected = 0;
        mapSides.forEach((v) => {
            if (v.count === 1) { totalSidesNotConnected++ }
        })

        logger.result(totalSidesNotConnected, [64, 3650])
    }
    else {
        const mapCube = new ExtendedMap<number, State>();
        const trappedCubes = calcCubeStateMap(data, mapCube);
        logger.debug("Nb trapped " + trappedCubes.length)
        trappedCubes.forEach(cube => {
            toNeightbourgsSides(cube)
                .forEach(side => {
                    mapSides.apply(coordToKey(side), (info) => {
                        if (info.count === 1) {
                            info.count++;
                            info.badCube.push(cube)
                        }
                        return info
                    }, initSideInfo)
                })
        })
        let totalSidesNotConnected = 0;
        mapSides.forEach((v) => {
            if (v.count === 1) {
                totalSidesNotConnected++
            }
        })
        logger.result(totalSidesNotConnected, [58, 2118])
    }
}

run(18, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])
