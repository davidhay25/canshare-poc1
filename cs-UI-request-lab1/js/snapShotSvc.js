angular.module("pocApp")

    .service('snapshotSvc', function(utilsSvc) {

        //also a copy in modelsSvc
        fhirDataTypes = ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']

        allDgSnapshot = {}      //a hash of all DGs with snapshots
        lstAllDG = []           //an alphabetical list of all DGs
        logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
        log = []                //the main log
        //errors = []
        logIndex=0              //An incremental index for log entries
        hashHierarchy = {}      //the hierarchy for each dg
        hashReferences = {}     //references by DG. This is used for the summary - not in processing...
        hashHistory = {}        //history if changes as tge dg hierarchy is traverser


        function clearInternalCaches() {
            allDgSnapshot = {}      //a hash of all DGs with snapshots
            lstAllDG = []           //an alphabetical list of all DGs
            logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
            log = []                //the main log
            //errors = []
            logIndex=0              //An incremental index for log entries
            hashHierarchy = {}      //the hierarchy for each dg
            hashReferences = {}     //references by DG. This is used for the summary - not in processing...
            hashHistory = {}
        }

        function logger(msg,dgName,isError,details) {
            if (logToConsole) {
                console.log(dgName,msg)
            }
            /*
            if (isError) {
                errors.push({msg:msg,dgName:dgName})
            }
            */
            let logEntry = {msg:msg,dgName:dgName,isError:isError,index:logIndex++}
            if (details) {
                logEntry.details = details
            }
            log.push(logEntry)
        }

        function getFirstPathSegment(path) {
            let ar = path.split('.')
            let firstSegment = ar[0]
            return firstSegment
        }


        //When a DG overrides an imported reference, the element will duplicate as it will be brought in
        //with the references DG as well as present as the override diff. We remove them here into a separate
        //element on the DG and apply them once the snapshot has been completely created
        function createDgOverride(dg) {

            //so we first create a hash with the first segment of the references, then check that before inserting
            let hashReferenceEds = {}
            dg.fullDiff.forEach(function (ed) {
                //let ed = hashEdPath[path]
                let type = ed.type[0]
                if (fhirDataTypes.indexOf(type) == -1) {
                    //this is a reference to a DG
                    //let firstSegment = getFirstPathSegment(path)
                    //hashReferenceEds[firstSegment] = true
                    hashReferenceEds[ed.path] = true
                    //console.log(dg.name,firstSegment)
                }
            })

            //now create the override list, and remove the overrides from the

            let newFullDiff = []        //this will be a full diff with the overrides removed
            dg.fullDiff.forEach(function (ed) {

                //check each one against the hash of refernce elements.
                let isOverride = false
                for (const key of Object.keys(hashReferenceEds)) {
                    if (ed.path.isChildPath(key)) {
                        isOverride = true

                        dg.overrides = dg.override || {}
                        dg.overrides[ed.path] = angular.copy(ed)
                        break
                    }
                }




                //it wasn't an override, so it stays in the fulldiff
                if (! isOverride) {
                    newFullDiff.push(ed)
                }


            })
            dg.fullDiff = newFullDiff


        }


        //apply the hierarchy of DG that lead to this one and save in .fullDiff
        //also add them to the snapshot
        function makeFullDiff(dg,allDg) {

            let arHierarchy = makeDgHierarchy(dg,allDg)     //the list of DG's that are parents of this one

            dg.fullDiff = []        //this is a complete list of diffs from the entire hierarchy ordered from the ultimate parent down
            dg.snapshot = []        //the definitive snapshot of all elements in order

            //now, create a diff array that has all elements
            let arFullDiffPath = []     //will contain paths of all elements in the expanded DG
            let hashEdPath = {}         //a hash, keyed by path than has the DG at that path
            let arHx = []               //history of changes made by each DG. will contain {dhName: changes:[]}
            hashHistory[dg.name] = arHx //

            //move down the hierarchy, parent first
            for (let i=arHierarchy.length-1;i > -1;--i) {
                let dgName = arHierarchy[i]

                let changesThisDg = []      //changes made by diffs in this parental DG
                arHx.push({dgName:dgName,changes:changesThisDg})

                let cDg = allDg[dgName]  //cDg = component Dg.
                for (const ed of cDg.diff) {

                    delete ed.sourceModelName   //the previous version saved this in the DG. I prefer to add it here.

                    //if the datatype is not a FHIR datatype - it's another DG - then it will need to have the members inserted
                    //into the target DG immediately after this element - once it's been inflated...
                    let type = ed.type[0]
                    if (fhirDataTypes.indexOf(type) == -1) {
                        ed.dgToBeInserted = type   //this is the type (same as DG name) to be inserted here. We clear the flag when inserting
                    }

                    //does this ed already exist in the full diff (based on the path)
                    let path = ed.path
                    let pos = arFullDiffPath.indexOf(path)
                    if (pos == -1) {
                        //no it doesn't. Add it to the list - unless the mult is set to 0..0
                        //add it to the list. Even if it is 0..0 - it could be removing part of a referenced DG so we need it for later

                        ed.sourceModelName = dgName     //the DG where this ed was added.
                        arFullDiffPath.push(path)
                        hashEdPath[path] = ed   //and store the ed in the hash
                        changesThisDg.push({msg:`Added ${ed.path}`,ed:ed })

                        /*
                                                if (ed.mult !== '0..0') {
                                                    ed.sourceModelName = dgName     //the DG where this ed was added.
                                                    arFullDiffPath.push(path)
                                                    hashEdPath[path] = ed   //and store the ed in the hash
                                                    changesThisDg.push({msg:`Added ${ed.path}`,ed:ed })
                                                } else {

                                                    changesThisDg.push({msg:`Ignored ${cDg.name}.${ed.path} as it is 0..0 and wasn't in the running list`,ed:ed })
                                                }
                                                */

                    } else {
                        //yes, it already exists
                        //alway add it to the diff

                        hashEdPath[path] = ed
                        changesThisDg.push({msg:`Replaced ${ed.path}`,ed:ed })

                        /*
                        if (ed.mult == '0..0') {
                            //It's hidden. remove it from the array
                            arFullDiffPath.splice(pos,1)
                            changesThisDg.push({msg:`Removed ${ed.path}`,ed:ed })
                        } else {
                            //it's just been replaced by a new one...
                            hashEdPath[path] = ed
                            changesThisDg.push({msg:`Replaced ${ed.path}`,ed:ed })
                        }
                        */

                    }
                }
            }

            //now arFullDiffPath has the list of all elements in the expanded diff and hashEdPath has the eds

            //now we can assemble the full diff and the start of the snapshot.
            //they start the same, but as the elements in fullDiff that are DG's are processed later, the contents are added
            //to the snapshot


            hashReferences[dg.name] = []    //the list of all references from this dg to another. For the summary

            /*
            This won't work as the 'original' diff may have come from a parent

            //If an element starts with the same segment as one that is a reference, then it is intended
            //to overwite the elements brought into the DG by the reference. We don't want to insert them
            //into the fullDiff / snapshot as they will be duplications - and in the wrong place. We'll apply
            //them once the DG has been completely assembled, but ignore them before then.


            */


            hashReferenceEds = {}   //temp, debugging

            //now we can create the fullDiff / snapshot
            //let arElements = []     //for the log
            arFullDiffPath.forEach(function (path) {

                //if we don't use a clone, then it's a reference to a common ed so if it's used more than
                //once, it won't get updated in some cases...
                let edClone = angular.copy(hashEdPath[path])


                dg.fullDiff.push(edClone)
                //dg.snapshot.push(edClone)       //other elements are added to the snapshot as referenced DGs are inflated
                //arElements.push(edClone)

                if (edClone.dgToBeInserted) {
                    //This is a reference to another dg
                    hashReferences[dg.name].push(edClone)
                }

/*
                //we need to determine if this ed is an override to the contents of a reference
                let firstSegment = getFirstPathSegment(path)


                if (path !== firstSegment && hashReferenceEds[firstSegment]) { //otherwise it matches the element defining the reference
                    //this is an ed that is an override to a reference element. We add it to a separate
                    //collection on the DG, but not to the fullDiff or snapshot. It will be applied
                    //once all referenced DG's have been imported into the DG
                    dg.overrides = dg.overrides || []
                    dg.overrides.push(edClone)
                } else {
                    dg.fullDiff.push(edClone)
                    dg.snapshot.push(edClone)       //other elements are added to the snapshot as referenced DGs are inflated
                    arElements.push(edClone)

                    if (edClone.dgToBeInserted) {
                        //This is a reference to another dg
                        hashReferences[dg.name].push(edClone)
                    }
                }
*/




                //dg.fullDiff.push(hashEdPath[path])
                //dg.snapshot.push(hashEdPath[path])
            })


            //create the override collection and remove overrides from the full diff
            createDgOverride(dg)

            //now we can create the initial snapshot (override DG's will have been removed from the fullDiff
            let arElements = []     //for the log

            dg.snapshot = []
            dg.fullDiff.forEach(function (ed) {
                arElements.push(ed)
                dg.snapshot.push(ed)        //todo does this need to be a clone
            })

            let msg = `${dg.name}: Created initial snapshot with ${arElements.length} elements`
            logger(msg,dg.name,false,arElements)


        }


        //create the hierarchy of all DGs that are parents of this one...
        function makeDgHierarchy(dg,allDg) {
            //create parental hierarchy for DG

            hashHierarchy[dg.name] = []

            let dgName = dg.name
            let arHierarchy = [dgName]

            let tmpDG = dg
            let ctr = 0

            while (tmpDG.parent) {
                let parent = tmpDG.parent
                arHierarchy.push(parent)
                hashHierarchy[dg.name].splice(0,0,parent)
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

        //Once the snapshot has been completed, the overrides from the DG can be applied.
        //This can be removing elements or replacing one in the snapshot by the appropriate override
        function applyOverrides(dg) {
            if (dg.overrides) {
                let newSnapshot = []

                dg.snapshot.forEach(function (ed) {
                    if (dg.overrides[ed.path]){
                        //there is an override
                        let overrideEd = dg.overrides[ed.path]
                        if (overrideEd.mult !== '0..0') {
                            //if the cardinality is 0..0 just drop it. Otherwise the override ed goes into the snapshot
                            newSnapshot.push(overrideEd)
                        }
                    } else {
                        //no override - keep in the snapshot
                        newSnapshot.push(ed)
                    }
                })

            dg.snapshot = newSnapshot
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
                                        let msg = `Inserting ${arElements.length} elements into ${dg.name}.${ed.path} from ${dgToInsert.name} (${dgToInsert.title})`
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


                            //now that the DG is complete, remove those where references have been 'zeroed out' in the diff and
                            //replace those changed in the diff
                            //we can't do that before as the snapshot needs to be created first
                             applyOverrides(dg)


                            //but there are also Groups which may have hidden elements.
                            //these are being treated separately - but in a similar way to references

                            //create a hash of all hidden paths
                            let hashHidden = {}
                            dg.diff.forEach(function (ed) {  //from the DG diff
                                if (ed.mult == '0..0') {
                                    hashHidden[ed.path] = true
                                }
                            })

                            //create a new snapshot list that excludes 0..0 elements
                            //also need to accomodate overrides from the main DG - eg fixing a value
                            let newSnapshot = []

                            dg.snapshot.forEach(function (ed) {
                                let canInclude = true
                                for (const key of Object.keys(hashHidden)) {
                                    if (ed.path == key || ed.path.isChildPath(key)) {
                                        //this is an excluded or child-of excluded element so don't include it
                                        canInclude = false
                                        let msg = `Directly removed ${ed.path}`
                                        logger(msg,dg.name,true)
                                        break
                                    }
                                }

                                //if it can be included (c=mult !== 0..0) then see if it matches one already
                                //in the DG - eg from a referenced element. If there is then the one from the
                                //diff needs to replace the imported one. eg a value may have been fixed or
                                //valueset changed
                                if (canInclude) {

                                }



                                if (canInclude) {
                                    newSnapshot.push(ed)
                                }
                            })
                            dg.snapshot = newSnapshot



                            /*
                            A version that uses 0..0 to hide the elements. Keep for the moment
                            dg.snapshot.forEach(function (ed) {
                                for (const key of Object.keys(hashHidden)) {
                                    if (ed.path.isChildPath(key)) {
                                        ed.mult = '0..0'
                                        let msg = `DG: ${dg.name} has directly hidden ${key}`
                                        logger(msg,dg.name,true)
                                        break
                                    }
                                }
                            })
                            */


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
                clearInternalCaches()
                logToConsole = false // inLogToConsole

                allDgSnapshot = angular.copy(hashAllDG) //this will be a local clone

                //construct a complete diff for each dg including the hierarchy
                Object.keys(allDgSnapshot).forEach(function (dgName) {
                    let dg = allDgSnapshot[dgName]
                    makeFullDiff(dg, allDgSnapshot)

                })

                //perform the 'inflation' of DG's that results in the snapshot
                processDataGroups()

                console.log(hashHistory)

                //console.log(utilsSvc.getSizeOfObject(allDgSnapshot))

                console.log(`Size of SnapShots: ${utilsSvc.getSizeOfObject(allDgSnapshot)/1024} K`)

                //construct an alphabetical list of DGs
                Object.keys(allDgSnapshot).forEach(function (dgName) {
                    lstAllDG.push(allDgSnapshot[dgName])
                })

                lstAllDG.sort(function (a,b) {
                    if (a.name > b.name) {
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
            getHierarchy : function (dgName) {
                return hashHierarchy[dgName]
            },
            getReferences : function (dgName) {
                return hashReferences[dgName]
            },
            getChangeHistory : function (dgName) {
                return hashHistory[dgName]
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