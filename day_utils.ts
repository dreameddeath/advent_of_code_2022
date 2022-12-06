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

export function getRawData(day: number, test: Type,  part: Part): string {
    const testDataSuffix = test === Type.TEST ? "_test" : "";
    const current_test_phase_filename = `./data/day_${day}_${part === Part.PART_2 ? 2 : 1}${testDataSuffix}.dat`
    if (fs.existsSync(current_test_phase_filename)) {
        return fs.readFileSync(current_test_phase_filename, 'utf-8');
    }
    const global_test_phase_filename = `./data/day_${day}${testDataSuffix}.dat`;
    if (!fs.existsSync(global_test_phase_filename)) {
        throw new Error(`No data found for day ${day}`)
    }
    return fs.readFileSync(global_test_phase_filename, 'utf-8');
}

export function getData(day: number, test: Type, part: Part): string[] {
    return getRawData(day, test, part).split(/\r?\n/);
}

export function run(day: number, types: Type[], fct: (lines: string[], part: Part) => void, parts: Part[] = [Part.ALL]): void {
    console.log(`[RUNNING] Day ${day}`)
    parts.forEach(part => {
        types.forEach(type => {
            const name = Type[type];
            console.log(`[${name}][${part}] Running`)
            const start = new Date()
        
            fct(getData(day, type, part), part)
            const duration = (new Date()).getTime() - start.getTime()
            console.log(`[${name}][${part}] Done in ${duration} ms`)
        })
    })
}