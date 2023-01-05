use std::fmt::Display;
use std::fs::File;
use std::io::{self, BufRead, BufReader, Error, Lines};
use std::path::Path;
use std::time::Instant;

#[macro_export]
macro_rules!
log {
    ($level:tt,$ctxt:expr,$msg:expr) => (
        $ctxt.$level(|| println!($msg))
    );
    ($level:tt, $ctxt:expr,$msg:expr, $($other:expr) ,*) => (
        $ctxt.$level(|| println!($msg,$($other , )+))
    );
}

#[macro_export]
macro_rules! check_result {
    ($ctxt:expr, [$res_p1:expr, $res_p2:expr ], [ $res_p1_test:expr,$res_p1_real:expr, $res_p2_test:expr, $res_p2_real:expr ] ) => {
        if $ctxt.has_part() {
            panic!("Shoudn't be call in separate run context")
        }
        if ($ctxt.is_test()) {
            $ctxt.check_both(($res_p1, $res_p2), ($res_p1_test, $res_p2_test))
        } else {
            $ctxt.check_both(($res_p1, $res_p2), ($res_p1_real, $res_p2_real))
        }
    };

    ($ctxt:expr, $res:expr, [ $res1:expr, $res2:expr ] ) => {
        if !$ctxt.has_part() {
            panic!("Shoudn't be call in mono run context")
        }
        if ($ctxt.is_test()) {
            $ctxt.check($res, $res1)
        } else {
            $ctxt.check($res, $res2)
        }
    };
}

fn read_lines_internal<P>(filename: P) -> Result<Lines<BufReader<File>>, Error>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

fn get_applicable_filename_default(day: &u8, is_test: &Dataset) -> String {
    return format!(
        "./data/day_{}{}.txt",
        day,
        match is_test {
            Dataset::Test => "_test",
            _ => "",
        }
    );
}

fn get_applicable_filename(day: &u8, part: Option<Part>, is_test: &Dataset) -> String {
    return part
        .map(|p| {
            format!(
                "./data/day_{}_{}{}.txt",
                day,
                match p {
                    Part::Part1 => 1,
                    Part::Part2 => 2,
                },
                match is_test {
                    Dataset::Test => "_test",
                    _ => "",
                }
            )
        })
        .filter(|name| std::path::Path::new(name.as_str()).exists())
        .unwrap_or_else(|| get_applicable_filename_default(day, is_test));
}

pub fn read_lines(
    day: &u8,
    part: Option<Part>,
    is_test: &Dataset,
) -> Option<Lines<BufReader<File>>> {
    let f = read_lines_internal(get_applicable_filename(day, part, is_test));

    return match f {
        Ok(lines) => Some(lines),
        Err(_) => {
            println!("No file found");
            None
        }
    };
}

#[derive(Eq, PartialEq,Clone, Copy)]
pub enum Mode {
    STANDARD,
    BENCH,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Part {
    Part1,
    Part2,
}

#[derive(Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum LogLevel {
    ERROR = 0,
    INFO = 1,
    DEBUG = 2,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dataset {
    Test,
    Real,
}

#[allow(dead_code)]
pub enum Active {
    True,
    False,
}

#[allow(dead_code)]
pub struct Context {
    log_level: LogLevel,
    day: u8,
    data_set: Dataset,
    is_debug: bool,
    part: Option<Part>,
}

impl Context {
    fn new_part(day: &u8, options: &RunOption, part: Part, data_set: &Dataset) -> Context {
        return Context::new(day, options, Some(part), data_set);
    }

    fn new_all(day: &u8, options: &RunOption, data_set: &Dataset) -> Context {
        return Context::new(day, options, None, data_set);
    }

    fn new(
        day: &u8,
        options: &RunOption,
        part: Option<Part>,
        data_set: &Dataset,
    ) -> Context {
        let log_level = options.debug.as_ref()
            .map(|d| if *d { LogLevel::DEBUG } else { LogLevel::INFO })
            .unwrap_or(LogLevel::INFO);
        let is_debug = options.debug.unwrap_or(false);
        return Context {
            log_level: log_level,
            day: *day,
            data_set: *data_set,
            part: part,
            is_debug: is_debug,
        };
    }

    fn log(&self, log_level: LogLevel, print_fct: impl Fn()) {
        if log_level <= self.log_level {
            match &self.part {
                Some(p) => {
                    print!("[Day {}/{:?}/{:?}]", self.day, p, self.data_set)
                }
                None => print!("[Day {}/ALL/{:?}]", self.day, self.data_set),
            }
            print_fct();
        }
    }

    #[allow(dead_code)]
    pub fn debug(&self, print_fct: impl Fn()) {
        self.log(LogLevel::DEBUG, print_fct);
    }

    pub fn error(&self, print_fct: impl Fn()) {
        self.log(LogLevel::ERROR, print_fct);
    }

    pub fn info(&self, print_fct: impl Fn()) {
        self.log(LogLevel::INFO, print_fct);
    }

    #[allow(dead_code)]
    pub fn is_debug(&self) -> bool {
        return self.is_debug;
    }

    pub fn is_part(&self, part: Part) -> bool {
        return if let Some(p) = self.part {
            p == part
        } else {
            false
        };
    }

    pub fn has_part(&self) -> bool {
        return match self.part {
            Some(_) => true,
            None => false,
        };
    }

    pub fn is_test(&self) -> bool {
        return self.data_set == Dataset::Test;
    }

    pub fn check<T: Eq + Display>(&self, val: T, expected: T) {
        if val == expected {
            log!(info, self, "Result OK {}", val);
        } else {
            log!(
                error,
                self,
                "Result KO >>>{}<<<< instead of {})",
                val,
                expected
            );
        }
    }

    pub fn check_both<T: Eq + Display>(&self, val: (T, T), expected: (T, T)) {
        if val.0 == expected.0 && val.1 == expected.1 {
            log!(info, self, "Result OK ({},{})", val.0, val.1);
        } else {
            log!(
                error,
                self,
                "Result KO (>>>{}<<<<,>>>{}<<<) instead of {},{})",
                val.0,
                val.1,
                expected.0,
                expected.1
            );
        }
    }
}

pub fn run<F: Fn(&Context, &Vec<String>)>(
    context: Context,
    fct: &F,
    lines: &Vec<String>,
    mode: &Mode,
) {
    log!(info, &context, "Starting");
    let nb_max = if *mode == Mode::BENCH { 10 } else { 1 };
    let start = Instant::now();
    let mut count = 0;
    while count < nb_max {
        count += 1;
        fct(&context, lines);
    }
    let duration = start.elapsed().as_millis() as u64;

    log!(
        info,
        context,
        "Duration {} ms (avg {} for #{} iterations)",
        duration,
        duration as f64 / nb_max as f64,
        count
    );
}

pub fn run_simult<F: Fn(&Context, &Vec<String>)>(
    context: Context,
    fct: &F,
    lines: &Vec<String>,
    mode: &Mode,
) {
    log!(info, context, "Starting");
    let nb_max = if *mode == Mode::BENCH { 10 } else { 1 };
    let start = Instant::now();
    let mut count = 0;
    while count < nb_max {
        count += 1;
        fct(&context, lines);
    }
    let duration = start.elapsed().as_millis() as u64;
    log!(
        info,
        context,
        "Duration {} ms (avg {} for #{} iterations)",
        duration,
        duration as f64 / nb_max as f64,
        count
    )
}

pub fn to_lines(day: &u8, part: Option<Part>, data_set: &Dataset) -> Vec<String> {
    return read_lines(day, part, data_set)
        .map(|lines| lines.filter_map(|l| l.ok()).collect())
        .unwrap_or(vec![]);
}

pub struct RunOption {
    active: Option<bool>,
    mode: Option<Mode>,
    debug: Option<bool>,
}

impl RunOption{
    pub fn default()->RunOption{
        RunOption::new()
    }
    pub fn new()-> RunOption{
        RunOption{
            debug:None,
            mode:None,
            active:None
        }
    }

    #[allow(dead_code)]
    pub fn disabled()-> RunOption{
        RunOption{
            debug:None,
            mode:None,
            active:Some(false)
        }
    }
    #[allow(dead_code)]
    pub fn debug(&self)->RunOption{
        RunOption{
            debug:Some(true),
            mode:self.mode,
            active:self.active
        }
    }
}

pub fn run_all<F: Fn(&Context, &Vec<String>)>(day: &u8, fct: &F, options: RunOption) {
    if !options.active.unwrap_or(true) {
        return;
    }
    let mode = options
        .mode.as_ref()
        .unwrap_or(&Mode::STANDARD);
    let start = Instant::now();

    println!("");
    println!("");
    println!("[Day {}] run per part", day);

    run(
        Context::new_part(day, &options, Part::Part1, &Dataset::Test),
        &fct,
        &to_lines(day, Some(Part::Part1), &Dataset::Test),
        mode,
    );
    println!("");
    run(
        Context::new_part(day, &options, Part::Part1, &Dataset::Real),
        &fct,
        &to_lines(day, Some(Part::Part1), &Dataset::Real),
        mode,
    );
    println!("");
    run(
        Context::new_part(day, &options, Part::Part2, &Dataset::Test),
        &fct,
        &to_lines(day, Some(Part::Part2), &Dataset::Test),
        mode,
    );
    println!("");
    run(
        Context::new_part(day, &options, Part::Part2, &Dataset::Real),
        &fct,
        &to_lines(day, Some(Part::Part2), &Dataset::Real),
        mode,
    );
    println!("");
    
    println!("[Day {}] done in {} ms", day,start.elapsed().as_millis() as u64);

}

pub fn run_all_simult<F: Fn(&Context, &Vec<String>)>(
    day: &u8,
    fct: &F,
    options: RunOption,
) {
    if !options.active.unwrap_or(true) {
        return;
    }
    let mode = options
        .mode.as_ref()
        .unwrap_or(&Mode::STANDARD);
    let start = Instant::now();
    println!("");
    println!("");
    println!("[Day {}] run global", day);
    run_simult(
        Context::new_all(day, &options, &Dataset::Test),
        fct,
        &to_lines(day, None, &Dataset::Test),
        mode,
    );
    println!("");
    run_simult(
        Context::new_all(day, &options, &Dataset::Real),
        fct,
        &to_lines(day, None, &Dataset::Real),
        mode,
    );
    println!("");
    println!("[Day {}] done in {} ms", day,start.elapsed().as_millis() as u64);

}

#[allow(dead_code)]
pub fn merge<A, B, C>(first: Option<A>, second: Option<B>, merger: fn(A, B) -> C) -> Option<C> {
    let first = first?;
    let second = second?;
    Some(merger(first, second))
}
