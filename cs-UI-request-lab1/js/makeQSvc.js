angular.module("pocApp")

    .service('makeQSvc', function($http) {

        let config = {}


        return {

            makeQ: function(treeObject) {
                Q = {resourceType:"Questionnaire",status:"draft"}

                function addChild(parent,node) {
                    let data = node.data

                    let item = {text:node.text}

                    //if the node is a section or group, then the type must also be 'group. Only 'element' types can be different

                    if (node.data.level == 'element') {
                        item.type = data.controlType    //the 'official' type for the item

                        //Add the hint instruction
                        if (data.controlType !== data.controlHint)  {
                            console.log(item.text,data.controlType,data.controlHint)
                            //the hint is the extension that gives more options to the renderer
                            item.extension = item.extension || []
                            let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                            ext.valueCodeableConcept = {coding:[{code:data.controlHint,system:"http://hl7.org/fhir/questionnaire-item-control"}]}
                            item.extension.push(ext)
                        }

                        switch (data.controlHint) {
                            case 'drop-down' :
                                //populate the answerOption. For now, get it from 'options, but later:
                                //todo - expand from valueSet if present
                                item.answerOption = []

                                if (data.ed.valueSet) {
                                    //if there's a valueSet, then tru to expand it
                                    let qry = `ValueSet/$expand?url=${data.ed.valueSet}&_summary=false`
                                    let encodedQry = encodeURIComponent(qry)

                                    $http.get(`nzhts?qry=${encodedQry}`).then(
                                        function (data) {
                                            let expandedVS = data.data
                                            for (const concept of expandedVS.expansion.contains) {
                                                item.answerOption.push(
                                                    {valueCoding:{system:concept.system, code:concept.code, display:concept.display}})
                                            }
                                            console.log(data.data)




                                        }, function (err) {
                                            item.answerOption.push({valueCoding:{display:"VS not found"}})
                                            console.log(`There was no ValueSet with the url:${url}`)
                                        }
                                    )


                                } else {
                                    if (data.ed.options) {
                                        for (const option of data.ed.options) {
                                            item.answerOption.push({valueCoding:{display:option.pt}})
                                        }
                                    }

                                }







                                break
                        }



                    } else {
                        item.type = 'group'
                        //console.log(data.cols)
                        //are there multi columns set
                        if (data.cols) {
                            item.extension = item.extension || []
                            let ext = {url:"http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"}
                            ext.valueInteger = data.cols
                            item.extension.push(ext)
                        }
                    }

                    item.linkId = node.id
                    parent.item = parent.item || []
                    parent.item.push(item)

                    if (node.children && node.children.length > 0) {
                        node.children.forEach(function (childNode) {

                            addChild(item,childNode)
                        })
                    }

                }


                treeObject[0].children.forEach(function (section) {
                    //only add a section if it has children
                    if (section.children && section.children.length > 0) {
                        addChild(Q,section)
                    }

                })

                //console.log(Q)
                return Q


        },



            moveDown : function (node,treeData) {
                //move up within the parent
                let parent = node.parent
                let bottomThisParent = -1  //the topmost item that has this parent
                let pos = -1 //position of this node
                treeData.forEach(function (item,inx) {
                    if (item.id == node.id) {
                        pos = inx
                    }
                    if (item.parent == node.parent) {
                        bottomThisParent = inx
                    }

                })

                if (bottomThisParent > pos) {

                    let nodeToMove = treeData.splice(pos,1)[0]
                    let amountToMove = 1

                    if (node.data.level == 'group') {
                        amountToMove = bottomThisParent - pos+1
                    }

                    treeData.splice(pos+amountToMove,0,nodeToMove)
                }

            },
            moveUp : function (node,treeData) {
                //move up within the parent
                let parent = node.parent
                let topThisParent = -1  //the topmost item that has this parent
                let pos = -1 //position of this node
                treeData.forEach(function (item,inx) {
                    if (item.id == node.id) {
                        pos = inx
                    }
                    if (item.parent == node.parent && topThisParent == -1) {
                        topThisParent = inx
                    }

                })

                if (topThisParent < pos) {

                    let nodeToMove = treeData.splice(pos,1)[0]
                    let amountToMove = 1
                    //A group needs to be moved above any children of the group above
                    if (node.data.level == 'group') {
                        amountToMove = pos-topThisParent+1
                    }

                    treeData.splice(pos-amountToMove,0,nodeToMove)
                }

            },

            isADG : function (ed, hashAllDG) {
                let isADG = false
                if (ed.kind == 'dg') {
                    isADG = true
                } else {
                    if (ed.type) {
                        let model = hashAllDG[ed.type]
                        if (model && model.diff && model.diff.length > 0) {
                            isADG = true
                        }
                    }
                }
                return isADG
            },

            getControlDetails : function(ed) {
                //return the control type & hint based on the ed

                let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
                let controlType = "string"          //this has to be one of the defined type values

                if (ed.options && ed.options.length > 0) {
                    controlHint = "drop-down"
                    controlType = "choice"
                }


                if (ed.type) {
                    switch (ed.type[0]) {
                        case 'dateTime' :
                            controlHint = "dateTime"
                            controlType = "dateTime"
                            break
                        case 'CodeableConcept' :
                            if (ed.valueSet) {
                                controlHint = "lookup"
                                controlType = "choice"
                            }
                    }
                }

                if (ed.controlHint) {
                    controlHint = ed.controlHint
                }


                return {controlType:controlType,controlHint:controlHint}

            },

            getAllChildNodes: function (parentId,ed,hashAllDG,allElementsThisSection) {

                //create an array of tree nodes that are children (direct or indirect) of the ed
                //the ed will refer to a DG (the responsibility of the caller)
                let that = this

                //parentId id the parent in the tree

                let internalParentId = parentId    //start by adding to the parent

                let arNodes = []        //a set of arNodes to add to the tree (could also pass the tree in)
                let path = ed.path

                //go through all the possible elements that can be added (as created when expanding the composition)
                //add any that start with the path of the passed in
                allElementsThisSection.forEach(function (ed1) {
                    //note that the path is the full path (including DG name)

                    if (ed1.path.startsWith(path)) {
                        console.log(ed1.path)

                        //let controlType = "string"
                        //let controlHint = "string"

                        let voControl = that.getControlDetails(ed1)



                        //is this a DG? if so, then we'll add to a group
                       // let type = ed1.type[0]


                      //  let dg = hashAllDG[type]

                        if (that.isADG(ed1,hashAllDG)) {
                            //yes, it is a dg. We need to add a group and set the internalParentId to that element
                            //but, if we're already adding to a group
                            console.log('---> is DG')
                            internalParentId = ed1.path //`${parentId}.${ed1.path}`    //the group is going to be the parent for the next element

                            let groupNode = {id:internalParentId,
                                text:ed1.title,
                                parent:parentId,
                                data:{ed:ed1,level:'group',controlType:voControl.controlType,controlHint:voControl.controlHint}}
                            arNodes.push(groupNode)

                        } else {
                            //this is a fhir DT. For now, we'll add it to the current internalParentId
                            //todo - need to think about nested DGs
                            let localId = ed1.path // `${internalParentId}.${ed1.name}`

                            let elementNode = {id:localId,
                                text:ed1.title,
                                parent:internalParentId,
                                data:{ed:ed1,level:'element',controlType:voControl.controlType,controlHint:voControl.controlHint}}
                            arNodes.push(elementNode)

                        }


                    }

                })

                return {arNodes:arNodes}

                /*
                let dg = hashAllDG[ed.name]

                if (! dg) {
                    alert(`The path ${path} is supposed to be a DG, but it cannot be found`)
                    return
                }
             */
                //now




            }
        }
    })