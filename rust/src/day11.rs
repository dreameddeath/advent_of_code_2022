use crate::{
    log,
    utils::{Context, Part}, check_result,
};
use lazy_static::lazy_static;
use regex::Regex;

#[derive(Debug)]
enum Operation {
    Square,
    Double,
    Add(u64),
    Multiply(u64),
}

#[derive(Debug)]
struct Monkey {
    id: usize,
    nb_processed_items: u64,
    items: Vec<u64>,
    test_divisibility: u64,
    targets: (usize, usize),
    operation: Operation,
}

lazy_static! {
    static ref STARTING_ITEMS_REGEXP: Regex =
        Regex::new(r"^\s*Starting items: (?P<items>\d+(?:,\s*\d+)*)$").unwrap();
    static ref OPERATION_REGEXP: Regex =
        Regex::new(r"^\s*Operation: new = old (?P<op>\*|\+) (?P<other>\w+)$").unwrap();
    static ref MONKEY_TARGET_REGEXP: Regex =
        Regex::new(r"^\s*If (?:true|false): throw to monkey (?P<target>\d+)$").unwrap();
    static ref CONDITION_REGEXP: Regex =
        Regex::new(r"^\s*Test: divisible by (?P<val>\d+)$").unwrap();
}

fn parse_operation(line: &String) -> Operation {
    let operation_parsed = OPERATION_REGEXP.captures(line.as_str()).unwrap();
    let other_operand = operation_parsed.name("other").unwrap().as_str();
    let other_operand_num = if other_operand == "old" {
        None
    } else {
        Some(other_operand.parse::<u64>().unwrap())
    };
    let operator = operation_parsed.name("op").unwrap().as_str();
    match operator {
        "*" => match other_operand_num {
            Some(val) => Operation::Multiply(val),
            None => Operation::Square,
        },
        "+" => match other_operand_num {
            Some(val) => Operation::Add(val),
            None => Operation::Double,
        },
        _ => panic!("Unknown operator {}", operator),
    }
}

fn parse_target(line: &String) -> usize {
    MONKEY_TARGET_REGEXP
        .captures(line.as_str())
        .unwrap()
        .name("target")
        .map(|target| target.as_str().parse::<usize>().unwrap())
        .unwrap()
}

fn parse_monkey(pos: usize, lines: &[String]) -> Monkey {
    let starting_items: Vec<u64> = STARTING_ITEMS_REGEXP
        .captures(lines[1].as_str())
        .unwrap()
        .name("items")
        .unwrap()
        .as_str()
        .split(", ")
        .map(|item| item.parse::<u64>().unwrap())
        .collect();

    Monkey {
        id: pos,
        items: starting_items,
        nb_processed_items: 0,
        test_divisibility: CONDITION_REGEXP
            .captures(lines[3].as_str())
            .unwrap()
            .name("val")
            .map(|val| val.as_str().parse::<u64>().unwrap())
            .unwrap(),
        targets: (parse_target(&lines[4]), parse_target(&lines[5])),
        operation: parse_operation(&lines[2]),
    }
}

fn parse(lines: &Vec<String>) -> Vec<Monkey> {
    lines
        .as_slice()
        .split(|line| line.len() == 0)
        .enumerate()
        .map(|(pos, lines)| parse_monkey(pos, lines))
        .collect()
}

fn iterate(monkeys: &mut Vec<Monkey>, is_part1: bool, combined_dividers: u64,new_items:&mut Vec<Vec<u64>>) {
    
    for monkey in monkeys.iter_mut() {
        monkey.items.append(&mut new_items[monkey.id]);
        monkey.nb_processed_items += monkey.items.len() as u64;
        for v in monkey.items.drain(..) {
            let new_value = match monkey.operation {
                Operation::Add(a) => v + a,
                Operation::Double => v * 2,
                Operation::Multiply(a) => v * a,
                Operation::Square => v * v,
            };
            let new_worry_level = if is_part1 {
                new_value / 3
            } else {
                new_value % combined_dividers
            };
            let is_true = new_worry_level % monkey.test_divisibility == 0;
            new_items[if is_true {
                monkey.targets.0
            } else {
                monkey.targets.1
            } as usize]
                .push(new_worry_level);
        }
    }
    for monkey in monkeys{
        std::mem::swap(&mut monkey.items,&mut new_items[monkey.id as usize])
    }
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let mut monkeys = parse(lines);
    let is_part1 = context.is_part(Part::Part1);
    let combined_dividers: u64 = monkeys.iter().map(|m| &m.test_divisibility).product();
    let mut temps:Vec<Vec<u64>> = Vec::with_capacity(monkeys.len());
    for _ in 0..monkeys.len(){
        temps.push(vec![]);
    }
    log!(debug, context, "Monkeys {:?}", monkeys);
    if context.is_part(Part::Part1) {
        for _ in 0..20 {
            iterate(&mut monkeys, is_part1, combined_dividers,&mut temps)
        }
        monkeys.sort_unstable_by(|a,b| b.nb_processed_items.cmp(&a.nb_processed_items));
        check_result!(context,monkeys[0].nb_processed_items * monkeys[1].nb_processed_items, [10605, 117640]);
    } else {
        for _ in 0..10000 {
            iterate(&mut monkeys, is_part1, combined_dividers,&mut temps)
        }
        monkeys.sort_unstable_by(|a,b| b.nb_processed_items.cmp(&a.nb_processed_items));
        check_result!(context,monkeys[0].nb_processed_items * monkeys[1].nb_processed_items, [2713310158, 30616425600]);
    }
}
