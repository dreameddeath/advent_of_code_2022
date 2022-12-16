import "./utils";
import * as fs from 'fs';

export enum Type {
    TEST = "TEST",
    RUN = "RUN"
}

export enum Part {
    ALL = "BOTH",
    PART_1 = "PART 1",
    PART_2 = "PART 2"
}

export const failures = {
    test: { count: 0, parts: [] as string[] },
    run: { count: 0, parts: [] as string[] },
}

export function getRawData(day: number, type: Type, part: Part, logger: Logger): string {
    const testDataSuffix = type === Type.TEST ? "_test" : "";
    const current_test_phase_filename = `./data/day_${day}_${part === Part.PART_2 ? 2 : 1}${testDataSuffix}.dat`
    if (fs.existsSync(current_test_phase_filename)) {
        return fs.readFileSync(current_test_phase_filename, 'utf-8');
    }
    const global_test_phase_filename = `./data/day_${day}${testDataSuffix}.dat`;
    if (!fs.existsSync(global_test_phase_filename)) {
        logger.error("No data file found");
        throw new Error(`No data found for day ${day}`)
    }
    return fs.readFileSync(global_test_phase_filename, 'utf-8');
}

export function getData(day: number, type: Type, part: Part, logger: Logger): string[] {
    return getRawData(day, type, part, logger).split(/\r?\n/);
}

export interface Logger {
    isdebug(): boolean,
    debug(message: string): void,
    log(message: string): void,
    error(message: string): void,
    result<T>(value: T, testResult?: T | [T, T]): void,
}

const emptyLogger: Logger = {
    isdebug: () => false,
    debug: () => { },
    log: () => { },
    error: () => { },
    result: () => { }
}

function calcSuccessMessage<T>(type: Type, value: T, expectedResult: T | [T, T] | undefined): "OK" | "KO" | "" {
    if (expectedResult === undefined) {
        return "";
    }
    if (Array.isArray(expectedResult)) {
        const expectedResultValue = type === Type.TEST ? expectedResult[0] : expectedResult[1];
        return value === expectedResultValue ? "OK" : "KO";
    } else if (type === Type.TEST) {
        return value === expectedResult ? "OK" : "KO";
    } else {
        return "";
    }
}

export type Solver<BTAG> = (lines: string[], part: Part, type: Type, logger: Logger, benchTag?: BTAG) => void;

export function doRun<BTAG>(fct: Solver<BTAG>, data: string[], part: Part, type: Type, logger: Logger, benchTag?: BTAG): number {
    const start = new Date();
    fct(data, part, type, logger, benchTag);
    return (new Date()).getTime() - start.getTime();
}


let _disableTests = false;

export function disableTests() {
    _disableTests = true;
}
export function run<BTAG>(day: number, types: Type[], fct: Solver<BTAG>, parts: Part[] = [Part.ALL], opt?: { bench?: boolean, debug?: boolean, benchTags?: BTAG[] }): void {
    console.log(`[RUNNING] Day ${day}`);
    parts.forEach(part => {
        types.forEach(type => {
            if (_disableTests && type == Type.TEST) {
                return;
            }
            const logger: Logger = buildLogger(day, opt?.debug, part, type)

            logger.log("Running")
            const data = getData(day, type, part, logger);
            if (opt?.bench) {
                for (const benchTag of opt?.benchTags ?? [undefined]) {
                    const benchedResult = [];
                    for (let count = 0; count < 10; count++) {
                        benchedResult.push(doRun(fct, data, part, type, emptyLogger, benchTag));
                    }
                    const duration = benchedResult.reduce((a, b) => a + b) / benchedResult.length;
                    const benchTypeLabel = benchTag ?? "";
                    logger.log(`Bench ${benchTypeLabel} done in agv ${duration} ms`)
                }
            } else {
                const duration = doRun(fct, data, part, type, logger);
                logger.log(`Done in ${duration} ms`)
            }
        })
    })
}

function buildLogger(day: number, debugMode: boolean | undefined, part: Part, type: Type): Logger {
    const name = Type[type];
    return {
        isdebug: debugMode ? (() => true) : (() => false),
        debug: debugMode ? ((message: string) => console.log(`[${name}][${part}] ${message}`)) : (() => { }),
        log: (message: string) => console.log(`[${name}][${part}] ${message}`),
        error: (message: string) => console.error(`[${name}][${part}] ${message}`),
        result: <T>(value: T, result?: T | [T, T]) => {
            const result_value = calcSuccessMessage(type, value, result);
            const finalMessage = `[${name}][${part}] RESULT ${result_value} ====>${value}<====`;
            if (result_value === "KO") {
                const target = type === Type.RUN ? failures.run : failures.test;
                target.count++;
                target.parts.push(`[DAY ${day} ${part}]`)
                console.error(finalMessage);
            } else {
                console.log(finalMessage);
            }

        }
    };
}
