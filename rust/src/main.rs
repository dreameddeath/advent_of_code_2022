mod day1;
mod day2;
mod utils;

fn main() {
    utils::run_all(&1, &day1::puzzle, &utils::Active::True);
    utils::run_all(&2, &day2::puzzle, &utils::Active::True);
}
