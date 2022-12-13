use std::{
    collections::{BinaryHeap, HashMap},
    fmt,
};

use crate::utils::Part;

#[derive(Eq, PartialEq, Debug)]
enum Type {
    START,
    END,
    STANDARD,
}

#[derive(Eq, PartialEq, Debug)]
struct MapItem {
    height: u8,
    item_type: Type,
}

struct MapWorld {
    items: Vec<Vec<MapItem>>,
    width: u8,
    height: u8,
}

fn parse(lines: &Vec<String>) -> MapWorld {
    let ref_char = Into::<u32>::into('a');
    return MapWorld {
        items: lines
            .into_iter()
            .map(|l| {
                l.chars()
                    .map(|c| {
                        if c == 'S' {
                            MapItem {
                                height: 0,
                                item_type: Type::START,
                            }
                        } else if c == 'E' {
                            MapItem {
                                height: (Into::<u32>::into('z') - ref_char) as u8,
                                item_type: Type::END,
                            }
                        } else if c >= 'a' && c <= 'z' {
                            MapItem {
                                height: (Into::<u32>::into(c) - ref_char) as u8,
                                item_type: Type::STANDARD,
                            }
                        } else {
                            panic!("Not managed char {}", c)
                        }
                    })
                    .collect()
            })
            .collect(),
        width: lines.get(0).map(|l| l.len() as u8).unwrap(),
        height: lines.len() as u8,
    };
}

#[derive(Eq, PartialEq, Debug)]
struct Node<'a> {
    x: u16,
    y: u16,
    map_item: &'a MapItem,
    nb_step: u16,
}

impl<'a> fmt::Display for Node<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "(x:{}, y:{}, h:{}, s:{})",
            self.x, self.y, self.map_item.height, self.nb_step
        )
    }
}

impl<'a> Ord for Node<'a> {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        other.nb_step.cmp(&self.nb_step)
    }
}

impl<'a> PartialOrd for Node<'a> {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        other.nb_step.partial_cmp(&self.nb_step)
    }
}

#[derive(Eq, PartialEq)]
enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT,
}

impl Direction {
    const VALUES: [Self; 4] = [Self::UP, Self::DOWN, Self::LEFT, Self::RIGHT];
}

fn get_next_pos<'a>(map: &'a MapWorld, curr: &Node, direction: &Direction) -> Option<Node<'a>> {
    let new_x = if *direction == Direction::LEFT {
        curr.x as i16 - 1
    } else if *direction == Direction::RIGHT {
        curr.x as i16 + 1
    } else {
        curr.x as i16
    };
    let new_y = if *direction == Direction::UP {
        curr.y as i16 + 1
    } else if *direction == Direction::DOWN {
        curr.y as i16 - 1
    } else {
        curr.y as i16
    };

    if new_x < 0 || new_x >= map.width as i16 || new_y < 0 || new_y > map.height as i16 {
        return Option::None;
    }

    return map
        .items
        .get(new_y as usize)
        .and_then(|line| line.get(new_x as usize))
        .filter(|next_item| next_item.height + 1 >= curr.map_item.height)
        .map(|item| Node {
            x: new_x as u16,
            y: new_y as u16,
            map_item: item,
            nb_step: curr.nb_step + 1,
        });
}

fn key(node: &Node) -> u16 {
    return ((node.y as u16) << 8) | node.x as u16;
}

fn find_path<P: Fn(&MapItem) -> bool>(map: &MapWorld, start_pos: Node, is_end: P) -> Option<u16> {
    //let mut processed: HashMap<u16,u16> = HashMap::new();
    let mut best_inserted: HashMap<u16, u16> = HashMap::new();
    let mut priority_queue: BinaryHeap<Node> = BinaryHeap::new();
    priority_queue.push(start_pos);
    while let Some(next) = priority_queue.pop() {
        if is_end(&next.map_item) {
            return Option::Some(next.nb_step);
        }
        
        for dir in Direction::VALUES.iter() {
            if let Some(to_explore) = get_next_pos(&map, &next, dir) {
                let key = key(&to_explore);
                if best_inserted
                    .get(&key)
                    .filter(|step| **step <= to_explore.nb_step)
                    .is_none()
                {
                    best_inserted.insert(key, to_explore.nb_step);
                    priority_queue.push(to_explore);
                }
            }
        }
    }
    return Option::None;
}

fn build_start<'a, P: Fn(&'a MapItem) -> bool>(map: &'a MapWorld, p: &'a P) -> Option<Node<'a>> {
    map.items.iter().enumerate().find_map(|(y, line)| {
        line.iter()
            .enumerate()
            .find(|(_, item)| p(*item))
            .map(move |(x, item)| Node {
                map_item: item,
                x: x as u16,
                y: y as u16,
                nb_step: 0,
            })
    })
}

const DEBUG:bool = true;

pub fn puzzle(part: &Part, lines: &Vec<String>) {
    let map = parse(lines);

    match part {
        Part::Part1 => {
            let result = build_start(&map, &(|item| item.item_type == Type::END))
                .and_then(|start| {
                    find_path(&map, start, |item: &MapItem| item.item_type == Type::START)
                })
                .unwrap();
            if DEBUG {
                println!("Result {}", result)
            }
        }
        Part::Part2 => {
            let result = build_start(&map, &(|item| item.item_type == Type::END))
                .and_then(|start| find_path(&map, start, |item| item.height == 0))
                .unwrap();
            if DEBUG {
                println!("Result {}", result)
            }
        }
    }
}
