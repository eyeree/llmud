import * as diff from "diff";

export function showDiff(older: string, newer: string) {
    console.log("==== diffs ====");

    const changes = diff.diffWords(older, newer);
    changes.forEach(change => {
        if (change.removed) {
            console.log("-----", change.value);
        }
        if (change.added) {
            console.log("+++++", change.value);
        }
    });

}
