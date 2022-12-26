use crate::{check_result, utils::Context};

#[derive(Debug,Clone,Copy,PartialEq, Eq, PartialOrd, Ord)]
enum Play {
    ROCK = 1,
    PAPER = 2,
    SCISSORS = 3,
}

#[derive(Debug)]
enum PlayResult {
    LOSS = 0,
    DRAW = 3,
    WIN = 6,
}

fn map_play(char: char) -> Play {
    match char {
        'A' => Play::ROCK,
        'B' => Play::PAPER,
        'C' => Play::SCISSORS,
        'X' => Play::ROCK,
        'Y' => Play::PAPER,
        'Z' => Play::SCISSORS,
        _=>panic!("Shouldn't occurs")
    }
}

fn map_play_result(char: char) -> PlayResult {
    match char {
        'X' => PlayResult::LOSS,
        'Y' => PlayResult::DRAW,
        'Z' => PlayResult::WIN,
        _=>panic!("Shouldn't occurs")
    }
}

fn parse(lines: &Vec<String>) -> Vec<(Play, Play,PlayResult)> {
    return lines
        .into_iter()
        .map(|l| {
            (
                map_play(l.chars().nth(0).unwrap()),
                map_play(l.chars().nth(2).unwrap()),
                map_play_result(l.chars().nth(2).unwrap()),
            )
        })
        .collect();
}

fn result(other:&Play,me:&Play)->PlayResult{
    return if other==me {
         PlayResult::DRAW
    } else if *me == Play::ROCK && *other == Play::SCISSORS {
         PlayResult::WIN
    } else if *me == Play::SCISSORS && *other == Play::ROCK {
         PlayResult::LOSS
    } else if  other < me {
        PlayResult::WIN
    } else {
        PlayResult::LOSS
    }
}

fn gain(other:&Play,me:&Play)->u32{
    let result = result(other, me);
    let value = *me as u32 + result as u32;
    return value;
}

fn get_play(other:&Play,expect:&PlayResult)->Play{
    return match *expect {
        PlayResult::DRAW=> *other,
        PlayResult::LOSS=> match *other {
            Play::ROCK=> Play::SCISSORS,
            Play::PAPER=> Play::ROCK,
            Play::SCISSORS=>Play::PAPER
        },
        PlayResult::WIN=> match *other {
            Play::ROCK=> Play::PAPER,
            Play::PAPER=> Play::SCISSORS,
            Play::SCISSORS=>Play::ROCK
        },
    }
}

pub fn puzzle(context: &Context, lines: &Vec<String>) {
    let values = parse(lines);
    let part1:u32 = values.iter().map(|(p1,p2,_)| gain(p1,p2)).sum();
    let part2:u32 = values.iter().map(|(p1,_,expect)| gain(p1,&get_play(p1,expect))).sum();
    check_result!(context, [part1, part2], [15, 11841, 12, 13022]);
}
