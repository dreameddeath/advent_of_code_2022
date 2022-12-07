export type VisitFct<TREE, DATA> = (tree: TREE, data: DATA,parents:TREE[]) => [boolean/*True : process children,... */, DATA/*the data to return and or pass to children*/];

export type ApplyParentFct<TREE, DATA> = (tree: TREE, data: DATA) => [boolean/*True: process parent*/, DATA/*the data to return and or pass to parent*/] | undefined;
export type ChildrenFct<TREE> = (tree: TREE) => TREE[];
export type ParentFct<TREE> = (tree: TREE) => TREE | undefined;

class InternalVisitor<TREE>{
    constructor(private readonly getParent: ParentFct<TREE>,private readonly getChildren: ChildrenFct<TREE>) { }

    public visit<DATA>(tree: TREE, inputData: DATA, fct: VisitFct<TREE, DATA>,parents:TREE[]=[]): DATA {
        let [continueProcess, resultData] = fct(tree, inputData,parents);
        if (!continueProcess) {
            return resultData;
        }
        return this.getChildren(tree).reduce((data, child) => this.visit(child, data, fct,[...parents,tree]), resultData);
    }

    public applyParent<DATA>(tree: TREE, fct: ApplyParentFct<TREE, DATA>, inputData: DATA): DATA {
        const [continueProcess, newData] = fct(tree, inputData) ?? [true, inputData];
        if (!continueProcess) {
            return newData;
        }
        const parent = this.getParent(tree);
        if (parent !== undefined) {
            return this.applyParent(parent, fct, newData);
        }
        return newData;
    }

    public toRoot(tree: TREE): TREE {
        return this.applyParent(tree, (curr) => {
            const parent = this.getParent(curr);
            if (parent !== undefined) {
                return [true, parent];
            } else {
                return [false, curr]
            }
        }, tree);
    }
}

export type Visitor<TREE> = {
    visit<DATA>(tree: TREE, data: DATA, fct: VisitFct<TREE, DATA>): DATA;
    applyParent<DATA>(tree: TREE, fct: ApplyParentFct<TREE, DATA>, data: DATA): DATA;
    toRoot(tree: TREE): TREE;
}

export function buildVisitor<TREE>(getParent: ParentFct<TREE>, getChildren: ChildrenFct<TREE>): Visitor<TREE> {
    return new InternalVisitor<TREE>(getParent, getChildren);
}
