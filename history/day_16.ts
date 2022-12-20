import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { PriorityQueue, QueuedItem } from "../priority_queue";
import { forcePresent, generator } from "../utils";

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


interface WeightedNextToVisit {
    potentialReleased: number,
    pathInfo: ShortestPathInfo
}

function orderedNextToOpen(start: ValveDef, remainingMinutes: number, toVisit: string[]): WeightedNextToVisit[] {
    if (remainingMinutes <= 1) {
        return []
    }
    return toVisit
        .map(vName => start.shortestPathTo.get(vName)!)
        .filter(pathInfo => pathInfo.path.length < remainingMinutes)
        .map(pathInfo => {
            return {
                potentialReleased: calcPotentialReleased(remainingMinutes, pathInfo),
                pathInfo
            }
        }).sort((a, b) => b.potentialReleased - a.potentialReleased)
}

interface IndexedValue<T> {
    pos: number,
    v: T;
}

function calcPotentialReleased(remainingMinutes: number, pathInfo: ShortestPathInfo): number {
    return Math.max(0, (remainingMinutes - pathInfo.path.length)) * pathInfo.target.flowRate;
}

function toIndexed<T>(t: T, i: number): IndexedValue<T> {
    return {
        pos: i,
        v: t
    }
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
    finished: boolean
}

interface State {
    potentialReleased: number;
    minutes: number,
    remainingMinutes: number,
    cumulFlowRate: number,
    released: number,
    agentsState: AgentState[],
    notAlreadyTargeted: string[],
    notOpenedFlowRate: number,
}


function setupPairsIntermediate(possibilities: IndexedValue<WeightedNextToVisit[]>[], toExclude: string[] = []): IndexedValue<WeightedNextToVisit>[][] {
    if (possibilities.length === 0) {
        return [];
    }
    const [first, ...remainings] = possibilities;
    return first.v.filter(v => !toExclude.includes(v.pathInfo.target.name))
        .flatMap(v => {
            const indexed: IndexedValue<WeightedNextToVisit> = {
                pos: first.pos,
                v
            }
            if (remainings.length === 0) {
                return [[indexed]];
            }

            return setupPairsIntermediate(remainings, [v.pathInfo.target.name, ...toExclude]).map(others => {
                others.unshift(indexed);
                return others;
            })
        })
}

function buildAgent(start: ValveDef, nextTarget: WeightedNextToVisit): AgentState {
    return {
        previous: start,
        currPath: nextTarget,
        distanceToTarget: nextTarget.pathInfo.path.length,
        finished: false
    }
}

function advanceMinutes(state: State, nb: number): void {
    const nbMinutes = Math.min(state.remainingMinutes, nb);
    if (nbMinutes === 0) {
        return;
    }
    state.agentsState
        .filter(a => !a.finished)
        .forEach((a) => {
            a.distanceToTarget -= nbMinutes
        });

    state.released += state.cumulFlowRate * nbMinutes;
    state.minutes += nb;
    state.remainingMinutes -= nb;

}

function cloneState(origState: State, targets: IndexedValue<WeightedNextToVisit>[]): State {
    const cloneState = { ...origState };
    cloneState.notAlreadyTargeted = [...cloneState.notAlreadyTargeted.filter(name => targets.find(t => t.v.pathInfo.target.name === name) === undefined)];
    cloneState.agentsState = cloneState.agentsState.map((currentAgent, i) => {
        const found = targets.find(t => t.pos === i);
        if (found !== undefined) {
            return buildAgent(currentAgent.currPath.pathInfo.target, found.v)
        } else {
            return {
                ...currentAgent,
            };
        }
    });
    return cloneState;
}

interface BestOutcome {
    released: number;
}

type Context = {
    skippedByReleased: number;
    bestReleased: number;
}

function createNewState(origState: State, targets: IndexedValue<WeightedNextToVisit>[]): State {
    const newState = cloneState(origState, targets);
    //Forward to nextTarget
    const minDistance = newState.agentsState.filter(a => !a.finished).map((a) => a.distanceToTarget).sort((a, b) => a - b)[0];
    advanceMinutes(newState, minDistance);
    openReachedNodes(newState);
    calcOptimisticReleased(newState);
    return newState;
}

function calcOptimisticReleased(state: State) {
    const agentsNotArrived = state.agentsState.filter(a => !a.finished).filter(a => a.distanceToTarget >= 0);
    const potentialStartingPoints = state.agentsState.filter(a => !a.finished).map(a => [Math.max(a.distanceToTarget, 0), a.currPath.pathInfo.target] as const);

    state.potentialReleased = state.released + state.cumulFlowRate * state.remainingMinutes +
        agentsNotArrived.map(a => a.currPath.potentialReleased).reduce((a, b) => a + b, 0) +
        state.notAlreadyTargeted.map(
            notOpened => potentialStartingPoints.map(
                ([distance, target]) => calcPotentialReleased(state.remainingMinutes - distance, target.shortestPathTo.get(notOpened)!)
            )
                .reduce((a, b) => Math.max(a, b), 0)
        ).reduce((a, b) => a + b, 0)
}


function buildNextPossibleStates(state: State, cache: Context): State[] {
    const indexedAgents = state.agentsState.filter(a => !a.finished).map(toIndexed);
    const agentOpened = indexedAgents.filter(a => a.v.distanceToTarget < 0);
    const targetsToExplore = agentOpened.map(targetRef => {
        return {
            pos: targetRef.pos,
            v: orderedNextToOpen(targetRef.v.currPath.pathInfo.target, state.remainingMinutes, state.notAlreadyTargeted)
        }
    });

    const nextTuples = setupPairsIntermediate(targetsToExplore);
    const result: State[] = []
    for (const tuple of nextTuples) {
        const newState = createNewState(state, tuple);
        if (newState.potentialReleased > cache.bestReleased) {
            result.push(newState);
        } else {
            cache.skippedByReleased++
        }
    }
    if (result.length === 0 && state.notAlreadyTargeted.length === 0 && state.agentsState.filter(a => !a.finished).length > 0) {
        const newState = createNewState(state, []);
        result.push(newState);
    }

    return result;
}

function openReachedNodes(state: State) {
    const toOpen = state.agentsState.filter(a => !a.finished).map(toIndexed)
        .filter(item => item.v.distanceToTarget === 0);
    advanceMinutes(state, 1);
    toOpen
        .forEach(agentRef => {
            const targetReached = agentRef.v.currPath.pathInfo.target;
            state.cumulFlowRate += targetReached.flowRate;
            if (state.notAlreadyTargeted.length === 0) {
                agentRef.v.finished = true;
            }
            state.notOpenedFlowRate -= targetReached.flowRate;
        });
}

function explore(state: State, cache: Context): BestOutcome | undefined {
    const nextStates = buildNextPossibleStates(state, cache);
    if (nextStates.length === 0) {
        const finalState = cloneState(state, []);
        advanceMinutes(finalState, state.remainingMinutes);
        cache.bestReleased = Math.max(cache.bestReleased, finalState.released);
        return {
            released: finalState.released,
        };
    }
    else {
        let currBestOutCome: BestOutcome | undefined = undefined;
        for (const nextState of nextStates) {
            const output = explore(nextState, cache);
            if (output === undefined) {
                continue;
            }
            if (currBestOutCome === undefined || output.released > currBestOutCome.released) {
                currBestOutCome = output;
            }
        }
        return currBestOutCome;
    }
}


function maximizeDfs(start: ValveDef, world: ValveDef[], maxDuration: number, isDebug: boolean, nbAgents: number, logger: Logger): BestOutcome {
    const toVisit = world.filter(v => v.flowRate !== 0).sort((a, b) => a.flowRate - b.flowRate).map(v => v.name).filter(n => n !== start.name);
    const maxRate = world.map(v => v.flowRate).reduce((a, b) => a + b);
    const cache: Context = {
        bestReleased: 0,
        skippedByReleased: 0,
    }
    const fakeTarget: WeightedNextToVisit = {
        potentialReleased: 0,
        pathInfo: {
            path: [],
            target: start
        }
    };

    const initialState: State = {
        minutes: 0,
        cumulFlowRate: 0,
        remainingMinutes: maxDuration,
        released: 0,
        notAlreadyTargeted: toVisit,
        notOpenedFlowRate: maxRate,
        potentialReleased: 0,
        agentsState: [...generator(nbAgents)].map(_ => buildAgent(start, fakeTarget)),
    };
    calcOptimisticReleased(initialState);

    const initialTargets = orderedNextToOpen(start, maxDuration, toVisit);
    const nextStates = setupPairs(initialTargets, nbAgents).map(targets => createNewState(initialState, targets.map(toIndexed)));
    const results: BestOutcome[] = [];
    for (const nextState of nextStates) {
        const outcome = explore(nextState, cache);
        if (outcome !== undefined) {
            results.push(outcome);
        }
    }

    return results.sort((a, b) => b.released - a.released)[0]
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const start = new Date();
    const data = parse(lines);
    logger.log(`Prep duration : ${new Date().getTime() - start.getTime()} ms`);

    const bestPart1 = maximizeDfs(forcePresent(data.get("AA")), [...data.values()], 30, type === Type.TEST, 1, logger);
    const bestPart2 = maximizeDfs(forcePresent(data.get("AA")), [...data.values()], 26, type === Type.TEST, 2, logger);
    logger.result([bestPart1.released, bestPart2.released], [1651, 2029, 1707, 2723])
}

run(16, [Type.TEST, Type.RUN], puzzle, [Part.ALL])
