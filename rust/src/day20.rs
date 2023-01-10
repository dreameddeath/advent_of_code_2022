use crate::{
    check_result, log,
    utils::{Context, Part},
};

#[derive(Debug, Eq)]
#[allow(dead_code)]
struct Item {
    init_pos: usize,
    v: i64,
}

impl PartialEq for Item {
    fn eq(&self, other: &Self) -> bool {
        self.v == other.v
    }
}


fn parse(lines: &Vec<String>, decypher_key: i64) -> Vec<Item> {
    lines
        .iter()
        .enumerate()
        .map(|(pos, line)| Item {
            v: line.parse::<i64>().unwrap() * decypher_key,
            init_pos: pos,
        })
        .collect()
}

#[allow(dead_code)]
fn to_vec(items: &Vec<Item>) -> Vec<i64> {
    items.iter().map(|item| item.v).collect()
}

#[allow(dead_code)]
fn mix(items: &mut Vec<Item>) {
    let end_pos = items.len();
    let max_pos = end_pos as i64 - 1;
    for pos in 0..end_pos {
        let curr_item_pos = items.iter().position(|item| item.init_pos == pos).unwrap();
        let offset = items[curr_item_pos].v;
        let new_index = ((curr_item_pos as i64) + offset).rem_euclid(max_pos) as usize;

        if curr_item_pos < new_index {
            items[curr_item_pos..=new_index].rotate_left(1);
        } else {
            items[new_index..=curr_item_pos].rotate_right(1);
        }
    }
}

#[allow(dead_code)]
fn calc_result(items: &Vec<Item>, context: &Context) -> i64 {
    let zero_index = items.iter().position(|it| it.v == 0).unwrap();
    let mut result = 0;
    log!(debug, context, "Zero pos {}", zero_index);

    for offset in [1000, 2000, 3000] {
        result += items[(zero_index + offset) % items.len()].v
    }
    result
}


pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let mut items = parse(
        lines,
        if context.is_part(Part::Part1) {
            1
        } else {
            811589153
        },
    );


    if context.is_part(Part::Part1) {
        mix(&mut items);
        let result = calc_result(&items, context);
        check_result!(context,result,[3, 988]);
    } else {
        for _iteration in 0..10 {
            mix(&mut items);
        }

        let result = calc_result(&items, context);
        check_result!(
            context,
            result,
            [1623178306, 7768531372516]
        );
    }
}