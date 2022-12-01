import { da } from 'date-fns/locale';
import * as fs from 'fs';
import { type } from 'os';

export enum Type {
    TEST,
    RUN
}

export enum Part {
    ALL = "BOTH",
    PART_1 = "PART 1",
    PART_2 = "PART 2"
}

export function getRawData(day: number, test: Type, testData: string, part: Part): string {
    if (test === Type.TEST) {
        return testData;
    }
    const current_test_phase_filename = `./data/day_${day}_${part === Part.PART_2 ? 2 : 1}.dat`
    if (fs.existsSync(current_test_phase_filename)) {
        return fs.readFileSync(current_test_phase_filename, 'utf-8');
    }
    return fs.readFileSync(`./data/day_${day}.dat`, 'utf-8');
}

export function getData(day: number, test: Type, testData: string, part: Part): string[] {
    return getRawData(day,test,testData,part).split(/\r?\n/);
}

export function run(day: number, testData: string | [string, string], types: Type[], fct: (lines: string[], part: Part) => void, parts: Part[] = [Part.ALL]): void {
    parts.forEach(part => {
        types.forEach(type => {
            const name = Type[type];
            console.log(`[${name}][${part}] Running`)
            const start = new Date()
            const effectiveTestData = !Array.isArray(testData) ? testData : ((part === Part.PART_2) ? testData[1] : testData[0])
            fct(getData(day, type, effectiveTestData, part), part)
            const duration = (new Date()).getTime() - start.getTime()
            console.log(`[${name}][${part}] Done in ${duration} ms`)
        })
    })
}

export function* generator(max: number): Generator<number> {
    let i = 0;
    while (i < max) {
        yield (i++)
    }
}
