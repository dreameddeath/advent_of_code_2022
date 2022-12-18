import { max } from "date-fns";
import { nb, ta } from "date-fns/locale";
import { Logger, Part, run, Type } from "./day_utils"
import { ExtendedMap } from "./mapUtils";
import { PriorityQueue, QueuedItem } from "./priority_queue";
import { forcePresent, generator, genericSort, reverseSort, StrictArray, strictToArray } from "./utils";

interface ShortestPathInfo {
    path: string[],
    target: ValveDef,
}

interface ValveDef {
    name: string;
    flowRate: number;
    connectedTo: string[],
    leadTo: Map<string, ValveDef>,
    shortestPathTo: ExtendedMap<string, ShortestPathInfo>;
    //hasPathToUsingTunnel: ExtendedMap<string, number>;
}

function parse(lines: string[]): Map<string, ValveDef> {
    const mapValves = new Map<string, ValveDef>();
    lines.forEach(line => {
        const [def, links] = line.split("; ");
        const parsedDef = forcePresent(def.match(/Valve (\w+) has flow rate=(\d+)/));
        const linksList = forcePresent(links.match(/tunnels? leads? to valves? (.+)/))[1].split(", ");
        const name = parsedDef[1];
        mapValves.set(name, {
            name,
            flowRate: parseInt(parsedDef[2]),
            connectedTo: linksList,
            leadTo: new ExtendedMap(),
            shortestPathTo: new ExtendedMap(),
            //hasPathToUsingTunnel: new ExtendedMap()
        });
    });
    mapValves.forEach(v => {
        v.connectedTo.forEach(n => v.leadTo.set(n, forcePresent(mapValves.get(n))));
    });
    const valves = [...mapValves.values()];
    valves.forEach(valve => {
        valves.filter(t => t.name !== valve.name).forEach(t => valve.shortestPathTo.set(t.name, hasPathTo(valve, t)))
    })
    return mapValves;
}

interface HasPathToState {
    curr: ValveDef,
    visited: string[],
}

function hasPathTo(valve: ValveDef, target: ValveDef): ShortestPathInfo {
    const queue = new PriorityQueue<HasPathToState>(s => s.visited.length);
    queue.put({ curr: valve, visited: [valve.name] }, "");
    let state: QueuedItem<HasPathToState> | undefined;
    while ((state = queue.pop()) !== undefined) {
        const next = state.item;
        if (next.curr.name === target.name) {
            const [_, ...result] = next.visited;
            return {
                path: result,
                target
            };
        }
        for (const other of next.curr.leadTo.values()) {
            if (next.visited.find(n => other.name === n)) {
                continue;
            }
            const newVisitedList = [...next.visited, other.name];
            queue.put({ curr: other, visited: newVisitedList }, newVisitedList.join(","));
        }
    }

    throw new Error("Not found");
}

interface TargetToExplore {
    targetToVisit: string,
    visited: string[]
}

interface WeightedNextToVisit {
    potentialReleased: number,
    pathInfo: ShortestPathInfo
}

function orderedNextToVisit(start: ValveDef, remainingMinutes: number, toVisit: string[]): WeightedNextToVisit[] {
    return toVisit.map(vName => {
        const pathInfo = start.shortestPathTo.get(vName)!;
        return {
            potentialReleased: (remainingMinutes - pathInfo.path.length) * pathInfo.target.flowRate,
            pathInfo
        }
    }).sort((a, b) => b.potentialReleased - a.potentialReleased)
}

interface IndexedValue<T> {
    pos: number,
    v: T;
}
function toIndexed<T>(t: T, i: number): IndexedValue<T> {
    return {
        pos: i,
        v: t
    }
}

function copyArray<T>(origArray: T[], replaceValues: IndexedValue<T>[] = []): T[] {
    const cloned = [...origArray];
    replaceValues.forEach(r => {
        (cloned as T[])[r.pos] = r.v;
    })
    return cloned;
}


function setupPairs<S extends number>(orderedNextToVisit: WeightedNextToVisit[], nbAgents: S): WeightedNextToVisit[][] {
    if (nbAgents === 1) {
        return orderedNextToVisit.map(o => [o]);
    }
    return orderedNextToVisit.flatMap(
        (n, i, all) => setupPairs(all.slice(i + 1), nbAgents - 1).map(sub => [n, ...sub])
    )
}

interface AgentState {
    previous: ValveDef,
    currPath: WeightedNextToVisit,
    distanceToTarget: number,
    visited: string[]
}

interface State {
    minutes: number,
    cumulFlowRate: number,
    released: number,
    agentsState: AgentState[],
    notOpened: string[],
    notOpenedFlowRate: number,
}


function setupPairsIntermediate(possibilities: IndexedValue<WeightedNextToVisit[]>[]): IndexedValue<WeightedNextToVisit>[][] {
    if (possibilities.length === 0) {
        throw new Error("Shouldn't occur");
    }
    const [first, ...remainings] = possibilities;
    return first.v.flatMap(v => {
        const indexed: IndexedValue<WeightedNextToVisit> = {
            pos: first.pos,
            v
        }
        if (remainings.length === 0) {
            return [[indexed]];
        }

        return setupPairsIntermediate(remainings).map(others => {
            others.unshift(indexed);
            return others;
        })
    })
}

const EMPTY_LIST_VISITED: string[] = [];
function buildAgent(start: ValveDef, nextTarget: WeightedNextToVisit, visited: string[], isDebug: boolean): AgentState {
    const distanceToTarget = nextTarget.pathInfo.path.length;
    return {
        previous: start,
        currPath: nextTarget,
        distanceToTarget: distanceToTarget,
        visited: isDebug ? [...visited] : EMPTY_LIST_VISITED
    }
}

const REF_TARGETS = [
    //me
    ["JJ"/*3*/, "BB"/*7*/, "CC"/*9*/],
    //Elf 
    ["DD"/*2*/, "HH"/*7*/, "EE"/*11*/]
];

let effectiveTarget: typeof REF_TARGETS;
//const chains = ["AA","II","JJ","II","AA",]

function findMaximisedRelease(start: ValveDef, world: ValveDef[], maxDuration: number, isDebug: boolean, nbAgents: number): [number, State] {
    const effectiveTarget = [[...REF_TARGETS[0]], [...REF_TARGETS[1]]];
    const toVisit = world.filter(v => v.flowRate !== 0).sort((a, b) => a.flowRate - b.flowRate).map(v => v.name).filter(n => n !== start.name);
    const maxRate = world.map(v => v.flowRate).reduce((a, b) => a + b);
    const totalMaximum = maxRate * maxDuration;
    const cost = (s: State) => {
        //const offsetToOpenAllCurrent = s.agentsState.map(a=>a.distanceToTarget).sort((a,b)=>b-a)[0];
        //const forseableReleased = s.released+s.agentsState.map(a => a.currPath.potentialReleased).reduce((a, b) => a + b)+ (maxDuration-s.minutes) *s.cumulFlowRate;
        //return totalMaximum - forseableReleased
        //return s.minutes;
        return maxRate * s.minutes - s.released
    };
    const priorityList = new PriorityQueue<State>(cost);
    const fakeTarget: WeightedNextToVisit = {
        potentialReleased: 0, pathInfo: {
            path: [],
            target: start
        }
    };
    const initialState: State = {
        minutes: 0,
        cumulFlowRate: 0,
        released: 0,
        notOpened: toVisit,
        notOpenedFlowRate: maxRate,
        agentsState: [...generator(nbAgents)].map(_ => buildAgent(start, fakeTarget, isDebug ? [start.name] : EMPTY_LIST_VISITED, isDebug)),
    };
    let nextToProcess: QueuedItem<State> | undefined;
    let nbExplored = 0;
    let all: [number, State][] = [];
    const initialTargets = orderedNextToVisit(start, maxDuration, toVisit);
    let isDebugFilteredDone = false;
    setupPairs(initialTargets, nbAgents).forEach((targets) => {
        if (isDebug) {
            if (isDebugFilteredDone) {
                return;
            }
            if (targets[0].pathInfo.target.name !== effectiveTarget[0][0] && targets[1].pathInfo.target.name !== effectiveTarget[1][0]) {
                return;
            }
            effectiveTarget[0].shift();
            effectiveTarget[1].shift();
            isDebugFilteredDone = true;
        }
        const state = cloneState(initialState, targets.map(toIndexed), isDebug);
        forwardStateToNearestTarget(state, maxDuration, isDebug);
        priorityList.put(state);
    })
    while ((nextToProcess = priorityList.pop()) !== undefined) {
        const state = nextToProcess.item;
        nbExplored++;
        //all.push(state);

        if ((state.notOpened.length === 0) || state.minutes >= maxDuration) {
            state.released += (maxDuration - state.minutes) * state.cumulFlowRate;
            //return [nbExplored, state];
            all.push([nbExplored, state]);
            continue;
        }
        const toOpen = state.agentsState.map(toIndexed)
            .filter(item => item.v.distanceToTarget === 0);
        advanceMinutes(state, 1, maxDuration, toOpen, isDebug);
        const targetsOpened = toOpen
            .map(agentRef => {
                const targetReached = agentRef.v.currPath.pathInfo.target;
                state.cumulFlowRate += targetReached.flowRate;
                state.notOpened.splice(state.notOpened.indexOf(targetReached.name), 1);
                state.notOpenedFlowRate -= targetReached.flowRate;
                if (isDebug) {
                    agentRef.v.visited[agentRef.v.visited.length - 1] += "*";
                };
                return {
                    v: targetReached,
                    pos: agentRef.pos
                }
            });
        forwardStateToNearestTarget(state, maxDuration, true);
        const effectiveToExplore = state.notOpened.filter(n => state.agentsState.find(a => a.currPath.pathInfo.target.name === n) === undefined)
        if (state.minutes >= maxDuration || effectiveToExplore.length === 0) {
            priorityList.put(state);
        } else {
            const remainingMinutes = maxDuration - state.minutes;
            const targetsToExplore = targetsOpened.map(targetRef => {
                return {
                    pos: targetRef.pos,
                    v: orderedNextToVisit(targetRef.v, remainingMinutes, effectiveToExplore)
                }
            });

            const nextTuples = setupPairsIntermediate(targetsToExplore);
            let isFilteredForDebug = false
            for (const tuple of nextTuples) {
                if (isDebug) {
                    if (isFilteredForDebug) {
                        continue;
                    }
                    const matchingTuple = tuple.filter(t => t.v.pathInfo.target.name === effectiveTarget[t.pos][0]);
                    if (matchingTuple.length !== tuple.length) {
                        continue;
                    }
                    matchingTuple.forEach(t => effectiveTarget[t.pos].shift());
                    isFilteredForDebug = true;
                }
                const nextState = cloneState(state, tuple, isDebug);
                forwardStateToNearestTarget(nextState, maxDuration, isDebug);
                priorityList.put(nextState);
            }
        }
    }
    all.forEach((item, pos) => {
        if (item[1].released === 1707) {
            console.log("Found");
        }
    })
    throw new Error("Not Found");
}

//true if overflow maxDuration
function advanceMinutes(state: State, nb: number, maxDuration: number, beingOpened: IndexedValue<AgentState>[], isDebug: boolean): void {
    const nbMinutes = Math.min(maxDuration - state.minutes, nb);
    if (nbMinutes === 0) {
        return;
    }
    state.agentsState.filter((_, pos) => beingOpened.find(t => t.pos === pos) === undefined)
        .forEach(a => {
            if (isDebug) {
                const path = a.currPath.pathInfo.path;
                const start = path.length - a.distanceToTarget;
                path.slice(start, start + nbMinutes).forEach(v => a.visited.push(v));
            }
            a.distanceToTarget -= nbMinutes

        });
    state.released += state.cumulFlowRate * nbMinutes;
    state.minutes += nb;
}

function cloneState(origState: State, targets: IndexedValue<WeightedNextToVisit>[], isDebug: boolean): State {
    const cloneState = { ...origState };
    cloneState.notOpened = [...cloneState.notOpened];
    cloneState.agentsState = cloneState.agentsState.map((currentAgent, i) => {
        const found = targets.find(t => t.pos === i);
        if (found !== undefined) {
            return buildAgent(currentAgent.currPath.pathInfo.target, found.v, currentAgent.visited, isDebug)
        } else {
            return {
                ...currentAgent,
                visited: isDebug ? [...currentAgent.visited] : EMPTY_LIST_VISITED
            };
        }
    });
    return cloneState;
}


function forwardStateToNearestTarget(nextState: State, maxDuration: number, isDebug: boolean) {
    const minDistance = nextState.agentsState.map((a) => a.distanceToTarget).sort((a, b) => a - b)[0];
    advanceMinutes(nextState, minDistance, maxDuration, [], isDebug);
}




function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const [nbExplored, best] = findMaximisedRelease(forcePresent(data.get("AA")), [...data.values()], 30, type === Type.TEST, 1);
        logger.log("Nb explored :" + nbExplored);
        logger.result(best.released, [1651, 2029])
    }
    else {
        const [nbExplored, best] = findMaximisedRelease(forcePresent(data.get("AA")), [...data.values()], 26, type === Type.TEST, 2);
        logger.log("Nb explored :" + nbExplored);
        logger.result(best.released, [1707, undefined])
    }
}

run(16, [Type.TEST, Type.RUN], puzzle, [/*Part.PART_1,*/ Part.PART_2])
