angular.module("pocApp")

    .service('snapshotSvc', function(utilsSvc) {

        //also a copy in modelsSvc
        fhirDataTypes = ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']

        allDgSnapshot = {}      //a hash of all DGs with snapshots
        lstAllDG = []           //an alphabetical list of all DGs by name
        lstAllDGTitle = []      //an alphabetical list by title
        logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
        log = []                //the main log
        //errors = []
        logIndex=0              //An incremental index for log entries
        hashHierarchy = {}      //the hierarchy for each dg
        hashReferences = {}     //references by DG. This is used for the summary - not in processing...
        hashHistory = {}        //history of changes as the dg hierarchy is traversed
        hashChildren = {}       //all direct children for a DG - used for the summary


        //Before creating the snapshots
        function clearInternalCaches() {
            allDgSnapshot = {}      //a hash of all DGs with snapshots
            lstAllDG = []           //an alphabetical list of all DGs
            lstAllDGTitle = []      //an alphabetical list by title
            logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
            log = []                //the main log
            //errors = []
            logIndex=0              //An incremental index for log entries
            hashHierarchy = {}      //the hierarchy for each dg
            hashChildren = {}       //all direct children for a DG - used for the summary
            hashReferences = {}     //references by DG. This is used for the summary - not in processing...
            hashHistory = {}        ////history of changes as the dg hierarchy is traversed
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
        //element on the DG (as a hash) and apply them once the snapshot has been completely created
        //note that the override only contains overrides for references.
        function createDgOverride(dg) {

            //so we first create a hash containing all references
            let hashReferenceEds = {}
            dg.fullDiff.forEach(function (ed) {
                let type = ed.type[0]
                if (fhirDataTypes.indexOf(type) == -1) {
                    //this is a reference to a DG
                    //let firstSegment = getFirstPathSegment(path)
                    //hashReferenceEds[firstSegment] = true
                    hashReferenceEds[ed.path] = true
                    //console.log(dg.name,firstSegment)
                }
            })

            //now create the override list, and remove the overrides from the full Diff

            let newFullDiff = []        //this will be a full diff with the overrides removed
            dg.fullDiff.forEach(function (ed) {

                //check each one against the hash of reference elements.
                let isOverride = false
                for (const key of Object.keys(hashReferenceEds)) {
                    if (ed.path.isChildPath(key)) {
                        isOverride = true

                        dg.overrides = dg.overrides || {}
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
            let hashEdPath = {}         //a hash, keyed by path than has the DG at that path. This may be replaced by subsequent DG's in the hierarchy
            let arHx = []               //history of changes made by each DG. will contain {dhName: changes:[]}
            hashHistory[dg.name] = arHx //

            //move down the hierarchy, parent first
            for (let i=arHierarchy.length-1;i > -1;--i) {
                let dgName = arHierarchy[i]

                let changesThisDg = []      //changes made by diffs in this parental DG
                arHx.push({dgName:dgName,changes:changesThisDg})

                let cDg = allDg[dgName]  //cDg = component Dg.
                //let cDg = angular.copy(allDg[dgName])  //cDg = component Dg.
                for (const ed of cDg.diff) {



                    //temp delete ed.sourceModelName   //the previous version saved this in the DG. I prefer to add it here.

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
                        //no it doesn't  - add it to the list.
                        // Even if it is 0..0 - it could be removing part of a referenced DG so we need it for later

                        ed.sourceModelName = dgName     //the DG where this ed was added.
                        arFullDiffPath.push(path)
                        hashEdPath[path] = ed   //and store the ed in the hash
                        changesThisDg.push({msg:`Added ${ed.path}`,ed:ed })


                    } else {
                        //yes, it already exists
                        //update the hash with the new ed

                        hashEdPath[path] = ed
                        changesThisDg.push({msg:`Replaced ${ed.path}`,ed:ed })


                    }
                }
            }

            //now arFullDiffPath has the ordered list of all elements in the expanded diff and hashEdPath has the eds

            //now we can assemble the full diff and the start of the snapshot.
            //they start the same, but as the elements in fullDiff that are DG's are processed later, the contents are added
            //to the snapshot


            //now we can create the fullDiff
            arFullDiffPath.forEach(function (path) {

                //if we don't use a clone, then it's a reference to a common ed so if it's used more than
                //once, it won't get updated in some cases...
                let edClone = angular.copy(hashEdPath[path])

                //we always add it to the full diff. If it has been overridden, then the most recent value will be at the path
                dg.fullDiff.push(edClone)


            })


            //create the override hash on the DG and remove override elements on referenced elements from the full diff
            //into the overrides note that this does not includes Groups - they remain in the fullDifs and are processed
            createDgOverride(dg)

            //now we can create the initial snapshot (override DG's will have been removed from the fullDiff)
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
            //hashChildren[dg.name] = []

            let dgName = dg.name
            let arHierarchy = [dgName]
            //let arHierarchy = []

            let tmpDG = dg
            let ctr = 0

            //we only want immediate children. This is for reporting only
            if (tmpDG.parent) {
                hashChildren[tmpDG.parent] = hashChildren[tmpDG.parent] || []
                hashChildren[tmpDG.parent].push(dgName)
            }

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
           // arHierarchy.push(dgName)

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
                    let processedInOverride  = false  //if the ed is an override or child of an override then it will be processed in the handler. If not, then add it

                    for (const key of Object.keys(dg.overrides)) {
                        if (ed.path == key || ed.path.isChildPath(key)) {
                            //this is an override or child of an override
                            processedInOverride = true      //we'll process it here

                            let overrideEd = dg.overrides[key]
                            //if it's 0..0 then drop it - otherwise add it
                            if (overrideEd.mult !== '0..0') {
                                newSnapshot.push(overrideEd)
                            }
                            break

                        }
                    }

                    //if not processed by the override, then add it to the snapshot
                    if (! processedInOverride) {
                        newSnapshot.push(ed)
                    }

                    /*
                    if (dg.overrides[ed.path]){
                        //there is an override
                        let overrideEd = dg.overrides[ed.path]




                        if (canInclude) {
                        //if (overrideEd.mult !== '0..0') {
                            //if the cardinality is 0..0 just drop it. Otherwise, the override ed goes into the snapshot
                            //todo - do we need to look at element children as well here - I don't think so

                            newSnapshot.push(overrideEd)
                        }
                    } else {
                        //no override - keep in the snapshot
                        newSnapshot.push(ed)
                    }
                    */
                })

                dg.snapshot = newSnapshot
            }
        }

        //examine all the referenced dgs and import the elements from the referenced DG. We need multiple cycles
        //to allow dgs to be progressively completed. Once a DG snapshot has been completed, the overrides (includeing groups) can be applied
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
                        //down to the DG. Overrides to referenced dgs are removed into the dg.overrides hash (but not groups)

                        //moreRefsToInsert will be set true if we find a reference to a DG that doesn't yet have a complete snapshot.
                        // If it remains false after examining all elements in the fullDiff then
                        //it means that all DG references have been inserted into the snapshot and the DG snapshot is complete
                        //at that point the overrides can be applied.

                        let moreRefsToInsert = false
                        dg.fullDiff.forEach(function (ed) {
                            //the .dgToBeInserted flag is set when creating the fullDiff element to indicate that this element
                            //is a reference to a DG whose snapshot needs to be inserted

                            if (ed.dgToBeInserted) {
                                let msg1 = `Checking ${dg.name}.${ed.path} to insert ${ed.dgToBeInserted}`
                                logger(msg1,dg.name)
                                let insertPath = ed.path        //the path in the dg where the elements from the referenced DG are to be inserted

                                let dgToInsert = allDgSnapshot[ed.dgToBeInserted]
                                if (dgToInsert) {
                                    //does the DG to insert have a completed snapshot? (In which case it is ready to be inserted)
                                    if (dgToInsert.snapshotComplete) {
                                        //yes it does! We can add the snapshot contents at the indicated path
                                        //first, create the array to insert into the snapshot (we have to update the path)
                                        let arElements = []

                                        dgToInsert.snapshot.forEach(function (edToInsert) {
                                            let ed1 = angular.copy(edToInsert)  //as we're updating the path...
                                            let path = `${insertPath}.${edToInsert.path}`
                                            ed1.path = path
                                            arElements.push(ed1)
                                        })

                                        //the log entry. Include the elements that are being inserted
                                        let msg = `Inserting ${arElements.length} elements into ${dg.name}.${ed.path} from ${dgToInsert.name} (${dgToInsert.title})`
                                        logger(msg,dg.name,false,arElements)

                                        //now insert the list of ed's from referenced DG into the snapshot
                                        insertIntoSnapshot(dg,insertPath,arElements)

                                        ed.dgToBeInserted = false   //mark this dg as having been inserted (false let's us know it was processed)
                                    } else {
                                        //no, the referenced DG has yet to be fully expanded.
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

                        //if moreRefsToInsert is true, it means that there are reference elements in the DG to other DGs that haven't been completed yet
                        if (! moreRefsToInsert) {
                            logger(`DG: ${dg.name} has a completed snapshot !`,dg.name)
                            //todo - remove any specific elements from the diff


                            //now that the DG is complete, remove those where references have been 'zeroed out' in the diff and
                            //replace those changed in the diff
                            //we can't do that before as the full needs to be created first
                             applyOverrides(dg)     //todo the applyOverrides may also need to be applied


                            //but there are also hierarchical Groups which may have hidden elements or overrides.
                            //these are being treated separately - but in a similar way to references

                            //create a hash of all hidden paths
                            //todo - should we be iterating over fulldiff?
                            let hashHidden = {}
                            //dg.diff.forEach(function (ed) {  //from the DG diff
                            //Anything 0..0 in the original diff is also present in the snapshot at this point
                            //unless it's a reference
                            dg.snapshot.forEach(function (ed) {  //from the DG diff
                                if (ed.mult == '0..0') {
                                    hashHidden[ed.path] = true
                                }
                            })

                            //create a new snapshot list that excludes 0..0 elements
                            //also need to accomodate overrides from the main DG - eg fixing a value
                            hashReferences[dg.name] = []  ////now that we are building the definitive snapshot, we can build the references hash
                            let finalSnapshot = []

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

                                if (canInclude) {
                                    let type = ed.type[0]
                                    if (fhirDataTypes.indexOf(type) == -1) {
                                        hashReferences[dg.name].push({path:ed.path,dgName: type,ed:ed})
                                    }

                                    finalSnapshot.push(ed)
                                }
                            })
                            dg.snapshot = finalSnapshot


                            logger(`DG: ${dg.name} snapshot has been finalised`,dg.name)
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

                try {
                    //construct a complete diff for each dg including the hierarchy
                    Object.keys(allDgSnapshot).forEach(function (dgName) {
                        let dg = allDgSnapshot[dgName]
                        makeFullDiff(dg, allDgSnapshot)

                    })

                    //perform the 'inflation' of DG's that results in the snapshot
                    processDataGroups()


                    console.log(`Size of SnapShots: ${utilsSvc.getSizeOfObject(allDgSnapshot)/1024} K`)

                    //construct an alphabetical list of DGs for the UI
                    Object.keys(allDgSnapshot).forEach(function (dgName) {
                        lstAllDG.push(allDgSnapshot[dgName])
                        lstAllDGTitle.push(allDgSnapshot[dgName])
                    })

                    lstAllDG.sort(function (a,b) {
                        if (a.name > b.name) {
                            return 1
                        } else {
                            return -1
                        }
                    })

                    lstAllDGTitle.sort(function (a,b) {
                        if (a.title > b.title) {
                            return 1
                        } else {
                            return -1
                        }
                    })



                } catch (ex) {
                    console.log(ex)
                    alert(`There was an exception during Snapshot generation processing. You should revert your latest update. ${angular.toJson(ex)}`)
                }



                return {log:log}

            },
            getAllDg : function () {
                //return the hash of all DGs with snapshots
                return allDgSnapshot
            },
            getDGList : function () {
                //return an alphabetical list of DG by name
                return lstAllDG
            },
            getDGListTitle : function () {
                //return an alphabetical list of DG by title
                return lstAllDGTitle
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
            getRelationshipsSummary : function (dgName) {
                //summarizes the parents, direct children & references
                let summary = {}
                summary.parents = hashHierarchy[dgName]
                summary.references = hashReferences[dgName]
                summary.children = hashChildren[dgName]

                return summary
            },
            getFullListOfElements: function (dgName,dgRef) {
                //return the full list of elements for a DG. In the format of the existing full element list.
                let lst = []
                let hash = {}
                //if dgRef was passed in, then decorate the ones that were defined on the DG (not a parent).
                //used for the tree to show locally updated elements
                if (dgRef && dgRef.diff) {
                    dgRef.diff.forEach(function (ed) {
                        hash[ed.path] = true
                    })
                }


                let title = dgName
                let dg = allDgSnapshot[dgName]
                if (dg) {       //not sure what to do if null - shouldn;t happen!
                    title = dg.title
                }


                let root = {path:dgName,title:title,kind:"root"}
                lst.push({ed:root})
                if (allDgSnapshot[dgName] && allDgSnapshot[dgName].snapshot) {
                    allDgSnapshot[dgName].snapshot.forEach(function(ed) {
                        let clone = angular.copy(ed)
                        if (hash[ed.path]) {
                            clone.definedOnDG = true
                        }
                        clone.path = `${dgName}.${clone.path}`
                        lst.push({ed:clone})
                    })
                } else {
                    console.error(`No DG called ${dgName} found`)
                }


                return lst
            }
        }

    })