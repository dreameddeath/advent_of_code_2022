import { cpuUsage } from "process";
import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { generator } from "../utils";

enum VextexPos {
    UP_LEFT = 0,
    UP_RIGHT = 1,
    DOWN_LEFT = 2,
    DOWN_RIGHT = 3
}

enum CellType {
    EMPTY,
    FREE,
    WALL
}

interface Coord {
    x: number,
    y: number
}
type Direction = "up" | "down" | "left" | "right";
const ALL_DIRECTIONS: Direction[] = ['up', "left", "down", "right"];
interface Cell {
    type: CellType,
    coord: Coord
    up?: CellTarget,
    down?: CellTarget,
    left?: CellTarget,
    right?: CellTarget
}

interface CellTarget {
    target: Cell;
    newMoveDirection: Direction
}

interface Data {
    world: Cell[][];
    instructions: Instruction[]
}

interface MoveInstruction {
    type: "move",
    distance: number;
}

interface RotateInstruction {
    type: "rotate",
    direction: "L" | "R"
}

type Instruction = MoveInstruction | RotateInstruction;
const instPattern = /\d+|R|L/g;
function parse(lines: string[]): Data {
    const [_, ending] = lines.splice(lines.length - 2, 2);
    const instructions: Instruction[] = [];
    let match;
    while ((match = instPattern.exec(ending)) !== null) {
        if (match[0] === "R" || match[0] === "L") {
            instructions.push({
                type: "rotate",
                direction: match[0]
            })
        } else {
            instructions.push({
                type: "move",
                distance: parseInt(match[0])
            })
        }
    }
    const width = lines.map(line => line.length).reduce((a, b) => Math.max(a, b));
    const world: Cell[][] = lines
        .map((line, y, all) => {
            const chars = line.split("");
            return [...generator(width)].map((_, x) => {
                return {
                    type: mapChar(chars[x] ?? " "),
                    coord: { x, y }
                } as Cell
            })
        });
    return {
        world,
        instructions
    };
}

function enrichCellForMap(cell: Cell, allLines: Cell[][]): Cell {
    if (cell.type !== CellType.FREE) {
        return cell;
    }
    cell.down = findNextCell(cell, allLines, "down");
    cell.up = findNextCell(cell, allLines, "up");
    cell.left = findNextCell(cell, allLines, "left");
    cell.right = findNextCell(cell, allLines, "right");
    return cell;
}

function findNextCell(cell: Cell, allLines: Cell[][], direction: Direction): CellTarget | undefined {
    const width = allLines[0].length;
    const height = allLines.length;
    let offset: Coord;
    switch (direction) {
        case "up": offset = { x: 0, y: -1 }; break;
        case "down": offset = { x: 0, y: 1 }; break;
        case "left": offset = { x: -1, y: 0 }; break;
        case "right": offset = { x: 1, y: 0 }; break;
    }

    let currCoord = { ...cell.coord };
    do {
        currCoord.x = (currCoord.x + offset.x) % width;
        currCoord.y = (currCoord.y + offset.y) % height;
        if (currCoord.x < 0) { currCoord.x += width; }
        if (currCoord.y < 0) { currCoord.y += height; }
        const nextCell = allLines[currCoord.y][currCoord.x];
        if (nextCell.type === CellType.FREE) {
            return {
                target: nextCell,
                newMoveDirection: direction,
            }
        } else if (nextCell.type === CellType.WALL) {
            return undefined;
        }
    } while (true)
}


function mapChar(char: string): CellType.EMPTY | CellType.FREE | CellType.WALL {
    return char === " " ? CellType.EMPTY : (char === "." ? CellType.FREE : CellType.WALL);
}

interface State {
    direction: Direction,
    cell: Cell
}
function applyMove(move: MoveInstruction, initState: State): State {
    let currCell = initState.cell;
    let currDirection = initState.direction;
    for (let pos = 0; pos < move.distance; ++pos) {
        let cellTarget = currCell[currDirection];
        if (cellTarget === undefined) {
            break;
        }
        currCell = cellTarget.target;
        currDirection = cellTarget.newMoveDirection;
    }

    return {
        direction: currDirection,
        cell: currCell
    }
}

function applyRotateToDirection(direction: Direction, rotation: "L" | "R"): Direction {
    switch (rotation) {
        case "L":
            switch (direction) {
                case "up": return "left";
                case "left": return "down";
                case "down": return "right";
                case "right": return "up";
            }
        case "R":
            switch (direction) {
                case "up": return "right";
                case "right": return "down";
                case "down": return "left";
                case "left": return "up";
            }
    }

}

function applyRotate(rotate: RotateInstruction, initState: State): State {
    return {
        direction: applyRotateToDirection(initState.direction, rotate.direction),
        cell: initState.cell
    }
}

function applyInstructions(data: Data, initState: State): State {
    return data.instructions.reduce((state, instruction) => {
        switch (instruction.type) {
            case "move": return applyMove(instruction, state)
            case "rotate": return applyRotate(instruction, state)
        }
    },
        initState)
}

function mapDirectionResult(direction: Direction): number {
    switch (direction) {
        case "up": return 3;
        case "left": return 2;
        case "down": return 1;
        case "right": return 0;
    }
}

function calcResult(state: State): number {
    return 1000 * (state.cell.coord.y + 1) +
        4 * (state.cell.coord.x + 1)
        + mapDirectionResult(state.direction)
}

function calcFaceSize(cells: Cell[][]): number {
    const width = cells[0].length;
    const height = cells.length;

    let xDivider = 1;
    let yDivider = 1;
    do {
        const xSize = width / xDivider;
        const ySize = height / yDivider;
        if (xSize === ySize && Math.floor(xSize) === xSize) {
            return xSize;
        }
        if (xSize > ySize) {
            xDivider++;
        } else {
            yDivider++;
        }
    } while (xDivider < width && yDivider < height)

    throw new Error("Shouldn't occurs");
}

interface CubeFaceLinks {
    left?: CubeFaceLink,
    right?: CubeFaceLink,
    up?: CubeFaceLink,
    down?: CubeFaceLink,
}

interface VertexInfo {
    coord: Coord,
    label: string
}

interface CubeFace {
    name: string,
    vextexes: [
        VertexInfo, // UP_LEFT
        VertexInfo, // UP RIGHT,
        VertexInfo, //BOTTOM_LEFT
        VertexInfo // BOTTOM_RIGHT
    ];
    links: CubeFaceLinks
}


interface CubeFaceLink {
    to: CubeFace,
    newMovingDirection: Direction,
}


interface FaceToFaceMapEntry {
    readonly x: number,
    readonly y: number,
    readonly vextex_map: {
        v1: {
            curr: VextexPos
            other: VextexPos
        },
        v2: {
            curr: VextexPos,
            other: VextexPos
        }
    }
}

interface SimpleFaceJointsCalcInfo {
    left: FaceToFaceMapEntry,
    right: FaceToFaceMapEntry,
    up: FaceToFaceMapEntry,
    down: FaceToFaceMapEntry,
}

/**
 * Calculate the faces and their links
 * @param world all the cells
 * @returns 
 */
function calcFolding(world: Cell[][]): CubeFace[] {
    //Create empty faces with only vertexes without labels
    const faces = initCubeFaces(world);

    const VERTEXES_LABEL = [...generator(8)].map((i) => "V" + (i + 1));

    //Init the cube face links for "simple" cases (direct attach)
    for (const face of faces) {
        const map: SimpleFaceJointsCalcInfo = calcMappingOfSimpleJointFaces(face);

        for (const otherFace of faces) {
            for (const [key, coord] of Object.entries(map) as [Direction, FaceToFaceMapEntry][]) {
                //face are joints, link them
                if (coord.x >= otherFace.vextexes[VextexPos.UP_LEFT].coord.x && coord.x <= otherFace.vextexes[VextexPos.DOWN_RIGHT].coord.x &&
                    coord.y >= otherFace.vextexes[VextexPos.UP_LEFT].coord.y && coord.y <= otherFace.vextexes[VextexPos.DOWN_RIGHT].coord.y) {

                    //init links
                    face.links[key] = {
                        to: otherFace,
                        newMovingDirection: key
                    }

                    //Init Vertex Mapping and labelling
                    for (const mapping of [coord.vextex_map.v1, coord.vextex_map.v2]) {
                        if (otherFace.vextexes[mapping.other].label !== "") {
                            face.vextexes[mapping.curr].label = otherFace.vextexes[mapping.other].label;
                        } else if (face.vextexes[mapping.curr].label !== "") {
                            otherFace.vextexes[mapping.other].label = face.vextexes[mapping.curr].label;
                        } else {
                            const newLabel = VERTEXES_LABEL.shift();
                            if (newLabel === undefined) {
                                throw new Error("Shouldn't occurs");
                            }
                            face.vextexes[mapping.curr].label = newLabel;
                            otherFace.vextexes[mapping.other].label = newLabel;
                        }
                    }

                }
            }
        }
    }

    //Try to create missing links between faces
    while (faces.flatMap(f => Object.keys(f.links)).length < 6 * 4) {
        for (const face of faces) {
            for (const direction of ALL_DIRECTIONS) {
                if (face.links[direction] !== undefined) {
                    continue;
                }
                //from a given direction, if you turn 3 times with the same rotation (and change face through that direction)
                // you come back to the initial edge 
                for (const orientation of ["L", "R"] as const) {
                    let nbRotations = 3;
                    let currFace = face;
                    //reverse direction to do as if you were coming from that edge
                    let currDirection = toMovingDirection(direction);
                    let found = true;
                    while (found && nbRotations > 0) {
                        nbRotations--;
                        //Rotate
                        const newDirection = applyRotateToDirection(currDirection, orientation);
                        //Change face
                        const newFace = currFace.links[newDirection]?.to;
                        //Last rotation, we are at the "right" face
                        if (nbRotations === 0) {
                            currDirection = newDirection;
                        }
                        else if (newFace !== undefined) {
                            //we need to correct the direction after having gone through the edge
                            currDirection = toMovingDirection(findOrigDirection(currFace, newFace));
                            currFace = newFace;
                        }
                        //The link doesn't exist yet, exit the loop
                        else {
                            found = false;
                        }
                    }

                    //The origin face has been found (and the direction)
                    if (found) {
                        currFace.links[currDirection] = {
                            to: face,
                            newMovingDirection: toMovingDirection(direction),
                        }
                        face.links[direction] = {
                            to: currFace,
                            newMovingDirection: toMovingDirection(currDirection),
                        }
                    }
                }
            }
        }
    }

    //Build missing labels on vertexes using links between faces
    while (faces.flatMap(face => face.vextexes.map(v => v.label)).filter(c => c === "").length > 0) {
        for (const face of faces) {
            for (const vertexPos of [VextexPos.UP_LEFT, VextexPos.UP_RIGHT, VextexPos.DOWN_LEFT, VextexPos.DOWN_RIGHT]) {
                if (face.vextexes[vertexPos].label === "") {
                    face.vextexes[vertexPos].label = findMatchingOtherNode(vertexPos, face)
                    if (face.vextexes[vertexPos].label === '') { //Vertex label not found, affect a new label
                        const newLabel = VERTEXES_LABEL.shift();
                        if (newLabel === undefined) {
                            throw new Error("Shouldn't occurs");
                        }
                        face.vextexes[vertexPos].label = newLabel;
                    }
                }
            }
        }
    }

    //All labels and links found exit
    return faces;
}

function applyCellRelinkForAllLinkFaces(world: Cell[][], face: CubeFace, direction: Direction) {
    const linkInfo = face.links[direction]!;
    const otherFaceDirection = findOrigDirection(face, linkInfo.to);
    const faceVertex = getVertexInfo(face, direction);
    const otherVertex = getVertexInfo(linkInfo.to, otherFaceDirection);
    if (faceVertex[0].label !== otherVertex[0].label) {
        otherVertex.reverse();
    }

    const calcOffsetSource = calcOffset(faceVertex[0].coord, faceVertex[1].coord);
    const calcOffsetTarget = calcOffset(otherVertex[0].coord, otherVertex[1].coord);
    let currSourceCoord = { ...faceVertex[0].coord };
    let currTargetCoord = { ...otherVertex[0].coord };
    do {
        const newTarget = world[currTargetCoord.y][currTargetCoord.x];
        if (newTarget.type === CellType.WALL) {
            world[currSourceCoord.y][currSourceCoord.x][direction] = undefined;
        } else {
            world[currSourceCoord.y][currSourceCoord.x][direction] = {
                target: newTarget,
                newMoveDirection: linkInfo.newMovingDirection
            };
        }

        currSourceCoord.x += calcOffsetSource.x;
        currSourceCoord.y += calcOffsetSource.y;
        currTargetCoord.x += calcOffsetTarget.x;
        currTargetCoord.y += calcOffsetTarget.y;
    } while (
        !(
            (currSourceCoord.x - calcOffsetSource.x) === faceVertex[1].coord.x &&
            (currSourceCoord.y - calcOffsetSource.y) === faceVertex[1].coord.y
        )
    )
}

function calcOffset(source: Coord, dest: Coord): Coord {
    return {
        x: Math.sign(dest.x - source.x),
        y: Math.sign(dest.y - source.y),
    }
}

function getVertexInfo(face: CubeFace, direction: Direction): [VertexInfo, VertexInfo] {
    switch (direction) {
        case "left": return [face.vextexes[VextexPos.UP_LEFT], face.vextexes[VextexPos.DOWN_LEFT]];
        case "right": return [face.vextexes[VextexPos.UP_RIGHT], face.vextexes[VextexPos.DOWN_RIGHT]];
        case "down": return [face.vextexes[VextexPos.DOWN_LEFT], face.vextexes[VextexPos.DOWN_RIGHT]];
        case "up": return [face.vextexes[VextexPos.UP_LEFT], face.vextexes[VextexPos.UP_RIGHT]];

    }
}

function calcMappingOfSimpleJointFaces(face: CubeFace): SimpleFaceJointsCalcInfo {
    return {
        left: {
            x: face.vextexes[VextexPos.UP_LEFT].coord.x - 1,
            y: face.vextexes[VextexPos.UP_LEFT].coord.y,
            vextex_map: {
                v1: { curr: VextexPos.UP_LEFT, other: VextexPos.UP_RIGHT },
                v2: { curr: VextexPos.DOWN_LEFT, other: VextexPos.DOWN_RIGHT }
            }
        },
        right: {
            x: face.vextexes[VextexPos.DOWN_RIGHT].coord.x + 1,
            y: face.vextexes[VextexPos.DOWN_RIGHT].coord.y,
            vextex_map: {
                v1: { curr: VextexPos.UP_RIGHT, other: VextexPos.UP_LEFT },
                v2: { curr: VextexPos.DOWN_RIGHT, other: VextexPos.DOWN_LEFT }
            }
        },
        up: {
            x: face.vextexes[VextexPos.UP_LEFT].coord.x,
            y: face.vextexes[VextexPos.UP_LEFT].coord.y - 1,
            vextex_map: {
                v1: { curr: VextexPos.UP_LEFT, other: VextexPos.DOWN_LEFT },
                v2: { curr: VextexPos.UP_RIGHT, other: VextexPos.DOWN_RIGHT }
            }
        },
        down: {
            x: face.vextexes[VextexPos.DOWN_RIGHT].coord.x,
            y: face.vextexes[VextexPos.DOWN_RIGHT].coord.y + 1,
            vextex_map: {
                v1: { curr: VextexPos.DOWN_LEFT, other: VextexPos.UP_LEFT },
                v2: { curr: VextexPos.DOWN_RIGHT, other: VextexPos.UP_RIGHT }
            }
        }
    } as const;
}

function initCubeFaces(world: Cell[][]): CubeFace[] {
    const faces: CubeFace[] = [];

    const width = world[0].length;
    const height = world.length;
    const faceSize = calcFaceSize(world);

    let currName = "A".charCodeAt(0);
    for (let y = 0; y < height; y += faceSize) {
        for (let x = 0; x < width; x += faceSize) {
            const cell = world[y][x];
            if (cell.type !== CellType.EMPTY) {
                faces.push({
                    name: String.fromCharCode(currName++),
                    vextexes: [
                        { coord: { x, y }, label: "" },
                        { coord: { x: x + faceSize - 1, y }, label: "" },
                        { coord: { x, y: y + faceSize - 1 }, label: "" },
                        { coord: { x: x + faceSize - 1, y: y + faceSize - 1 }, label: "" }
                    ],
                    links: {}
                });
            }
        }
    }
    return faces;
}

function findOrigDirection(source: CubeFace, target: CubeFace): Direction {
    for (const key of Object.keys(target.links) as Direction[]) {
        const link = target.links[key]!;
        if (source === link.to) {
            return key as Direction;
        }
    }
    throw new Error("Shouldn't occurs")
}
function findMatchingOtherLabels(direction: Direction, face: CubeFace): [string, string] {
    const found = face.links[direction]!;
    for (const [key, other] of Object.entries(found.to.links) as [Direction, CubeFaceLink][]) {
        if (other.to === face) {
            switch (key) {
                case "up": return [found.to.vextexes[VextexPos.UP_LEFT].label, found.to.vextexes[VextexPos.UP_RIGHT].label];
                case "down": return [found.to.vextexes[VextexPos.DOWN_LEFT].label, found.to.vextexes[VextexPos.DOWN_RIGHT].label];
                case "right": return [found.to.vextexes[VextexPos.UP_RIGHT].label, found.to.vextexes[VextexPos.DOWN_RIGHT].label];
                case "left": return [found.to.vextexes[VextexPos.UP_LEFT].label, found.to.vextexes[VextexPos.DOWN_LEFT].label];
            }
        }
    }
    return ['', '']
}

function findMatchingMissingLabel(direction: Direction, face: CubeFace, other: string): string {
    return findMatchingOtherLabels(direction, face).filter(label => label !== other && label !== '')[0] ?? ''
}


function findMatchingMissingLabelForPossibilites(face: CubeFace, toLookForTuples: [Direction, VextexPos][]): string {
    for (const toLookFor of toLookForTuples) {
        if (face.vextexes[toLookFor[1]].label === '') {
            continue;
        }
        const found = findMatchingMissingLabel(toLookFor[0], face, face.vextexes[toLookFor[1]].label)
        if (found !== '') {
            return found;
        }
    }
    return '';
}


function findMatchingOtherNode(vertexPos: VextexPos, face: CubeFace): string {
    switch (vertexPos) {
        case VextexPos.UP_LEFT:
            return findMatchingMissingLabelForPossibilites(face, [["up", VextexPos.UP_RIGHT], ["left", VextexPos.DOWN_LEFT]])
        case VextexPos.DOWN_LEFT:
            return findMatchingMissingLabelForPossibilites(face, [["left", VextexPos.UP_LEFT], ["down", VextexPos.DOWN_RIGHT]])
        case VextexPos.UP_RIGHT:
            return findMatchingMissingLabelForPossibilites(face, [["up", VextexPos.UP_LEFT], ["right", VextexPos.DOWN_RIGHT]])
        case VextexPos.DOWN_RIGHT:
            return findMatchingMissingLabelForPossibilites(face, [["down", VextexPos.DOWN_LEFT], ["right", VextexPos.UP_RIGHT]])
    }
}

function toMovingDirection(sourceDirection: Direction): Direction {
    switch (sourceDirection) {
        case "up": return "down";
        case "down": return "up";
        case "left": return "right";
        case "right": return "left";
    }
}




function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const initState: State = {
        direction: "right",
        cell: data.world.flatMap(cells => cells.find(cell => cell.type === CellType.FREE))[0]!
    }
    data.world.map((cells, _, allLines) => cells.map((cell) => enrichCellForMap(cell, allLines)));
    if (part === Part.PART_1) {
        const result = applyInstructions(data, initState)
        logger.result(calcResult(result), [6032, 66292])
    }
    else {
        const faces = calcFolding(data.world);
        for (const face of faces) {
            for (const direction of ALL_DIRECTIONS) {
                applyCellRelinkForAllLinkFaces(data.world, face, direction);
            }
        }
        const result = applyInstructions(data, initState)
        logger.result(calcResult(result), [5031, 127012])
    }
}

run(22, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2]);

