import * as fs from 'fs';

export enum Type {
    TEST,
    RUN
}

export enum Part {
    ALL = "BOTH",
    PART_1 = "PART 1",
    PART_2 = "PART 2"
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
    debug(message: string): void,
    log(message: string): void,
    error(message: string): void,
    result<T>(value: T, testResult?: T | [T, T]): void,
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

export function run(day: number, types: Type[], fct: (lines: string[], part: Part, type: Type, logger: Logger) => void, parts: Part[] = [Part.ALL], debug: boolean = false): void {
    console.log(`[RUNNING] Day ${day}`);
    parts.forEach(part => {
        types.forEach(type => {
            const logger: Logger = {
                debug: debug ? ((message: string) => console.log(`[${name}][${part}] ${message}`)) : (() => { }),
                log: (message: string) => console.log(`[${name}][${part}] ${message}`),
                error: (message: string) => console.error(`[${name}][${part}] ${message}`),
                result: <T>(value: T, result?: T | [T, T]) => {
                    const result_value = calcSuccessMessage(type, value, result);
                    const finalMessage = `[${name}][${part}] RESULT ${result_value} ====>${value}<====`
                    if (result_value === "KO") {
                        console.error(finalMessage);
                    } else {
                        console.log(finalMessage)
                    }

                }
            }

            const name = Type[type];
            logger.log("Running")
            const start = new Date()

            fct(getData(day, type, part, logger), part, type, logger)
            const duration = (new Date()).getTime() - start.getTime()
            logger.log(`Done in ${duration} ms`)
        })
    })
}