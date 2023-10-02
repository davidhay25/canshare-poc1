angular.module("pocApp")

    .service('makeQSvc', function() {

        let config = {}


        return {

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