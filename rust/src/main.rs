use std::time::Instant;

use crate::utils::RunOption;

mod day1;
mod day2;
mod day12;
mod day16;
mod day24;
mod utils;
mod priority_queue;

fn main() {
    let start = Instant::now();
    utils::run_all(&1, &day1::puzzle, None);
    utils::run_all_simult(&2, &day2::puzzle, None);
    utils::run_all(&12, &day12::puzzle,None);
    utils::run_all_simult(&16, &day16::puzzle,Some(RunOption::new()/*.debug()*/));
    utils::run_all_simult(&24, &day24::puzzle,None);
    let duration = start.elapsed().as_millis() as u64;

    println!("");
    println!("[ALL] Overall finished in {} ms",duration);
}

