use std::time::Instant;

use crate::utils::{RunOption, DaysRestriction};

mod day1;
mod day2;
mod day11;
mod day12;
mod day16;
mod day19;
mod day20;
mod day23;
mod day24;
mod utils;
mod priority_queue;

fn main() {
    let start = Instant::now();
    //let days_restriction:DaysRestriction = &Some(vec![20]);
    let days_restriction:DaysRestriction = &None;
    utils::run_all(&1, &day1::puzzle, RunOption::default(days_restriction));
    utils::run_all_simult(&2, &day2::puzzle, RunOption::default(days_restriction));
    utils::run_all(&11, &day11::puzzle, RunOption::default(days_restriction));
    utils::run_all(&12, &day12::puzzle,RunOption::default(days_restriction));
    utils::run_all_simult(&16, &day16::puzzle,RunOption::default(days_restriction));
    utils::run_all(&19, &day19::puzzle,RunOption::default(days_restriction));
    utils::run_all(&20, &day20::puzzle,RunOption::default(days_restriction));
    utils::run_all(&23, &day23::puzzle,RunOption::default(days_restriction));
    utils::run_all_simult(&24, &day24::puzzle,RunOption::default(days_restriction));
    let duration = start.elapsed().as_millis() as u64;
    println!("");
    println!("[ALL] Overall finished in {} ms",duration);
}

