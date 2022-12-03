export function* generator(max: number): Generator<number> {
    let i = 0;
    while (i < max) {
        yield (i++)
    }
}
export enum GroupImpact {
    APPEND = 0,
    CHANGE = 1,
    SKIP_AND_CHANGE = 2,
    SKIP = 3
}

export function reduceList<RES, T>(fct: (groups: RES[], item: T, index: number, orig: T[]) => void): (groups: RES[], item: T, index: number, orig: T[]) => RES[] {
    return (groups, item, index, orig) => {
        fct(groups, item, index, orig);
        return groups;
    }
}


export function packIf<T, RES extends T[] = T[]>(condition: (groups: RES[], item: T, index: number, orig: T[]) => boolean | GroupImpact): (groups: RES[], item: T, index: number, orig: T[]) => RES[] {
    const rule: (groups: RES[], item: T, index: number, orig: T[]) => GroupImpact = (groups, item, index, orig) => {
        if (index === 0) {
            return GroupImpact.CHANGE;
        }
        const res = condition(groups, item, index, orig);
        if (typeof res === "boolean") {
            return res ? GroupImpact.CHANGE : GroupImpact.APPEND;
        }
        return res;
    }
    return reduceList((groups, item, index, orig) => {
        const resRule = rule(groups, item, index, orig);
        switch (resRule) {
            case GroupImpact.APPEND: groups[groups.length - 1].push(item); break;
            case GroupImpact.CHANGE: groups.push([item] as RES); break;
            case GroupImpact.SKIP_AND_CHANGE: groups.push(([] as any) as RES);
        }
    })
}


export function pack<T>(size: number): (groups: T[][], item: T, index: number, orig: T[]) => T[][] {
    return reduceList(packIf((_groups, _item, index) => index === 0 || index % size === 0));
}
type BuildAry<T, Res extends unknown[] = []> = T extends Res["length"]
    ? Res
    : BuildAry<T, [...Res, unknown]>;
type AddOne<T extends number> = BuildAry<T> extends [...infer Rest]
    ? [...Rest, 1]["length"]
    : never;

type StrictArray<T, S extends number, POS extends number = 0, RES extends T[] = []> = POS extends S ? [...RES] : StrictArray<T, S, AddOne<POS>, [...RES, T]>;

export function packStrict<T, S extends number>(size: S): (groups: StrictArray<T, S>[], item: T, index: number, orig: T[]) => StrictArray<T, S>[] {
    return reduceList(packIf<T, StrictArray<T, S>>((_groups, _item, index, orig) => {
        if (index === 0 && orig.length % size !== 0) {
            throw new Error("Array size is not correct <" + orig.length + "/" + size + ">")
        }
        return (index === 0 || index % size === 0);
    }))
}

export function genericSort<T extends number | string | any[]>(): (a: T, b: T) => number {
    return (a: T, b: T) => {
        if (typeof a === "number") return a - (b as number);
        else if (typeof a === "string") return a.localeCompare((b as string))
        else return a.length - (b as any).length;
    }
}



export function sortByNum(): (a: number, b: number) => number {
    return (a, b) => a - b;
}

export function reverseSort<T>(fct: (a: T, b: T) => number): (a: T, b: T) => number {
    return (a, b) => fct(a, b) * (-1);
}

export function applyMap<I, T>(map: T): (item: I, index: number, orig: I[]) => T[keyof T] {
    return (item, index) => {
        return applyMapOnItem(item, map, () => { throw new Error(`Cannot map ${item} at pos ${index}`) })
    }
}

export function applyMapOnItem<I, T>(item: I, map: T, failure: () => void = () => { }): T[keyof T] {
    const result = map[item as keyof T];
    if (result === undefined) { 
        failure(); 
        throw new Error(`Cannot map item ${item}`);
    }
    return result;
}

export function forcePresent<I>(input: I):NonNullable<I> {
    if (input === undefined || input === null) {
        throw new Error("Empty item");
    }
    return input as NonNullable<I>;
}