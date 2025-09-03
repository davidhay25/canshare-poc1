//functions to generate artifacts for the IG generation


//generate an index object for all DG's. Adapted from the version used to list all DG's in the
//hierarchical view
function makeDGIndex(hashAllDG) {

    let index = []


    //make a list
    let ar = []

    Object.keys(hashAllDG).forEach(function (key) {
        let dg = hashAllDG[key]
        ar.push(dg)
    })

/*
    //now sort by name for the full DG tree
    ar.sort(function (a,b) {
        let aTitle = a.title || a.name
        let bTitle = b.title || b.name
        if (aTitle.toLowerCase() > bTitle.toLowerCase()) {
            return 1
        } else { return -1}
    })

    ar.forEach(function (dg) {
        let text = dg.title || dg.name
        let parent = dg.parent || "root"
        let node = {name:dg.name,title:text,parent:parent}
        index.push(node)

    })
*/

    return index


}

module.exports = {
    makeDGIndex : makeDGIndex
};