export class ReleaseBranch {
    static REGEX = /heads\/releases\/(?<majorNumber>\d+)\.(?<minorNumber>\d+)/;

    MajorNumber: number;
    MinorNumber: number;

    constructor(gitRefName: string) {
        let match = ReleaseBranch.REGEX.exec(gitRefName);

        if (!match) throw new Error("Regex not matched.");

        this.MajorNumber = parseInt(match!.groups!.majorNumber);
        this.MinorNumber = parseInt(match!.groups!.minorNumber);
    }

    get Name(): string {
        return `releases/${this.MajorNumber}.${this.MinorNumber}`;
    }

    public toString = (): string => {
        return this.Name;
    };

    static compare(
        releaseBranch1: ReleaseBranch,
        releaseBranch2: ReleaseBranch
    ): number {
        if (releaseBranch1.MajorNumber > releaseBranch2.MajorNumber) return 1;
        if (releaseBranch1.MajorNumber < releaseBranch2.MajorNumber) return -1;
        // Here means MajorNumber equality.

        if (releaseBranch1.MinorNumber > releaseBranch2.MinorNumber) return 1;
        if (releaseBranch1.MinorNumber < releaseBranch2.MinorNumber) return -1;
        // Here means MajorNumber equality.

        return 0;
    }
}

export function sort(releaseBranches: ReleaseBranch[]): ReleaseBranch[] {
    return releaseBranches.sort((b1, b2) => ReleaseBranch.compare(b1, b2));
}
