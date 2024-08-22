//This is the current service to make Q

angular.module("pocApp")

    .service('makeQSvc', function($http,codedOptionsSvc,QutilitiesSvc,snapshotSvc,$filter,vsSvc,orderingSvc) {

        let unknownCodeSystem = "http://example.com/fhir/CodeSystem/example"
        let extLaunchContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"
        extPrePopUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        extItemControlUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extCollapsibleUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible"
        //let extGtableUrl = ""
       // let extSourceQuery = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries"
        systemItemControl = "http://hl7.org/fhir/questionnaire-item-control"

        function addPrePopExtensions(Q) {
            //add the SDC extensions required for pre-pop
            Q.extension = Q.extension || []
            addExtension("LaunchPatient","Patient","The patient that is to be used to pre-populate the form")
            addExtension("LaunchPractitioner","Practitioner","The practitioner that is to be used to pre-populate the form")

            //let ext = {url:extSourceQuery,valueReference:{reference:"#PrePopQuery"}}

            function addExtension(name,type,description) {
                let ext = {url:extLaunchContextUrl,extension:[]}

                ext.extension.push({url:'name',valueId:name})
                ext.extension.push({url:'type',valueCode:type})
                ext.extension.push({url:'description',valueString:description})
                Q.extension.push(ext)
            }

        }


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
                    case 'boolean' :
                        controlHint = "boolean"
                        controlType = "boolean"
                        break
                    case 'Quantity' :
                        controlHint = "quantity"
                        controlType = "quantity"
                        if (ed.units) {
                            //p
                            console.log(ed.units)
                        }
                        break
                    case 'dateTime' :
                        controlHint = "dateTime"
                        controlType = "dateTime"
                        break
                    case 'date' :
                        controlHint = "date"
                        controlType = "date"
                        break
                    case 'CodeableConcept' :
                        //  controltype is always choice. May want typeahead later

                        controlHint = "drop-down"
                        controlType = "choice"

                        if (ed.controlHint ) {
                            controlHint = ed.controlHint
                        } else {
                           // controlHint = "drop-down"
                           // controlType = "choice"
                        }
                        break
                    case 'Group' :
                        controlHint = "display"
                        controlType = "display"


                }

                //determine if this is a referece to another DG
                //make a display if so as we're not nesting in the Q in the same way as in th emodel
                    let type = ed.type[0]
                    if (snapshotSvc.getDG(ed.type[0])) {
                        controlHint = "display"
                        controlType = "display"
                    }

            }


            return {controlType:controlType,controlHint:controlHint}

        }


        //If the ed has the 'otherType set, then an additional item mutst be created - possibl with an enableWhen
        //The function returns the items to insert (including the source) - possibly not needed, but I'll leave it like this for now
        function addOtherItemDEP(ed,sourceItem) {
            let arItems = []        //the function returns the list of items
            switch (ed.otherType) {
                case "always" :
                    //just add the extra item
                    let item = {text:`Other ${ed.title}`,linkId:`${ed.path}-other`,type:'string'}
                    arItems.push(sourceItem)
                    arItems.push(item)
                    break
                case "sometimes" :
                    //add the additional item, plus a conditional on the sourceItem
                    let item1 = {text:`Other ${ed.title}`,linkId:`${ed.path}-other`,type:'string'}

                    let qEW = {}
                    qEW.question = sourceItem.linkId
                    qEW.operator = '='
                    qEW.answerCoding = {code:"74964007",system:'http://snomed.info/sct'}
                    item1.enableWhen = sourceItem.enableWhen || []
                    item1.enableWhen.push(qEW)

                    arItems.push(sourceItem)
                    arItems.push(item1)
                    break
                case "textonly" :
                    //the original item (a CC) is NOT included. In this case only the text box is added
                    //even though the source is not included in the Q, the linkId of the inserted item has '-other' appended
                    //though the text is copied form the source
                    let item2 = {text:`${ed.title}`,linkId:`${ed.path}-other`,type:'string'}
                    arItems.push(item2)

                    break


            }
            return arItems
        }

        //Add the 'enable when' to the Q
        //updates the item object directly
        //When used by the Composition, we add a prefix which is {compname}.{section name}. (note the trailing dot)
        function addEnableWhen(ed,item,inPathPrefix) {

            //return

            let allEW = []  //track all EW created as the Q is created. Used to check the links once the Q is cinisher
            let pathPrefix = ""
            if (inPathPrefix) {
                pathPrefix = inPathPrefix + "."
            }

            //need to adjust for embedded DGs
            //let sourcePath =



            if (ed && ed.enableWhen && ed.enableWhen.length > 0) {
                //console.log(ed,'has ew')
                 //item.enableWhen = []

                ed.enableWhen.forEach(function (ew) {
                    let qEW = {}

                    let source = QutilitiesSvc.updateEWSourcePath(ed.path,ew.source)

                    //let source = ew.source
/*
                    //adjustment for embedded DG path
                    let arControllerPath = ew.source.split('.')  //the control element - question / source
                    let arThisPath = ed.path.split('.')      // this ed - the one that is dependant

                    //console.log(arThisPath[0],arControllerPath[0])
                    if (arThisPath[0] !== arControllerPath[0]) {
                        //This is an ew in a 'contained' DG
                        let diff = Math.abs(arThisPath.length - arControllerPath.length)
                        if (arThisPath.length > arControllerPath.length) {

                            let ar = arThisPath.slice(0,diff)
                            arControllerPath = ar.concat(arControllerPath)
                            source = arControllerPath.join('.')
                        } else {
                            console.log("EnableWhen paths don't seem right...")
                            //not sure if this is ever true - or what to do if it is!
                            //probably remove the extra elements from source???
                            //let ar = arControllerPath.slice(diff)
                           // arThisPath = ar.concat(arThisPath)
                            //source = arThisPath.join('.')
                        }

                    }
*/

                    qEW.question = `${pathPrefix}${source}` //linkId of source is relative to the parent (DG)

                    //qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
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

                            qEW.answerCoding.system = qEW.answerCoding.system || unknownCodeSystem
                            //qEW.answerCoding.system = qEW.answerCoding.system || "http://example.com/fhir/CodeSystem/example"
                            canAdd = true
                        }
                    }

                    //need to determine the path to the question. For now, assume that
                    //qEW.question = `${parent.linkId}.${ew.source}` //linkId of source is relative to the parent (DG)
                   // qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                    if (canAdd) {
                        item.enableWhen = item.enableWhen || []
                        item.enableWhen.push(qEW)

                        //for the validation we need the target link as well... So this would be an invalid EW on the Q - don't add it!
                        let copyEW = angular.copy(qEW)
                        copyEW.target = item.linkId

                        allEW.push(copyEW)


                        if (item.enableWhen.length == 2) {
                            //if there are 2 EW then set the EW behaviour. More than 2 and it will already be set...
                            item.enableBehavior = 'any'    //todo - may need to specify this
                        }
                    }

                })
            }
            return allEW
        }

        //set the control type (and hint extension) for the item
        //updates the item object directly
        //strategy has options for populating choice elements
        //  - expandVS - if true, generate answerOption elements
        //ed has controlType and controlHint
         function setControlType(ed,item,strategy) {
                 strategy = strategy || {}

                 //config = config || {maxFromValueSet : 500}

             //sets the Q control type from the ed.type
                 let vo = getControlDetails(ed) //get the control details from the ed

                 item.type = vo.controlType    //the 'official' type for the item (from the spec)

                 //Add the hint instruction
                 if (vo.controlType !== vo.controlHint) {
                     //console.log(item.text,data.controlType,data.controlHint)
                     //the hint is the extension that gives more options to the renderer
                     item.extension = item.extension || []
                     let ext = {url: extItemControlUrl}
                     ext.valueCodeableConcept = {
                         coding: [{
                             code: vo.controlHint,
                             system: "http://hl7.org/fhir/questionnaire-item-control"
                         }]
                     }
                     item.extension.push(ext)
                 }

                 //we need to do this before the async function codedOptionsSvc.getOptionsForEd() otherwise the form is rendered
                //before it is returned and won't appear.
                 if (ed.valueSet) {
                     let vs = ed.valueSet
                     if (vs.indexOf('http:') == -1) {
                         vs = `https://nzhts.digital.health.nz/fhir/ValueSet/${vs}`
                     }

                     //todo seems to be an issue where despite the VS, the answeroptions are being added...
                     //todo - need to think through the strategy for answeOption population
                     // todo temp - just while debugging
                     item.answerValueSet = vs
                     //delete item.answerOption   //if there's a valueset, then no options - mar 21
                 }

                 switch (vo.controlHint) {
                     case 'drop-down' :
                         //will be 'drop-down' if the type is CodeableConcept...
                         //use the options service to get the list of options. could come from the options element of expanded vs
                         //let timerLabel = `sct${ed.path}`
                        // console.time(timerLabel)
                         codedOptionsSvc.getOptionsForEd(ed).then(

                             function (vo1) {
                                 //console.log(vo1)
                                 //console.timeEnd(timerLabel)
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
                                             //delete item.answerValueSet //mar 21
                                         } else {
                                             let vs = ed.valueSet
                                             if (vs.indexOf('http') == -1) {
                                                 //the vs in the model might not have the full url
                                                 vs = `https://nzhts.digital.health.nz/fhir/ValueSet/${vs}`
                                             }
                                             //item.answerValueSet = vs
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

                                         if (item.type == 'choice') {
                                             item.answerOption = [{
                                                 valueCoding: {
                                                     code: 'no-options',
                                                     system: 'http://example.com/CodeSystem/unknown',
                                                     display: `Neither options nor ValueSet`
                                                 }
                                             }]

                                         }

                                        // console.log(`The element ${ed.title} had neither ValueSet not options defined`)
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


        }







        return {


            makeHierarchicalQFromComp : function (comp,hashAllDG) {
                //construct a Q from the composition
                //strategy is to gather the DG from the comp sections, create DG Qs then assemble them into the comp Q
                //assumption is that the composition itself doesn't change the DG contents - it is just a selector of DGs

                let that = this
                let errorLog = []
                let allEW = []      //all EnableWhens - for validation

                let Q = {resourceType:'Questionnaire'}
                Q.title = comp.title
                Q.status = 'active'
                Q.id = `canshare-${comp.name}`
                Q.url = `http://canshare.co.nz/questionnaireUrl/${comp.name}`
                addPrePopExtensions(Q)
                Q.item = []

                let containerSection = {text: comp.title, linkId: `tab-${comp.name}`, extension: [], type: 'group', item: []}
                let ext = {url: extItemControlUrl}
                ext.valueCodeableConcept = {
                    coding: [{
                        code: "tab-container",
                        system: "http://hl7.org/fhir/questionnaire-item-control"
                    }]
                }

                //http://hl7.org/fhir/ValueSet/questionnaire-item-control
                //
                containerSection.extension.push(ext)

                Q.item.push(containerSection)


                let hashEd = {}         //has of ED by path (=linkId)
                let hashVS = {}         //all valueSets

                for (const section of comp.sections) {
                    if (section.items && section.items.length > 0) {
                        let sectionItem = {linkId:`sect-${section.name}`,text:section.title,type:'group',item:[]}
                        containerSection.item.push(sectionItem)

                        //make up an ed for the section for the display in the UI. It's not a real ed...
                        let sectionEd = {linkId:sectionItem.linkId,path:sectionItem.linkId}
                        hashEd[sectionItem.linkId] = sectionEd

                        for (const contentDG of section.items) {     //a section can have multiple DGs within it.
                            let dgType = contentDG.type[0]        //the dg type. Generally a 'section' dg
                            let dgElementList = snapshotSvc.getFullListOfElements(dgType)

                            //adjust according to 'insertAfter' values
                            let dg = hashAllDG[dgType]
                            orderingSvc.sortFullListByInsertAfter(dgElementList,dg,hashAllDG)

                            //path prefix is used to adjust enablewhen targets
                            let pathPrefix = sectionItem.linkId


                            let config = {expandVS:true,enableWhen:true,pathPrefix : pathPrefix,calledFromComp:true}
                            //todo - enablewhen not working for composition yet
                            let vo = that.makeHierarchicalQFromDG(dgElementList,config)


                            allEW.push(...vo.allEW)

                            let dgQ = vo.Q
                            let hashByPath = vo.hashEd          //EDs from the child

                            //the list of all EDs
                            Object.keys(vo.hashEd).forEach(function (linkId) {
                                hashEd[linkId] = vo.hashEd[linkId]
                            })

                            //all ValueSets
                            Object.keys(vo.hashVS).forEach(function (url) {
                                hashVS[url] =  hashVS[url] || []
                                hashVS[url].push(...vo.hashVS[url])
                            })

                            //any errors
                            if (vo.errorLog.length > 0) {
                                errorLog.push(...vo.errorLog)
                            }

                            //the section is populated by DGs - but there area a couple of ways that has been done.
                            //sectionPatientDetails is a DG thhat has the Patient DG as a child
                            //bresteReporthistolymphnodes has the elements directly
                            //to be discussed next week

                            //add the child elements to the Q
                            for (const child of dgQ.item[0].item){
                                sectionItem.item.push(child)
                            }


                        }
                    }

                }

                console.log(allEW)

                //validate the enablewhens
                for (const ew of allEW) {
                    if (! hashEd[ew.question]) {

                        errorLog.push({msg:`EnableWhen on ${ew.target} refers to a missing element: ${ew.question}`})
                    }
                }

                return {Q:Q,hashEd:hashEd,hashVS:hashVS,errorLog:errorLog,allEW:allEW}


            },


            makeHierarchicalQFromDG : function  (lstElements,config) {
                //Used in the new Q renderer
                //config.enableWhen will cause the enableWhens to be set
                //config.pathPrefix is used for enable when targets. Only used from composition. It may be null
                let pathPrefix = ""
                if (config.pathPrefix) {
                    pathPrefix = config.pathPrefix + "."
                }

                //if config.expandVS is true, then the contents of the VS will be expanded as options into the item. May need to limit the length...
                let errorLog = []
                let firstElement = lstElements[0]
                let allEW = []      //all EnableWhen. Used for validation



                //create list of paths to hide
                //construct a list of paths to hide
                let basePathsToHide = []    //a list of all paths where hideInQ is set. Any elements starting with this path are also set
                lstElements.forEach(function (thing) {
                    //Actually, there shouldn't be anything with the mult 0..0 any more - but hideInQ is certainly there
                    if (thing.ed.hideInQ || (thing.ed.mult == '0..0')) {
                        basePathsToHide.push(thing.ed.path)  //the full path
                    }
                })


                //now create the list of ED to include in the Q
                //we do this first so that we can exclude all child elements of hidden elements as well
                let lstQElements = []
                lstElements.forEach(function (thing,ctr) {

                        let ed = thing.ed
                        let okToAdd = true
                        if (ed.mult == '0..0') {okToAdd = false}
                        if (okToAdd) {
                            for (const pth of basePathsToHide) {
                                if (ed.path == pth || ed.path.isChildPath(pth)) {
                                    okToAdd = false
                                    break
                                }
                            }
                        }

                        //now we need to look at the conditional ValueSets. If an item has condtional ValueSets defined
                        //then an ed is constructed for each VS with an enableWhen defined.
                        //todo - should the original be defined - what about the linkId

                        if (thing.ed.conditionalVS) {
                            ctr = 1
                            thing.ed.conditionalVS.forEach(function (cvs) {
                                let newThing = angular.copy(thing)
                                //delete newThing.enableWhen

                                let ew = {source:cvs.path,operator:'=',value:cvs.value}
                                newThing.ed.enableWhen = [ew]
                                newThing.ed.valueSet = cvs.valueSet
                                newThing.ed.path =`${thing.ed.path}-${ctr++}`
                                lstQElements.push(newThing)
                            })

                           //temp okToAdd = false     //don't show the original
                        }

                        if (okToAdd) {
                            lstQElements.push(thing)
                        }
                })





                let Q = {resourceType:'Questionnaire'}
                Q.id = `canshare-${firstElement.ed.path}`
                Q.name = firstElement.ed.path
                Q.title = firstElement.title
                Q.status = 'active'
                Q.url = `http://canshare.co.nz/questionnaire/${firstElement.ed.path}`

                addPrePopExtensions(Q)
                let currentItem
                let hashItems = {}      //items by linkId
                let hashEd = {}         //has of ED by path (=linkId)
                let hashVS = {}         //hash of all ValueSets defined

                for (const item of lstQElements) {
                    let ed = item.ed
                    let path = ed.path


                    //If this is being called from the composition then add the pathprefix to the path (linkId)
                    let newLink = path
                    if (pathPrefix) {
                        newLink = `${pathPrefix}${path}`
                    }
                    hashEd[newLink] = ed

                    if (currentItem) {
                        let parentItemPath = $filter('dropLastInPath')(path)
                        //console.log(parentItemPath)
                        currentItem = {linkId:`${pathPrefix}${path}`,type:'string',text:ed.title}

                        decorateItem(currentItem,ed)
                        if (config.enableWhen) {
                            let ar =  addEnableWhen(ed,currentItem,config.pathPrefix)
                            allEW.push(...ar)
                        }

                        if (ed.mult.indexOf('..*')> -1) {
                            currentItem.repeats = true
                        }

                        //here is where the new item is added to it's parent...
                        hashItems[parentItemPath] = hashItems[parentItemPath] || {}
                        hashItems[parentItemPath].item = hashItems[parentItemPath].item || []
                        hashItems[parentItemPath].item.push(currentItem)
                        hashItems[parentItemPath].type = "group"
                        hashItems[path] = currentItem


                    } else {
                        currentItem = {linkId:`${pathPrefix}${path}`,type:'string',text:ed.title}
                        decorateItem(currentItem,ed)
                        if (config.enableWhen) {
                            let ar = addEnableWhen(ed,currentItem,config.pathPrefix)
                            allEW.push(...ar)
                        }

                        hashItems[path] = currentItem
                        Q.item = [currentItem]

                    }

                }


                //validate the enablewhens - but not if the generation is called from the composition
                if (! config.calledFromComp) {
                    for (const ew of allEW) {
                        if (! hashEd[ew.question]) {
                            errorLog.push({msg:`EnableWhen on ${ew.target} refers to a missing element: ${ew.question}`})
                        }
                    }
                }


                return {Q:Q,hashEd:hashEd,hashVS:hashVS,errorLog:errorLog, allEW : allEW}

                function adjustEWPath() {
                    //when a DG is child of another (
                }

                function decorateItem(item,ed) {

                    if (! ed.type) {
                        return
                    }

                    item.definition = `${ed.path}` //`${firstElement.ed.path}.${ed.path}`

                    if (ed.mult) {
                        //required bolding
                        if (ed.mult.indexOf('1..') > -1) {
                            //need to add to any existing stype
                            item.required = true
                        }
                        //multiple
                        if (ed.mult.indexOf('..*') > -1) {
                            item.text += " *"
                        }
                    }

                    let vo = getControlDetails(ed)

                    item.type = vo.controlType

                    if (vo.controlHint == 'radio') {
                        let ext = {url:extItemControlUrl}

                        let cc = {coding:[{code: 'radio-button',system:'http://hl7.org/fhir/questionnaire-item-control'}]}
                        ext.valueCodeableConcept = cc
                        item.extension = ed.extension || []
                        item.extension.push(ext)
                    }

                    if (vo.controlHint == 'check-box') {
                        let ext = {url:extItemControlUrl}

                        let cc = {coding:[{code: 'check-box',system:'http://hl7.org/fhir/questionnaire-item-control'}]}
                        ext.valueCodeableConcept = cc
                        item.extension = ed.extension || []
                        item.extension.push(ext)
                    }



                    //set the ValueSet or options from the ed to the item
                    //the valueset takes precedence
                    let edType = ed.type[0]

                    if (edType == 'CodeableConcept') {

                        //check for fixedCoding. If there is, then set an answeroption with initialSelected

                        if (ed.fixedCoding) {
                            let concept = ed.fixedCoding
                            item.answerOption = [{valueCoding:concept,initialSelected:true}]

                        } else {
                            //no fixed value - check for valuesets & options
                            if (ed.valueSet) {
                                //check for any spaces in the valueSet url
                                if (ed.valueSet.indexOf(' ') > -1 ) {
                                    //this is an illegal vs name
                                    item.answerOption = [{valueCoding : {display:"The ValueSet name is illegal (has a space)"}}]
                                    errorLog.push({msg:`${ed.path} has an invalid valueSet: ${ed.valueSet}. The valueSet was not included`})

                                } else {
                                    //hash of valueset by path
                                    hashVS[ed.valueSet] = hashVS[ed.valueSet] ||  []
                                    hashVS[ed.valueSet].push(ed.path)

                                    if (config.expandVS) {
                                        //if we're expanding the VS, then add all the contents as optoins...
                                        item.answerOption = []
                                        let options = vsSvc.getOneVS(ed.valueSet)
                                        if (options && options.length > 0) {
                                            for (const concept of options) {
                                                concept.system = concept.system || unknownCodeSystem
                                                item.answerOption.push({valueCoding : concept})
                                            }
                                        } else {
                                            item.answerOption.push({valueCoding : {display:"The ValueSet is missing or empty"}})
                                        }

                                    } else {
                                        //otherwise, add the answervalueSet property and let the renderer retrieve the contents
                                        item.answerValueSet = ed.valueSet
                                    }
                                }
                            } else if (ed.options && ed.options.length > 0) {
                                item.answerOption = []
                                for (const concept of ed.options) {
                                    delete concept.fsn
                                    delete concept.pt
                                    concept.system = concept.system || unknownCodeSystem
                                    item.answerOption.push({valueCoding : concept})
                                }
                            } else {
                                item.answerOption = [{valueCoding : {display:"There is neither a ValueSet nor options"}}]
                            }

                        }


                    }

                    if (edType == 'Quantity') {
                        //https://smartforms.csiro.au/docs/components/quantity
                        if (ed.units && ed.units.length > 0) {
                            let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-unit"}
                            ext.valueCoding = {code:ed.units[0],system:"http://unitsofmeasure.org",display:ed.units[0]}
                            item.extension = ed.extension || []
                            item.extension.push(ext)

                        }
                    }

                    if (ed.prePop) {
                        //let ext = {url:extPrePopUrl}
                        let ext = {url:"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"}

                        //Assume a naming convention for context names - '%Launch{resourcetype}
                        let expression = `%Launch${ed.prePop}`
                        ext.valueExpression = {language:"text/fhirpath",expression:expression}
                        item.extension = item.extension || []
                        item.extension.push(ext)

                    }



                    if (ed.collapsible) {
                        let ext = {url:extCollapsibleUrl}
                        ext.valueCode = ed.collapsible
                        item.extension = item.extension || []
                        item.extension.push(ext)
                    }

                    if (ed.gtable) {
                        let ext = {url:extItemControlUrl}
                        ext.valueCodeableConcept = {
                            coding: [{
                                code: "gtable",
                                system: systemItemControl
                            }]
                        }

                        item.extension = item.extension || []
                        item.extension.push(ext)

                    }


                }


            },

            makeTreeFromQ : function (Q) {
                //pass in a Q and return a tree array representation
                //used in previewQ
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

            getAllEW : function (Q) {
                //Create a hash of all the 'EnableWhens' in a Q
                //used by previewQ
                let hashAllEW = {}


                let hashAllElements = {} // hash of all items so can locate the dependency


                function getEW(item) {
                    hashAllElements[item.linkId] = item
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            hashAllEW[item.linkId] = hashAllEW[item.linkId] || []
                            //title is the thing that is being effected, ew are the rules for showing
                            //item.linkId is the linkId of the item
                            hashAllEW[item.linkId].push({title:item.text,ew:ew})
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

                let arEW = []
                //add the items to the ew hash
                Object.keys(hashAllEW).forEach(function (key) {     //key is the linkId of the target item
                    let target =  hashAllElements[key]
                    let arConditions = hashAllEW[key]         //the items in this element  whose visibility is effected by the dependency
                    //let ar = hashAllEW[key]     //this is the item whose visibility is controlled

                    arConditions.forEach(function (ewObject) {      // ewObject = {dep: ew: }

                        //locate the dependent item - ie the one whose value enables the source
                        let dep = hashAllElements[ewObject.ew.question] || {text:'not found in Q'}
                        //ewObject.dep = dep

                        //construct a single item to represent the dependency.
                        // If a single item were 2 have 2 dependencies (ews) there will be multiple iteme
                        let item = {targetText : target.text,targetItem:ewObject.ew }
                        item.dep = dep
                        item.depText = dep.text
                        arEW.push(item)

                    })
                })

                return arEW

            },

            getControlDetails : function(ed) {
                //return the control type & hint based on the ed
                //used by modelsSvc
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

            makeQFromDGDEP : function (lstElements,hashAllDG) {


                let dgName = lstElements[0].ed.path

                //get the full DG so we can get the ultimate parent
                let fullDG = snapshotSvc.getDG(dgName)
                console.log(fullDG)

                let qUrl = `http://canshare.co.nz/fhir/questionnaire-name/${dgName}`
                let Q = {resourceType:"Questionnaire",status:'draft',url:qUrl,item:[]}
                let section = []

                if (fullDG.ultimateParent == 'Section') {
                    //if it's a section, then each ed within the section is a full DG, so process each
                    //one individually and aggregate all of them is a list. This means the 'boxing' around
                    //the DGs is preserved


                    let hash = {}
                    lstElements.forEach(function (item) {
                        if (item.ed.path) {
                            let ar = item.ed.path.split('.')
                            let name = ar[0]
                            hash[name] = true
                        }

                    })

                    console.log(hash)

                    let vo = this.internalMakeQFromDG(lstElements,hashAllDG) //{Q:Q,section:section}
                    Q.item.push(vo.section)
                    section.push(vo.section)



                } else {
                    let vo = this.internalMakeQFromDG(lstElements,hashAllDG) //{Q:Q,section:section}
                    Q.item.push(vo.section)
                    section.push(vo.section)
                }


                return {Q:Q,section:section}
            },

            //this is used by the DG form creation
            makeQFromDGDEP : function (lstElements,hashAllDG) {
                //generate a Q based on the list of elements that represents a DG

                if (! lstElements || lstElements.length == 0) {
                    return {}
                }

                let dgName = lstElements[0].ed.path

                //construct a list of paths to hide
                let basePathsToHide = []    //a list of all paths where hideInQ is set. Any elements starting with this path are also set
                lstElements.forEach(function (thing) {
                    //Actually, there shouldn't be anything with the mult 0..0 any more - but hideInQ is certainly there
                    if (thing.ed.hideInQ || (thing.ed.mult == '0..0')) {
                        basePathsToHide.push(thing.ed.path)  //the full path
                    }
                })

                //now create the list of ED to include in the Q
                //we do this first so that we can exclude all child elements of hidden elements as well
                let lstQElements = []
                lstElements.forEach(function (thing,ctr) {
                    if (ctr > 0) {
                        let ed = thing.ed
                        let okToAdd = true
                        if (ed.mult == '0..0') {okToAdd = false}
                        if (okToAdd) {
                            for (const pth of basePathsToHide) {
                                if (ed.path == pth || ed.path.isChildPath(pth)) {
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
                let qUrl = `http://canshare.co.nz/fhir/questionnaire-name/${dgName}`
                let Q = {resourceType:"Questionnaire",status:'draft',url:qUrl,item:[]}

                //there's a single section (item) for the DG (This is a Q section - not the same as the composition section)
                let section = {text:lstElements[0].ed.title,linkId:`${dgName}-section`,item:[]}
                section.definition = lstElements[0].ed.path
                section.type = "group"

                Q.item.push(section)


                let group //= topGroup

                //strategy is to represent the DG as a flattened structure off the section item with up to 2 levels
                //if an element (ed) is a FHIR DT (excl group) then it is appended to the section item
                //if the element is a group or DT then a Q group item is created and added to the section.
                //  components of the group / DT are then added to that group item


                let processingDGPath = null     //When processing a DT / group, what the path of that group is

                lstQElements.forEach(function (ed) {

                    let path = ed.path
                    let type = ed.type[0]

                    //if the ed is a DT or a Group then create a Q group item to hold the contents.
                    //set the processingDGPath to the path of the ED so we know when we get past it

                    //console.log(processingDGPath,path,path.isChildPath(processingDGPath))

                    if (processingDGPath) {
                        //if we're already processing a group / DG , is the path of this ed the same? (ie are we still processing a member of that DT / group
                        if (stillOnProcessingPath(ed,path,processingDGPath)) {
                            //if ( path.isChildPath(processingDGPath)) {
                            //yes, we're still on the same path, so just create and add an item to the group
                            let item = {text:ed.title,linkId:ed.path,type:'string'}
                            decorateItem(ed,item)
                            group.item.push(item)
                        } else {
                            //no, we've move on to something different. What sort is it
                            checkEd(ed)    //will set processingDGPath if a group / DG. clear otherwise
                        }

                    } else {
                        //we're not currently processing a group / ED
                        checkEd(ed)
                    }

                    if (false) {


                        if (hashAllDG[type]) {
                            //console.log('new group',ed)
                            //this is not a group datatype - slightly confusing...
                            group = makeGroup(ed)
                            addEnableWhen(ed,group)  //If there are any conditionals

                            processingDGPath = path
                        } else {
                            //need to see if we've finished procesing a path
                            if (processingDGPath) {
                                //yes, we have started processing a DG group. Are we still on that path?

                                if ( !path.isChildPath(processingDGPath)) {
                                    //group = topGroup  - this puts everyting at the top
                                    //We've moved on past the DG.

                                    //may13


                                    //todo - may not want to use the DG being processed for the group ?What should the text be
                                    //let groupEd = {title:"Group",path:`${ed.title}-group`}
                                    let groupEd = {title:ed.title,path:`${ed.title}-group`}
                                    group = makeGroup(groupEd)       //create a new group for the elements following the referenced DG

                                    //todo - this doesn't appear to do anything...

                                    processingDGPath = null
                                }

                            }

                            let item = {text:ed.title,linkId:ed.path,type:'string'}

                            decorateItem(ed,item)

                            if (type == 'Group') {
                                item.type = "display"
                            }


                            group.item.push(item)





                            /* - don't think we're supporting that now...
                            //have to check here to ensure 'other' item is after main one
                            if (ed.otherType) {
                                //if there's an 'otherType set then the function will return the items to insert (as conditionals need to be set)
                                let lstItem = addOtherItem(ed,item)    //if the element has the 'otherType' set then add the extra item + ew
                                //the function returns the items to add, in order
                                lstItem.forEach(function (newItem) {
                                    group.item.push(newItem)
                                })
                            } else {
                                //if there's no otherType then just add the new item

                            }
                            */
                        }
                    }

                })

                //the section is just the first item in the Q - maybe remove
                return {Q:Q,section:section}

                //Is the path still part of the processing path?
                function stillOnProcessingPath(ed,path,processingDGPath) {
                    //first use the 'isChildPath' function.
                    if (! path.isChildPath(processingDGPath)) {
                        //not on the path, return false
                        return false
                    }
                    //the path is still on the path - is it a DG??
                    let type = ed.type[0]
                    if (hashAllDG[type]) {
                        return false
                    } else {
                        return true
                    }



                }

                function checkEd(ed) {
                    let path = ed.path
                    let type = ed.type[0]

                    if (hashAllDG[type] || type=="Group") {
                        //it's a DG or group.
                        processingDGPath = path
                        group = makeGroup(ed) //will add to section
                        addEnableWhen(ed,group)  //If there are any conditionals
                        //section.item.push(group)
                    } else {
                        //just a FHIR DT - add to the section
                        delete processingDGPath
                        let item = {text:ed.title,linkId:ed.path,type:'string'}
                        decorateItem(ed,item)
                        section.item.push(item)
                    }
                }



                //set the other attributes of the item from the ed
                function decorateItem(ed,item) {
                    if (ed.autoPop) {item.text += ' (Auto populated)'}
                    item.definition = ed.path
                    addEnableWhen(ed,item)  //If there are any contitionals
                    setControlType(ed,item)  //set the control type to use - also expands any ValueSet
                    QutilitiesSvc.setFixedValue(ed,item)
                }

                function makeGroup(ed) {
                    let text = ed.title || ed.path
                    let group = {text:text,linkId: ed.path,type:'group',item:[]}
                    group.definition = ed.path

                    //group.linkId = ed.path
                    section.item.push(group)

                    //add a display element may2024
                    //let display = {text:text,linkId: `${ed.path}-display`,type:'display'}
                    //group.item.push(display)

                    return group
                }

            }

        }
    })