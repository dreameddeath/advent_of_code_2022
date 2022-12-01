use std::fs::File;
use std::io::{self, BufRead, BufReader, Error, Lines};
use std::path::Path;
use std::time::Instant;

fn read_lines_internal<P>(filename: P) -> Result<Lines<BufReader<File>>, Error>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

fn get_applicable_filename(day: &u8, part: &Part, is_test: &Dataset) ->String{
    let file_with_part = format!(
        "./data/day_{}_{}{}.txt",
        day,
        match part {
            Part::Part1=>1,
            Part::Part2=>2
        },
        match is_test {
            Dataset::Test => "_test",
            _ => "",
        }
    );
    return if std::path::Path::new(file_with_part.as_str()).exists() {
     file_with_part
    }
    else {
        format!(
        "./data/day_{}{}.txt",
        day,
        match is_test {
            Dataset::Test => "_test",
            _ => "",
        })
    }
}

pub fn read_lines(day: &u8, part: &Part, is_test: &Dataset) -> Option<Lines<BufReader<File>>> {

    let f = read_lines_internal(get_applicable_filename(day,part,is_test));

    return match f {
        Ok(lines) => Some(lines),
        Err(_) => {
            println!("No file found");
            None
        }
    };
}

#[derive(Debug)]
pub enum Part {
    Part1,
    Part2,
}

#[derive(Debug)]
pub enum Dataset {
    Test,
    Real,
}

#[allow(dead_code)]
pub enum Active {
    True,
    False,
}

pub fn run<F: Fn(&Part, &Vec<String>)>(
    day: &u8,
    fct: &F,
    part: &Part,
    data_set: &Dataset,
    lines: &Vec<String>,
) {
    let start = Instant::now();
    println!("[Day {}][{:?}][{:?}] Starting ", day, part, data_set);
    fct(part, lines);
    println!(
        "[Day {}][{:?}][{:?}] Duration {} ms ",
        day,
        part,
        data_set,
        start.elapsed().as_millis()
    )
}

pub fn to_lines(day: &u8, part: &Part, data_set: &Dataset) -> Vec<String> {
    return read_lines(day, part, data_set)
        .map(|lines| lines.filter_map(|l| l.ok()).collect())
        .unwrap_or(vec![]);
}

pub fn run_all<F: Fn(&Part, &Vec<String>)>(day: &u8, fct: &F, active: &Active) {
    if let Active::False = active {
        return;
    }

    let test_lines_part1 = to_lines(day, &Part::Part1, &Dataset::Test);
    let test_lines_part2 = to_lines(day, &Part::Part2, &Dataset::Test);
    let real_lines_part1 = to_lines(day, &Part::Part1, &Dataset::Real);
    let real_lines_part2 = to_lines(day, &Part::Part2, &Dataset::Real);
    run(day, fct, &Part::Part1, &Dataset::Test, &test_lines_part1);
    println!("");
    run(day, fct, &Part::Part1, &Dataset::Real, &real_lines_part1);
    println!("");
    run(day, fct, &Part::Part2, &Dataset::Test, &test_lines_part2);
    println!("");
    run(day, fct, &Part::Part2, &Dataset::Real, &real_lines_part2);
}

#[allow(dead_code)]
pub fn merge<A, B, C>(first: Option<A>, second: Option<B>, merger: fn(A, B) -> C) -> Option<C> {
    let first = first?;
    let second = second?;
    Some(merger(first, second))
}
