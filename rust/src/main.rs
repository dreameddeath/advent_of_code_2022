use std::time::Instant;

mod day1;
mod day2;
mod day12;
mod utils;
mod priority_queue;

fn main() {
    let start = Instant::now();
    utils::run_all(&1, &day1::puzzle, None);
    utils::run_all_simult(&2, &day2::puzzle, None);
    utils::run_all(&12, &day12::puzzle,None);

    let duration = start.elapsed().as_millis() as u64;

    println!("");
    println!("[ALL] Overall finished in {} ms",duration);
}

