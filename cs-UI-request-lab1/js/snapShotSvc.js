angular.module("pocApp")

    .service('snapshotSvc', function(utilsSvc) {

        //also a copy in modelsSvc
        fhirDataTypes = ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']

        allDgSnapshot = {}      //a hash of all DGs with snapshots
        lstAllDG = []           //an alphebetical list of all DGs
        logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
        log = []
        errors = []
        logIndex=0

        function logger(msg,dgName,isError,details) {
            if (logToConsole) {
                console.log(dgName,msg)
            }
            if (isError) {
                errors.push({msg:msg,dgName:dgName})
            }
            let logEntry = {msg:msg,dgName:dgName,isError:isError,index:logIndex++}
            if (details) {
                logEntry.details = details
            }
            log.push(logEntry)
        }


        //create the hierarchy of DG that lead to this one and save in .fullDiff
        //also add them to the snapshot
        function makeFullDiff(dg,allDg) {

            let arHierarchy = makeDgHierarchy(dg,allDg)

            //now, create a diff array that has all elements
            let arFullDiffPath = []     //will contain paths
            let hashEdPath = {}         //a hash, keyed by path than has the DG at that path

            //move down the hierarchy, parent first
            for (let i=arHierarchy.length-1;i > -1;--i) {
                let dgName = arHierarchy[i]

                let cDg = allDg[dgName]  //cDg = component Dg.
                for (const ed of cDg.diff) {

                    //if the datatype is not a FHIR datatype - it's another DG - then it will need to have the members inserted
                    //into the target DG immediately after this element...
                    let type = ed.type[0]
                    if (fhirDataTypes.indexOf(type) == -1) {
                        ed.dgToBeInserted = type   //this is the type (same as DG name) to be inserted here. We clear the flag when inserting
                    }

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
                            //it's just been replaced by a new one...
                            hashEdPath[path] = ed
                        }

                    }
                }
            }
            //now we can assemble the full diff and the start of the snapshot.
            //they start the same, but as the elements in fullDiff that are DG's are processed, the contents are added
            //to the snapshot

            dg.fullDiff = []        //this is a complete list of diffs from the entire hierarchy ordered from the ultimate parent down
            dg.snapshot = []        //the definitive snapshot of all elements in order
            arFullDiffPath.forEach(function (path) {

                //if we don't use a clone, then it's a reference to a common ed so if it's used more than
                //once, it won't get updated in some cases...
                let clone = angular.copy(hashEdPath[path])

                dg.fullDiff.push(clone)
                dg.snapshot.push(clone)

                //dg.fullDiff.push(hashEdPath[path])
                //dg.snapshot.push(hashEdPath[path])
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

        //insert a set of ed's into the snapshot of a DG at a given path
        function insertIntoSnapshot(dg,insertPath,arElements) {
            let inx = -1
            for (const ed of dg.snapshot) {
                inx++
                if (ed.path == insertPath) {
                    break
                }
            }
            if (inx !== -1) {
                Array.prototype.splice.apply(dg.snapshot, [inx+1, 0].concat(arElements));
            } else {
                msg = `Can't find insertPath:${insertPath} in the snapshot of ${dg.name}`
                logger(msg,dg.name,true)
            }
        }


        //fill in all the datatypes/dgs
        function processDataGroups() {

            let moreToGo = true     //wil keep on going until all DGs have had their snapshot created done (or can't go any further)

            let ctr = 0
            while (moreToGo) {
                logger(`cycle #${ctr}`)
                ctr ++
                let updatesMade = false         //track whether we were able to fill in a DG element
                Object.keys(allDgSnapshot).forEach(function (dgName) {
                    let dg = allDgSnapshot[dgName]

                    if (! dg.snapshotComplete) {            //the snapshot is not yet complete
                        //the fullDiff is the set of diff elements created by traversing the hierarchy from ultimate parent
                        //down to the DG.

                        //moreRefsToInsert will be set true if we find a reference to a DG that doesn't yet have a complete snapshot.
                        // If it remains false after examining all elements in the fullDiff then
                        //it means that all DG references have been inserted into the snapshot and the DG snapshot is complete
                        let moreRefsToInsert = false
                        dg.fullDiff.forEach(function (ed) {
                            //the .dgToBeInserted flag is set when creating the fullDiff element to indicate that this element
                            //is a DG whose snapshot needs to be inserted

                            if (ed.dgToBeInserted) {
                                let msg1 = `Checking ${dg.name}.${ed.path} to insert ${ed.dgToBeInserted}`
                                logger(msg1,dg.name)
                                let insertPath = ed.path        //the path in the dg where the elements from the referenced DG are to be inserted

                                //let dgToInsert = angular.copy(allDgSnapshot[ed.dgToBeInserted])
                                let dgToInsert = allDgSnapshot[ed.dgToBeInserted]
                                if (dgToInsert) {
                                    //does the DG to insert have a completed snapshot? (In which case it is ready to be inserted)
                                    if (dgToInsert.snapshotComplete) {
                                        //yes it does! We can add the snapnsho contents at the indicated path
                                        //first, create the array to insert into the snapshot (we have to update the path)
                                        let arElements = []
                                       // let details = []    //details for the log
                                        dgToInsert.snapshot.forEach(function (edToInsert) {
                                            let ed1 = angular.copy(edToInsert)  //as we're updating the path...
                                            let path = `${insertPath}.${edToInsert.path}`
                                            ed1.path = path
                                            //details.push(path)
                                            arElements.push(ed1)
                                        })

                                        //the log entry. Include the elements that are being inserted
                                        let msg = `Inserting ${arElements.length} elements into ${dg.name}.${ed.path}`
                                        logger(msg,dg.name,false,arElements)

                                        //now insert the list of ed's from referenced DG into the snapshot
                                        insertIntoSnapshot(dg,insertPath,arElements)

                                        ed.dgToBeInserted = false   //mark this dg as having been inserted (false let's us know it was processed)
                                    } else {
                                        let msg = `${ed.dgToBeInserted} not yet complete at ${dg.name}.${ed.path}`
                                        logger(msg,dg.name,true)
                                        moreRefsToInsert = true //we found an ed to insert, but it didn't have a completed snapshot
                                    }
                                } else {
                                    let msg = `Can't find DG ${ed.dgToBeInserted} at ${dg.name}.${ed.path}`
                                    logger(msg,dg.name,true)
                                }
                            }
                        })

                        //if moreRefsToInsert is true, it means that there arereference elements in the DG that haven't been completed yet
                        //snapshot from the referenced element
                        if (! moreRefsToInsert) {
                            logger(`DG: ${dg.name} has a completed snapshot !`,dg.name)
                            //todo - remove any specific elements from the diff

                            //now that the DG is complete, hide all those that have been 'zeroed out'
                            //we can't do that before as the snapshot needs to be created
                            //todo - eventually will actually remove them...

                            let hashHidden = {}
                            dg.diff.forEach(function (ed) {  //from the DG diff
                                if (ed.mult == '0..0') {
                                    hashHidden[ed.path] = true
                                }
                            })

                            dg.snapshot.forEach(function (ed) {
                                //item.ed.mult = '0..0'
                                for (const key of Object.keys(hashHidden)) {
                                    //if (item.ed.path.startsWith(key +'.')) {
                                    if (ed.path.isChildPath(key)) {
                                        ed.mult = '0..0'
                                        break
                                    }
                                }
                            })






                            dg.snapshotComplete = true
                        } else {
                            logger(`DG: ${dg.name} not yet completed`,dg.name)
                        }
                    }
                })


                //just to terminate the loop. todo need to check that all DG's have a completed snapshot
                if (ctr > 100) {
                    moreToGo = false
                }

            }


        }
        
        return {
            makeSnapshots: function (hashAllDG,inLogToConsole) {
                logToConsole = false // inLogToConsole

                allDgSnapshot = angular.copy(hashAllDG) //this will be a local clone



                //construct a complete diff for each dg including the hierarchy
                Object.keys(allDgSnapshot).forEach(function (dgName) {
                    let dg = allDgSnapshot[dgName]
                    makeFullDiff(dg, allDgSnapshot)
                    //console.log(angular.toJson(allDgSnapshot))
                    //logger(`${dg.name}, ${dg.fullDiff.length}`)
                    //console.log(angular.copy(dg))
                })

                //perform the 'inflation' of DG's that results in the snapshot
                processDataGroups()

                //console.log(utilsSvc.getSizeOfObject(allDgSnapshot))

                console.log(`Size of SnapShots: ${utilsSvc.getSizeOfObject(allDgSnapshot)/1024} K`)

                //construct an alphabetical list of DGs
                Object.keys(allDgSnapshot).forEach(function (dgName) {
                    lstAllDG.push(allDgSnapshot[dgName])
                })

                lstAllDG.sort(function (a,b) {
                    if (a.title > b.title) {
                        return 1
                    } else {
                        return -1
                    }
                })

                return {log:log}

            },
            getAllDg : function () {
                //return the hash of all DGs with snapshots
                return allDgSnapshot
            },
            getDGList : function () {
                //return an alphabetical list of DG
                return lstAllDG
            },
            getDG: function (dgName) {
                return allDgSnapshot[dgName]
            },
            getFullListOfElements: function (dgName) {
                //return the full list of elements for a DG
                let lst = []
                let root = {path:dgName,title:dgName,kind:"root"}
                lst.push({ed:root})
                allDgSnapshot[dgName].snapshot.forEach(function(ed) {
                    let clone = angular.copy(ed)
                    clone.path = `${dgName}.${clone.path}`
                    lst.push({ed:clone})
                })

                return lst
            }
        }

    })