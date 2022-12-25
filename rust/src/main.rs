mod day1;
mod day2;
mod day12;
mod utils;

fn main() {
    utils::run_all(&1, &day1::puzzle, &utils::Active::True,&utils::Mode::STANDARD);
    utils::run_all(&2, &day2::puzzle, &utils::Active::True,&utils::Mode::STANDARD);
    utils::run_all(&12, &day12::puzzle, &utils::Active::True,&utils::Mode::STANDARD);
}

