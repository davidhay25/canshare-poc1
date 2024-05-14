//a new service (please let it be the last) that generates a Q from a composition
//uses the list of composition elements
angular.module("pocApp")
    .service('makeCompQSvc', function($http,codedOptionsSvc,cmSvc,utilsSvc,vsSvc,QutilitiesSvc,makeQSvc,snapshotSvc) {

        //let hashVS = {}             //a hash containing the concepts from the VS

        //this is the function that actually generates the Q
        function generateQ(allElements,hashAllDG) {
            console.log('generate Q')
            let qName = allElements[0].ed.path
            let id = "cs-" + qName
            Q = {resourceType: "Questionnaire", id: id, status: "draft", name: qName, item: []}
            Q.url = `http://canshare.co.nz/fhir/Questionnaire/${id}`
            let extTS = {url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-preferredTerminologyServer"}
            extTS.valueUrl = "https://nzhts.digital.health.nz/fhir/"
            Q.extension = [extTS]


            //create a top level item to represent a tab container
            //all of the sections are added to that item
            let containerSection = {text: "tabContainer", linkId: qName, extension: [], type: 'group', item: []}

            let ext = {url: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
            ext.valueCodeableConcept = {
                coding: [{
                    code: "tab-container",
                    system: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
                }]
            }
            containerSection.extension.push(ext)


            //log.push({msg:`Added container section`,item:angular.copy(containerSection)})

            Q.item.push(containerSection)

            let sectionItem   //


            //Now iterate over the elements in the list. The number of segments in the path indicates the 'type' of element
            allElements.forEach(function (item) {
                let ed = item.ed
                let path = ed.path
                let ar = path.split('.')

                //console.log(path)

                switch (ar.length) {
                    case 1 :
                        //this is the first element - just the composition
                        break
                    case 2 :
                        //the section item. I don't think there is anything in here we need...
                        break
                    case 3 :
                        //the section DG element. This marks a new section
                        sectionItem = {text: ed.title + " group", linkId: ed.path, type: 'group', extension:[],item: []}

                        //Add the tab container extension as well
                        let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                        ext.valueCodeableConcept = {coding:[{code:"page",system:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}]}
                        sectionItem.extension.push(ext)

                        //the path prefix is the path to the DG in the composition - {compname}.{section name}.
                        //this is the first 2 segments in the node id (which is the full path)
                        let ar = ed.path.split('.')
                        let pathPrefix = `${ar[0]}.${ar[1]}.${ar[2]}.`
                        checkEnableWhen(ed,sectionItem,pathPrefix)

                        containerSection.item.push(sectionItem)



                        //get the Q for this DG and add to the comp DG. This should be all we need
                        //note it assumes we are no longer doing Z elements...
                        //todo - do we need to adjust path [refixes???

                        let dgName = ed.name
                        let allDgElements = snapshotSvc.getFullListOfElements(dgName)
                        let vo = makeQSvc.makeQFromDG(allDgElements,hashAllDG)

                        sectionItem.item = vo.section.item[0].item



                        break


                    case 4 :


                        //the DG within the section DG. I don't think there is anything in here we need...
                        //let groupItem = {text: ed.title + " group", linkId: ed.path, type: 'display', extension:[],item: []}
                        //sectionItem.item.push(groupItem)
                        break
                    default :

                        break       //for now ignore the rest of the processing
                        //contents of the section DG. Add to the current section
                        let type = ed.type[0]
                        let isDG = false
                        if (utilsSvc.fhirDataTypes().indexOf(type) == -1) {
                            isDG = true
                        }

                        let ar1 = ed.path.split('.')
                        //let pathPrefix1 = `${ar1[0]}.${ar1[1]}.${ar1[2]}.`
                        let pathPrefix1 = `${ar1[0]}.${ar1[1]}.`

                        //if it's a group, then add a label - not a control
                        if (type == "Group" || isDG) {
                            let controlItem = {text: ed.title, linkId: ed.path, type: "display"}
                            sectionItem.item.push(controlItem)
                        } else {
                            let vo = getControlDetails(ed)  // return {controlType:controlType,controlHint:controlHint}


                            let controlItem = {text: ed.title, linkId: ed.path, type: vo.controlType}
                            applyControlHint(controlItem,vo.controlHint)

                            //add a ValueSet or answerOptions - but not both
                            if (ed.valueSet) {
                                controlItem.answerValueSet = ed.valueSet
                            } else if (ed.options && ed.options.length > 0) {
                                controlItem.answerOption = []
                                ed.options.forEach(function (opt) {
                                    let concept = {code:opt.code,display:opt.display}
                                    concept.system = opt.system || 'http://example.com/fhir/CodeSystem/example'
                                    controlItem.answerOption.push({valueCoding:concept})
                                })
                            }
                            checkEnableWhen(ed,controlItem,pathPrefix1)

                            QutilitiesSvc.setFixedValue(ed,controlItem)


                            sectionItem.item.push(controlItem)
                        }

                        break
                }

            })


            //console.log(Q)
            return (Q)

            //add any 'enableWhen' instructions
            function checkEnableWhen(ed,item,pathPrefix) {
                pathPrefix = pathPrefix || ""
                if (ed.enableWhen && ed.enableWhen.length > 0) {
                    ed.enableWhen.forEach(function (ew) {
                        let qEW = {}
                        qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                        qEW.operator = ew.operator
                        //if the ew.value is an object then assume a Coding. Otherwise a boolean (we only support these 2)

                        let canAdd = false
                        if (typeof ew.value == 'boolean') {
                            //this is a boolean
                            qEW.answerBoolean = ew.value
                            canAdd = true
                        } else {
                            //let qEW = {operator:ew.operator,answerCoding:ew.value}
                            if (ew.value && ew.value.code) {        //must have a code
                                qEW.answerCoding = ew.value
                                delete qEW.answerCoding.pt  //the preferred term...
                                delete qEW.answerCoding.fsn  //the preferred term...
                                qEW.answerCoding.system = qEW.answerCoding.system || "http://example.com/fhir/CodeSystem/example"
                                canAdd = true
                            }
                        }

                        //need to determine the path to the question. For now, assume that
                        //qEW.question = `${parent.linkId}.${ew.source}` //linkId of source is relative to the parent (DG)
                        // qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                        if (canAdd) {
                            item.enableWhen = item.enableWhen || []
                            item.enableWhen.push(qEW)

                            if (item.enableWhen.length == 2) {
                                //if there are 2 EW then set the EW behaviour. More than 2 and it will already be set...
                                item.enableBehavior = 'any'    //todo - may need to specify this
                            }
                        }

                    })

                }
            }

        }



        function generateQSAVE(allElements) {
            console.log('generate Q')
            let qName = allElements[0].ed.path
            let id = "cs-" + qName
            Q = {resourceType: "Questionnaire", id: id, status: "draft", name: qName, item: []}
            Q.url = `http://canshare.co.nz/fhir/Questionnaire/${id}`
            let extTS = {url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-preferredTerminologyServer"}
            extTS.valueUrl = "https://nzhts.digital.health.nz/fhir/"
            Q.extension = [extTS]


            //create a top level item to represent a tab container
            //all of the sections are added to that item
            let containerSection = {text: "tabContainer", linkId: qName, extension: [], type: 'group', item: []}

            let ext = {url: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
            ext.valueCodeableConcept = {
                coding: [{
                    code: "tab-container",
                    system: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
                }]
            }
            containerSection.extension.push(ext)


            //log.push({msg:`Added container section`,item:angular.copy(containerSection)})

            Q.item.push(containerSection)

            let sectionItem   //


            //Now iterate over the elements in the list. The number of segments in the path indicates the 'type' of element
            allElements.forEach(function (item) {
                let ed = item.ed
                let path = ed.path
                let ar = path.split('.')

                //console.log(path)

                switch (ar.length) {
                    case 1 :
                        //this is the first element - just the composition
                        break
                    case 2 :
                        //the section item. I don't think there is anything in here we need...
                        break
                    case 3 :
                        //the section DG element. This marks a new section
                        sectionItem = {text: ed.title + " group", linkId: ed.path, type: 'group', extension:[],item: []}

                        //Add the tab container extension as well
                        let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                        ext.valueCodeableConcept = {coding:[{code:"page",system:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}]}
                        sectionItem.extension.push(ext)

                        //the path prefix is the path to the DG in the composition - {compname}.{section name}.
                        //this is the first 2 segments in the node id (which is the full path)
                        let ar = ed.path.split('.')
                        let pathPrefix = `${ar[0]}.${ar[1]}.${ar[2]}.`
                        checkEnableWhen(ed,sectionItem,pathPrefix)

                        containerSection.item.push(sectionItem)
                        break


                    case 4 :

                        //the DG within the section DG. I don't think there is anything in here we need...
                        //let groupItem = {text: ed.title + " group", linkId: ed.path, type: 'display', extension:[],item: []}
                        //sectionItem.item.push(groupItem)
                        break
                    default :
                        //contents of the section DG. Add to the current section
                        let type = ed.type[0]
                        let isDG = false
                        if (utilsSvc.fhirDataTypes().indexOf(type) == -1) {
                            isDG = true
                        }

                        let ar1 = ed.path.split('.')
                        //let pathPrefix1 = `${ar1[0]}.${ar1[1]}.${ar1[2]}.`
                        let pathPrefix1 = `${ar1[0]}.${ar1[1]}.`

                        //if it's a group, then add a label - not a control
                        if (type == "Group" || isDG) {
                            let controlItem = {text: ed.title, linkId: ed.path, type: "display"}
                            sectionItem.item.push(controlItem)
                        } else {
                            let vo = getControlDetails(ed)  // return {controlType:controlType,controlHint:controlHint}


                            let controlItem = {text: ed.title, linkId: ed.path, type: vo.controlType}
                            applyControlHint(controlItem,vo.controlHint)

                            //add a ValueSet or answerOptions - but not both
                            if (ed.valueSet) {
                                controlItem.answerValueSet = ed.valueSet
                            } else if (ed.options && ed.options.length > 0) {
                                controlItem.answerOption = []
                                ed.options.forEach(function (opt) {
                                    let concept = {code:opt.code,display:opt.display}
                                    concept.system = opt.system || 'http://example.com/fhir/CodeSystem/example'
                                    controlItem.answerOption.push({valueCoding:concept})
                                })
                            }
                            checkEnableWhen(ed,controlItem,pathPrefix1)

                            QutilitiesSvc.setFixedValue(ed,controlItem)


                            sectionItem.item.push(controlItem)
                        }

                        break
                }

            })


            //console.log(Q)
            return (Q)

            //add any 'enableWhen' instructions
            function checkEnableWhen(ed,item,pathPrefix) {
                pathPrefix = pathPrefix || ""
                if (ed.enableWhen && ed.enableWhen.length > 0) {
                    ed.enableWhen.forEach(function (ew) {
                        let qEW = {}
                        qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                        qEW.operator = ew.operator
                        //if the ew.value is an object then assume a Coding. Otherwise a boolean (we only support these 2)

                        let canAdd = false
                        if (typeof ew.value == 'boolean') {
                            //this is a boolean
                            qEW.answerBoolean = ew.value
                            canAdd = true
                        } else {
                            //let qEW = {operator:ew.operator,answerCoding:ew.value}
                            if (ew.value && ew.value.code) {        //must have a code
                                qEW.answerCoding = ew.value
                                delete qEW.answerCoding.pt  //the preferred term...
                                delete qEW.answerCoding.fsn  //the preferred term...
                                qEW.answerCoding.system = qEW.answerCoding.system || "http://example.com/fhir/CodeSystem/example"
                                canAdd = true
                            }
                        }

                        //need to determine the path to the question. For now, assume that
                        //qEW.question = `${parent.linkId}.${ew.source}` //linkId of source is relative to the parent (DG)
                        // qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                        if (canAdd) {
                            item.enableWhen = item.enableWhen || []
                            item.enableWhen.push(qEW)

                            if (item.enableWhen.length == 2) {
                                //if there are 2 EW then set the EW behaviour. More than 2 and it will already be set...
                                item.enableBehavior = 'any'    //todo - may need to specify this
                            }
                        }

                    })

                }
            }

        }



        function getAllVSDEP(allElements, cb) {

            //cb()        //term server not working

            //return
            //a function that will get all of the valuesets in the list of elements and populate a hash
            // - like the concept map does. This will be memory intensive (may need to re-factor) but the intent
            //is to be able to avoid the async stuff

            let lst = []

            allElements.forEach(function (item) {
                //console.log(item.ed.path)
                if (item.ed && item.ed.valueSet) {
                    //console.log(ed.title + " " + ed.valueSet)
                    let vs = item.ed.valueSet
                    if (vs.indexOf('http') == -1) {
                        vs = "https://nzhts.digital.health.nz/fhir/ValueSet/" + vs
                    }

                    if (lst.indexOf(vs) == -1) {    //only add once!
                        lst.push(vs)
                    }

                }
            })


            cmSvc.getVSContentsHash(lst).then(
                function (hash) {
                    //console.log(hash)
                    vsSvc.setVSContents(hash)
                    //hashVS = hash


                    let size1 = utilsSvc.getSizeOfObject(hash)
                    console.log(`Size of all VS: ${size1/1024} K`)
                    cb()
                }
            )

            //code from conceptmap stuff



            console.log('getting VS')

        }


        function getControlDetails(ed) {
            //return the control type & hint based on the ed

            let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
            let controlType = "string"          //this has to be one of the defined type values

            if (ed.options && ed.options.length > 0) {
                controlHint = "drop-down"
                controlType = "choice"
            }

            if (ed.type) {
                switch (ed.type[0]) {
                    case 'string' :
                        controlType = "string"      //default to single text box
                        if (ed.controlHint == 'text') {
                            controlType = "text"
                        }
                        break
                    case 'boolean' :
                        controlHint = "boolean"
                        controlType = "boolean"
                        break
                    case 'dateTime' :
                        controlHint = "dateTime"
                        controlType = "dateTime"
                        break
                    case 'CodeableConcept' :
                        controlType = "choice"
                        //  if (ed.valueSet) {
                        //todo - need to check for type-ahead
                        if (ed.controlHint ) {
                            controlHint = ed.controlHint
                        } else {
                            controlHint = "drop-down"

                        }


                    //   }
                }
            }


            /*
            if (ed.controlHint && ) {
                controlHint = ed.controlHint
            }
*/

            return {controlType:controlType,controlHint:controlHint}

        }

        //apply the control hint (if any) to the item
        function applyControlHint(item,hint) {
            switch (hint) {
                case 'radio' :
                    item.extension = item.extension || []
                    let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                    ext.valueCodeableConcept = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:'radio-button'}]}
                    item.extension.push(ext)
                    break
            }
        }

        function removeHiddenElements(allElements) {
            let lst = []
            let pathsToHide = []


            allElements.forEach(function (item) {
                let canAdd = true
                let ed = item.ed
                if (ed.hideInQ) {
                    //if this is set to hide, then set canAdd false, and add the
                    //path to the list of 'pathsToHide'
                    pathsToHide.push(ed.path)
                    canAdd = false
                } else {
                    //check that the path of this element is not in the pathsToHide list
                    for (const path of pathsToHide) {
                        //if (node.data.ed.path.startsWith(path)) {
                        if (ed.path.isChildPath(path)) {
                            console.log(`Removing ${ed.path}`)
                            canAdd = false
                            break
                        }
                    }
                }
                if (canAdd) {
                    lst.push(item)
                }
            })
            return lst

        }



        return {
            makeQ: function (allElements, hashAllDG, cb) {
                console.log('invoking make')
                //generate the Q from the list of all elements. hidden (mult = 0..0) have been removed

                let lstElements = removeHiddenElements(allElements)     //where hideInQ is set

                vsSvc.getAllVS(lstElements, function () {
                //getAllVS(lstElements, function () {
                    let Q = generateQ(lstElements,hashAllDG)

                    cb(Q)

                })

            }
        }
    })
