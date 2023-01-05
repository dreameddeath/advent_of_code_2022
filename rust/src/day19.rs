use regex::{Captures, Regex};

use crate::{
    check_result, log,
    utils::{Context, Part},
};

#[derive(Debug, PartialEq, Eq)]
struct PerTypeMap<T> {
    ore: T,
    clay: T,
    obsidian: T,
    geode: T,
}

#[derive(Debug, PartialEq, Eq)]
enum MaterialType {
    Ore,
    Clay,
    Obsidian,
    Geode,
}

struct PerTypeIterator {
    is_reverse: bool,
    curr: Option<MaterialType>,
}

impl Iterator for PerTypeIterator {
    type Item = MaterialType;
    fn next(&mut self) -> Option<Self::Item> {
        self.curr.take().map(|curr| {
            match curr {
                MaterialType::Ore => {
                    self.curr = if self.is_reverse {
                        None
                    } else {
                        Some(MaterialType::Clay)
                    };
                }
                MaterialType::Clay => {
                    self.curr = if self.is_reverse {
                        Some(MaterialType::Ore)
                    } else {
                        Some(MaterialType::Obsidian)
                    };
                }
                MaterialType::Obsidian => {
                    self.curr = if self.is_reverse {
                        Some(MaterialType::Clay)
                    } else {
                        Some(MaterialType::Geode)
                    };
                }
                MaterialType::Geode => {
                    self.curr = if self.is_reverse {
                        Some(MaterialType::Obsidian)
                    } else {
                        None
                    };
                }
            };
            curr
        })
    }
}

impl MaterialType {
    fn iter() -> PerTypeIterator {
        PerTypeIterator {
            is_reverse: false,
            curr: Some(MaterialType::Ore),
        }
    }

    fn iter_rev() -> PerTypeIterator {
        PerTypeIterator {
            is_reverse: true,
            curr: Some(MaterialType::Geode),
        }
    }

    fn get<'a, T>(&self, parent: &'a PerTypeMap<T>) -> &'a T {
        match self {
            MaterialType::Ore => &parent.ore,
            MaterialType::Clay => &parent.clay,
            MaterialType::Obsidian => &parent.obsidian,
            MaterialType::Geode => &parent.geode,
        }
    }

    fn get_mut<'a, T>(&self, parent: &'a mut PerTypeMap<T>) -> &'a mut T {
        match self {
            MaterialType::Ore => &mut parent.ore,
            MaterialType::Clay => &mut parent.clay,
            MaterialType::Obsidian => &mut parent.obsidian,
            MaterialType::Geode => &mut parent.geode,
        }
    }
}

type Requirements = PerTypeMap<u16>;

impl Requirements {
    fn init() -> Requirements {
        Requirements {
            ore: 0,
            clay: 0,
            obsidian: 0,
            geode: 0,
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
struct Blueprint {
    requirements: PerTypeMap<Requirements>,
    max_requirement: PerTypeMap<u16>,
    id: u16,
}

impl Blueprint {
    fn init(id: u16) -> Blueprint {
        Blueprint {
            requirements: PerTypeMap {
                ore: Requirements::init(),
                clay: Requirements::init(),
                obsidian: Requirements::init(),
                geode: Requirements::init(),
            },
            max_requirement: PerTypeMap {
                ore: 0,
                clay: 0,
                obsidian: 0,
                geode: 0,
            },
            id,
        }
    }
}

fn update_requirement(req: &mut Requirements, name: &str, qty: &str) {
    let value = qty.parse::<u16>().unwrap();
    match name {
        "ore" => req.ore = value,
        "clay" => req.clay = value,
        "obsidian" => req.obsidian = value,
        "geode" => req.geode = value,
        _ => panic!("Unknown name {}", name),
    }
}

fn update_requirements(req: &mut Requirements, parse_res: Captures) {
    update_requirement(
        req,
        parse_res.name("req1name").unwrap().as_str(),
        parse_res.name("req1qty").unwrap().as_str(),
    );
    if let Some(req2_name) = parse_res.name("req2name") {
        update_requirement(
            req,
            req2_name.as_str(),
            parse_res.name("req2qty").unwrap().as_str(),
        );
    }
}

fn parse(lines: &Vec<String>) -> Vec<Blueprint> {
    let re = Regex::new(r"^Each (?P<rname>\w+) robot costs (?P<req1qty>\d+) (?P<req1name>\w+)(?: and (?P<req2qty>\d+) (?P<req2name>\w+))?\.?$").unwrap();
    let re_blueprint = Regex::new(r"^Blueprint (?P<id>\d+)$").unwrap();
    return lines
        .iter()
        .map(|line| {
            let mut main_parts = line.split(": ");
            let blueprint_descr = main_parts.nth(0).unwrap();
            let id = re_blueprint
                .captures(blueprint_descr)
                .unwrap()
                .name("id")
                .unwrap()
                .as_str()
                .parse::<u16>()
                .unwrap();
            let requirements_str = main_parts.last().unwrap();
            let mut blueprint = Blueprint::init(id);
            for req_str in requirements_str.split(". ") {
                let c = re.captures(req_str).unwrap();
                let name = c.name("rname").unwrap().as_str();
                match name {
                    "ore" => update_requirements(&mut blueprint.requirements.ore, c),
                    "clay" => update_requirements(&mut blueprint.requirements.clay, c),
                    "obsidian" => update_requirements(&mut blueprint.requirements.obsidian, c),
                    "geode" => update_requirements(&mut blueprint.requirements.geode, c),
                    _ => panic!("Unknown name {}", name),
                }
            }
            for iter_requirement in MaterialType::iter() {
                let req = iter_requirement.get(&blueprint.requirements);
                for iter_target in MaterialType::iter() {
                    *iter_target.get_mut(&mut blueprint.max_requirement) = std::cmp::max(
                        *iter_target.get(&blueprint.max_requirement),
                        *iter_target.get(req),
                    );
                }
            }
            blueprint.max_requirement.geode = std::u16::MAX;
            blueprint
        })
        .collect();
}

type Stock = PerTypeMap<u16>;
type Production = PerTypeMap<u16>;

#[derive(Debug, PartialEq, Eq)]
struct State {
    stock: Stock,
    production: Production,
    remaining_minutes: u16,
}

struct DfsContext<'a> {
    blueprint: &'a Blueprint,
    best_produced: u16,
    nb_explored: u32,
    nb_skipped: u32,
}

fn new_state_after_duration(state: &State, duration: u16, req: &Requirements) -> State {
    return State {
        stock: Stock {
            ore: state.stock.ore + state.production.ore * duration - req.ore,
            clay: state.stock.clay + state.production.clay * duration - req.clay,
            obsidian: state.stock.obsidian + state.production.obsidian * duration - req.obsidian,
            geode: state.stock.geode + state.production.geode * duration - req.geode,
        },
        production: Production {
            ore: state.production.ore,
            clay: state.production.clay,
            obsidian: state.production.obsidian,
            geode: state.production.geode,
        },
        remaining_minutes: state.remaining_minutes - duration,
    };
}

fn next_state_with_production(
    state: &State,
    type_to_produce: &MaterialType,
    req: &Requirements,
) -> Option<State> {
    let mut duration: u16 = 0;
    for required_type in MaterialType::iter_rev() {
        let required_qty = required_type.get(req);
        if *required_qty > 0 {
            let curr_production = required_type.get(&state.production);

            if *curr_production == 0 {
                return None;
            }
            let curr_stock = required_type.get(&state.stock);
            duration = std::cmp::max(
                duration,
                if *curr_stock > *required_qty {
                    0
                } else {
                    let missing = *required_qty - curr_stock;
                    missing / curr_production + if missing % curr_production > 0 { 1 } else { 0 }
                },
            )
        }
    }
    if duration + 1 >= state.remaining_minutes {
        return None;
    }
    let mut new_state = new_state_after_duration(state, duration + 1, req);
    match type_to_produce {
        MaterialType::Ore => new_state.production.ore += 1,
        MaterialType::Clay => new_state.production.clay += 1,
        MaterialType::Obsidian => new_state.production.obsidian += 1,
        MaterialType::Geode => new_state.production.geode += 1,
    }
    return Some(new_state);
}

struct BestEstimatedProduction {
    geodes: u16,
    geodes_prod_rate: u16,
}

fn may_state_produce_more_than_best(state: &State, dfs_context: &DfsContext) -> bool {
    let mut best_production: BestEstimatedProduction = BestEstimatedProduction {
        geodes: state.stock.geode,
        geodes_prod_rate: state.production.geode,
    };
    let mut remaining_minutes = state.remaining_minutes;

    while remaining_minutes > 0 {
        best_production.geodes += best_production.geodes_prod_rate;
        best_production.geodes_prod_rate += 1;
        remaining_minutes -= 1;
    }
    return best_production.geodes > dfs_context.best_produced;
}

fn next_states(state: &State, dfs_context: &mut DfsContext) -> Vec<State> {
    let mut result: Vec<State> = vec![];
    let max_req = &dfs_context.blueprint.max_requirement;

    for type_to_produce in MaterialType::iter_rev() {
        if type_to_produce.get(&state.production) >= type_to_produce.get(max_req) {
            continue;
        }
        if let Some(new_state) = next_state_with_production(
            state,
            &type_to_produce,
            type_to_produce.get(&dfs_context.blueprint.requirements),
        ) {
            if may_state_produce_more_than_best(&new_state, dfs_context) {
                result.push(new_state)
            } else {
                dfs_context.nb_skipped += 1;
            }
        }
    }
    if result.len() == 0 && state.remaining_minutes > 0 {
        result.push(new_state_after_duration(
            state,
            state.remaining_minutes,
            &Requirements {
                ore: 0,
                clay: 0,
                geode: 0,
                obsidian: 0,
            },
        ))
    }

    result
}

fn explore(state: &State, dfs_context: &mut DfsContext, context: &Context, depth: u8) -> u16 {
    log!(
        debug,
        context,
        "Depth {} / Exploring {} with production {}/{}/{}/{} and stock {}/{}/{}/{} and best {}",
        depth,
        state.remaining_minutes,
        state.production.ore,
        state.production.clay,
        state.production.obsidian,
        state.production.geode,
        state.stock.ore,
        state.stock.clay,
        state.stock.obsidian,
        state.stock.geode,
        dfs_context.best_produced
    );

    dfs_context.nb_explored += 1;
    if state.remaining_minutes == 0 {
        return state.stock.geode;
    }

    let mut best_produced = 0;
    let next_states = next_states(state, dfs_context);
    for next_state in &next_states {
        let produced = explore(&next_state, dfs_context, context, depth + 1);
        if produced > best_produced {
            dfs_context.best_produced = std::cmp::max(dfs_context.best_produced, produced);
            best_produced = produced;
        }
    }

    return best_produced;
}

fn maximise_dfs(max_mins: u16, blueprint: &Blueprint, context: &Context) -> u16 {
    let mut dfs_context = DfsContext {
        best_produced: 0,
        nb_explored: 0,
        nb_skipped: 0,
        blueprint,
    };
    let state = State {
        production: Production {
            ore: 1,
            clay: 0,
            geode: 0,
            obsidian: 0,
        },
        remaining_minutes: max_mins,
        stock: Stock {
            ore: 0,
            clay: 0,
            geode: 0,
            obsidian: 0,
        },
    };
    let result = explore(&state, &mut dfs_context, context, 0);
    log!(
        debug,
        context,
        "{} with Explored {} / {}",
        result,
        dfs_context.nb_explored,
        dfs_context.nb_skipped
    );
    result
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let blueprints = parse(lines);
    if context.is_part(Part::Part1) {
        let result = blueprints
            .iter()
            .map(|blueprint| maximise_dfs(24, blueprint, context) * blueprint.id as u16)
            .sum();

        check_result!(context, result, [33, 1599]);
    } else {
        let result = blueprints
            .iter()
            .take(3)
            .map(|blueprint| maximise_dfs(32, blueprint, context))
            .product();

        check_result!(context, result, [3472, 14112]);
    }
}
