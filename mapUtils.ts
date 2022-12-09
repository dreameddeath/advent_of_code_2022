import { de } from "date-fns/locale";

export class ExtendsMap<K, V> extends Map<K, V>{
    constructor(entries?: readonly (readonly [K, V])[] | null) {
        super(entries);
    }

    public apply(k: K, fct: (curr: V, key: K) => V, defaultVal: V): V {
        const curr = this.get(k) ?? defaultVal;
        const newVal = fct(curr, k);
        this.set(k, newVal);
        return newVal;
    }

    public cache(k: K, fct: (key: K) => V): V {
        const res = this.get(k);
        if (res !== undefined) {
            return res;
        } else {
            const newValue = fct(k);
            this.set(k, newValue);
            return newValue
        }
    }
}