
export interface QueuedItem<T> {
    key: string | undefined,
    cost: number,
    item: T
}

interface QueueCostSlot<T> {
    cost: number,
    items: QueuedItem<T>[]
}

export class PriorityQueue<T>{
    private readonly queue: QueueCostSlot<T>[] = [];
    private readonly existingItems: Map<string, number> = new Map()
    constructor(private getCost: (i: T) => number, private readonly keep_processed_key: boolean = false) {

    }

    public put(inputItem: T, key: string | undefined = undefined): number | undefined {
        const cost = this.getCost(inputItem);
        if (key) {
            const prefered_duplicate = this.manage_duplicate(cost, key);
            if (prefered_duplicate) {
                return prefered_duplicate;
            }
        }
        const newItem = {
            cost,
            item: inputItem,
            key
        }
        const allValues = this.queue.length;
        for (let x = 0; x < allValues; x++) {
            if (this.queue[x].cost === cost) {
                this.insert_in_slot(this.queue[x], newItem);
                return;
            }
            else if (this.queue[x].cost < cost) {
                const newSlot = this.createNewSlot(cost, x);
                this.insert_in_slot(newSlot, newItem);
                return;
            }
        }
        const newSlot = this.createNewSlot(cost, undefined);
        this.insert_in_slot(newSlot, newItem);
    }

    private createNewSlot(cost: number, pos: number | undefined): QueueCostSlot<T> {
        const newSlot = { cost, items: [] };
        if (pos !== undefined) {
            this.queue.splice(pos, 0, newSlot);
        }
        else {
            this.queue.push(newSlot);
        }
        return newSlot;
    }

    private insert_in_slot(slot: QueueCostSlot<T>, item: QueuedItem<T>) {
        slot.items.push(item);
        if (item.key) {
            this.existingItems.set(item.key, slot.cost);
        }
    }

    private manage_duplicate(cost: number, key: string): number | undefined {
        const existingCost = this.existingItems.get(key);
        if (existingCost !== undefined) {
            if (existingCost <= cost) {
                return existingCost;
            }
            const [existing_slot_id, slot, existing_item_index, item] = this.get_existing_item_information(existingCost, key);
            if (item.key) {
                this.existingItems.delete(item.key);
            }
            slot.items.splice(existing_item_index, 1);
            if (slot.items.length === 0) {
                this.queue.splice(existing_slot_id, 1);
            }

        }
        return undefined;
    }

    private get_existing_item_information(cost: number, key: string): [number, QueueCostSlot<T>, number, QueuedItem<T>] {
        const existing_slot_id = this.queue.findIndex(item => item.cost === cost);
        const slot = this.queue[existing_slot_id] as QueueCostSlot<T>;
        const existing_item_index = slot.items.findIndex(item => item.key === key);
        const item = slot.items[existing_item_index];
        return [existing_slot_id, slot, existing_item_index, item];
    }

    public pop(): QueuedItem<T> | undefined {
        if (this.queue.length === 0) {
            return undefined;
        }
        const last_slot = this.queue[this.queue.length - 1] as QueueCostSlot<T>;
        const item = last_slot.items.pop() as QueuedItem<T>;
        if (last_slot.items.length === 0) {
            const suppressed_slot = this.queue.pop();
            if (last_slot !== suppressed_slot) {
                throw "MAJOR FAILURE";
            }
        }
        if (!this.keep_processed_key && item.key) {
            this.existingItems.delete(item.key);
        }
        return item;
    }

    public isNotEmpty(): boolean {
        return this.queue.length > 0
    }

    public isEmpty(): boolean {
        return this.queue.length === 0
    }

    public explored(): number {
        return this.existingItems.size
    }
}