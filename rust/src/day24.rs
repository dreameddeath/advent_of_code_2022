use crate::{
    check_result,
    priority_queue::{Cost, Key, PriorityQueue},
    utils::Context,
};

#[derive(Debug, PartialEq, Eq)]
enum ObjectType {
    BlizzardDown,
    BlizzardUp,
    BlizzardLeft,
    BlizzardRight,
    Empty,
}

//type CellContent = ObjectType | undefined;

struct World {
    width: i16,
    height: i16,
    cells: Vec<ObjectType>,
}

fn parse(lines: &Vec<String>) -> World {
    let height: i16 = lines.len() as i16 - 2;
    let width: i16 = lines.get(0).map(|line| line.len() as i16 - 2).unwrap_or(0);
    World {
        width,
        height,
        cells: lines
            .into_iter()
            .take(lines.len() - 1)
            .skip(1)
            .flat_map(|line| {
                line.chars()
                    .into_iter()
                    .take(line.len() - 1)
                    .skip(1)
                    .map(|c| match c {
                        '^' => ObjectType::BlizzardUp,
                        'v' => ObjectType::BlizzardDown,
                        '>' => ObjectType::BlizzardRight,
                        '<' => ObjectType::BlizzardLeft,
                        _ => ObjectType::Empty,
                    })
            })
            .collect(),
    }
}

#[derive(Debug)]
struct Coord {
    x: i16,
    y: i16,
}

#[derive(Debug)]
struct State<'a> {
    coord: Coord,
    mins: u16,
    target: &'a Coord,
}

static OFFSET: &'static [(i16, i16)] = &[(-1, 0), (1, 0), (0, -1), (0, 1), (0, 0)];

fn calc_index(coord: &Coord, world: &World, minutes_offset: (i16, i16)) -> usize {
    if minutes_offset.1 == 0 {
        let mut offset = (coord.x + minutes_offset.0) % world.width;
        if offset < 0 {
            offset += world.width
        }
        (coord.y * world.width + offset) as usize
    } else {
        let mut offset = (coord.y  + minutes_offset.1) % world.height;
        if offset < 0 {
            offset += world.height
        }
        (offset * world.width + coord.x) as usize
    }
}

fn is_occupied(coord: &Coord, min: &u16, world: &World) -> bool {
    let d: i16 = *min as i16;
    return world.cells[calc_index(coord, world, (d, 0))] == ObjectType::BlizzardLeft
        || world.cells[calc_index(coord, world, (-d, 0))] == ObjectType::BlizzardRight
        || world.cells[calc_index(coord, world, (0, -d))] == ObjectType::BlizzardDown
        || world.cells[calc_index(coord, world, (0, d))] == ObjectType::BlizzardUp;
}

fn get_next_state<'a>(curr: &State<'a>, world: &World) -> Vec<State<'a>> {
    OFFSET
        .into_iter()
        .map(|offset| State {
            coord: Coord {
                x: curr.coord.x + offset.0,
                y: curr.coord.y + offset.1,
            },
            mins: curr.mins + 1,
            target: curr.target,
        })
        .filter(|new_state| {
            let is_start = new_state.coord.y == -1 && new_state.coord.x == 0;
            let is_end = new_state.coord.y == world.height
                && new_state.coord.x == (world.width - 1);
            let is_valid_coord = (new_state.coord.x >= 0 && new_state.coord.x < world.width)
                && (new_state.coord.y >= 0 && new_state.coord.y < world.height);
            is_start
                || is_end
                || (is_valid_coord && !is_occupied(&new_state.coord, &new_state.mins, world))
        })
        .collect()
}

impl<'a> Cost<u16> for State<'a> {
    fn cost(&self) -> u16 {
        self.mins
            + (self.target.x - self.coord.x).abs() as u16
            + (self.target.y - self.coord.y).abs() as u16
    }
}

impl<'a> Key<u32> for State<'a> {
    fn key(&self) -> u32 {
        (self.mins as u32) << 16 | (((self.coord.y + 1) as u32) << 8) | (self.coord.x + 1) as u32
    }
}

fn find_path<'a>(world: &World, start: &Coord, target: &'a Coord, start_min: &u16) -> Option<u16> {
    let mut priority_queue: PriorityQueue<u16, u32, State<'a>> = PriorityQueue::new();
    priority_queue.push(State {
        coord: Coord {
            x: start.x,
            y: start.y,
        },
        mins: *start_min,
        target,
    });
    while let Some(next) = priority_queue.pop() {
        if next.coord.x == target.x && next.coord.y == target.y {
            return Option::Some(next.mins);
        }
        for new_state in get_next_state(&next, &world) {
            priority_queue.push(new_state)
        }
    }
    return Option::None;
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let world = parse(lines);
    let start = Coord { x: 0, y: -1 };
    let end = Coord {
        y: world.height as i16,
        x: world.width as i16 - 1,
    };

    let first_trip = find_path(&world, &start, &end, &0).unwrap();
    let second_trip = find_path(&world, &end, &start, &first_trip).unwrap();
    let third_trip = find_path(&world, &start, &end, &second_trip).unwrap();
    check_result!(context, [first_trip, third_trip], [18, 292, 54, 816]);
}
