use std::collections::LinkedList;

use crate::{
    check_result, log,
    utils::{Context, Part},
};
const DISABLE_STANDARD_IMPL: bool = false;
const DISABLE_ALTERNATIVE_IMPL: bool = true;

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

#[derive(Debug, Eq)]
struct Wrapper<'a> {
    item: &'a Item,
    grouped_pos: usize,
}

impl<'a> PartialEq for Wrapper<'a> {
    fn eq(&self, other: &Self) -> bool {
        self.item == other.item
    }
}

struct AdaptativeList<'a> {
    size: usize,
    items: Vec<Wrapper<'a>>,
    circular_list: Vec<LinkedList<usize>>,
}


impl<'a> AdaptativeList<'a> {
    fn new(orig: &'a Vec<Item>, size: usize) -> AdaptativeList<'a> {
        let total_len = orig.len();
        let estimated_len = (total_len / size) + if total_len % size > 0 { 1 } else { 0 };
        let mut circular_list: Vec<LinkedList<usize>> = Vec::with_capacity(estimated_len);
        let items: Vec<Wrapper> = orig
            .chunks(size)
            .enumerate()
            .flat_map(|(pos, array)| {
                circular_list.push(LinkedList::new());
                let sub_list: Vec<Wrapper<'a>> = array
                    .iter()
                    .enumerate()
                    .map(|(sub_pos, item)| {
                        let result = Wrapper {
                            item,
                            grouped_pos: pos,
                        };
                        circular_list[pos].push_back(pos * size + sub_pos);
                        result
                    })
                    .collect();
                sub_list
            })
            .collect();

        AdaptativeList {
            size,
            circular_list,
            items,
        }
    }

    fn reorg(&mut self, target_bucket: usize, start_bucket: usize) {
        if target_bucket < start_bucket {
            for curr_bucket_to_reorg in target_bucket..start_bucket {
                let target_bucket_to_reorg = curr_bucket_to_reorg + 1;
                let last_item = self.circular_list[curr_bucket_to_reorg].pop_back().unwrap();
                self.items[last_item].grouped_pos = target_bucket_to_reorg;
                self.circular_list[target_bucket_to_reorg].push_front(last_item);
            }
        } else if target_bucket > start_bucket {
            for curr_bucket_to_reorg in (start_bucket + 1..target_bucket + 1).rev() {
                let target_bucket_to_reorg = curr_bucket_to_reorg - 1;
                let last_item = self.circular_list[curr_bucket_to_reorg]
                    .pop_front()
                    .unwrap();
                self.items[last_item].grouped_pos = target_bucket_to_reorg;
                self.circular_list[target_bucket_to_reorg].push_back(last_item);
            }
        }
    }

    fn move_item(
        &mut self,
        source_pos: usize,
        source_tuple: (usize, usize),
        orig_target_pos: usize,
    ) {
        let effective_target_pos = (if source_pos < orig_target_pos {
            orig_target_pos + 1
        } else {
            orig_target_pos
        }) % self.items.len();
        //let source_tuple = (start_pos / self.size, start_pos % self.size);
        let target_tuple = (
            effective_target_pos / self.size,
            effective_target_pos % self.size,
        );
        let mut after_source = self.circular_list[source_tuple.0].split_off(source_tuple.1);
        let item_to_move = after_source.pop_front().unwrap();
        self.circular_list[source_tuple.0].append(&mut after_source);
        self.items[item_to_move].grouped_pos = target_tuple.0;
        let mut after_target = self.circular_list[target_tuple.0].split_off(target_tuple.1);
        after_target.push_front(item_to_move);
        self.circular_list[target_tuple.0].append(&mut after_target);
        self.reorg(target_tuple.0, source_tuple.0)
    }

    fn mix(&mut self, context: &Context,_iteration:u32) {
        if DISABLE_ALTERNATIVE_IMPL {
            return;
        }
        let total_len = self.items.len();
        let len_for_modulus = total_len as i64 - 1;
        if context.is_test() {
            log!(debug, context, "Initial list {:?}", self.to_vec());
        }
        for item_pos in 0..total_len {
            let grouped_pos = self.items[item_pos].grouped_pos;
            let sub_pos = self.circular_list[grouped_pos]
                .iter()
                .position(|item| *item == item_pos)
                .unwrap();
            let orig_pos = grouped_pos * self.size + sub_pos;
            let offset = self.items[item_pos].item.v;
            let target_pos = (orig_pos as i64 + offset).rem_euclid(len_for_modulus) as usize;
            self.move_item(orig_pos, (grouped_pos, sub_pos), target_pos);
            if context.is_test() {
                log!(
                    debug,
                    context,
                    "Current list {:?} after moving {}+{} to {}",
                    self.to_vec(),
                    orig_pos,
                    offset,
                    target_pos
                );
            }else if _iteration==3 {
                log!(
                    debug,
                    context,
                    "Moving {}+({}) to {}",
                    orig_pos,
                    offset,
                    target_pos
                );
            }
        }
    }

    fn calc_result(&self, context: &Context) -> i64 {
        if DISABLE_ALTERNATIVE_IMPL {
            return 0;
        }
        let zero_index = self.items.iter().position(|it| it.item.v == 0).unwrap();

        let group_pos = self.items[zero_index].grouped_pos;
        let offset = self.circular_list[group_pos]
            .iter()
            .position(|global_pos| *global_pos == zero_index)
            .unwrap();
        let real_zero_index = group_pos * self.size + offset;
        log!(debug, context, "Zero pos {}", real_zero_index);
        let mut result = 0;
        for offset in [1000, 2000, 3000] {
            let target_pos = (real_zero_index + offset) % self.items.len();
            let target_tuple = (target_pos / self.size, target_pos % self.size);
            let target_index = self.circular_list[target_tuple.0]
                .iter()
                .nth(target_tuple.1)
                .unwrap();
            result += self.items[*target_index].item.v;
        }
        result
    }

    fn to_vec(&self) -> Vec<i64> {
        let effective_list: Vec<i64> = self
            .circular_list
            .iter()
            .flat_map(|sub_list| sub_list.iter().map(|pos| self.items[*pos].item.v))
            .collect();
        effective_list
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
fn mix(items: &mut Vec<Item>, context: &Context,_iteration:u32) {
    if DISABLE_STANDARD_IMPL {
        return;
    }
    let end_pos = items.len();
    let max_pos = end_pos as i64 - 1;
    if context.is_test() {
        log!(debug, context, "Initial list {:?}", to_vec(items));
    }
    for pos in 0..end_pos {
        let curr_item_pos = items.iter().position(|item| item.init_pos == pos).unwrap();
        let item = items.remove(curr_item_pos);
        let offset = item.v;
        let new_index = ((curr_item_pos as i64) + offset).rem_euclid(max_pos) as usize;
        items.insert(new_index, item);
        if context.is_test() {
            log!(
                debug,
                context,
                "Current list {:?} after moving {}+({}) to {}",
                to_vec(items),
                curr_item_pos,
                offset,
                new_index
            );
        } else if _iteration==3 {
            log!(
                debug,
                context,
                "Moving {}+({}) to {}",
                curr_item_pos,
                offset,
                new_index
            );
        }
    }
}

#[allow(dead_code)]
fn calc_result(items: &Vec<Item>, context: &Context) -> i64 {
    if DISABLE_STANDARD_IMPL {
        return 0;
    }
    
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

    let items_v2 = parse(
        lines,
        if context.is_part(Part::Part1) {
            1
        } else {
            811589153
        },
    );

    let mut new_list = AdaptativeList::new(&items_v2, if context.is_test() { 2 } else { 100 });

    if context.is_part(Part::Part1) {
        mix(&mut items, context,0);
        new_list.mix(context,0);
        let result = calc_result(&items, context);
        let result_v2 = new_list.calc_result(context);
        check_result!(context, if DISABLE_ALTERNATIVE_IMPL { result } else {result_v2}, [3, 988]);
    } else {
        for _iteration in 0..10 {
            mix(&mut items, context,_iteration);
            new_list.mix(context,_iteration);
            log!(debug, context, "Result {} : {}",_iteration, calc_result(&items, context));
            log!(debug, context, "Result v2 {}: {}",_iteration, new_list.calc_result(context));    
        }
        let result = calc_result(&items, context);
        let result_v2 = new_list.calc_result(context);
        log!(debug, context, "Result {}", result);
        check_result!(context, if DISABLE_ALTERNATIVE_IMPL { result } else {result_v2}, [1623178306, 7768531372516]);
    }
}
