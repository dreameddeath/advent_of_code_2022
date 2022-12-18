export { }

export type BuildAry<T, Res extends unknown[] = []> = T extends Res["length"]
    ? Res
    : BuildAry<T, [...Res, unknown]>;
export type AddOne<T extends number> = BuildAry<T> extends [...infer Rest]
    ? [...Rest, 1]["length"]
    : never;

export type StrictArray<T, S extends number, POS extends number = 0, RES extends T[] = []> = POS extends S ? [...RES] : StrictArray<T, S, AddOne<POS>, [...RES, T]>;

export function strictToArray<T,S extends number>(o:StrictArray<T,S>):T[]{
    return o as T[];
}

export enum PackMatchAction {
    SKIP_AND_CHANGE,
    APPEND_THEN_CHANGE,
    CHANGE_THEN_APPEND
}

declare global {
    interface Array<T> {
        mapNonNull<U>(fct: (i: T, index: number, all: T[]) => U): Array<NonNullable<U>>;
        pack(cond: (i: T, index: number, all: T[]) => boolean, whenMatch: PackMatchAction): Array<Array<T>>
        packStrict<S extends number>(nb: S): StrictArray<T, S>[]
    }
}

Array.prototype.mapNonNull = function <T, U>(fct: (i: T, index: number, all: T[]) => U) {
    // code to remove "o"
    return (this as T[]).map(fct)
        .filter((v): v is NonNullable<typeof v> => !(v === null || v === undefined));
}

Array.prototype.packStrict = function <T, S extends number>(size: number) {
    if (this.length % size !== 0) {
        throw new Error("Cannot pack array because size " + this.length + " not coherent with pack size " + size);
    }

    return (this as T[]).reduce((groups, v, pos) => {
        if (groups.length === 0 || pos % size === 0) {
            groups.push([v] as StrictArray<T, S>);
        } else {
            (groups[groups.length - 1] as T[]).push(v);
        }
        return groups;
    }, [] as StrictArray<T, S>[]);
}


Array.prototype.pack = function <T>(fct: (i: T, index: number, all: T[]) => boolean, skipMatch: PackMatchAction) {
    const appendToCurrent = (groups: T[][], item: T) => {
        if (groups.length === 0) {
            groups.push([]);
        }
        groups[groups.length - 1].push(item);
        return groups;
    };
    const changeGroup = (groups: T[][]) => {
        if (groups.length === 0) {
            return groups;
        }
        groups.push([]);
        return groups;
    }
    // code to remove "o"
    return this.reduce((groups, item, index, all) => {
        const res = fct(item, index, all);
        if (res) {
            switch (skipMatch) {
                case PackMatchAction.APPEND_THEN_CHANGE: return changeGroup(appendToCurrent(groups, item));
                case PackMatchAction.CHANGE_THEN_APPEND: return appendToCurrent(changeGroup(groups), item);
                case PackMatchAction.SKIP_AND_CHANGE: return changeGroup(groups);
            }
        } else {
            return appendToCurrent(groups, item)
        }
    }, []);
}


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


export function packIf<T, RES extends T[] = T[]>(condition: (item: T, index: number, groups: RES[], orig: T[]) => boolean | GroupImpact): (groups: RES[], item: T, index: number, orig: T[]) => RES[] {
    const rule: (groups: RES[], item: T, index: number, orig: T[]) => GroupImpact = (groups, item, index, orig) => {
        if (index === 0) {
            return GroupImpact.CHANGE;
        }
        const res = condition(item, index, groups, orig);
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
    return reduceList(packIf((_item, index, _groups) => index === 0 || index % size === 0));
}
export function packStrict<T, S extends number>(size: S): (groups: StrictArray<T, S>[], item: T, index: number, orig: T[]) => StrictArray<T, S>[] {
    return reduceList(packIf<T, StrictArray<T, S>>((_item, index, _groups, orig) => {
        if (index === 0 && orig.length % size !== 0) {
            throw new Error("Array size is not correct <" + orig.length + "/" + size + ">")
        }
        return (index === 0 || index % size === 0);
    }))
}


export function genericSort<T extends bigint | number | string | any[], U = T>(map?: (i: U) => T): (a: U, b: U) => number {
    const realMap = map !== undefined ? map : ((i: U) => i as any as T);
    return (aBefore: U, bBefore: U) => {
        const a = realMap(aBefore);
        const b = realMap(bBefore);
        if (typeof a === "bigint") return (a < b) ? -1 : ((a > b) ? 1 : 0)
        else if (typeof a === "number") return a - (b as number);
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

export function forcePresent<I>(input: I): NonNullable<I> {
    if (input === undefined || input === null) {
        throw new Error("Empty item");
    }
    return input as NonNullable<I>;
}

export function forceType<O>(input: any, fct: (i: any) => boolean): input is O {
    if (input === undefined || input === null) {
        return false;
    }
    return fct(input);
}
