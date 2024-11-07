//This is the current service to make Q

angular.module("pocApp")

    .service('makeQSvc', function($http,codedOptionsSvc,QutilitiesSvc,snapshotSvc,$filter,vsSvc,orderingSvc,utilsSvc) {

        let unknownCodeSystem = "http://example.com/fhir/CodeSystem/example"
        let extLaunchContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"

        extInitialExpressionUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        extItemControlUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extCollapsibleUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible"

        //extQuantityUnit = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
        extQuantityUnit = "http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption"


        extExtractionContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext"
        extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"

        //this specifies a specific value or an expression to set the value
        extExtractionValue = "http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue"

        //defines a query that provides context data for pre-population of child elements
        extPopulationContext = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext"
        extVariable = "http://hl7.org/fhir/StructureDefinition/variable"

        //let extGtableUrl = ""
       // let extSourceQuery = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries"
        systemItemControl = "http://hl7.org/fhir/questionnaire-item-control"


        //resources that have the patient reference attached.
        //todo - might want to externalize into a config file ot similar
        //todo - anf maybe for references outside of patient ones...
        let resourcesForReference = {}
        resourcesForReference['AllergyIntolerance'] = {path:'patient'}
        resourcesForReference['Observation'] = {path:'subject'}
        resourcesForReference['Condition'] = {path:'subject'}
        resourcesForReference['MedicationStatement'] = {path:'subject'}
        resourcesForReference['Patient'] = {}   //treated as a special case

        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        function createUUID () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            })
        }

        function addPrePopExtensions(Q) {
            //add the SDC extensions required for pre-pop
            //these are added to the
            Q.extension = Q.extension || []
            addExtension("patient","Patient","The patient that is to be used to pre-populate the form")
            addExtension("user","Practitioner","The practitioner that is to be used to pre-populate the form")
           // addExtension("encounter","Encounter","The current encounter")


            //let ext = {url:extSourceQuery,valueReference:{reference:"#PrePopQuery"}}

            function addExtension(name,type,description) {
                let ext = {url:extLaunchContextUrl,extension:[]}

                ext.extension.push({url:'name',valueCoding:{code:name}})
                ext.extension.push({url:'type',valueCode:type})
                ext.extension.push({url:'description',valueString:description})
                Q.extension.push(ext)
            }
        }


        function addItemControl(item,code) {
            let ext = {url:extItemControlUrl}

            let cc = {coding:[{code: code,system:'http://hl7.org/fhir/questionnaire-item-control'}]}
            ext.valueCodeableConcept = cc
            item.extension = item.extension || []
            item.extension.push(ext)
        }


        function addFixedValue(item,definition,type,value,expression) {
            //add a fixed value extension. Can either be a value or an expression

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extExtractionValue,extension:[]}
            ext.extension.push({url:"definition",valueCanonical:definition})

            if (value) {
                let child = {url:'fixed-value'}
                child[`value${type}`] = value
                ext.extension.push(child)
            } else if (expression){
                let child = {url:'expression'}
                child[`value${type}`] = expression
                ext.extension.push(child)
            } else {
                return  //todo shoul add error...
            }


            item.extension = item.extension || []
            item.extension.push(ext)

        }

        function addReference(item,definition,type,expression) {
            //add a fixed value extension. Can either be a value or an expression

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extExtractionValue,extension:[]}
            ext.extension.push({url:"definition",valueCanonical:definition})


            let child = {url:'expression'}
            child[`valueExpression`] = {language:"text/fhirpath",expression:expression}
            ext.extension.push(child)


            item.extension = item.extension || []
            item.extension.push(ext)

        }



        function addUseContext(Q) {
            //adds the use context for the FHIRPath Lab. Need to configure this in some way
            Q.useContext = Q.useContext || []
            let uc = {code:{system:"http://terminology.hl7.org/CodeSystem/usage-context-type",code:"user",display:"User Type"}}
            uc.valueCodeableConcept = {coding:[{code:'extract',display:'Demo Extract'}]}
            Q.useContext.push(uc)
        }

        function addPublisher(Q) {
            Q.publisher = "DEMO: David Hay"
        }

        //adds the named queries for a DG as variable extensions
        //nq = {name: description: content: }
        function addNamedQuery (item,name,namedQueries) {

            let nq = namedQueries[name]
            if (! nq) {
                //todo - should there ba an error message or log?
                return
            }

            let ext = {url:extVariable}
            ext.valueExpression = {language:"application/x-fhir-query",expression:nq.contents,name:nq.name}

            item.extension = item.extension || []
            item.extension.push(ext)

        }

        //Population context is used as a bridge between a named query (a variable in the Q)
        //and how it can be pre-populated
        function addPopulationContext (nqName,item) {

            let nq = utilsSvc.getNQbyName(nqName)
            if (!nq) {
                alert(`Named Query: ${nqName} not found`)
                return
            }

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extPopulationContext}


            ext.valueExpression = {language:"text/fhirpath"}
            ext.valueExpression.name = nq.itemName //the name that subsequent expressions will use
            ext.valueExpression.expression = `%${nq.name}.entry.resource` //the 'iterator'

            item.extension = item.extension || []
            item.extension.push(ext)

        }

        //get the extraction context from the DG
        function getExtractionContext(dgName,hashAllDG) {
            let dg = hashAllDG[dgName]
            let extractionContext
            while (dg) {
                if (dg.type) {
                    extractionContext = dg.type
                    break
                } else {
                    if (dg.parent) {
                        dg = hashAllDG[dg.parent]
                    } else {
                        break
                    }
                }
            }

            //is this a profile or a core resource type
            if (extractionContext && extractionContext.indexOf('http') == -1) {
                //this is a core FHIR patient resource. Add the rest of the url
                extractionContext = `http://hl7.org/fhir/StructureDefinition/${extractionContext}`
            }

            return extractionContext
        }

        //given an ed, return the control type and hint
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
                    case 'decimal' :
                        controlHint = "decimal"
                        controlType = "decimal"
                        break
                    case 'Quantity' :
                        controlHint = "quantity"
                        controlType = "quantity"
                        if (ed.units) {
                            //p
                            //console.log(ed.units)
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
                        break
                    /*
                    case 'Identifier' :
                        controlHint = "Identifier"
                        controlType = "Identifier"
*/

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
        function addOtherItem(ed,sourceItem) {
            let newItem       //the function returns the list of items
            switch (ed.otherType) {
                case "never" :
                    //just add the extra item
                   // let item = {text:`Other ${ed.title}`,linkId:`${ed.path}-other`,type:'string'}
                   // arItems.push(sourceItem)
                   // arItems.push(item)
                    break
                case "sometimes" :
                    //add the additional item, plus a conditional on the sourceItem
                    newItem = {text:`Other ${ed.title}`,linkId:`${ed.path}-other`,type:'string'}

                    let qEW = {}
                    qEW.question = sourceItem.linkId
                    qEW.operator = '='
                    qEW.answerCoding = {code:"74964007",system:'http://snomed.info/sct'}

                    newItem.enableWhen = sourceItem.enableWhen || []
                    newItem.enableWhen.push(qEW)

                    break
                case "textonly" :
                    //the original item (a CC) is NOT included. In this case only the text box is added
                    //even though the source is not included in the Q, the linkId of the inserted item has '-other' appended
                    //though the text is copied form the source

                    //todo - add a fixed value extension (from default) AND a hide extension to original item


                    //hide the original
                    sourceItem.extension = sourceItem.extension || []
                    sourceItem.extension.push({url:extHidden,valueBoolean:true})


/*
                    //addFixedValue(sourceItem,definition,type,value)
                    typeof
                        let concept = ed.fixedCoding
                    delete concept.fsn
                    item.answerOption = [{valueCoding:concept,initialSelected:true}]

*/
                    newItem = {text:`${ed.title}`,linkId:`${ed.path}-other`,type:'string'}


                    break


            }
            return newItem
        }

        //Add the 'enable when' to the Q
        //updates the item object directly
        //When used by the Composition, we add a prefix which is {compname}.{section name}. (note the trailing dot)
        function addEnableWhen(ed,item,inPathPrefix) {

            let allEW = []  //track all EW created as the Q is created. Used to check the links once the Q is finished
            let pathPrefix = ""
            if (inPathPrefix) {
                pathPrefix = inPathPrefix + "."
            }

            if (ed && ed.enableWhen && ed.enableWhen.length > 0) {

                ed.enableWhen.forEach(function (ew) {
                    let qEW = {}

                    //When an EW is in a contained DG, then the paths of the source (in the EW) need to be updated
                 //temp   let source = QutilitiesSvc.updateEWSourcePath(ed.path,ew.source)
                    let source = ew.source
                    qEW.question = `${pathPrefix}${source}` //linkId of source is relative to the parent (DG)

                    //qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                    qEW.operator = ew.operator
                    //if the ew.value is an object then assume a Coding. Otherwise a boolean (we only support these 2)

                    let canAdd = false


                    if (typeof ew.value == 'boolean' || ew.operator == 'exists') {
                        //this is a boolean or an 'exists check
                        qEW.answerBoolean = ew.value
                        canAdd = true
                    } else {
                        //let qEW = {operator:ew.operator,answerCoding:ew.value}
                        if (ew.value && ew.value.code) {        //must have a code
                            qEW.answerCoding = ew.value
                            delete qEW.answerCoding.pt  //the preferred term...
                            delete qEW.answerCoding.fsn  //the preferred term...

                            qEW.answerCoding.system = qEW.answerCoding.system || unknownCodeSystem
                            canAdd = true
                        } else {

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

        //find a specific extension
        function getExtension(item,url,type) {
            let result = []
            if (item && item.extension) {
                for (const ext of item.extension) {
                    if (ext.url == url) {
                        if (type) {
                            let vName = `value${type}`
                            result.push(ext[vName])
                        } else {
                            result.push(ext)
                        }

                    }
                }
            }
            return result

        }

        //return true if has a fixed value
        function isFixed(ed) {
            if (ed.fixedCoding || ed.fixedBoolean || ed.fixedQuantity || ed.fixedRatio || ed.fixedCode) {
                return true
            }
        }

        let services =  {

            testExpression : function (expression) {
                //test an expression
                //exceute against test data

            },

            getNamedQueries : function (cb) {
                let qry = "/model/namedquery"
                $http.get(qry).then(
                    function (data) {
                        let hash = {}
                        data.data.forEach(function (nq) {
                            hash[nq.name] = nq
                        })
                        cb(hash)
                    },function (err) {
                        alert(angular.toJson(err.data))
                        cb({})
                    })
            },

            makeReport : function (Q) {
                //generate a report object for the SDC table view (that displays key extraction / population details)



                let report = {entries:[],variableUsage:{},errors:[]}
                let thing = {text:Q.name}
                //A hash showing for each variable where it is used...
                //report.variableUsage = {}

                //errors discovered during the report creation
               // report.errors = []

                //see if there is an extraction context on the Q
                //we assume there is only 1 and it on the Q - not descendent items (at the moment)
                let ar1 = getExtension(Q,extExtractionContextUrl,'Canonical')
                if (ar1.length > 0) {
                    thing.extractionContext = ar1[0]
                }

                report.entries.push(thing)
                
                //get the variables - assume they are defined on the Q root for now...
                let ar2 = getExtension(Q,extVariable,'Expression')
                ar2.forEach(function (ext) {
                    let thing = {text:Q.name}
                    thing.variable = ext.name
                    //thing.expression = ext.expression  //varable type is x-query
                    thing.contents = ext.expression  //varable type is x-query
                    thing.itemName = ext.name       //the name the variable is referred to
                    //thing.kind = 'variable'
                    report.entries.push(thing)

                    report.variableUsage[ext.name] = []

                })


                //get the launch contexts. These are fixed ATM but worth displaying
                let arLC = getExtension(Q,extLaunchContextUrl)

                report.launchContext = []
                for (const ext of arLC) {
                    let item = {}
                    ext.extension.forEach(function (child) {

                        switch (child.url) {
                            case "name" :
                                item.name = child.valueCoding.code
                                break
                            case "type" :
                                item.type = child.valueCode
                                break
                            case "description" :
                                item.description = child.valueString
                                break
                        }


                    })

                    report.launchContext.push(item)
                    report.variableUsage[item.name] = []

                }

                console.log(report.launchContext)
                function processItem(report,item) {
                    let thing = {linkId:item.linkId,text:item.text,type:item.type,definition:item.definition}


                    let mult = "0.."
                    if (item.required) {
                        mult = "1.."
                    }
                    if (item.repeats) {
                        mult += "*"
                    } else {
                        mult += "1"
                    }

                    thing.mult = mult

                    //look for fixed values. These are values with answerOption, and initialSelected set
                    //todo fix!! answerOption is an array....
                    if (item.answerOption) {
                        //currently only using code & CodeableConcept
                        Object.keys(item.answerOption).forEach(function (key) {
                            //console.log(key)
                            if (item.answerOption[key].initialSelected) {
                                console.log(item.answerOption[key])
                                let opt = item.answerOption[key]
                                //console.log(opt)
                                if (opt.valueCoding) {
                                    thing.fixedValue = `${opt.valueCoding.code} | ${opt.valueCoding.display} | ${opt.valueCoding.system}`
                                } else if (opt.valueCode) {
                                    thing.fixedValue = opt.valueCode
                                } else if (opt.valueString) {
                                    thing.fixedValue = opt.valueString
                                }

                            }
                        })
                    }


                    //now process the extensions. Some we recognize here - others are added with the url

                    if (item.extension) {
                        item.extension.forEach(function (ext) {

                            switch (ext.url) {
                                case extQuantityUnit :
                                    thing.fixedValue = `Units: ${ext.valueCoding.code}`
                                    break
                                case extHidden:
                                    thing.isHidden = ext.valueBoolean
                                    break
                                case  extInitialExpressionUrl:

                                    thing.initialExpression = ext.valueExpression.expression

                                    //add to the variable usage hash
                                    let ar1 = thing.initialExpression.split('.')
                                    let variable = ar1[0].substr(1)
                                    if (report.variableUsage[variable]) {
                                        report.variableUsage[variable] = report.variableUsage[variable] || []
                                        report.variableUsage[variable].push(item.linkId)
                                    } else {
                                        report.errors.push({msg:`variable ${variable} not found at ${item.linkId}`})
                                    }
                                    break
                                case extExtractionContextUrl:
                                    thing.extractionContext = ext.valueCanonical
                                    break

                                case extPopulationContext:
                                    thing.populationContext = ext.valueExpression

                                    break

                                case extExtractionValue:
                                    report.setValue = report.setValue || []


                                    let v = {}
                                    console.log(ext)
                                    ext.extension.forEach(function (child) {
                                        switch (child.url) {
                                            case 'definition' :
                                                //the path in the extract where this element is to be inserted
                                                v.path = child.valueCanonical
                                                break
                                            case 'fixed-value' :
                                                //the actual value
                                                v.value = child.valueString || child.valueId
                                                break
                                            case 'dynamic-value':
                                                //an expression
                                                v.expression = child.valueExpression
                                                break
                                            default :
                                                //shouldn't happen - what to do?
                                                break
                                        }


                                    })

                                    report.setValue.push(v)

                                        //add to entries
                                        // let sv = {text:'setValue'}
                                        //report.entries.push(sv)


                                    break

                                case extItemControlUrl :
                                    thing.itemControl = thing.itemControl || []
                                    thing.itemControl.push(ext.valueCodeableConcept)
                                    break

                                default:
                                    thing.unknownExtension = thing.unknownExtension || []
                                    thing.unknownExtension.push(ext)
                                    break

                            }

                        })
                    }

                    //look for extQuantityUnit extension. This is used in quantity to set the unit
                    //In the model, for a Quantity set the 'fixedValue' property - setting the units
                 /*   let ar2 = getExtension(item,extQuantityUnit,'Coding')
                    if (ar2.length > 0) {
                        thing.fixedValue = `Units: ${ar2[0].code}`
                    }

                    //check for hidden values
                    let ar0 = getExtension(item,extHidden,'Boolean')
                    if (ar0.length > 0) {
                        thing.isHidden = ar0[0]
                    }

                    //check for initial expression - used in CodeableConcept pre-pop
                    let ar = getExtension(item,extInitialExpressionUrl,'Expression')
                    if (ar.length > 0) {
                        thing.initialExpression = ar[0].expression

                        //add to the variable usage hash
                        let ar1 = thing.initialExpression.split('.')
                        let variable = ar1[0].substr(1)
                        if (report.variableUsage[variable]) {
                            report.variableUsage[variable] = report.variableUsage[variable] || []
                            report.variableUsage[variable].push(item.linkId)
                        } else {
                            report.errors.push({msg:`variable ${variable} not found at ${item.linkId}`})
                        }
                    }

                    //check for extraction context
                    //let ar1 = getExtension(item,extExtractionContextUrl,'Code')
                    let ar1 = getExtension(item,extExtractionContextUrl,'String')
                    if (ar1.length > 0) {
                        thing.extractionContext = ar1[0]
                    }

                    //check for population contexts
                    let ar3 = getExtension(item,extPopulationContext,'Expression')
                    if (ar3.length > 0) {
                        thing.populationContext = ar3[0]
                    }

                    //check for fixed values (our new extension)
                    let ar4 = getExtension(item,extExtractionValue)   //without a type the whole extension is returned
                    if (ar4.length > 0) {
                        report.setValue = []
                        for (const ext of ar4) {
                            let v = {}
                            console.log(ext)
                            ext.extension.forEach(function (child) {
                                switch (child.url) {
                                    case 'definition' :
                                        //the path in the extract where this element is to be inserted
                                        v.path = child.valueCanonical
                                        break
                                    case 'fixed-value' :
                                        //the actual value
                                        v.value = child.valueString
                                        break
                                    case 'dynamic-value':
                                        //an expression
                                        v.expression = child.valueExpression
                                        break
                                    default :
                                        //shouldn't happen - what to do?
                                        break
                                }


                            })

                            report.setValue.push(v)

                            //add to entries
                           // let sv = {text:'setValue'}
                            //report.entries.push(sv)

                        }

                    }

                    */

                    report.entries.push(thing)
                    if (item.item) {
                        item.item.forEach(function (child) {
                            processItem(report,child)
                        })
                    }
                }




                Q.item.forEach(function (item) {
                    processItem(report,item)
                })

                console.log(report)
                return {report:report}

            },

            makeHierarchicalQFromComp : function (comp,hashAllDG,namedQueries,compConfig) {
                //construct a Q from the composition
                //strategy is to gather the DG from the comp sections, create DG Qs then assemble them into the comp Q
                //assumption is that the composition itself doesn't change the DG contents - it is just a selector of DGs

                //automatically adds the tab container level so UI has tabs for sections
                compConfig = compConfig || {}


                let that = this
                let errorLog = []
                let allEW = []      //all EnableWhens - for validation

                let Q = {resourceType:'Questionnaire'}
                Q.title = comp.title
                Q.status = 'active'
                Q.name = comp.name
                //make the version of the Q the same as the composition version
                Q.version = comp.version

                Q.id = `canshare-${comp.name}`
                Q.url = `http://canshare.co.nz/questionnaireUrl/${comp.name}`
                addPrePopExtensions(Q)
                addUseContext(Q)
                addPublisher(Q)
                Q.item = []

                let containerSection = {text: comp.title, linkId: `${comp.name}`, extension: [], type: 'group', item: []}
                let ext = {url: extItemControlUrl}
                ext.valueCodeableConcept = {
                    coding: [{
                        code: "tab-container",
                        system: "http://hl7.org/fhir/questionnaire-item-control"
                    }]
                }

                //http://hl7.org/fhir/ValueSet/questionnaire-item-control
                containerSection.extension.push(ext)

                Q.item.push(containerSection)


                let hashEd = {}         //has of ED by path (=linkId)
                let hashVS = {}         //all valueSets


                let patientId = createUUID() // crypto.randomUUID();

                for (const section of comp.sections) {
                    if (section.items && section.items.length > 0) {
                        //let sectionItem = {linkId:`sect-${section.name}`,text:section.title,type:'group',item:[]}
                        //let sectionItem = {linkId:`${section.name}`,text:section.title,type:'group',item:[]}
                        let sectionItem = {linkId:`${comp.name}.${section.name}`,text:section.title,type:'group',item:[]}

                        //sectionItem.repeats = true
                        containerSection.item.push(sectionItem)

                        //make up an ed for the section for the display in the UI. It's not a real ed...
                        let sectionEd = {linkId:sectionItem.linkId,path:sectionItem.linkId}
                        hashEd[sectionItem.linkId] = sectionEd

                        for (const contentDG of section.items) {     //a section can have multiple DGs within it.
                            let dgType = contentDG.type[0]        //the dg type. Generally a 'section' dg


                            //todo - should this ordering be done in the snapshot service???
                            let dgElementList = snapshotSvc.getFullListOfElements(dgType)

                            //adjust according to 'insertAfter' values
                            let dg = hashAllDG[dgType]
                            orderingSvc.sortFullListByInsertAfter(dgElementList,dg,hashAllDG)

                            //path prefix is prepended to the linkid (=path) from the DG. used to adjust enablewhen targets
                            let pathPrefix = sectionItem.linkId

                            let config = {expandVS:true,enableWhen:true,pathPrefix : pathPrefix,calledFromComp:true}
                            config.hashAllDG = hashAllDG
                            config.namedQueries = namedQueries
                            if (compConfig.hideEnableWhen) {
                                config.enableWhen = false
                            }

                           // const guid = createUUID() // crypto.randomUUID();

                            config.patientId = patientId //'testPatient'    //will be a uuid


                            let vo = that.makeHierarchicalQFromDG(dg,dgElementList,config)

                            allEW.push(...vo.allEW)

                            let dgQ = vo.Q

                            //if there are any variables defined by the DG then add them to the root
                            //they would have been added by the DG routine, but the Q root is ignored here.
                            //add the named queries as variables in the Q.
                            if (dg.namedQueries) {
                                //let item = Q.item[0]
                                dg.namedQueries.forEach(function (nqName) {
                                    addNamedQuery(Q,nqName,config.namedQueries)
                                })
                            }

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
                            //console.log(`${dgType} ${vo.errorLog.length}`)
                            if (vo.errorLog.length > 0) {
                                errorLog.push(...vo.errorLog)
                            }

                            //the section is populated by DGs - but there are a couple of ways that has been done.
                            //sectionPatientDetails is a DG thhat has the Patient DG as a child
                            //bresteReporthistolymphnodes has the elements directly
                            //to be discussed next week

                            //now we can actually add add the child elements from the DG to the Composition Q
                            //First we need to see if there was an extract context defined on the DG Q. If so
                            //it needs to be added to the section. It will be an extension with the url of extExtractionContextUrl
                            //Note that there will only be a single extension of this type on the Q. If a DG has
                            //multiple resources extracted from it, they will be in the items...

                            //let arExt = getExtension(vo.Q,extExtractionContextUrl,'Code')
/* - temp
                            let arExt = getExtension(vo.Q,extExtractionContextUrl,'String')
                            if (arExt.length) {
                                sectionItem.extension = sectionItem.extension || []
                                let ext = {url:extExtractionContextUrl,valueString:arExt[0]}
                                sectionItem.extension.push(ext)
                            }
                            */



                            if (dgQ && dgQ.item[0]) {




                                //todo - added this level of nesting as CSIRO renderer doesn't support pre-pop in tabs
                                //makes the tree bad though...
                                let dgItem = {linkId:`${comp.name}.${section.name}.section`,text:section.title,type:'group',repeats:true,item:[]}


                                //-----------
                                //see if this is a DG that extracts to a resource with a patient reference
                                //wellington oct29




                                if (resourcesForReference[dg.type]) {
                                    //if (dg.type == 'Condition') {
                                    let definition = `http://hl7.org/fhir/StructureDefinition/${dg.type}#${dg.type}.subject.reference`         //path in
                                    let type = "String"
                                    let value = config.patientId //`Patient/${patientId}`

                                    //addReference(item,definition,type,expression)

                                    addFixedValue(dgItem,definition,type,value)
                                }


                                //---------------



                                if (dgQ.item[0].extension) {

                                    for (const ext of dgQ.item[0].extension) {

                                    }

                                    dgItem.extension = dgItem.extension || []
                                    dgItem.extension.push(...dgQ.item[0].extension)
                                    dgItem.repeats = true


                               //     sectionItem.extension = sectionItem.extension || []
                                //    sectionItem.extension.push(...dgQ.item[0].extension)
                                 //   sectionItem.repeats = true
                                }







                                for (const child of dgQ.item[0].item){
                                    dgItem.item.push(child)
                                   //temp  sectionItem.item.push(child)
                                }

                                sectionItem.item.push(dgItem)

                            }
                        }
                    }

                }

                //console.log(allEW)

                //validate the enablewhens
                for (const ew of allEW) {
                    if (! hashEd[ew.question]) {
                        errorLog.push({msg:`EnableWhen on ${ew.target} refers to a missing element: ${ew.question}`,dgName:ew.dgName})
                    }
                }

                return {Q:Q,hashEd:hashEd,hashVS:hashVS,errorLog:errorLog,allEW:allEW}

            },

            makeHierarchicalQFromDG : function  (dg,lstElements,config) {
                //Used in the new Q renderer
                //config.enableWhen (boolean) will cause the enableWhens to be set. It's a debugging flag...
                //config.patientId is the patient id to use for the fixed value extension
                config.patientId = config.patientId || createUUID()
                //config.pathPrefix is used for enable when targets. Only used from composition. It may be null
                //config.namedQueries allows the NQ to be passed in
                let pathPrefix = ""
                if (config.pathPrefix) {
                    pathPrefix = config.pathPrefix + "."
                }



                if (! lstElements || lstElements.length == 0) {
                    return  {allEW:[],hashEd :{} ,hashVS:{}, errorLog:[] }    //this results when there is a missing DG referenced...
                }

                let dgName = dg.name //lstElements[0].ed.path     //first line is the DG name

                //if config.expandVS is true, then the contents of the VS will be expanded as options into the item. May need to limit the length...
                let errorLog = []
                let firstElement = lstElements[0]
                let allEW = []      //all EnableWhen. Used for validation


                //all EDs where the valueSet is conditional. Anything that has a dependency of one of these
                //ED's will need to have their dependency adjusted as the ED will not be added to the Q - rather
                //an ED created for each VS will have been added with a linkId of  {linkId}-{inx}
                //This will need to be an OR set of EW
                let conditionalED = {}


                //construct a list of paths to hide (not include in the Q)
                let basePathsToHide = []    //a list of all paths where hideInQ is set. Any elements starting with this path are also set
                lstElements.forEach(function (thing) {
                    //Actually, there shouldn't be anything with the mult 0..0 any more - but hideInQ is certainly there
console.log(thing.ed.path)
                    if (thing.ed.mult == '0..0') {
                        basePathsToHide.push(thing.ed.path)  //the full path
                    } else if (thing.ed.hideInQ) {
                        //if it's a fixed value, then it will still be added to the Q, but it will be hidden -
                        if (! isFixed(thing.ed) ) {
                            basePathsToHide.push(thing.ed.path)  //the full path
                        }
                    }
                })

                //console.log(basePathsToHide)

                //now create the list of ED to include in the Q
                //we do this first so that we can exclude all child elements of hidden elements as well
                let lstQElements = []

                lstElements.forEach(function (thing) {
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

                    if (thing.ed.conditionalVS && thing.ed.conditionalVS.length > 0) {
                        let ctr = 1
                        let adjustedPath = `${pathPrefix}${thing.ed.path}`
                        conditionalED[adjustedPath] = []
                        thing.ed.conditionalVS.forEach(function (cvs) {
                            let newThing = angular.copy(thing)
                            //delete newThing.enableWhen

                            let ew = {source:cvs.path,operator:'=',value:cvs.value}

                            newThing.ed.enableWhen = [ew]
                            newThing.ed.valueSet = cvs.valueSet
                            newThing.ed.path =`${thing.ed.path}-${ctr++}`
                            lstQElements.push(newThing)

                            //the hash has a list of all the new eds that were created to replace the one with the conditional ValueSet
                            conditionalED[adjustedPath].push(`${pathPrefix}${newThing.ed.path}`)
                        })

                       okToAdd = false     //don't show the original
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


                addPrePopExtensions(Q)      //launchPatient & LaunchPractitioner
                addUseContext(Q)
                addPublisher(Q)

                //add the named queries as variables in the Q
                if (dg.namedQueries) {
                    dg.namedQueries.forEach(function (nqName) {
                        addNamedQuery(Q,nqName,config.namedQueries)
                    })

                }

                let extractionContext

                //add definition based data extraction. This is where the DG can be extracted to a FHIR
                //resource using the SDC definition extraction
                //examine the DG hierarchy to see if there is a 'type' in any of the DG parents which is the SDC extraction context
                //note that the extraction context is a complete url (not just a type name)
                //this is where the context is defined on the DG (as opposed to a referenced DG

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
                        //console.log(path,parentItemPath)
                        currentItem = {linkId:`${pathPrefix}${path}`,type:'string',text:ed.title}

                        extractionContext = decorateItem(currentItem,ed,extractionContext,dg,config)

                        if (config.enableWhen) {
                            let ar =  addEnableWhen(ed,currentItem,config.pathPrefix)
                            allEW.push(...ar)
                        }

                        if (ed.mult.indexOf('..*')> -1) {
                            currentItem.repeats = true
                        }

                        //here is where the new item is added to it's parent...
                        //We need to deal with 'out of order' elements - ie where we get to an item before its parent...
                        let canAdd = true
                        //console.log(`Adding: ${path} to  ${parentItemPath}`)
                        if (! hashItems[parentItemPath]) {
                            console.error(`${parentItemPath} not present - adding...`)

                            //create an element to add...
                            hashItems[parentItemPath] = {placeHolder:true,linkId:parentItemPath}

                            //we assume the grandparent is there
                            //todo - will generate an exception if not - how best to check?
                            let grandParentPath = $filter('dropLastInPath')(parentItemPath)
                            hashItems[grandParentPath].item = hashItems[grandParentPath].item || []
                            let t = hashItems[parentItemPath]
                            hashItems[grandParentPath].item.push(t)

                        } else {
                            if (hashItems[path] && hashItems[path].placeHolder) {
                                console.error(`${path} is placeholder`)
                                //This is an out of order item that was previously added as a placeholder
                                //we don't want to re-add it - but do need to copy all the attributes across
                                Object.assign(hashItems[path],currentItem)
                                delete  hashItems[path].placeHolder
                                hashItems[path].type = 'group'      //this must be a froup if it has children...
                                canAdd = false  //nothing else to do...
                            }
                        }

                        if (canAdd) {
                            //this is where the parent item exists so the current one can just be added
                            //hashItems[parentItemPath] = hashItems[parentItemPath] || {}     //in theory, the parent should always have been added
                            hashItems[parentItemPath].item = hashItems[parentItemPath].item || []
                            hashItems[parentItemPath].item.push(currentItem)
                            hashItems[parentItemPath].type = "group"
                            hashItems[path] = currentItem   //ready to act as a parent...

                            //We also need to process 'other' items. These are used in choice elements when the desired option is not in the options list
                            let newItem = addOtherItem(ed,currentItem)
                            if (newItem) {
                                hashItems[parentItemPath].item.push(newItem)
                            }
                        }



                    } else {
                        //this is the first item in the DG Q.

                        console.log(`>>>>>>>>>. ${pathPrefix}${path}` )
                        currentItem = {linkId:`${pathPrefix}${path}`,type:'string',text:ed.title}
                        decorateItem(currentItem,ed,extractionContext,dg,config)

                        if (config.enableWhen) {
                            let ar = addEnableWhen(ed,currentItem,config.pathPrefix)
                            allEW.push(...ar)
                        }

                        //this is the first item in the Q. We place any extraction context defined on the DG
                        // here so it is in the right place for repeated elements...
                        //note that it is already defined - don't use 'let'

                        extractionContext = getExtractionContext(dgName,config.hashAllDG)
                        if (extractionContext) {
                            currentItem.extension = currentItem.extension || []
                            currentItem.extension.push({url:extExtractionContextUrl,valueCanonical:extractionContext})
                        }

                        //we'll also add a population context here. This is to support any pre-pop
                        //todo - does it make sense for a DG to have multiple NQ? For now, we'll just grab the first one
                        if (dg.namedQueries && dg.namedQueries.length > 0) {
                            addPopulationContext (dg.namedQueries[0],currentItem)
                            currentItem.repeats = true  //if pre-pop from a NQ then must be able to repeat

                            //we'll also add the extension to render pre-pop as a table.
                            //todo - this could be an option on the DG

                            addItemControl(currentItem,'gtable')

                        }

                        //this sets the Q.item to the first entry (currentItem) - all the others are references off that
                        hashItems[path] = currentItem
                        Q.item = [currentItem]

                    }

                }

                console.log(hashItems)


                //validate the enablewhens - but not if the generation is called from the composition
                //if the error is to an element that has conditional ValueSets, then it isn't really an error
                //as the EW was updated to refer to all the conditional copies made (and a copy made in the  conditionalED[] array
                let newAllEW = []   //the set of all enableWhens - excluding the conditional ValueSet ones...


                for (const ew of allEW) {
                    ew.dgName = firstElement.ed.path        //so that the DGName can be reported back to the composiiton
                    //ew.dgPath = ew.question
                    if (! hashEd[ew.question] ) {
                        //the question (controller element) was not found
                        //is this an element that had conditional valueSets?
                        if (! conditionalED[ew.question]) {
                            //no it isn't - it is an error
                            newAllEW.push(ew)       //we still add it to the list - it needs to be fixed

                            if (! config.calledFromComp) {

                                errorLog.push({msg:`EnableWhen on ${ew.target} refers to a missing element: ${ew.question}`})
                            }


                        } else {
                            //this is an element that had a conditional VS - and the element was not included in the Q so it doesn't go in thelist
                        }



                    } else {
                        //the question / control element was found so add to the updated 'allEW' list
                        newAllEW.push(ew)
                    }
                }


                //at this point the Q has been built, but if there were any elements with conditionalVS
                //then that element will not have been added to the Q (conditional items for each possible VS will have been)
                //and any other items that have a dependency on that one will need to be corrected...



                correctEW(Q,conditionalED)




                return {Q:Q,hashEd:hashEd,hashVS:hashVS,errorLog:errorLog, allEW : newAllEW}

                function adjustEWPath() {
                    //when a DG is child of another (
                }


                //add details to item
                //extraction context is the url of the profile (could be a core type)
                function decorateItem(item,ed,extractionContext,dg,config) {

                   // let newItem = {}    //If a new item is needed - ie extension url

                    if (! ed.type) {
                        return
                    }

                    let edType = ed.type[0]     //actually be the name of the DG

                    //If this ed is a reference to another, it can have a different exraction context...
                    if (config.hashAllDG[edType]) {

                        //console.log("is DG", config.hashAllDG[edType])

                        //This is a resource that should have a patient reference
                        let referencedDG = config.hashAllDG[edType]

                        //console.log(referencedDG)
                        if (resourcesForReference[referencedDG.type]) {
                            let refConfig = resourcesForReference[referencedDG.type]
                            console.log('for patref --->',edType)

                            if (referencedDG.type == 'Patient') {
                                //set the patient id...
                                let definition = `http://hl7.org/fhir/StructureDefinition/Patient#Patient.id`         //path in
                                let type = "Id"
                                let value = config.patientId //`Patient/${patientId}`

                                //addReference(item,definition,type,expression)

                                addFixedValue(item,definition,type,value)
                            } else {
                                //I'm not sure how useful this is. I think it's only going to work on
                                //referenced dG's - may be a little complicated...
                                ///\"http://hl7.org/fhir/StructureDefinition/Patient#Patient.identifier.system"
                                let definition = `http://hl7.org/fhir/StructureDefinition/${referencedDG.type}#${referencedDG.type}.subject.reference`         //path in
                                let type = "String"
                                let value = config.patientId //`Patient/${patientId}`

                                //addReference(item,definition,type,expression)

                                addFixedValue(item,definition,type,value)
                            }

                        }


                        //this ed is a child ED. Des this DG have an extraction context? Curentlly a FHIR resource type, but could be a profile

                        //is there an extraction context (dg.type) on this DG or any of its parents
                        //todo - check this. I think this extractionContext is in a different scope - ? should change name

                        //the extractionContext is preserved across calls to decorate()
                        //this allows it to flow into children...
                        //If the DG has no extraction context, it won't be updated...

                        extractionContext = getExtractionContext(edType,config.hashAllDG) || extractionContext

                        //let extractionContext = config.hashAllDG[edType].type
                        if (extractionContext) {
                            //The DG defines a new extraction context
                            item.extension = item.extension || []
                            item.extension.push({url:extExtractionContextUrl,valueCanonical:extractionContext})

                           // item.extension.push({url:extExtractionContextUrl,valueExpression:{language:"text/fhirpath",expression:extractionContext}})
                        }
                    }

                    //The only way an element here will have hideInQ set but still be included is for fixed values.
                    //they get added to the Q - but with the hidden extension

                    if (ed.hideInQ) {
                        item.extension = item.extension || []
                        item.extension.push({url:extHidden,valueBoolean:true})
                    }

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

                    //todo - refactor these
                    if (vo.controlHint == 'autocomplete') {
                        addItemControl(item,'autocomplete')
                        /*
                        let ext = {url:extItemControlUrl}

                        let cc = {coding:[{code: 'autocomplete',system:'http://hl7.org/fhir/questionnaire-item-control'}]}
                        ext.valueCodeableConcept = cc
                        item.extension = ed.extension || []
                        item.extension.push(ext)
                        */
                    }

                    if (vo.controlHint == 'radio') {
                        addItemControl(item,'radio-button')
                        /*
                        let ext = {url:extItemControlUrl}

                        let cc = {coding:[{code: 'radio-button',system:'http://hl7.org/fhir/questionnaire-item-control'}]}
                        ext.valueCodeableConcept = cc
                        item.extension = ed.extension || []
                        item.extension.push(ext)
                        */
                    }

                    if (vo.controlHint == 'check-box') {
                        addItemControl(item,'check-box')
                        /*
                        let ext = {url:extItemControlUrl}

                        let cc = {coding:[{code: 'check-box',system:'http://hl7.org/fhir/questionnaire-item-control'}]}
                        ext.valueCodeableConcept = cc
                        item.extension = ed.extension || []
                        item.extension.push(ext)
                        */
                    }

                    //set the ValueSet or options from the ed to the item
                    //the fixed takes precedence, then ValueSet then options
                    //todo - need to look for other datatypes than can be fixed

                    if (edType == 'code') {
                        if (ed.fixedCode) {
                            item.answerOption = [{valueString:ed.fixedCode,initialSelected:true}]
                        }
                    }

                    if (edType == 'Identifier') {


                        if (ed.identifierSystem) {
                            //an identifier system has been set - add the fixedValue extension to the item
                            let ar = extractionContext.split('/')
                            let canonical = `${extractionContext}#${ar[ar.length-1]}.identifier.system`
                            console.log(canonical)
                            addFixedValue(item,canonical,"String",ed.identifierSystem)
                        }
                    }

                    if (edType == 'CodeableConcept') {

                        //check for fixedCoding. If there is, then set an answeroption with initialSelected
                        if (ed.fixedCoding) {
                            let concept = ed.fixedCoding
                            delete concept.fsn
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

                        if (ed.fixedQuantity) {
                            if (ed.fixedQuantity.unit) {
                                let ext = {url:extQuantityUnit}
                                ext.valueCoding = {code:ed.fixedQuantity.unit,system:"http://unitsofmeasure.org",display:ed.fixedQuantity.unit}
                                item.extension = ed.extension || []
                                item.extension.push(ext)
                            }


                        }

                        //if there are units
                        /* - not sure what to do about this.
                        if (ed.units && ed.units.length > 0) {
                            let ext = {url:extQuantityUnit}
                            ext.valueCoding = {code:ed.units[0],system:"http://unitsofmeasure.org",display:ed.units[0]}
                            item.extension = ed.extension || []
                            item.extension.push(ext)

                        }
                        */
                    }

                    //There is a pre-pop extression
                    if (ed.prePop) {
                        //let ext = {url:extPrePopUrl}
                        let ext = {url:extInitialExpressionUrl}

                        //todo - not sure if 'Launch is needed
                        //Assume a naming convention for context names - '%Launch{resourcetype}
                        //let expression = `%Launch${ed.prePop}`
                        let expression = `${ed.prePop}`
                        //let expression = `%${dg.name}.${ed.prePop}`


                        ext.valueExpression = {language:"text/fhirpath",expression:expression}
                        item.extension = item.extension || []
                        item.extension.push(ext)

                    }


                    //collapsibe sections
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



                    //important that this segment is the last as it can adjust items (eg the valueset stuff)
                    if (ed.definition && extractionContext) {
                        //this will be the extract path for this element into the target resource
                        //right now assumes extracting to a core FHIR resource - will need further thought if profiled...

                        //may need to adjust definition to add type (eg NZName) for 'utility' DG's used elsewhere
                        let definition = ed.definition
                        let ar = extractionContext.split('/')
                        let resourceType = ar[ar.length-1]      //todo - this assumes core types only...  need to think about profiles later
                        definition = definition.replace('%root%',resourceType)
                        item.definition = `${extractionContext}#${definition}`

                        //todo - want to check this more...
                        if (false && ed.extractExtensionUrl) {
                            //If there's an extension url on the item, then this item is an extension and
                            //the definition will refer to the extension (eg Patient.extension). However,
                            //we need to change the structure so that the element becomes a group
                            //with child elements for url & value

                            //Save attributes needed for the value child
                            let copyItem = angular.copy(item)
                            //let itemType = item.type  //need this for the value child




                            item.type = "group"
                            item.item = item.item || []

                            // add an additional, hidden Q item for the extension url
                            let urlItem = {linkId:`${item.linkId}.extUrl`,type:'string',text:"extension url"}

                            //the defintion will be {resource type}.extension.url
                            let ar = ed.definition.split('.')
                            let extractResourceType = ar[0]

                            urlItem.definition = `${extractionContext}#${extractResourceType}.extension.url`
                            urlItem.initial = [{valueString:ed.extractExtensionUrl}]
                            urlItem.extension = [{url:extHidden,valueBoolean:true}]
                            item.item.push(urlItem)

                            //now the value
                            let valueItem = {linkId:`${item.linkId}.extValue`,type:copyItem.type,text:"extension value"}

                            //There are attributes of the original model element that need to be copied to the value
                            //currently only 1 identified
                            let arCopy = ["answerOption"]

                            for (const name of arCopy) {
                                if (copyItem[name]) {
                                    valueItem[name] = copyItem[name]
                                    delete item[name]
                                }
                            }

                            /*
                            if (copyItem.answerValueSet) {
                                delete item.answerOption
                                valueItem.answerOption = copyItem.answerValueSet
                            }
                            */

                            //Need to set the type of the valueItem according to the dt in the model. sometimes they
                            //are the same (string) and sometimes not (codeableconcept)

                            let dtInValue = edType
                            switch (edType) {
                                case "CodeableConcept" :
                                    dtInValue = "Coding"
                                    break
                            }


                            valueItem.definition = `${extractionContext}#${extractResourceType}.extension.value${capitalizeFirstLetter(dtInValue)}`

                            //valueItem.definition = `${extractionContext}#${extractResourceType}.extension.value${dtInValue}`
                            item.item.push(valueItem)

                        }



                    }



                    return extractionContext

                }

                function correctEW(Q,conditionalED) {

                    function checkItem(item) {

                        if (item.enableWhen) {
                            let newEWList = []

                            item.enableWhen.forEach(function (ew) {
                                if (conditionalED[ew.question]) {
                                    console.log(`${item.linkId} needs adjusting`)


                                    //we'll create new EW's for each of the conditional ED's that were created
                                    conditionalED[ew.question].forEach(function (path) {
                                        let newEw = angular.copy(ew)
                                        newEw.question = path
                                        newEWList.push(newEw)
                                    })


                                } else {
                                    newEWList.push(ew)
                                }

                            })

                            item.enableWhen = newEWList
                            item.enableBehavior = 'any'




                        }
                        if (item.item) {
                            item.item.forEach(function (child) {
                                checkItem(child)
                            })
                        }

                    }

                    Q.item.forEach(function (item) {
                        checkItem(item)
                    })


                    return Q

                }
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


        }

        return services


    })