import * as Utils from "../utils";
import { Logger, Part, run, Type } from "../day_utils"
import { buildVisitor } from "../treeUtils";

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
    maxDepth: number,
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

const visitor = buildVisitor<Tree>(t => t.parent, (t) => Object.values(t.subDirs));

function initTree(name: string, parent?: Tree): Tree {
    if (parent !== undefined && parent.subDirs[name] !== undefined) {
        return parent.subDirs[name];
    }
    const newElement = {
        name: name,
        parent: parent,
        maxDepth: 0,
        files: {},
        subDirs: {},
        currSize: 0,
        totalSize: 0
    };

    if (parent !== undefined) {
        parent.subDirs[name] = newElement;
        visitor.applyParent(parent, (curr, maxDepthChild) => {
            if (curr.maxDepth > maxDepthChild + 1) {
                return [false, curr.maxDepth];
            } else {
                curr.maxDepth = maxDepthChild + 1;
                return [true, curr.maxDepth];
            }
        }, 0);
    }
    return newElement;
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
        return initTree(name, curr);
    }
}

function addFileIfNeeded(curr: Tree, name: string, size: number): Tree {
    if (curr.files[name] !== undefined) {
        return curr;
    }
    curr.files[name] = size;
    curr.currSize += size;
    visitor.applyParent(curr, (tree, sizeToAdd) => {
        tree.totalSize += sizeToAdd;
        return [true, sizeToAdd];
    }, size);
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

function display(tree: Tree, logger: Logger) {
    const indentation_part = "  ";
    visitor.visit(tree, undefined, (item, v, parents) => {
        const prefix = indentation_part.repeat(parents.length);
        logger.debug(`${prefix}dir ${item.name}`);
        Object.entries(item.files).forEach(([name, size]) =>
            logger.debug(`${prefix}${indentation_part}file ${name} ${size}`)
        );
        return [true, v];
    })
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const root = visitor.toRoot(data.reduce((tree, cmd) => apply(tree, cmd), initTree("/")));
    if (part === Part.PART_1) {
        const maxSize = 100000;
        if (type == Type.TEST) display(root, logger);
        const result = Object.values(root.subDirs).map(child => visitor.visit(child, 0, (tree, sum) => {
            if (tree.totalSize > maxSize) {
                return [true, sum];
            } else {
                return [true, sum + tree.totalSize];
            }
        })).reduce((a, b) => a + b)
        logger.result(result, [95437, 1513699])
    }
    else {
        const totalSizeAvailable = 70000000;
        const minFreeSpace = 30000000;
        const currFreeSpace = totalSizeAvailable - root.totalSize;
        const sizeToRemove = minFreeSpace - currFreeSpace;

        const result = visitor.visit(root, [] as Tree[], (tree, list) => {
            if (tree.totalSize >= sizeToRemove) {
                return [true, [tree, ...list]];
            } else {
                return [false, list];
            }
        });
        result.sort((t1, t2) => t1.totalSize - t2.totalSize);
        logger.result(result[0].totalSize, [24933642, 7991939]);
    }
}

run(7, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])