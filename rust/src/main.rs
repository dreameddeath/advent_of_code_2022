mod day1;
mod utils;

fn main() {
    utils::run_all(&1, &day1::puzzle, &utils::Active::True);
}
