use std::collections::{HashMap, HashSet};

use regex::Regex;

use crate::{
    check_result, log,
    priority_queue::{Cost, Key, PriorityQueue},
    utils::Context,
};

#[derive(Debug, PartialEq, Eq)]
struct ValveDef {
    id: u8,
    name: String,
    flow_rate: u16,
    connected_to: Vec<String>,
}

fn parse(lines: &Vec<String>) -> Vec<ValveDef> {
    let re = Regex::new(r"^Valve (?P<name>\w+) has flow rate=(?P<rate>\d+); tunnels? leads? to valves? (?P<list>\w+(?:, \w+)*)$").unwrap();

    lines
        .into_iter()
        .enumerate()
        .map(|(pos, line)| {
            let c = re.captures(line).unwrap();
            ValveDef {
                id: pos as u8,
                name: String::from(c.name("name").unwrap().as_str()),
                flow_rate: c.name("rate").unwrap().as_str().parse::<u16>().unwrap(),
                connected_to: c
                    .name("list")
                    .unwrap()
                    .as_str()
                    .split(", ")
                    .into_iter()
                    .map(|s| String::from(s))
                    .collect(),
            }
        })
        .collect()
}

struct Graph<'a> {
    map: &'a HashMap<u8, ValveDef>,
    map_id: &'a HashMap<String, u8>,
    valves_to_open: Vec<u8>,
    paths: HashMap<(u8, u8), PathInfo>,
}

struct PathInfo {
    distance: u16,
}

struct FindPathState<'a> {
    curr: &'a ValveDef,
    distance: u16,
}

impl<'a> Cost<u16> for FindPathState<'a> {
    fn cost(&self) -> u16 {
        self.distance
    }
}

impl<'a> Key<&'a String> for FindPathState<'a> {
    fn key(&self) -> &'a String {
        &self.curr.name
    }
}

fn find_sortest_path<'a>(
    from: &'a ValveDef,
    to: &'a ValveDef,
    all_valves: &'a HashMap<u8, ValveDef>,
    map_id: &'a HashMap<String, u8>,
) -> PathInfo {
    let mut priority_queue: PriorityQueue<u16, &'a String, FindPathState> = PriorityQueue::new();
    priority_queue.push(FindPathState {
        curr: from,
        distance: 0,
    });

    while let Some(s) = priority_queue.pop() {
        if s.curr.name == *to.name {
            return PathInfo {
                distance: s.distance,
            };
        }
        for link in &s.curr.connected_to {
            priority_queue.push(FindPathState {
                curr: all_valves.get(map_id.get(link).unwrap()).unwrap(),
                distance: s.distance + 1,
            })
        }
    }

    PathInfo { distance: 0 }
}

#[derive(Debug, Clone, Copy)]
struct AgentState {
    target_id: u8,
    remaining_distance: i16,
    potential_released: u16,
    done: bool,
}

struct State {
    agents: (AgentState, AgentState),
    valves_to_open: Vec<u8>,
    cumul_flow_rate: u16,
    released: u16,
    remaining_minutes: u16,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum AgentToProcess {
    First,
    Second,
}

fn advance_minutes(state: &mut State, nb: i16) {
    let nb_mins = std::cmp::min(state.remaining_minutes as i16, nb);
    if nb_mins == 0 {
        return;
    }
    state.agents.0.remaining_distance -= nb_mins as i16;
    state.agents.1.remaining_distance -= nb_mins as i16;
    state.released += state.cumul_flow_rate * nb_mins as u16;
    state.remaining_minutes -= nb_mins as u16;
}

fn open_reached_node_for_id(state: &mut State, id: u8, graph: &Graph) {
    let valve = graph.map.get(&id).unwrap();
    state.cumul_flow_rate += valve.flow_rate;
}

fn open_reached_node(state: &mut State, graph: &Graph, context: &mut DfsContext) {
    let need_open_0 = !state.agents.0.done && state.agents.0.remaining_distance == 0;
    let need_open_1 = !state.agents.1.done && state.agents.1.remaining_distance == 0;
    advance_minutes(state, 1);
    let is_ended = state.valves_to_open.len() == 0;
    if need_open_0 && need_open_1 {
        context.nb_dual_opened += 1;
    }
    if need_open_0 {
        state.agents.0.done = is_ended;
        state.agents.0.potential_released = 0;
        open_reached_node_for_id(state, state.agents.0.target_id, graph);
    }
    if need_open_1 {
        state.agents.1.done = is_ended;
        state.agents.1.potential_released = 0;
        open_reached_node_for_id(state, state.agents.1.target_id, graph);
    }
}

fn move_to_next_nearest_target(state: &mut State, graph: &Graph, context: &mut DfsContext) {
    let dist_for_first = if !state.agents.0.done {
        Some(state.agents.0.remaining_distance)
    } else {
        None
    };
    let dist_for_second = if !state.agents.1.done {
        Some(state.agents.1.remaining_distance)
    } else {
        None
    };
    let min_dist = std::cmp::max(
        std::cmp::min(
            dist_for_first.unwrap_or(i16::MAX),
            dist_for_second.unwrap_or(i16::MAX),
        ),
        0,
    );

    advance_minutes(state, min_dist);
    open_reached_node(state, graph, context);
}

fn build_new_state_with_valve_to_visit(state: &State, to_visit: &ValveToVisit) -> State {
    let new_agent = AgentState {
        target_id: to_visit.id,
        done: false,
        potential_released: to_visit.potential_released,
        remaining_distance: to_visit.path_info.distance as i16,
    };
    State {
        agents: if to_visit.agent == AgentToProcess::First {
            (new_agent, state.agents.1)
        } else {
            (state.agents.0, new_agent)
        },
        valves_to_open: state
            .valves_to_open
            .iter()
            .filter(|n| **n != to_visit.id)
            .map(|s| *s)
            .collect(),
        cumul_flow_rate: state.cumul_flow_rate,
        released: state.released,
        remaining_minutes: state.remaining_minutes,
    }
}

struct DfsContext {
    best_released: u16,
    nb_node_evaluated: u32,
    nb_skipped: u32,
    nb_dual_opened: u32,
}

fn need_to_change_target(agent: &AgentState) -> bool {
    agent.done == false && agent.remaining_distance < 0
}
struct ValveToVisit<'a> {
    id: u8,
    agent: AgentToProcess,
    path_info: &'a PathInfo,
    potential_released: u16,
}

fn get_agent<'a>(state: &'a State, ref_agent: &AgentToProcess) -> &'a AgentState {
    if *ref_agent == AgentToProcess::First {
        &state.agents.0
    } else {
        &state.agents.1
    }
}

fn get_valves_to_visit<'a>(
    state: &State,
    ref_agent: &AgentToProcess,
    graph: &'a Graph,
) -> Vec<ValveToVisit<'a>> {
    let agent = get_agent(state, ref_agent);
    let mut valves_to_visit: Vec<ValveToVisit<'a>> = state
        .valves_to_open
        .iter()
        .map(|t| (t, graph.paths.get(&(agent.target_id, *t)).unwrap()))
        .filter(|(_, p)| p.distance < state.remaining_minutes)
        .map(|(t, path_info)| ValveToVisit {
            id: *t,
            agent: *ref_agent,
            path_info,
            potential_released: graph.map.get(t).unwrap().flow_rate
                * std::cmp::max((state.remaining_minutes - path_info.distance - 1) as u16, 0),
        })
        .collect();
    valves_to_visit.sort_unstable_by(|v1, v2| v2.potential_released.cmp(&v1.potential_released));
    valves_to_visit
}

fn calc_potential_released(state: &State, graph: &Graph) -> u16 {
    let base_release = state.released
        + state.cumul_flow_rate * state.remaining_minutes
        + state.agents.0.potential_released
        + state.agents.1.potential_released;
    let info_agent_0 = (
        if state.agents.0.done {
            state.remaining_minutes
        } else {
            std::cmp::max(state.agents.0.remaining_distance, 0) as u16
        },
        state.agents.0.target_id,
    );
    let info_agent_1 = (
        if state.agents.1.done {
            state.remaining_minutes
        } else {
            std::cmp::max(state.agents.1.remaining_distance, 0) as u16
        },
        state.agents.1.target_id,
    );
    return base_release
        + state
            .valves_to_open
            .iter()
            .map(|t| {
                let mins = std::cmp::min(
                    graph.paths.get(&(info_agent_0.1, *t)).unwrap().distance + info_agent_0.0,
                    graph.paths.get(&(info_agent_1.1, *t)).unwrap().distance + info_agent_1.0,
                );
                if mins >= state.remaining_minutes {
                    0
                } else {
                    std::cmp::max((state.remaining_minutes - mins - 1) as u16, 0)
                        * graph.map.get(t).unwrap().flow_rate
                }
            })
            .sum::<u16>();
}

fn build_new_state_to_reach_next_target(
    state: &State,
    graph: &Graph,
    context: &mut DfsContext,
) -> State {
    let mut new_state = State {
        agents: (
            AgentState {
                done: state.agents.0.done,
                target_id: state.agents.0.target_id,
                potential_released: state.agents.0.potential_released,
                remaining_distance: state.agents.0.remaining_distance,
            },
            AgentState {
                done: state.agents.1.done,
                target_id: state.agents.1.target_id,
                potential_released: state.agents.1.potential_released,
                remaining_distance: state.agents.1.remaining_distance,
            },
        ),
        cumul_flow_rate: state.cumul_flow_rate,
        released: state.released,
        remaining_minutes: state.remaining_minutes,
        valves_to_open: state.valves_to_open.clone(),
    };

    move_to_next_nearest_target(&mut new_state, graph, context);
    new_state
}

fn build_new_state_to_reach_0_minutes(state: &State) -> State {
    let mut new_state = State {
        agents: (
            AgentState {
                done: true,
                target_id: 0,
                potential_released: 0,
                remaining_distance: 0,
            },
            AgentState {
                done: true,
                target_id: 0,
                potential_released: 0,
                remaining_distance: 0,
            },
        ),
        cumul_flow_rate: state.cumul_flow_rate,
        released: state.released,
        remaining_minutes: state.remaining_minutes,
        valves_to_open: state.valves_to_open.clone(),
    };
    advance_minutes(&mut new_state, state.remaining_minutes as i16);
    new_state
}

fn get_next_raw_possible_states(state: &State, graph: &Graph, is_start: bool) -> Vec<State> {
    let (need_0, need_1) = (
        need_to_change_target(&state.agents.0),
        need_to_change_target(&state.agents.1),
    );

    let mut next_valves_to_visit: Vec<ValveToVisit> = vec![];

    if need_0 {
        next_valves_to_visit.append(&mut get_valves_to_visit(
            state,
            &AgentToProcess::First,
            graph,
        ));
    }
    if need_1 && (!need_0 || !is_start) {
        next_valves_to_visit.append(&mut get_valves_to_visit(
            state,
            &AgentToProcess::Second,
            graph,
        ));
    }
    let next_states = next_valves_to_visit
        .into_iter()
        .map(|to_visit| build_new_state_with_valve_to_visit(state, &to_visit))
        .collect();
    if !(need_0 && need_1) {
        next_states
    } else {
        let tuple_next_states: Vec<State> = next_states
            .into_iter()
            .flat_map(|mut new_state| {
                let child = get_next_raw_possible_states(&new_state, graph, false);
                if child.len() > 0 {
                    child
                } else if new_state.agents.0.remaining_distance < 0 {
                    new_state.agents.0.done = true;
                    new_state.agents.0.remaining_distance = 0;
                    vec![new_state]
                } else {
                    new_state.agents.1.done = true;
                    new_state.agents.1.remaining_distance = 0;
                    vec![new_state]
                }
            })
            .collect();
        if !is_start {
            tuple_next_states
        } else {
            let mut target_set:HashSet<(u8,u8)> = HashSet::new();
            tuple_next_states.into_iter()
            .filter(|s| {
                let key = (s.agents.1.target_id,s.agents.0.target_id);
                if target_set.contains(&key) {
                    false
                } else {
                    target_set.insert((s.agents.0.target_id,s.agents.1.target_id));
                    true
                }
            })
            .collect()
        }
    }
}

fn get_next_possible_states(
    state: &State,
    graph: &Graph,
    dfs_context: &mut DfsContext,
    is_start: bool,
) -> Vec<State> {
    let mut next_raw_possible_states = get_next_raw_possible_states(state, graph, is_start);

    if next_raw_possible_states.len() == 0 {
        if !state.agents.0.done || !state.agents.1.done {
            return vec![build_new_state_to_reach_next_target(
                state,
                graph,
                dfs_context,
            )];
        }
        return vec![build_new_state_to_reach_0_minutes(state)];
    }

    next_raw_possible_states
        .iter_mut()
        .for_each(|s| move_to_next_nearest_target(s, graph, dfs_context));

    next_raw_possible_states
        .into_iter()
        .filter(|s| {
            let potential_released = calc_potential_released(&s, graph);
            let to_keep = potential_released > dfs_context.best_released;
            if !to_keep {
                dfs_context.nb_skipped += 1;
            }
            to_keep
        })
        .collect()
}

fn explore(
    state: &State,
    graph: &Graph,
    dfs_context: &mut DfsContext,
    is_start: bool,
    context: &Context,
) -> u16 {
    dfs_context.nb_node_evaluated += 1;
    if context.is_debug() {
        let not_opened: Vec<&String> = state
            .valves_to_open
            .iter()
            .map(|t| &graph.map.get(&t).unwrap().name)
            .collect();
        log!(
            debug,
            context,
            "Exploring {} / {} # {} / {} # {} / {:?}",
            dfs_context.best_released,
            state.remaining_minutes,
            state.released,
            graph.map.get(&state.agents.0.target_id).unwrap().name,
            graph.map.get(&state.agents.1.target_id).unwrap().name,
            not_opened
        );
    }
    if state.remaining_minutes == 0 {
        dfs_context.best_released = std::cmp::max(dfs_context.best_released, state.released);
        return state.released;
    }
    let mut max_released: u16 = 0;
    for next_state in get_next_possible_states(state, graph, dfs_context, is_start) {
        let result = explore(&next_state, graph, dfs_context, false, context);
        if result > max_released {
            max_released = result;
            dfs_context.best_released = std::cmp::max(dfs_context.best_released, max_released);
        }
    }
    max_released
}

fn dfs_max_release(
    graph: &Graph,
    max_duration: u16,
    is_second_part: bool,
    context: &Context,
) -> u16 {
    let start = graph.map.get(graph.map_id.get("AA").unwrap()).unwrap().id;
    let init_state: State = State {
        agents: (
            AgentState {
                target_id: start,
                remaining_distance: -1,
                potential_released: 0,
                done: false,
            },
            AgentState {
                target_id: start,
                remaining_distance: -1,
                potential_released: 0,
                done: !is_second_part,
            },
        ),
        valves_to_open: graph.valves_to_open.clone(),
        cumul_flow_rate: 0,
        released: 0,
        remaining_minutes: max_duration,
    };
    let mut dfs_context = DfsContext {
        best_released: 0,
        nb_node_evaluated: 0,
        nb_skipped: 0,
        nb_dual_opened: 0,
    };

    let max = explore(&init_state, graph, &mut dfs_context, true, context);
    log!(
        debug,
        context,
        "Node explored {} / {} skipped / {} double opened",
        dfs_context.nb_node_evaluated,
        dfs_context.nb_skipped,
        dfs_context.nb_dual_opened
    );
    max
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let map: HashMap<u8, ValveDef> = parse(lines).into_iter().map(|v| (v.id, v)).collect();
    let map_id: HashMap<String, u8> = map
        .iter()
        .map(|(_, v)| (v.name.to_string(), v.id))
        .collect();
    let map_path = build_paths_map(&map, &map_id);
    let graph = Graph {
        valves_to_open: get_valves_map_to_open(&map),
        map: &map,
        map_id: &map_id,
        paths: map_path,
    };

    check_result!(
        context,
        [
            dfs_max_release(&graph, 30, false, context),
            dfs_max_release(&graph, 26, true, context)
        ],
        [1651, 2029, 1707, 2723]
    );
}

fn get_valves_map_to_open(map: &HashMap<u8, ValveDef>) -> Vec<u8> {
    map.values()
        .filter(|v| v.flow_rate > 0)
        .map(|v| v.id)
        .collect()
}

fn build_paths_map(
    map: &HashMap<u8, ValveDef>,
    map_id: &HashMap<String, u8>,
) -> HashMap<(u8, u8), PathInfo> {
    return map
        .values()
        .filter(|a| a.flow_rate > 0 || a.name == "AA")
        .flat_map(|v| {
            map.values()
                .filter(|a| a.flow_rate > 0)
                .map(|v2| ((v.id, v2.id), find_sortest_path(v, v2, map, map_id)))
        })
        .collect();
}
