import * as Utils from "./utils";
import { Part, run, Type } from "./day_utils"
import { id } from "date-fns/locale";
import { string } from "yargs";

enum CmdType {
    cd = "cd",
    ls = "ls"
}

interface Command {
    type: "Command"
    cmdType: CmdType
    value: string
}

interface Content {
    type: "Content",
    contentType: "dir" | "file",
    size: number,
    name: string;
}

interface Tree {
    name: string,
    parent?: Tree,
    totalSize: number,
    currSize: number,
    files: { [name: string]: number }
    subDirs: {
        [name: string]: Tree
    }
}

function parse(lines: string[]): (Command | Content)[] {
    return lines.map(line => {
        if (line.startsWith("$")) {
            const [_start, cmd, ...rest] = line.split(" ");
            return {
                type: "Command",
                cmdType: cmd as CmdType,
                value: (rest ?? []).join(" ")
            }
        } else {
            const [start, ...rest] = line.split(" ");
            return {
                type: "Content",
                contentType: start === "dir" ? "dir" : "file",
                size: start === "dir" ? 0 : parseInt(start),
                name: (rest ?? []).join("")
            }
        }
    });
}

function initTree(name: string, parent?: Tree): Tree {
    return {
        name: name,
        parent: parent,
        files: {},
        subDirs: {},
        currSize: 0,
        totalSize: 0
    }
}

function moveDir(curr: Tree, name: string): Tree {
    if (name === "/") {
        if (curr.parent !== undefined) {
            return moveDir(curr.parent, name);
        }
        return curr
    }
    else if (name === "..") {
        if (curr.parent === undefined) {
            throw new Error("Cannot access parent");
        }
        return curr.parent;
    } else {
        if (curr.subDirs[name] === undefined) {
            curr.subDirs[name] = initTree(name, curr)
        }
        return curr.subDirs[name];
    }
}

function addFileIfNeeded(curr: Tree, name: string, size: number): Tree {
    if (curr.files[name] !== undefined) {
        return curr;
    }
    curr.files[name] = size;
    curr.currSize += size;
    let dirToIncTotal: Tree | undefined = curr;
    do {
        dirToIncTotal.totalSize += size;
    } while ((dirToIncTotal = dirToIncTotal.parent) !== undefined);
    return curr;
}

function apply(curr: Tree, line: Content | Command): Tree {
    if (line.type === "Command" && line.cmdType === CmdType.cd) {
        return moveDir(curr, line.value);
    } else if (line.type === "Content" && line.contentType === "file") {
        curr = addFileIfNeeded(curr, line.name, line.size);
    }
    return curr;
}

function visit<T>(tree: Tree, v: T, fct: (v: T, t: Tree) => [boolean, T]): T {
    let [cont, result] = fct(v, tree);
    if (!cont) {
        return result;
    }
    for (const subDirName in tree.subDirs) {
        result = visit(tree.subDirs[subDirName], result, fct);
    }
    return result;
}

function puzzle(lines: string[], part: Part): void {
    const data = parse(lines);
    const root = initTree("/")
    const _lastSubDir = data.reduce((tree, cmd) => apply(tree, cmd), root);
    if (part === Part.PART_1) {
        const maxSize = 100000
        const result = Object.values(root.subDirs).map(child => visit(child, 0, (count, tree) => {
            if (tree.totalSize > maxSize) {
                return [true, count];
            } else {
                return [true, count + tree.totalSize];
            }
        })).reduce((a, b) => a + b)
        console.log(`Result: ${result}`)

    }
    else {
        const totalSizeAvailable = 70000000;
        const minFreeSpace = 30000000;
        const currFreeSpace = totalSizeAvailable - root.totalSize;
        const sizeToRemove = minFreeSpace - currFreeSpace;

        const result = visit(root, [] as Tree[], (list, tree) => {
            if (tree.totalSize >= sizeToRemove) {
                return [true, [tree, ...list]];
            } else {
                return [false, list];
            }
        });
        result.sort((t1, t2) => t1.totalSize - t2.totalSize);
        console.log(`Result: ${result[0].totalSize}`);
    }
}

run(7, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])