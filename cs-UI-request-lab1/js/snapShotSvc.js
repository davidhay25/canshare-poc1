angular.module("pocApp")

    .service('snapshotSvc', function() {

        allDgSnapshot = {}

        function makeFullDiff(dg,allDg) {
            //create the hiearchy of DG that lead to this one
            let arHierarchy = makeDgHierarchy(dg,allDg)
            //console.log(arHierarchy)

            //now, create a diff array that has all elements
            let arFullDiffPath = []     //will contain paths
            let hashEdPath = {}         //a hash, keyed by path than has the DG at that path

            for (let i=arHierarchy.length-1;i > -1;--i) {
                let dgName = arHierarchy[i]
                //console.log(dgName)
                let cDg = allDg[dgName]  //cDg = component Dg.
                for (const ed of cDg.diff) {
                    //does this ed already exist in the full diff (based on the path)
                    let path = ed.path
                    let pos = arFullDiffPath.indexOf(path)
                    if (pos == -1) {
                        //no it doesn't. Add it to the list - unless the mult is set to 0..0
                        if (ed.mult !== '0..0') {
                            arFullDiffPath.push(path)
                            hashEdPath[path] = ed   //and store the ed in the hash
                        }

                    } else {
                        //yes, it already exists
                        if (ed.mult == '0..0') {
                            //It's hidden. remove it from the array
                            arFullDiffPath.splice(pos,1)
                        } else {
                            //it's just been replaced
                            hashEdPath[path] = ed
                        }

                    }
                }
            }
            //now we can assemble the full diff
            dg.fullDiff = []
            arFullDiffPath.forEach(function (path) {
                dg.fullDiff.push(hashEdPath[path])
            })
        }


        //create a
        function makeDgHierarchy(dg,allDg) {
            //create hierarchy for DG

            let dgName = dg.name
            let arHierarchy = [dgName]

            let tmpDG = dg
            let ctr = 0

            while (tmpDG.parent) {
                let parent = tmpDG.parent
                arHierarchy.push(parent)
                let dgTitle = tmpDG.title
                tmpDG = allDg[tmpDG.parent]
                if (! tmpDG) {
                    throw new Error(`DG ${parent} was not found. Referenced in ${dgTitle}`)
                    return
                }

                ctr++
                if (ctr > 100) {
                    throw new Error(`Error finding ultimate parent of ${dgName}`)
                    return
                }

            }
            return arHierarchy




        }


        return {
            makeSnapshots: function (hashAllDG) {
                let allDg = angular.copy(hashAllDG)
                Object.keys(hashAllDG).forEach(function (dgName) {
                    let dg = hashAllDG[dgName]
                    makeFullDiff(dg, allDg)
                    console.log(dg.name, dg.fullDiff.length)
                })

                allDgSnapshot = allDg
                /*
                let dg = hashAllDG['ECOGStatus']
                makeFullDiff(dg,allDg)
                console.log(dg)
                */


            },
            getFullElementList: function (dgName) {
                return allDgSnapshot[dgName]
            }
        }

    })