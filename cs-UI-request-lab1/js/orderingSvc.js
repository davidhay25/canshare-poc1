//functions used in re-ordering elements.
angular.module("pocApp")

    .service('orderingSvc', function() {

        return {



            sortFullListByInsertAfter(lst,dg) {
                //console.log(lst)

                if (!dg.ordering || dg.ordering.length < 1) {
                    return
                }

                dg.ordering.forEach(function (item) {
                    let insertPointFound = false
                    /*
                    let ar = preceding.split('.')

                    //the
                    ar.splice(0,1)
                    let endOfPath = ar.join('.')     //the path without the datatype name

                    //set the first segment to the DG name
                    ar[0] = dgName
                    preceding = ar.join('.')
*/
                    let currentPos = findCurrentPositionInList(item.toMove)    //where the item to be moved is currently placed

                    let itemToMove = lst.splice(currentPos,1)       //OK, it's removed

                    for (let i=0; i< lst.length; i++) {
                        let tItem = lst[i]
                        if (tItem.ed.path == item.insertAfter) {
                            //now insert it into the tree at 'i+1'
                            lst.splice(i+1,0,itemToMove[0])
                            insertPointFound = true
                            break
                        }
                    }
                    if (! insertPointFound) {
                        console.log(`Insert point ${item.insertAfter} not found, no re-ordering occurred`)
                    }

                })

                function findCurrentPositionInList(path) {
                    //find where an item is in the tree based on the path
                    //have to do this each time as it may change with other moves
                    let pos = -1
                    for (const item of lst) {
                        pos ++
                        if (item.ed.path == path) {
                            return pos
                        }
                    }
                }

            },

            sortFullListByInsertAfterDEP(lst) {
                console.log(lst)
                let dgName = lst[0].ed.path     //the DGName is the first element

                //get the list of elements that need to be ordered. todo - may need to think of some kind of precedence if there are multiple
                let arToBeOrdered = []

               // let listOfTargets = []  //all the elements that are targets of a move


                lst.forEach(function (item) {
                    if (item.ed && item.ed.insertAfter) {
                        arToBeOrdered.push(item)
                       // listOfTargets.push(item.ed.insertAfter)
                    }
                })
/*
                //now, change the order of moves so that items that are targets of others are the first to be moved
                let newListToBeOrdered = []
                arToBeOrdered.forEach(function (item) {

                   // if (item.pat)
                })
*/
                console.log(arToBeOrdered)

                arToBeOrdered.forEach(function (item) {
                    let preceding = item.ed.insertAfter        //the path of the item that the item should be inserted after

                    let insertPointFound = false
                    let ar = preceding.split('.')

                    //the
                    ar.splice(0,1)
                    let endOfPath = ar.join('.')     //the path without the datatype name

                    //set the first segment to the DG name
                    ar[0] = dgName
                    preceding = ar.join('.')

                    let currentPos = findCurrentPositionInList(item.ed.path)    //where the item to be moved is currently placed

                    for (let i=0; i< lst.length; i++) {
                        let tItem = lst[i]
                        if (tItem.ed.path.endsWith(endOfPath)) {
                        //if (tItem.ed.path == preceding) {
                            //this is the point to move the item to
                            console.log(i)
                            //first, remove the item from the tree
                            let itemToMove = lst.splice(currentPos,1)       //OK, it's removed

                            if (currentPos < i) {
                                //if the item to be moved is above the insertion point, then slicing it out means we need to adjust the insertion point
                                i--
                            } else {
                                i++
                            }

                            //now insert it into the tree at 'i' - todo need to check if itemToMove is above or below insert point
                            lst.splice(i,0,itemToMove[0])
                            insertPointFound = true
                            break

                        }
                    }
                    if (! insertPointFound) {
                        console.log(`Insert point ${preceding} not found, noi re-ordering occurred`)
                    }

                })

                function findCurrentPositionInList(path) {
                    //find where an item is in the tree based on the path
                    //have to do this each time as it may change with other moves
                    let pos = -1
                    for (const item of lst) {
                        pos ++
                        if (item.ed.path == path) {
                            return pos
                        }
                    }
                }

            },

            sortDGTreeDEP : function(treeData) {
                //re-order the tree based on the 'insert after
                //best to do this on the sorted list as other displays (like table) are updated

                //get the list of elements that need to be ordered. todo - may need to think of some kind of precedence if there are multiple
                let arToBeOrdered = []
                treeData.forEach(function (item) {
                    if (item.data.ed && item.data.ed.insertAfter) {
                        arToBeOrdered.push(item)
                    }

                })

                console.log(arToBeOrdered)

                //now go through each of the items to find the one it should be inserted after
                arToBeOrdered.forEach(function (item) {
                    let preceding = item.data.ed.insertAfter        //the path of the item that the item should be inserted after
                    let currentPos = findCurrentPositionInTree(item.data.ed.path)    //where the item to be moved is currently placed

                    for (let i=0; i< treeData.length; i++) {
                        let tItem = treeData[i]
                        if (tItem.data.ed.path == preceding) {
                            //this is the point to move the item to
                            console.log(i)
                            //first, remove the item from the tree
                            let itemToMove = treeData.splice(currentPos,1)       //OK, it's removed

                            if (currentPos < i) {
                                //if the item to be moved is above the insertion point, then slicing it out means we need to adjust the insertion point
                                i--
                            } else {
                                i++
                            }

                            //now insert it into the tree at 'i' - todo need to check if itemToMove is above or below insert point
                            treeData.splice(i,0,itemToMove[0])
                            break

                        }
                    }
                    console.log(treeData)

                })

                function findCurrentPositionInTree(path) {
                    //find where an item is in the tree based on the path
                    //have to do this each time as it may change with other moves
                    let pos = -1
                    for (const item of treeData) {
                        pos ++
                        if (item.data.ed.path == path) {
                            return pos
                        }
                    }
                }

            }
        }


    })