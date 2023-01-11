use crate::{
    check_result, log,
    utils::{Context, Part},
};

type CompactItem = i16;

fn parse(lines: &Vec<String>) -> Vec<CompactItem> {
    lines
        .iter()
        .map(|line| {
            line.parse::<i16>().unwrap()
        })
        .collect()
}

#[allow(dead_code)]
fn mix(items: &Vec<CompactItem>, _key:i64,nb_loop: u8) -> Vec<CompactItem> {
    let end_pos = items.len() as u16;
    let max_pos = end_pos as i64 - 1;
    let offsets = items.iter().map(|v| ((*v as i64)*_key).rem_euclid(max_pos) as u16).collect::<Vec<_>>();
    let mut hints = items
        .iter()
        .enumerate()
        .map(|(pos, _)| pos as u16)
        .collect::<Vec<u16>>();
    let mut mixed_array = hints.clone();
    let mut search_cost = 0;
    for _ in 0..nb_loop {
        for id in 0..end_pos {
            unsafe {
                let offset = *offsets.get_unchecked(id as usize);
                let mut source_pos = *hints.get_unchecked(id as usize) as usize;
                let mut left = source_pos;
                let mut right = source_pos;

                if search_cost > max_pos / 2 {
                    for id_orig in 0..end_pos {
                        *hints.get_unchecked_mut(*mixed_array.get_unchecked(id_orig as usize) as usize)=id_orig;
                    }
                    search_cost = 0;
                }

                if *mixed_array.get_unchecked(source_pos) != id {
                    loop {
                        search_cost += 1;
                        if left > 0 {
                            left -= 1;
                            if *mixed_array.get_unchecked(left) == id {
                                source_pos = left;
                                break;
                            }
                        } else if right < max_pos as usize {
                            right += 1;
                            if *mixed_array.get_unchecked(right) == id {
                                source_pos = right;
                                break;
                            }
                        }
                    }
                }
                let target_pos = (((source_pos as i64) + offset as i64)%(max_pos))as usize;

                if source_pos < target_pos {
                    mixed_array[source_pos..=target_pos].rotate_left(1);
                } else {
                    mixed_array[target_pos..=source_pos].rotate_right(1);
                }
                *hints.get_unchecked_mut(id as usize)=target_pos as u16;
            }
        }
    }

    mixed_array.iter().map(|pos| items[*pos as usize]).collect()
}



#[allow(dead_code)]
fn calc_result(items: &Vec<CompactItem>, key: i64, context: &Context) -> i64 {
    let zero_index = items.iter().position(|it| *it == 0).unwrap();
    let mut result: i64 = 0;
    log!(debug, context, "Zero pos {}", zero_index);

    for offset in [1000, 2000, 3000] {
        result += items[(zero_index + offset) % items.len()] as i64 * key;
    }
    result
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let key = if context.is_part(Part::Part1) {
        1
    } else {
        811589153
    };
    let mut items = parse(lines);

    if context.is_part(Part::Part1) {
        let mixed = mix(&mut items, key,1);
        let result = calc_result(&mixed, key, context);
        check_result!(context, result, [3, 988]);
    } else {
        let mixed = mix(&mut items, key,10);
        let result = calc_result(&mixed, key, context);
        check_result!(context, result, [1623178306, 7768531372516]);
    }
}
