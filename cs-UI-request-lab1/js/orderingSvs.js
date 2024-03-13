//functions used in re-ordering elements.
angular.module("pocApp")

    .service('orderingSvc', function() {

        return {

            sortFullListByInsertAfter(lst) {
                console.log(lst)
                let dgName = lst[0].ed.path     //the DGName is the first element

                //get the list of elements that need to be ordered. todo - may need to think of some kind of precedence if there are multiple
                let arToBeOrdered = []
                lst.forEach(function (item) {
                    if (item.ed && item.ed.insertAfter) {
                        arToBeOrdered.push(item)
                    }

                })

                console.log(arToBeOrdered)

                arToBeOrdered.forEach(function (item) {
                    let preceding = item.ed.insertAfter        //the path of the item that the item should be inserted after

                    //set the first segment to the DG name
                    let ar = preceding.split('.')
                    ar[0] = dgName
                    preceding = ar.join('.')


                    let currentPos = findCurrentPositionInList(item.ed.path)    //where the item to be moved is currently placed

                    for (let i=0; i< lst.length; i++) {
                        let tItem = lst[i]
                        if (tItem.ed.path == preceding) {
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
                            break

                        }
                    }
                    console.log(lst)

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