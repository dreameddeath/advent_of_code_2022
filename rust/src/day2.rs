use crate::utils::{Part};
pub fn parse(lines:&Vec<String>) -> Vec<i32> {
    return lines.into_iter()
                .filter_map(|l| if l.len()==0 {Some(-1)} else {l.parse::<i32>().ok()})
                .collect()
        
}

pub fn puzzle(part: &Part, lines: &Vec<String>) {
    let values = parse(lines);

    let mut grouped_sum:Vec<i32> = values
    .split(| v | *v<0)
    .map(|group| group.iter().filter(|v| **v >= 0).sum())
    .collect();

    grouped_sum.sort_by(|a,b| b.cmp(a)); 
    match part {
        Part::Part1 => {
            println!("Result {}", grouped_sum[0])
        }
        Part::Part2 => {
            let total:i32 = grouped_sum
                .into_iter()
                .take(3)
                .sum();
            println!("Result {}", total)
        }
    }
}
