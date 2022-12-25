import { Logger, Part, run, Type } from "../day_utils"


function parse(lines: string[]): string[] {
    return lines;
}

function fromSnafu(snafu: string): number {
    const converted = snafu.split("")
        .reverse()
        .reduce(
            (converted, digit, pos) =>
                (digit === "=" ? (-2) : (digit === "-" ? -1 : +digit)) * (5 ** pos) + converted
            , 0
        );
    return converted
}
console.assert(fromSnafu("2=-01") === 976, "KO");
console.assert(toSnafu(976) === "2=-01", "KO");
function toSnafu(n: number): string {
    const result: string[] = [];
    let currN = n;
    while (currN > 0) {
        let digit = (currN) % 5;
        let carry = 0;
        if (digit > 2) {
            digit -= 5;
            carry = 1;
        }
        if (digit >= 0 && digit <= 2) {
            result.push(digit.toString())
        } else if (digit === -1) {
            result.push("-")
        } else if (digit === -2) {
            result.push("=")
        }
        currN = Math.floor(currN / 5) + carry;
    }

    return result.reverse().join("");
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const fromSnafuSum = data.map(fromSnafu).reduce((a, b) => a + b);
    const result = toSnafu(fromSnafuSum);
    logger.result([result, result], ["2=-1=0", "2--2-0=--0--100-=210", "2=-1=0", "2--2-0=--0--100-=210"])
}

run(25, [Type.TEST, Type.RUN], puzzle, [Part.ALL])