use std::{
    hash::{Hash}
};

use rustc_hash::FxHashSet;

use crate::{
    check_result, log,
    utils::{Context, Part},
};

#[derive(Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
struct Coord {
    x: i16,
    y: i16,
}


static OFFSETS: [Coord; 8] = [
    Coord { x: -1, y: -1 },
    Coord { x: -1, y: 0 },
    Coord { x: -1, y: 1 },
    Coord { x: 0, y: -1 },
    Coord { x: 0, y: 1 },
    Coord { x: 1, y: -1 },
    Coord { x: 1, y: 0 },
    Coord { x: 1, y: 1 },
];

#[derive(Debug)]
struct Elf {
    coord: Coord,
}

impl Elf {
    fn new_simple(x: i16, y: i16) -> Elf {
        Elf {
            coord: Coord { x, y },
        }
    }
}


impl PartialEq for Elf {
    fn eq(&self, other: &Self) -> bool {
        self.coord == other.coord
    }
}

impl Eq for Elf {}

struct Map {
    used_coord: FxHashSet<Coord>,
    elves: Vec<Elf>,
    max_size: usize,
}

enum Direction {
    North,
    South,
    East,
    West,
}

impl Direction {
    fn can_move_toward(&self, offsets: &Vec<&Coord>) -> bool {
        (match self {
            Direction::North => offsets.iter().filter(|offset| offset.y == -1).count(),
            Direction::South => offsets.iter().filter(|offset| offset.y == 1).count(),
            Direction::West => offsets.iter().filter(|offset| offset.x == -1).count(),
            Direction::East => offsets.iter().filter(|offset| offset.x == 1).count(),
        }) == 3
    }

    fn new_coord(&self, elf: &Elf) -> Coord {
        match self {
            Direction::North => Coord {
                x: elf.coord.x,
                y: elf.coord.y - 1,
            },
            Direction::South => Coord {
                x: elf.coord.x,
                y: elf.coord.y + 1,
            },
            Direction::West => Coord {
                x: elf.coord.x - 1,
                y: elf.coord.y,
            },
            Direction::East => Coord {
                x: elf.coord.x + 1,
                y: elf.coord.y,
            },
        }
    }
}

type DirectionList = [Direction; 4];

static ALL_DIRECTIONS: [DirectionList; 4] = [
    [
        Direction::North,
        Direction::South,
        Direction::West,
        Direction::East,
    ],
    [
        Direction::South,
        Direction::West,
        Direction::East,
        Direction::North,
    ],
    [
        Direction::West,
        Direction::East,
        Direction::North,
        Direction::South,
    ],
    [
        Direction::East,
        Direction::North,
        Direction::South,
        Direction::West,
    ],
];

impl Map {
    fn new() -> Map {
        Map {
            used_coord: FxHashSet::default(),
            elves: vec![],
            max_size: 0,
        }
    }

    fn has(&self, x: i16, y: i16) -> bool {
        self.used_coord.contains(&Coord { x, y })
    }

    fn insert(&mut self, elf: Elf) {
        self.used_coord.insert(Coord {
            x: elf.coord.x,
            y: elf.coord.y,
        });
        self.elves.push(elf);
    }

    fn move_elves_v3(&mut self, direction_list: &DirectionList,to_try_move:&mut Vec<(Coord,usize)>) -> usize {
        let mut offsets: Vec<&Coord> = Vec::with_capacity(8);
        to_try_move.clear();
        for (pos,elf) in self.elves.iter().enumerate() {
            offsets.clear();
            for offset in &OFFSETS {
                if !self.used_coord.contains(&Coord {
                    x: offset.x + elf.coord.x,
                    y: offset.y + elf.coord.y,
                }) {
                    offsets.push(offset);
                }
            }
            if offsets.len() <= 2 || offsets.len() == 8 {
                continue;
            }
            for direction in direction_list {
                if direction.can_move_toward(&offsets) {
                    to_try_move.push((direction.new_coord(elf), pos));
                    break;
                }
            }
        }

        to_try_move.sort_unstable_by(|(c1, _), (c2, _)| c1.cmp(&c2));
        let mut nb_move = 0;
        let mut pos = 0;
        let size = to_try_move.len();
        if size > self.max_size {
            self.max_size = size;
        }
        while pos < size {
            let coord_ref = &to_try_move[pos].0;
            if pos + 1 < size {
                if to_try_move[pos + 1].0 == *coord_ref {
                    while pos + 1 < size && to_try_move[pos + 1].0 == to_try_move[pos].0 {
                        pos += 1;
                    }
                    pos += 1;
                    continue;
                }
            }
            let (coord,elf_pos) = &to_try_move[pos];
            let elf = &mut self.elves[*elf_pos];
            self.used_coord.remove(&elf.coord);
            elf.coord.x = coord.x;
            elf.coord.y = coord.y;
            self.used_coord.insert(Coord {
                x: coord.x,
                y: coord.y,
            });
            pos += 1;
            nb_move += 1;
        }
        nb_move
    }
}

fn parse(lines: &Vec<String>) -> Map {
    let mut map = Map::new();
    lines.iter().enumerate().for_each(|(y, line)| {
        line.chars().enumerate().for_each(|(x, char)| {
            if char == '#' {
                map.insert(Elf::new_simple(x as i16, y as i16));
            }
        })
    });
    map
}

fn calc_min_max(map: &Map) -> (Coord, Coord) {
    let mut min_max = (
        Coord {
            x: std::i16::MAX,
            y: std::i16::MAX,
        },
        Coord {
            x: std::i16::MIN,
            y: std::i16::MIN,
        },
    );
    for elf in &map.elves {
        min_max.0.x = std::cmp::min(min_max.0.x, elf.coord.x);
        min_max.0.y = std::cmp::min(min_max.0.y, elf.coord.y);

        min_max.1.x = std::cmp::max(min_max.1.x, elf.coord.x);
        min_max.1.y = std::cmp::max(min_max.1.y, elf.coord.y);
    }
    min_max
}

fn print(map: &Map, context: &Context) {
    if !context.is_debug() || !context.is_test() {
        return;
    }

    let min_max = calc_min_max(map);
    let mut result = String::with_capacity(calc_size(&min_max) as usize);
    result.push('\n');
    for y in min_max.0.y..min_max.1.y + 1 {
        for x in min_max.0.x..min_max.1.x + 1 {
            result.push(if map.has(x, y) { '#' } else { '.' });
        }
        result.push('\n');
    }
    log!(debug, context, "{}", result);
}

fn calc_size(min_max: &(Coord, Coord)) -> i32 {
    (min_max.1.x as i32 - min_max.0.x as i32 + 1) * (min_max.1.y as i32 - min_max.0.y as i32 + 1)
}

fn calc_free_slots(map: &Map) -> i32 {
    let min_max = calc_min_max(map);
    calc_size(&min_max) - map.elves.len() as i32
}

fn iterate(map: &mut Map, id: i32,temps:&mut Vec<(Coord,usize)>) -> usize {
    let direction_list = &ALL_DIRECTIONS[(id as usize) % ALL_DIRECTIONS.len()];
    map.move_elves_v3(direction_list,temps)
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let mut map = parse(lines);
    let mut temp_movable:Vec<(Coord,usize)>=Vec::with_capacity(map.elves.len());
    if context.is_part(Part::Part1) {
        print(&map, context);

        for i in 0..10 {
            iterate(&mut map, i,&mut temp_movable);
            print(&map, context);
        }
        let result = calc_free_slots(&map);
        check_result!(context, result, [110, 4172]);
    } else {
        let mut id = 0;
        while iterate(&mut map, id,&mut temp_movable) > 0 {
            id += 1;
        }
        check_result!(context, id + 1, [20, 942]);
    }
}
