import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { forcePresent } from "../utils";

const PATTERN_PRODUCER = /Each (\w+) robot costs (\d+) (\w+)(?: and (\d+) (\w+))?/;
enum Material {
    ORE = "ore",
    CLAY = "clay",
    OBSIDIAN = "obsidian",
    GEODE = "geode"
};

type Requirements = [number, number, number, number];
type Producer = Requirements;

type Blueprint = [Producer, Producer, Producer, Producer];
const GEODE_POS = 3;

function setRequirement(requirements: Requirements, name: string | undefined, quantity: string | undefined) {
    if (name === undefined || quantity === undefined) {
        return;
    }
    switch (name) {
        case Material.ORE: requirements[0] = parseInt(quantity, 10); break;
        case Material.CLAY: requirements[1] = parseInt(quantity, 10); break;
        case Material.OBSIDIAN: requirements[2] = parseInt(quantity, 10); break;
        case Material.GEODE: requirements[3] = parseInt(quantity, 10); break;
        default: throw new Error("Unkown requirement " + name);

    }
}

function setProducer(producerStr: string, blueprint: Blueprint) {
    const found = forcePresent(PATTERN_PRODUCER.exec(producerStr));
    const name = found[1];
    let requirements: Requirements;
    switch (name) {
        case Material.ORE: requirements = blueprint[0]; break;
        case Material.CLAY: requirements = blueprint[1]; break;
        case Material.OBSIDIAN: requirements = blueprint[2]; break;
        case Material.GEODE: requirements = blueprint[3]; break;
        default: throw new Error("Unkown producer " + name);
    }
    setRequirement(requirements, found[3], found[2]);
    setRequirement(requirements, found[5], found[4]);
}

interface State {
    remainingMinutes: number,
    minutes: number,
    stock: [number, number, number, number],
    productionRates: [number, number, number, number]
}

type NextGeodProducerIncrease = { after: number }[]
interface BestOutcome {
    maxRemainingMinutes: number,
    geodesProducerCreated: NextGeodProducerIncrease,
    states: State[],
}

type Cache = {
    map: ExtendedMap<string, BestOutcome[]>,
    bestProduced: number,
    maxProductionRatePerType: [number, number, number, number]
}

function calcTimeToProduceNext(requirements: Requirements, state: State, cache: Cache): number | undefined {
    let remainingDurationToProduce = -1;
    let nbAlreadyProduceable = Number.MAX_SAFE_INTEGER;
    for (let typeRequired = 0; typeRequired < requirements.length; ++typeRequired) {
        const required = requirements[typeRequired];
        if (required === 0) {
            continue;
        }
        const productionRate = state.productionRates[typeRequired];
        if (productionRate === 0) {
            remainingDurationToProduce = -1;
            break;
        }
        nbAlreadyProduceable = Math.min(state.stock[typeRequired] / required, nbAlreadyProduceable);
        const duration = Math.max(Math.ceil((required - state.stock[typeRequired]) / productionRate), 0);
        remainingDurationToProduce = Math.max(remainingDurationToProduce, duration);
    }
    if (remainingDurationToProduce < 0) {
        return undefined;
    }
    if (nbAlreadyProduceable > 1) {
        return 0;//undefined;
    }
    if (nbAlreadyProduceable === 1) {
        return 0;
    }
    return remainingDurationToProduce;
}


function advanceState(requirements: Requirements, state: State, duration: number, producerToIncrease: number): State {
    const newState: State = {
        remainingMinutes: state.remainingMinutes - duration,
        minutes: state.minutes + duration,
        productionRates: [...state.productionRates],
        stock: [...state.stock]
    };
    for (let pos = 0; pos < newState.stock.length; ++pos) {
        newState.stock[pos] += duration * state.productionRates[pos];
    }

    newState.productionRates[producerToIncrease]++;
    for (let pos = 0; pos < newState.stock.length; ++pos) {
        newState.stock[pos] -= requirements[pos];
    }
    return newState;
}

function bestOptimisticOutcome(state: State): number {
    let totalProduced = state.stock[GEODE_POS];
    let curr = state.remainingMinutes;
    let rate = state.productionRates[GEODE_POS];
    while (curr > 0) {
        curr--;
        totalProduced += rate;
        rate++;
    }
    return totalProduced;
}

function calcNextPossibleStates(blueprint: Blueprint, state: State, cache: Cache): { maxMinutes: number, minMinutes: number, states: State[] } {
    const result: State[] = [];
    let maxMinutesToChangeState: number | undefined;
    let minMinutesToChangeState: number = Number.MAX_SAFE_INTEGER;
    for (let typeProducer = blueprint.length - 1; typeProducer >= 0; --typeProducer) {
        const requirements = blueprint[typeProducer];
        if (state.productionRates[typeProducer] >= cache.maxProductionRatePerType[typeProducer]) {
            continue;
        }
        const nextDuration = calcTimeToProduceNext(requirements, state, cache);
        if (nextDuration !== undefined) {
            maxMinutesToChangeState = Math.max(maxMinutesToChangeState ?? Number.MIN_SAFE_INTEGER, nextDuration);
            minMinutesToChangeState = Math.min(minMinutesToChangeState, nextDuration);
            if (nextDuration + 1 < state.remainingMinutes) {
                const nextState = advanceState(requirements, state, nextDuration + 1, typeProducer);
                if (bestOptimisticOutcome(nextState) > cache.bestProduced) {
                    result.push(nextState);
                }
            }
        }
    }

    return {
        maxMinutes: maxMinutesToChangeState ?? Number.MAX_SAFE_INTEGER,
        minMinutes: minMinutesToChangeState,
        states: result
    };
}

function calcNextGeodeProductionChange(durationOffset: number, increaseProduction: boolean, bestOutCome: BestOutcome): NextGeodProducerIncrease {
    if (increaseProduction) {
        return [{
            after: durationOffset
        }, ...bestOutCome.geodesProducerCreated]
    }
    if (bestOutCome.geodesProducerCreated.length === 0) {
        return [];
    }
    const [first, ...remaining] = bestOutCome.geodesProducerCreated;
    return [{
        after: first.after + durationOffset
    },
    ...remaining];
}

function calcBestOutcome(blueprint: Blueprint, state: State, cache: Cache): { producedGeodes: number, bestOutcome: BestOutcome } {
    const key = state.stock.join("|") + "#" + state.productionRates.join("|");
    const outcomes = cache.map.cache(key, () => []);
    const needProcessing = outcomes.length === 0 || state.remainingMinutes > outcomes[outcomes.length - 1].maxRemainingMinutes;
    if (!needProcessing) {
        for (let pos = 0; pos < outcomes.length; ++pos) {
            const outcome = outcomes[pos];
            if (state.remainingMinutes <= outcome.maxRemainingMinutes) {
                const newNextGeod = calcNextGeodeProductionChange(0, false, outcome);
                const produced = calcProduction(state, newNextGeod);
                cache.bestProduced = Math.max(cache.bestProduced, produced);
                return {
                    bestOutcome: {
                        geodesProducerCreated: newNextGeod,
                        maxRemainingMinutes: outcome.maxRemainingMinutes,
                        states: [state, ...outcome.states]
                    },
                    producedGeodes: produced
                }
            }
        }
        throw new Error("Shouldn't occurs");
    }

    const nextStates = calcNextPossibleStates(blueprint, state, cache);
    let currBestOutcomeForNextStates: NextGeodProducerIncrease | undefined;
    let maxMinutesApplicableForOutcome = -1;
    let currBestProduceGeod = 0;
    let bestOutComeStates: State[] = [];
    for (const nextState of nextStates.states) {
        const durationOffset = state.remainingMinutes - nextState.remainingMinutes;
        const { bestOutcome } = calcBestOutcome(blueprint, nextState, cache);
        const newNextGeod = calcNextGeodeProductionChange(durationOffset, state.productionRates[GEODE_POS] < nextState.productionRates[GEODE_POS], bestOutcome);
        let nbGeodProduced = calcProduction(state, newNextGeod);
        if (nbGeodProduced > currBestProduceGeod) {
            currBestProduceGeod = nbGeodProduced;
            bestOutComeStates = bestOutcome.states;
            maxMinutesApplicableForOutcome = durationOffset + bestOutcome.maxRemainingMinutes;
            currBestOutcomeForNextStates = newNextGeod;
        }
    }

    let newBestOutcome: BestOutcome;
    if (currBestOutcomeForNextStates !== undefined) {
        newBestOutcome = {
            geodesProducerCreated: currBestOutcomeForNextStates,
            maxRemainingMinutes: maxMinutesApplicableForOutcome,
            states: [state, ...bestOutComeStates]
        };
    } else {
        newBestOutcome = {
            geodesProducerCreated: [],
            maxRemainingMinutes: nextStates.maxMinutes,
            states: [state]
        }
        currBestProduceGeod = calcProduction(state, newBestOutcome.geodesProducerCreated);
    }
    outcomes.push(newBestOutcome);
    cache.bestProduced = Math.max(cache.bestProduced, currBestProduceGeod);
    return {
        bestOutcome: newBestOutcome,
        producedGeodes: currBestProduceGeod
    }
}

function calcProduction(state: State, newNextGeod: NextGeodProducerIncrease) {
    let nbGeodProduced = 0;
    let currRate = state.productionRates[GEODE_POS];
    let remainingDuration = state.remainingMinutes;
    for (let posNext = 0; posNext < newNextGeod.length; ++posNext) {
        const nextDurationOffset = newNextGeod[posNext].after;
        nbGeodProduced += currRate * nextDurationOffset;
        remainingDuration -= nextDurationOffset;
        currRate++;
    }
    nbGeodProduced += currRate * (remainingDuration);
    return nbGeodProduced;
}

function parse(lines: string[]): Blueprint[] {
    return lines.map(line => {
        const [_blueprint_str, producers] = line.split(": ")
        const blueprint: Blueprint = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        producers.split(". ").forEach(prod => {
            setProducer(prod, blueprint);
        });
        return blueprint;
    });
}

function calcMaxProductionRate(blueprint: Blueprint): [number, number, number, number] {
    const result: [number, number, number, number] = [0, 0, 0, 0];
    for (let pos = 0; pos < blueprint.length; ++pos) {
        for (let posReq = 0; posReq < result.length; ++posReq) {
            result[posReq] = Math.max(result[posReq], blueprint[pos][posReq]);
        }
    }
    result[GEODE_POS] = Number.MAX_SAFE_INTEGER;
    return result;
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);

    if (part === Part.PART_1) {
        let total = 0;
        for (let pos = 0; pos < data.length; ++pos) {
            const cache: Cache = {
                map: new ExtendedMap(),
                bestProduced: 0,
                maxProductionRatePerType: calcMaxProductionRate(data[pos])
            }
            const result = calcBestOutcome(data[pos], {
                productionRates: [1, 0, 0, 0],
                remainingMinutes: 24,
                minutes: 0,
                stock: [0, 0, 0, 0]
            }, cache);
            logger.debug(`Result ${result.producedGeodes} for ${pos + 1} with ${cache.map.size} explored`)
            total += result.producedGeodes * (pos + 1);
        }

        //const result = data.length;
        logger.result(total, [33, 1599])
    }
    else {
        let total = 1;
        const nbElements = Math.min(3, data.length);
        for (let pos = 0; pos < nbElements; ++pos) {
            const cache: Cache = {
                map: new ExtendedMap(),
                bestProduced: 0,
                maxProductionRatePerType: calcMaxProductionRate(data[pos])
            }
            const result = calcBestOutcome(data[pos], {
                productionRates: [1, 0, 0, 0],
                remainingMinutes: 32,
                minutes: 0,
                stock: [0, 0, 0, 0]
            }, cache);
            logger.debug(`Result ${result.producedGeodes} for ${pos + 1} with ${cache.map.size} explored`)
            total *= result.producedGeodes;
        }


        logger.result(total, [3472, 14112])
    }
}

run(19, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2], { debug: false })