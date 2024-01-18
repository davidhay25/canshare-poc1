//This is the current service to make Q

angular.module("pocApp")

    .service('makeQSvc', function($http,codedOptionsSvc) {

        let config = {}
        let nzHTSPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/"


        //given an ed, return the control type and hine
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
                    case 'dateTime' :
                        controlHint = "dateTime"
                        controlType = "dateTime"
                        break
                    case 'CodeableConcept' :
                        //  if (ed.valueSet) {
                        //todo - need to check for type-ahead
                        controlHint = "drop-down"
                        controlType = "choice"
                    //   }
                }
            }

            if (ed.controlHint) {
                controlHint = ed.controlHint
            }


            return {controlType:controlType,controlHint:controlHint}

        }

        //Add the 'enable when' to the Q
        //updates the item object directly
        //When used by the Composition, we add a prefix which is {compname}.{section name}. (note the trailing dot)
        function addEnableWhen(ed,item,pathPrefix) {
            pathPrefix = pathPrefix || ""
            if (ed && ed.enableWhen && ed.enableWhen.length > 0) {
                //console.log(ed,'has ew')
                item.enableWhen = []
                ed.enableWhen.forEach(function (ew) {

                    let qEW = {operator:ew.operator,answerCoding:ew.value}
                    delete qEW.answerCoding.pt  //the preferred term...
                    qEW.answerCoding.system = qEW.answerCoding.system || "http://example.com/fhir/CodeSystem/example"

                    //need to determine the path to the question. For now, assume that
                    //qEW.question = `${parent.linkId}.${ew.source}` //linkId of source is relative to the parent (DG)
                    qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)

                    item.enableWhen.push(qEW)
                })
            }
           // return item
        }

        //set the control type (and hint extension) for the item
        //updates the item object directly
        //strategy has options for populating choice elements
        //  - expandVS - if true, generate answerOption elements
        //ed has controlType and controlHint
         function setControlType(ed,item,strategy) {
            //if useVS is true, then
             return new Promise((resolve) => {
                 strategy = strategy || {}

                 //config = config || {maxFromValueSet : 500}

                 let vo = getControlDetails(ed) //get the control details from the ed

                 item.type = vo.controlType    //the 'official' type for the item

                 //Add the hint instruction
                 if (vo.controlType !== vo.controlHint) {
                     //console.log(item.text,data.controlType,data.controlHint)
                     //the hint is the extension that gives more options to the renderer
                     item.extension = item.extension || []
                     let ext = {url: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                     ext.valueCodeableConcept = {
                         coding: [{
                             code: vo.controlHint,
                             system: "http://hl7.org/fhir/questionnaire-item-control"
                         }]
                     }
                     item.extension.push(ext)
                 }

                 switch (vo.controlHint) {
                     case 'drop-down' :
                         //will be 'drop-down' if the type is CodeableConcept...
                         //use the options service to get the list of options. could come from the options element of expanded vs
                         let timerLabel = `sct${ed.path}`
                         console.time(timerLabel)
                         codedOptionsSvc.getOptionsForEd(ed).then(

                             function (vo1) {
                                 console.timeEnd(timerLabel)
                                 if (!vo1.options || (vo1.options && vo1.options.length == 0)) {
                                     vo1.options = vo1.options || []
                                     vo1.options.push({
                                         code: 'nocode',
                                         system: 'http://example.com/CodeSystem/unknown',
                                         display: "No codes supplied"
                                     })
                                 }

                                 switch (vo1.status) {
                                     case 'options' :
                                         //the list of options came from an options element in the ED. They must be answerOption

                                         for (const Coding of vo1.options) {
                                             item.answerOption = item.answerOption || []
                                             item.answerOption.push({valueCoding: Coding})
                                         }
                                         break
                                     case 'vs' :
                                         //the list of options came from an expanded valueset
                                         if (strategy.expandVS) {
                                             //if (config && config.maxFromValueSet && vo.options.length <= config.maxFromValueSet) {
                                             //item.answerOption = []
                                             for (const Coding of vo1.options) {
                                                 item.answerOption = item.answerOption || []
                                                 item.answerOption.push({valueCoding: Coding})
                                             }
                                         } else {
                                             let vs = ed.valueSet
                                             if (vs.indexOf('http') == -1) {
                                                 //the vs in the model might not have the full url
                                                 vs = `https://nzhts.digital.health.nz/fhir/ValueSet/${vs}`
                                             }
                                             item.answerValueSet = vs
                                         }
                                         break
                                     case 'not-found' :
                                         //there was a ValueSet, but it wasn't found on the terminology server
                                         item.answerOption = [{
                                             valueCoding: {
                                                 code: 'not-found',
                                                 system: 'http://example.com/CodeSystem/unknown',
                                                 display: `VS ${ed.valueSet} not found`
                                             }
                                         }]
                                         console.log(`The element ${ed.title} had the ValueSet ${ed.valueSet} which was not on the terminology server`)
                                         break
                                     case 'no-options-or-vs':
                                         item.answerOption = [{
                                             valueCoding: {
                                                 code: 'no-options',
                                                 system: 'http://example.com/CodeSystem/unknown',
                                                 display: `Neither options nor ValueSet`
                                             }
                                         }]
                                         console.log(`The element ${ed.title} had neither ValueSet not options defined`)
                                         break

                                 }
                                 //resolve(item)

                             }, function (err) {
                                 console.log(err)
                                 //resolve(item)

                             }
                         )


                         break

                     case 'typeahead' :
                         //resolve(item)
                         break
                 }
                 resolve(item)
             })

        }


        return {



            makeTreeFromQ : function (Q) {
                //pass in a Q and return a tree array representation
                let treeData = []
                let issues = []         //any issues found during
                let lstElements = []    //a flat list of elements
                let hashLinkId = {}     //a hash of linkIds

                function processItem(item,parent) {
                    let node = {id:item.linkId,text:item.text,parent:parent}
                    node.data = item
                    if (hashLinkId[item.linkId]) {
                        issues.push(`linkId: ${item.linkId} is duplicated`)
                    } else {
                        hashLinkId[item.linkId] = true
                    }
                    treeData.push(node)

                    lstElements.push({linkId:item.linkId,item:item})


                    if (item.item) {
                        item.item.forEach(function (child) {
                            processItem(child,item.linkId)
                        })
                    }
                }

                let node = {id:'root',parent:"#",text:"root"}
                treeData.push(node)
                Q.item.forEach(function (item) {
                    processItem(item,'root')
                })


                return {treeData:treeData,issues : issues,lstElements:lstElements}


            },

            makeQfromCompListDEP : function (comp,allElements) {


                let result = {};

                for (const pathWithValue of allElements) {
                    const pathComponents = pathWithValue.ed.path.split('.');
                    const value = pathWithValue.ed;
                    let currentLevel = result;

                    for (const component of pathComponents) {
                        if (!currentLevel[component]) {
                            currentLevel[component] = {};
                        }
                        currentLevel = currentLevel[component];
                    }

                    currentLevel._value = value;
                }
                console.log(result)

                return

                allElements.forEach(function (item) {
                    console.log(item.ed.path, item.ed.type)
                    let ar = item.ed.split('.')
                    switch (ar.length) {
                        case 1 :
                            compName = ar[0]
                            break
                        case 2 :
                            //the start of a new section
                            isNewSection = trur
                            sectionName = ar[1]
                            break
                        case 3 :
                            isNewDT = true
                            dtName = ar[2]
                            break
                        default :
                            sectionName = ar[1]
                            dtName = ar[2]


                    }


                })

            },

            makeQfromSectionsDEP : function (hashAllElements, comp,allTypes,hashAllDG,modelsSvc) {

                //todo - not allowing composition level constraints
                //have to work from hashAllElements - created after all the constraints are applied
                //can infer the section name from the second path segment (first is type name)

                // >>> don't need DG rendering of Q - do it directly against the hash

                //pass 1 - parse the hash and assemble the list of sections and maybe datatypes from path segment 3 (note z elements)

                //pass 2 - iterate through the sections & DGs and assemble the Q



                //create a funcrion to return the controlType/hint stuff - Qbuilder does this I think

                //there will be 'hideInQ' element to look at - will need to hide all that start with path - like DG




                const that = this
                let mainQ = {resourceType:"Questionnaire",item:[]}

                //iterate over composition sections
                comp.sections.forEach(function (sect) {
                    //in each section iterate over the DGs (z items later)
                    let qSectionItems = []      //the items in this section
                    sect.items.forEach(function (sectionItem) { //todo check for z element
                        //the section item has section level details about the DG in the section...


                        let dgName = sectionItem.type[0]

                        let dg = hashAllDG[dgName]


                        if (dg) {
                            // hydrate the DG into a list of elements
                            let vo = modelsSvc.getFullListOfElements(dg,allTypes,hashAllDG)

                            let fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)

                            let vo1 = that.makeQFromDG(fullElementList,hashAllDG)
                            //  vo1.section is a 'top level' item. We take the child items
                            //to add to the Q section...
                            console.log(vo1.section)

                            vo1.section.item.forEach(function (item) {
                                console.log(item)
                                qSectionItems.push(item)
                            })

                        } else {
                            alert(`DG name ${dgName} not found`)
                        }

                    })
                    let sectionItem = {text:sect.title,linkId:`section-${sect.name}`,item:[]}
                    qSectionItems.forEach(function (item) {
                        sectionItem.item.push(item)
                    })
                    mainQ.item.push(sectionItem)

                })


                console.log(mainQ)

                return mainQ



                //assemble the Q from a list of sections (item group with children)




                Q.item = lstSections
                return Q

            },

            //this is used by the DG form creation
            makeQFromDG : function (lstElements,hashAllDG) {
                //generate a Q based on the list of elements that represents a DG
                //todo create a copy of the lstElements, then delete mult=0.0 and hideInQ (element & DG)
                //console.log(lstElements)

                //let hashEW = {}

                let dgName = lstElements[0].ed.path

                //construct a list of paths to hide
                let basePathsToHide = []    //a list of all paths where hideInQ is set. Any elements starting with this path are also set
                lstElements.forEach(function (thing) {
                    //console.log(thing.ed)
                    if (thing.ed.hideInQ || (thing.ed.mult == '0..0')) {
                        basePathsToHide.push(thing.ed.path)  //the full path
                    }
                })

                //now create the list of ED to include in the Q
                let lstQElements = []
                lstElements.forEach(function (thing,ctr) {
                    if (ctr > 0) {
                        let ed = thing.ed
                        let okToAdd = true
                        if (ed.mult == '0..0') {okToAdd = false}
                        if (okToAdd) {
                            for (const pth of basePathsToHide) {
                                if (ed.path.startsWith(pth)) {
                                    okToAdd = false
                                    break
                                }
                            }
                        }

                        if (okToAdd) {
                            lstQElements.push(ed)
                        }
                    }

                })

                //now can build the Q
                let Q = {resourceType:"Questionnaire",item:[]}

                //there's a single section (item) for the DG (This is not the same as the composition section)
                let section = {text:lstElements[0].ed.title,linkId:`${dgName}-section`,item:[]}
                section.definition = lstElements[0].ed.path

                Q.item.push(section)

                //let currentPathRoot
                let topGroup = makeGroup({title:'',path:dgName})
                let group = topGroup

                let processingDGPath = null     //When processing a group, what the path of that group is
                lstQElements.forEach(function (ed) {

                    let path = ed.path
                    //console.log(path)
                    let type = ed.type[0]
                    if (hashAllDG[type]) {
                        //console.log('new group',ed)
                        group = makeGroup(ed)

                        addEnableWhen(ed,group)  //If there are any contitionals

                        processingDGPath = path
                    } else {
                        //need to see if we've finished procesing a path
                        if (processingDGPath) {
                            //yes, we have started processing a DG group. Are we still on that path?
                            if ( !path.startsWith(processingDGPath)) {
                                //group = topGroup  - this puts everyting at the top
                                //We've moved on past the DG

                                //todo - may not want to use the DG being processed for the group ?What should the text be
                                let groupEd = {title:"Group",path:`${ed.title}-group`}
                                group = makeGroup(groupEd)       //create a new group for the elements following the referenced DG

                                //todo - this doesn't appear to do anything...

                                processingDGPath = null
                            }

                        }
                        let item = {text:ed.title,linkId:ed.path,type:'string'}
                        item.definition = ed.path

                        addEnableWhen(ed,item)  //If there are any contitionals
                        setControlType(ed,item)  //set the control type to use

//console.log(ed,item.type)
                        group.item.push(item)
                    }

                })
                //console.log(Q)


                //the section is just the first item in the Q - maybe remove
                return {Q:Q,section:section}

                function makeGroup(ed) {
                    let group = {text:ed.title,linkId: ed.path,type:'group',item:[]}
                    group.definition = ed.path
                    let ext = {'url':'http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count'}
                    ext.valueInteger = "2"
                    group.extension = [ext]
                    //group.linkId = ed.path
                    section.item.push(group)
                    return group
                }

            },

            getAllEW : function (Q) {
                //Create a hash of all the 'EnableWhens' in a Q
                let hashAllEW = {}

                function getEW(item) {
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            hashAllEW[ew.question] = hashAllEW[ew.question] || []
                            hashAllEW[ew.question].push(ew)
                        })
                    }

                    if (item.item) {
                        item.item.forEach(function (child) {
                            getEW(child)
                        })
                    }

                }

                if (Q.item) {
                    Q.item.forEach(function (item) {
                        getEW(item)
                    })
                }
                return hashAllEW

            },



            getQFromTreeDEP :  function(treeObject,comp,strategy) {
                return new Promise((resolve) => {

                    async function test() {


                    }

                    /*
                    setTimeout(() => {
                        resolve('resolved');
                    }, 2000);
                    */
                });

            },

            //this is used by the composition to build the Q
            //this has the structure needed for tabs
            makeQFromTreeTab :  async function (treeObject,comp,strategy) {
                //this is a version I'm using during connectathon to implemnet the tabs extensions
                //the Q that are created won't be able to be used in my renderer...

                return new Promise(async (resolve) => {
                    //Given a tree array representing a composition (from jstree), construct a Q resource
                    let that = this

                    let pathsToHide = []    //a list of paths that should not appear in the Q. It is assembled dynamically

                    //get the EnableWhens defined on the Composition for the sections
                    let hashSectionEW = {}      //any enableWhen for this section
                    if (comp && comp.enableWhen) {
                        comp.enableWhen.forEach(function (ew) {
                            hashSectionEW[ew.targetSection] = hashSectionEW[ew.targetSection] || []
                            hashSectionEW[ew.targetSection].push(ew)
                        })
                    }


                    console.log(treeObject)
                    let qName = treeObject[0].id
                    let id = "cs-" + qName
                    Q = {resourceType: "Questionnaire", id: id, status: "active", name: qName, item: []}
                    Q.url = `http://canshare.co.nz/fhir/Questionnaire/${id}`
                    let extTS = {url:"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-preferredTerminologyServer"}
                    extTS.valueUrl = "https://nzhts.digital.health.nz/fhir/"
                    Q.extension = [extTS]


                    //create a top level item to represent a tab container
                    //all of the sections are added to that item
                    let containerSection = {text: "tabContainer", linkId: qName, extension:[], type:'group', item: []}

                    let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                    ext.valueCodeableConcept = {coding:[{code:"tab-container",system:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}]}
                    containerSection.extension.push(ext)


                    Q.item.push(containerSection)



                    // section is the current section. Used when adding a new group

                    let section // = {text: "section", linkId: qName, item: []}

                    let obj = {}

                    //parent is what the item will be added to (a section of a group
                    //node is the node from the tree - multi level
                    // section is the current section. Used when adding a new group
                    async function addChild(parent, node, section) {

                        console.log(node.data.level)
                        let canAdd = true

                      //  if (node.data.level == 'section') {
                       //     canAdd = false
                       // }

                        //if the id / path length is 2, then this is representing a section from the tree
                        //the node id structure is {comp name}.{section name}.{dg name}...
                        //todo - need to think about z elements


                        let ar = node.id.split('.')
                        if (ar.length == 2) {
                            //this is a section definition. Create a new Q section and add to the Q root

                            let sectionName = ar[1]     //the second segment
                            section = {text: node.text, linkId: node.id, type: 'group', extension:[],item: []}

                            //Add the tab container extension as well
                            let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                            ext.valueCodeableConcept = {coding:[{code:"page",system:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}]}
                            section.extension.push(ext)

                            //are there any conditionals (enableWhen) to add
                            if (hashSectionEW[sectionName]) {
                                section.enableWhen = section.enableWhen || []
                                hashSectionEW[sectionName].forEach(function (vo) {
                                    // let vo = hashSectionEW[sectionName]
                                    let ew = {}
                                    ew.question = `${ar[0]}.${vo.sourceSection}.${vo.ed}`
                                    ew.operator = "="
                                    ew.answerCoding = vo.value
                                    section.enableWhen.push(ew)
                                })

                                console.log(section.enableWhen)

                            }

                            //here is where the section is added to the Q. All other items are added to the section
                            if (section) {

                                containerSection.item.push(section)
                            }


                            //Q.item.push(section)

                            canAdd = false          //because it's already been added
                        } else if (ar.length == 3) {
                            //this is the DG name attached to the section
                            //we've got the children enumerated - we want to enumerate them but not add this one
                            canAdd = false
                        }

                        //so, we've determined that this element can be added. is the 'hideInQ' set
                        //for it (or for any of the ancestors.
                        if (canAdd) {
                            if (node.data.ed.hideInQ) {
                                //if this is set to hide, then set canAdd false, and add the
                                //path to the list of 'pathsToHide'
                                pathsToHide.push(node.data.ed.path)
                                canAdd = false
                            } else {
                                //check that the path of this element is not in the pathsToHide list
                                for (const path of pathsToHide) {
                                    if (node.data.ed.path.startsWith(path)) {
                                        canAdd = false
                                        break
                                    }
                                }
                            }

                        }


                        if (canAdd) {
                            let item = {text: node.text, linkId: node.id, type: 'string'}

                            if (node.data.ed.mult == '0..*' || node.data.ed.mult == '1..*') {
                                item.repeats = true
                            }

                            //the definition is the link back to the model - the DG. We drop the first 2 segments
                            //in the path as they are the composition & section name

                            if (node.data.ed.path) {
                                let ar = node.data.ed.path.split('.')
                                ar.splice(0, 2)
                                //todo  - will become a uri - when the DGs are published as models
                                item.definition = ar.join('.')
                            }

                            //todo - get correct type. This is just a placeholder
                            if (node.children && node.children.length > 0) {
                                item.type = 'group'
                            }


                            //the path prefix is the path to the DG in the composition - {compname}.{section name}.
                            //this is the first 2 segments in the node id (which is the full path)
                            let ar = node.id.split('.')

                            let pathPrefix = `${ar[0]}.${ar[1]}.${ar[2]}.`
                            addEnableWhen(node.data.ed, item, pathPrefix)  //If there are any conditionals

                            //set the control type to use. Will add the VS or answerOptions to the item
                            let response = await setControlType(node.data.ed, item, strategy)

                            //applying formatting to a label
                           // let ext1 = {url:"http://hl7.org/fhir/StructureDefinition/rendering-xhtml"}
                           // ext1.valueString = `<div style="color: green">${response.text}</div>`
                            //response['_text'] = {extension: [ext1]}

                            if (node.data.ed.mult == '0..*' || node.data.ed.mult == '1..*') {
                                let ext2 = {url:"http://hl7.org/fhir/StructureDefinition/rendering-xhtml"}
                                ext2.valueString = `<div style="font-weight:bold">${response.text}</div>`
                                response['_text'] = {extension: [ext2]}
                            }





                            //add a tooltip with the description
                            response.item = []
                            if (node.data.ed.description) {
                                let tt = {text: node.data.ed.description, linkId: `${node.data.ed.path}-tt`, type: 'display',extension:[]}
                                let ext = {url: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                                //ext.valueCodeableConcept = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:"flyover"}]}
                                ext.valueCodeableConcept = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:"help"}]}
                                tt.extension.push(ext)

                                //response.extension = response.extension || []
                                response.item.push(tt)
                            }


                            console.log(parent.linkId)
                            console.log(response.linkId)
                            console.log("")
                            parent.item = parent.item || []
                            parent.item.push(response)
                        }



                        if (node.children && node.children.length > 0) {

                            //create a new group item and add to the current section
                            let group = {
                                text: `${node.text}`,
                                type: 'group',
                                linkId: `group-${node.id}`,
                                item: []
                            }



                            console.log(section.linkId)
                            console.log(group.linkId)
                            console.log("")

                            section.item = section.item || []
                            //section.item.push(group)


                            //For some reason the routine adds an additional element after adding the group.
                            //This prevents that. Took ages to figure out! Change at your peril...
                            if (group.linkId !== `group-${section.linkId}`) {
                                section.item.push(group)
                            } else {
                                console.log(`not adding ${group.linkId}`)
                            }



                            //pass the group in as the parent
                            node.children.forEach(function (childNode) {
                                //addChild(item,childNode)
                                addChild(group, childNode, section)
                            })



                        }
                    }

                    //there's only a single child which returns the top level
                    treeObject[0].children.forEach(function (node) {
                        addChild(section, node, section)
                    })


                    //the DG name is added as a child to the section item. Not sure how to prevent that - for now, remove them
                    Q.item.forEach(function (item) {

                        console.log(item.item)
                        if (item.item) {
                            //just remove the first child - it will have the empty item
                        //temp    item.item.splice(0, 1)
                        }

                    })





                    resolve(Q) //that.makeQ(treeObject)
                })


            },

            //this is used by the composition to build the Q
            //this is the version that my renderer can support
            makeQFromTree :  async function (treeObject,comp,strategy) {
                //this is the original Q creator before I started hacking around with it
                return new Promise(async (resolve) => {
                    //Given a tree array representing a composition (from jstree), construct a Q resource
                    let that = this

                    let pathsToHide = []    //a list of paths that should not appear in the Q. It is assembled dynamically

                    //get the EnableWhens defined on the Composition for the sections
                    let hashSectionEW = {}      //any enableWhen for this section
                    if (comp && comp.enableWhen) {
                        comp.enableWhen.forEach(function (ew) {
                            hashSectionEW[ew.targetSection] = hashSectionEW[ew.targetSection] || []
                            hashSectionEW[ew.targetSection].push(ew)
                        })
                    }


                    console.log(treeObject)
                    let qName = treeObject[0].id
                    let id = "cs-" + qName
                    Q = {resourceType: "Questionnaire", id: id, status: "draft", name: qName, item: []}

                    let section = {text: "section", linkId: qName, item: []}

                    let obj = {}

                    //parent is what the item will be added to (a section of a group
                    //node is the node from the tree - multi level
                    // section is the current section. Used when adding a new group
                    async function addChild(parent, node, section) {

                        let canAdd = true
                        //if the id / path length is 2, then this is representing a section from the tree
                        //the node id structure is {comp name}.{section name}.{dg name}...
                        //todo - need to think about z elements


                        let ar = node.id.split('.')
                        if (ar.length == 2) {
                            //this is a section definition. Create a new Q section and add to the Q root
                            //Add the tab container extension as well
                            let sectionName = ar[1]     //the second segment
                            section = {text: node.text, linkId: node.id, type: 'group', item: []}



                            //are there any conditionals (enableWhen) to add
                            if (hashSectionEW[sectionName]) {
                                section.enableWhen = section.enableWhen || []
                                hashSectionEW[sectionName].forEach(function (vo) {
                                    // let vo = hashSectionEW[sectionName]
                                    let ew = {}
                                    ew.question = `${ar[0]}.${vo.sourceSection}.${vo.ed}`
                                    ew.operator = "="
                                    ew.answerCoding = vo.value
                                    section.enableWhen.push(ew)
                                })

                                console.log(section.enableWhen)

                            }

                            Q.item.push(section)
                            canAdd = false          //because it's already been added
                        } else if (ar.length == 3) {
                            //this is the DG name attached to the section
                            //we've got the children enumerated - we want to enumerate them but not add this one
                            canAdd = false
                        }

                        //so, we've determined that this element can be added. is the 'hideInQ' set
                        //for it (or for any of the ancestors.
                        if (canAdd) {
                            if (node.data.ed.hideInQ) {
                                //if this is set to hide, then set canAdd false, and add the
                                //path to the list of 'pathsToHide'
                                pathsToHide.push(node.data.ed.path)
                                canAdd = false
                            } else {
                                //check that the path of this element is not in the pathsToHide list
                                for (const path of pathsToHide) {
                                    if (node.data.ed.path.startsWith(path)) {
                                        canAdd = false
                                        break
                                    }
                                }
                            }

                        }


                        if (canAdd) {
                            let item = {text: node.text, linkId: node.id, type: 'string'}

                            //the definition is the link back to the model - the DG. We drop the first 2 segments
                            //in the path as they are the composition & section name

                            if (node.data.ed.path) {
                                let ar = node.data.ed.path.split('.')
                                ar.splice(0, 2)
                                //todo  - will become a uri - when the DGs are published as models
                                item.definition = ar.join('.')
                            }

                            //todo - get correct type. This is just a placeholder
                            if (node.children && node.children.length > 0) {
                                item.type = 'group'
                            }


                            //the path prefix is the path to the DG in the composition - {compname}.{section name}.
                            //this is the first 2 segments in the node id (which is the full path)
                            let ar = node.id.split('.')

                            let pathPrefix = `${ar[0]}.${ar[1]}.${ar[2]}.`
                            addEnableWhen(node.data.ed, item, pathPrefix)  //If there are any conditionals

                            //set the control type to use. Will add the VS or answerOptions to the item
                            let timerlabel = node.id
                            console.time(timerlabel)
                            let response = await setControlType(node.data.ed, item, strategy)

                            console.log(response)
                            console.timeEnd(timerlabel)
                            parent.item = parent.item || []
                            //parent.item.push(item)
                            parent.item.push(response)
                        }


                        if (node.children && node.children.length > 0) {

                            //create a new group item and add to the current section
                            let group = {
                                text: `${node.text}`,
                                type: 'group',
                                linkId: `group-${node.id}`,
                                item: [],
                                extension: []
                            }
                            //let group = {text:`group-${node.text}`,type:'group',linkId:`group-${node.id}` ,item:[],extension:[]}
                            let ext = {url: "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"}
                            ext.valueInteger = 2
                            group.extension.push(ext)

                            section.item = section.item || []


                            //For some reason the routine adds an additional element after adding the group.
                            //This prevents that. Took ages to figure out! Change at your peril...
                            if (group.linkId !== `group-${section.linkId}`) {
                                section.item.push(group)
                            }


                            //section.item.push(group)



                            //pass the group in as the parent
                            node.children.forEach(function (childNode) {
                                //addChild(item,childNode)
                                addChild(group, childNode, section)
                            })

                        }
                    }

                    //there's only a single child which returns the top level
                    treeObject[0].children.forEach(function (node) {
                        addChild(section, node, section)
                    })


                    //the DG name is added as a child to the section item. Not sure how to prevent that - for now, remove them
                    Q.item.forEach(function (item) {

                        console.log(item.item)
                        if (item.item) {
                            //just remove the first child - it will have the empty item
                            item.item.splice(0, 1)
                        }

                    })


                    resolve(Q) //that.makeQ(treeObject)
                })


            },


            makeQDEP: function(treeObject) {
                //construct a Questionnaire resource - called by the makeQ controller - will be deprecated probably
                //treeObject comes from the jstree control - it's actually an array
                let qName = treeObject[0].id
                Q = {resourceType:"Questionnaire",status:"draft",name:qName,item:[]}

                function addChild(parent,node) {
                    let data = node.data

                    let item = {text:node.text}     //this is the Q item element
                    item.linkId = node.id

                    if (data.ed && data.ed.enableWhen) {
                        console.log(data.ed,'has ew')
                        item.enableWhen = []
                        data.ed.enableWhen.forEach(function (ew) {
                            let qEW = {operator:ew.operator,answerCoding:ew.value}
                            qEW.question = `${parent.linkId}.${ew.source}` //linkId of source is relative to the parent (DG)
                            item.enableWhen.push(qEW)
                        })

                    }

                    //if the node is a section or group, then the type must also be 'group. Only 'element' types can be different

                    if (node.data.level == 'element') {
                        item.type = data.controlType    //the 'official' type for the item

                        //Add the hint instruction
                        if (data.controlType !== data.controlHint)  {
                            //console.log(item.text,data.controlType,data.controlHint)
                            //the hint is the extension that gives more options to the renderer
                            item.extension = item.extension || []
                            let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                            ext.valueCodeableConcept = {coding:[{code:data.controlHint,system:"http://hl7.org/fhir/questionnaire-item-control"}]}
                            item.extension.push(ext)
                        }


                        switch (data.controlHint) {
                            case 'drop-down' :
                                //populate the answerOption. For now, get it from 'options, but later:
                                item.answerOption = []


                                //do the options first...
                                if (data.ed.options) {
                                    for (const option of data.ed.options) {
                                        item.answerOption.push({valueCoding:{code:option.code,display:option.display}})
                                    }
                                } else if (data.ed.valueSet) {
                                    //if there's a valueSet, then tru to expand it

                                    //let url = `https://nzhts.digital.health.nz/fhir/ValueSet/${targetVSName}`

                                    //don't expand it - just add the VS to the Q (but keep the code)
                                    let vs = data.ed.valueSet
                                    if (vs.indexOf('http:') == -1) {
                                        vs = `https://nzhts.digital.health.nz/fhir/ValueSet/${vs}`
                                    }
                                    item.answerValueSet = vs


                                    if (false) {
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
                                                console.log(`There was no ValueSet with the url:${data.ed.valueSet}`)
                                            }
                                        )
                                    }





                                }







                                break
                        }



                    } else {
                        item.type = 'group'
                        //console.log(data.cols)
                        //are there multi columns set

                        //default to 2 columns
                        data.cols = data.cols || 2

                        if (data.cols) {
                            item.extension = item.extension || []
                            let ext = {url:"http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"}
                            ext.valueInteger = data.cols
                            item.extension.push(ext)
                        }
                    }

                    //item.linkId = node.id
                    parent.item = parent.item || []
                    parent.item.push(item)

                    //If 'other allowed' is set, then add a text box
                    if (data.ed && data.ed.otherAllowed) {
                        let itemOther = {text:`${node.text} (Other)`}     //this is the Q item element
                        itemOther.linkId = `${node.id}.other`
                        itemOther.type = 'string'
                        parent.item.push(itemOther)
                    }


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
                        case 'string' :
                            controlType = "string"      //default to single text box
                            if (ed.controlHint == 'text') {
                                controlType = "text"
                            }
                            break
                        case 'dateTime' :
                            controlHint = "dateTime"
                            controlType = "dateTime"
                            break
                        case 'CodeableConcept' :
                          //  if (ed.valueSet) {
                                controlHint = "drop-down"
                                controlType = "choice"
                         //   }
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
                        //console.log(ed1.path)

                        let voControl = that.getControlDetails(ed1)

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