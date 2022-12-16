import { Logger, Part, run, Type } from "../day_utils"
import { forcePresent, generator, genericSort } from "../utils";

interface Coord {
    x: number,
    y: number
}
interface Data {
    sensor: Coord,
    beacon: Coord
}

interface RangeManhattan {
    start: Coord,
    dist: Dist,
    beacon: Coord,
}

interface Dist {
    xOffset: number,
    yOffset: number,
    total: number,
}

interface RowRange {
    y: number,
    minX: number,
    maxX: number,
}


const pattern = /Sensor at x=(-?\d+), y=(-?\d+): closest beacon is at x=(-?\d+), y=(-?\d+)/;
function parse(lines: string[]): Data[] {
    return lines.map(line => {
        const match = forcePresent(pattern.exec(line));
        return {
            sensor: {
                x: parseInt(match[1]),
                y: parseInt(match[2]),
            },
            beacon: {
                x: parseInt(match[3]),
                y: parseInt(match[4]),
            }
        } satisfies Data
    });
}


function distance(a: Coord, b: Coord): Dist {
    const xOffset = Math.abs(a.x - b.x);
    const yOffset = Math.abs(a.y - b.y);
    return {
        xOffset,
        yOffset,
        total: xOffset + yOffset
    }
}

let display: (r: RangeManhattan) => RangeManhattan = (r) => r;

function rangeOfSensor(data: Data): RangeManhattan {
    const dist = distance(data.sensor, data.beacon);
    return display({
        start: {
            x: data.sensor.x,
            y: data.sensor.y,
        },
        dist,
        beacon: data.beacon
    })
}

function calcRowRange(a: RangeManhattan, row: number): RowRange | undefined {
    const distRow = Math.abs(a.start.y - row);
    const xDistance = a.dist.total - distRow;

    if (xDistance < 0) {
        return undefined;
    }

    return {
        y: row,
        minX: a.start.x - xDistance,
        maxX: a.start.x + xDistance,
    }
}

function excludeBeacon(rowRange: RowRange | undefined, beacon: Coord): RowRange[] {
    if (rowRange === undefined) {
        return [];
    }
    return excludeRowRange(rowRange, { y: beacon.y, minX: beacon.x, maxX: beacon.x });
}

function intersectRowRange(a: RowRange, b: RowRange): RowRange | undefined {
    if (a.y !== b.y) {
        return undefined;
    }
    if (a.minX > b.maxX || a.maxX < b.minX) {
        return undefined;
    }
    return {
        y: a.y,
        minX: Math.max(a.minX, b.minX),
        maxX: Math.min(a.maxX, b.maxX)
    }
}

function excludeRowRange(orig: RowRange, toExclude: RowRange): RowRange[] {
    const intersect = intersectRowRange(orig, toExclude);
    if (intersect === undefined) {
        return [orig];
    }
    if (intersect.minX === orig.minX && intersect.maxX === orig.maxX) {
        return [];
    } else if (toExclude.minX > orig.minX && toExclude.maxX < orig.maxX) {
        return [
            { y: orig.y, minX: orig.minX, maxX: toExclude.minX - 1 },
            { y: orig.y, minX: toExclude.maxX + 1, maxX: orig.maxX }
        ];
    } else if (toExclude.maxX >= orig.maxX) {
        return [
            { y: orig.y, minX: orig.minX, maxX: toExclude.minX - 1 }
        ];
    } else {
        return [
            { y: orig.y, minX: toExclude.maxX + 1, maxX: orig.maxX }
        ];
    }
}

function isContiguous(left: RowRange | undefined, right: RowRange | undefined): boolean {
    if (left === undefined || right === undefined) {
        return false;
    }
    return left.y === right.y && left.maxX + 1 === right.minX;
}

function unionRows(input: RowRange[], newRange: RowRange | undefined): RowRange[] {
    if (newRange === undefined) {
        return input;
    }
    const intersections = input.mapNonNull(r => intersectRowRange(r, newRange));
    const newRangeSplitted = intersections.reduce((splitted, i) => splitted.flatMap(s => excludeRowRange(s, i)), [newRange]);
    const range = [...input, ...newRangeSplitted].sort(genericSort((r) => r.minX));
    return range.flatMap((r, i, all) => {
        if (isContiguous(all[i - 1], r)) {
            return [];
        }
        const max = all.length;
        const newR: RowRange = { ...r };
        for (let pos = i + 1; pos < max; pos++) {
            const otherRange = all[pos];
            if (!isContiguous(newR, otherRange)) {
                break;
            }
            newR.maxX = otherRange.maxX;
        }
        return [newR];
    });
}

function displayRange(logger: Logger, r: RangeManhattan, maxX: number, maxY: number, targetRow: number): RangeManhattan {
    if (!logger.isdebug()) {
        return r;
    }

    const notMatchingRowRange: RowRange = { y: 0, minX: maxX + 1, maxX: maxX + 2 };
    logger.debug("\n" + [...generator(maxY + 1)].map(
        (y) => {
            const match = calcRowRange(r, y) ?? notMatchingRowRange;
            const char = (y === targetRow) ? "%" : "#";
            return [...generator(maxX + 1)].map(
                (x) => {
                    if (x === r.start.x && y === r.start.y) {
                        return "S";
                    }
                    if (x === r.beacon.x && y === r.beacon.y) {
                        return "B";
                    }
                    return (x >= match.minX && x <= match.maxX) ? char : "."
                }).join("")
        }
    ).join("\n"))

    return r;
}

interface Rectangle {
    type: "rect",
    start: Coord,
    end: Coord
}

interface Segment {
    start: number,
    end: number,
}


function buildSegments(coords: number[]): Segment[] {
    coords.sort(genericSort(a => a));
    return coords.filter((v, i, all) => v === 0 || v !== all[i - 1]).flatMap((v, i, all) => i === 0 ? [] : [{ start: all[i - 1], end: v }satisfies Segment]);
}


const angle = Math.PI / 4;

const Rotations = {
    toNewSpace: {
        cos: Math.cos(angle),
        sin: Math.sin(angle)

    },
    toOrig: {
        cos: Math.cos(-angle),
        sin: Math.sin(-angle),
    }
}

function calcCoords(r: RangeManhattan): [Coord, Coord, Coord, Coord] {
    return [{
        x: r.start.x - r.dist.total,
        y: r.start.y

    }, {
        x: r.start.x,
        y: r.start.y - r.dist.total

    }, {
        x: r.start.x + r.dist.total,
        y: r.start.y

    }, {
        x: r.start.x,
        y: r.start.y + r.dist.total
    }]
}

function rotate(r: Coord, toOrig: boolean): Coord {
    const tri = toOrig ? Rotations.toOrig : Rotations.toNewSpace

    return {
        x: tri.cos * r.x - r.y * tri.sin,
        y: tri.sin * r.x + r.y * tri.cos
    }
}

function rotateManhattanToRect(r: RangeManhattan): Rectangle {
    const coordsNotTransformed = calcCoords(r);
    const coords = coordsNotTransformed.map(c => rotate(c, false));
    const inverted = coords.map(c => rotate(c, true));
    const allX = coords.map(c => c.x).sort(genericSort(a => a));
    const allY = coords.map(c => c.y).sort(genericSort(a => a));


    return {
        type: "rect",
        start: {
            x: allX[0], y: allY[0]
        },
        end: {
            x: allX[3], y: allY[3]
        }
    }
}

function rotateBack(r: Rectangle, max: number): Coord[] | undefined {
    const coords = [{
        x: r.start.x,
        y: r.start.y
    },
    {
        x: r.start.x,
        y: r.end.y
    },
    {
        x: r.end.x,
        y: r.start.y
    },
    {
        x: r.end.x,
        y: r.end.y
    }
    ].map(c => rotate(c, true)).filter(c => c.x >= 0 && c.x <= max && c.y >= 0 && c.y <= max);

    if (coords.length < 4) {
        return undefined;
    } else {
        return coords;
    }
}

function hasNoIntersection(r1: Rectangle, r2: Rectangle): boolean {
    const hasNoCommonX = (r2.end.x <= r1.start.x) || (r1.end.x <= r2.start.x);
    const hasNoCommonY = (r2.end.y <= r1.start.y) || (r1.end.y <= r2.start.y)
    return hasNoCommonX || hasNoCommonY;
}

function intersectRect(r1: Rectangle, r2: Rectangle): Rectangle | undefined {
    if (hasNoIntersection(r1, r2)) {
        return undefined;
    }

    const start: Coord = {
        x: Math.max(r1.start.x, r2.start.x),
        y: Math.max(r1.start.y, r2.start.y)
    };
    const end: Coord = {
        x: Math.min(r1.end.x, r2.end.x),
        y: Math.min(r1.end.y, r2.end.y)
    }
    return {
        type: "rect",
        start,
        end
    }
}



function excludeRect(rect: Rectangle, toExclude: Rectangle): Rectangle[] {
    const intersection = intersectRect(rect, toExclude);
    if (intersection === undefined) {
        return [rect];
    }

    const xSegments = buildSegments([rect.start.x, rect.end.x, intersection.start.x, intersection.end.x]);
    const ySegments = buildSegments([rect.start.y, rect.end.y, intersection.start.y, intersection.end.y]);
    const allRects = xSegments
        .flatMap(xSeg => ySegments.map(ySeg => { return { type: "rect", start: { x: xSeg.start, y: ySeg.start }, end: { x: xSeg.end, y: ySeg.end } } satisfies Rectangle }));
    const preMerged = allRects.filter(newRect => hasNoIntersection(newRect, intersection));
    const results = preMerged.reduce((merged, item) => {
        if (merged.length === 0) {
            return [item];
        }
        const previous = merged[merged.length - 1];
        //Same bottom
        if (previous.end.y === item.start.y && previous.start.x === item.start.x && previous.end.x === item.end.x) {
            previous.end = item.end;
        }
        //Same right
        else if (previous.end.x === item.start.x && previous.start.y === item.start.y && previous.end.y === item.end.y) {
            previous.end = item.end;
        } else {
            merged.push(item)
        }
        return merged;
    }, [] as Rectangle[])
        ;
    return results;
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const datas = parse(lines);
    display = (r: RangeManhattan) => r;
    const ranges = datas.map(d => rangeOfSensor(d));

    if (part === Part.PART_1) {

        const targetRow = type == Type.TEST ? 10 : 2000000;
        if (type === Type.TEST) {
            display = (r: RangeManhattan) => displayRange(logger, r, 25, 22, targetRow)
        }
        const potentialRanges = ranges
            .flatMap(data => excludeBeacon(calcRowRange(data, targetRow), data.beacon))
        const resultRanges = potentialRanges
            .reduce((ranges, range) => unionRows(ranges, range), [] as RowRange[]);
        const result = resultRanges
            .reduce((total, r) => total + (r.maxX - r.minX + 1), 0);
        logger.result(result, [26, 5688618])
    }
    else {
        const max = type == Type.TEST ? 20 : 4000000;
        const regionSquareRotated = rotateManhattanToRect({
            beacon: { x: max / 2, y: max / 2 },
            start: { x: max / 2, y: max / 2 },
            dist: { xOffset: max / 2, yOffset: max / 2, total: 2 * max }
        });

        const rotatedExcludedRegions = ranges.map(r => rotateManhattanToRect(r));
        const remainingRangesRotated = rotatedExcludedRegions.reduce((rects, toExclude) => rects.flatMap(r => excludeRect(r, toExclude)), [regionSquareRotated] as Rectangle[])
        const remainingRanges = remainingRangesRotated
            .map(r => {
                const area = (r.end.x - r.start.x) * (r.end.y - r.start.y);
                return {
                    rect: r,
                    area: area
                }
            })
            .mapNonNull(rInfo => {
                const coords = rotateBack(rInfo.rect, max);
                if (coords === undefined) {
                    return undefined;
                }
                return {
                    area: rInfo.area,
                    coords: coords
                }
            });
        const matchingAreas = remainingRanges.filter(rInfo => rInfo.area > 0.8 && rInfo.area < 2)
        if (matchingAreas.length !== 1) {
            throw new Error("Bad filtering");
        }
        const coordFinal = matchingAreas[0].coords.reduce((a, b) => { return { x: a.x + b.x, y: a.y + b.y } }, { x: 0, y: 0 } satisfies Coord)
        const xAvg = Math.round(coordFinal.x / matchingAreas[0].coords.length);
        const yAvg = Math.round(coordFinal.y / matchingAreas[0].coords.length);
        const result = BigInt(xAvg) * 4000000n + BigInt(yAvg);
        logger.result(result, [56000011n, 12625383204261n])
    }
}

run(15, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2], { debug: false })