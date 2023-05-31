angular.module("pocApp")

    .service('modelsSvc', function($q,$http) {
        let cache = {}

        return {

           // findUsageOf

            makeQfromModel : function(model, types) {
                //make a Q that represents a model
                //all the top level elements on the model are a section
                //if an element below that has childre it is a group
                //todo - doesn't follow parent chain...

                let Q = {title:model.title,name:model.name,status:'draft',item:[]}         //an object that will become a Q

                //process an ed
                function processSection(item,DG,pathRoot) {
                    //add all the children of the DG to the item. If a child has children, call recursively
                    if (DG.diff) {
                        DG.diff.forEach(function (ed) {
                            //find the ed in the set of types
                            if (ed.type) {
                                let type = ed.type[0]
                                let m = types[type]
                                if (m) {
                                    if (m.diff) {
                                        //there are child elements
                                        let nextPathRoot = `${pathRoot}.${ed.path}`
                                        let groupItem = {linkId:nextPathRoot,text:ed.title,type:'group'}
                                        item.item = item.item || []
                                        item.item.push(groupItem)
                                        processSection(groupItem,m,nextPathRoot)


                                    } else {
                                        //add the item
                                        let itemToAdd = {linkId:`${pathRoot}.${ed.path}` ,text:ed.title}
                                        itemToAdd.type = 'string'
                                        item.item = item.item || []
                                        item.item.push(itemToAdd)
                                    }
                                }

                            } else {
                                console.log(`Type ${type} not found`)
                            }

                        })
                    }
                }

                //iterate through the top level. These will be sections in the Q
                //for now, assume that all of the top level entries in a model are
                //references to DG / compositions. Perhaps any 'non types' could be in an 'other' section
                if (model.diff) {
                    model.diff.forEach(function (ed) {
                        let section = {linkId:`section-${ed.path}`,text:ed.title}
                        Q.item.push(section)
                        let type = ed.type[0]
                        let childModel = types[type]
                        if (childModel) {
                            processSection(section,childModel,ed.path)
                        } else {
                            console.log(`Type ${type} not found`)
                        }

                    })
                }



                return Q





            },

            analyseWorld : function(world,types) {
                //find references between structures
                let that = this
                let merged = angular.copy({...world.compositions, ...world.dataGroups})     //all EDs

                if (! cache.analysis) {
                    cache.analysis = {}     //hash of references by target
                    //create the anaysis
                    Object.keys(merged).forEach(function (key) {
                        let model = merged[key]
                        let vo = that.getFullListOfElements(model,types,true)
                        vo.allElements.forEach(function (ed) {
                            //console.log(model.name,ed)
                            if (ed.type) {
                                let type = ed.type[0]
                                cache.analysis[type] = cache.analysis[type] || []
                                cache.analysis[type].push({display:`from ${model.name} path ${ed.path}`,model:model,path:ed.path})
                            }

                        })

                    })

                }

                //console.log(cache.analysis)
                return cache.analysis

                let hashReference = {}
                let hashTarget = {}

/*
                function populateModel(model,parent) {
                    //add all the paths from a parent to the model
                    if (merged[parent] && merged[parent].diff) {
                        model.diff = model.diff || []
                        merged[parent].diff.forEach(function (ed) {
                            model.diff.push(ed)
                        })
                    }

                    if (model.parent) {
                        populateModel(model,model.parent)
                    }
                }

                Object.keys(merged).forEach(function (key) {
                    let obj = merged[key]
                    populateModel(obj)
                })
*/

                function analyseModel(model) {
                    if (model.parent) {
                        hashTarget[model.parent] = hashTarget[model.parent] || []
                        hashTarget[model.parent].push({display : `specialized by '${model.name}'`})

                    }
                    if (model.diff) {
                        model.diff.forEach(function (ed) {
                            let type = ed.type[0]       //todo not checking for array
                            hashTarget[type] = hashTarget[type] || []
                            hashTarget[type].push({display : `referenced from '${model.name}' with path '${ed.path}'`})
                        })
                    }

                }

                //console.log(merged)
                Object.keys(merged).forEach(function (key) {
                    let obj = merged[key]
                    analyseModel(obj)
                })
                //{compositions:hashCompositions,dataGroups:hashDataGroups,valueSets:hashVS}

               // console.log(hashTarget)

            },

            makeTreeFromElementList : function(arElements){
                //construct a tree assuming that arElements is in path order
                let rootEd = arElements[0]
                let treeData = []

                //add the root
                let root = {id:rootEd.path,text: rootEd.title,parent:'#',data:{ed:rootEd}}
                treeData.push(root)

                for (let i=1; i < arElements.length; i++){          //skip the root
                    let ed = arElements[i]
                    let ar = ed.path.split('.')
                    let leafPath = ar.pop()     // the name is the last item.
                    let parent = ar.join(".")  //the
                    let id = ed.path
                    let text = ed.title || leafPath
                    let node = {id:id,text:text,parent:parent,data:{ed:ed}}
                    treeData.push(node)
                }

                //console.log(treeData)
                return treeData


            },

            getFullListOfElements(model,types,followReferences) {
                //create a complete list of elements for a model, traversing up the inheritance chain (via parent)

                let topModel = angular.copy(model)
                let allElements = []
                let errors = []

                let arNodes = []      //for the graph
                let arEdges = []      //for the graph

               // let q = {item:[]}

                //first follow the parental hierarchy to populate the initial list
                //updates allElements as it extracts
                //as it moves up the hierarchy, add the element to the list (based on the path) unless there is
                //already one there (so it replaced the parental one)

                //create as ed to act as the root
                let edRoot = {path:model.name,title:model.title}
                allElements.push(edRoot)

                extractElements(model,model.name)

                //set up the visjs objects

                let nodes = new vis.DataSet(arNodes)
                let edges = new vis.DataSet(arEdges);


                // provide the data in the vis format
                let graphData = {
                    nodes: nodes,
                    edges: edges
                };


                return {allElements: allElements,graphData:graphData}


                // add to list of elements, replacing any with the same path (as it has been overwtitten)
                function addToList(ed) {
                    //is there already an entry with this path
                    let path = ed.path
                    let pos = -1
                    allElements.forEach(function (element,inx) {
                        if (element.path == path) {     //should only be one (unless there are duplicate names in the model
                            pos = inx
                        }
                    })
                    if (pos > -1) {
                        //replace the existing path
                        allElements.splice(pos,1,ed)
                    } else {
                        allElements.push(ed)
                    }
                }

                //add note to the nodelist, replacing any with the same id
                function addNodeToList(node) {
                    let pos = -1
                    arNodes.forEach(function (iNode,inx) {
                        if (iNode.id == node.id) {
                            pos = inx
                        }
                    })

                    if (pos > -1) {
                        //there is already an element with this id - replace it
                        arNodes.splice(pos,1,node)
                    } else {
                        arNodes.push(node);
                    }
                }


                function extractElements(model,pathRoot) {

                    //add to nodes list
                    let node = {id: model.name, label: model.name,shape: 'box'}
                    node.data = {model:model}
                    if (model.name == topModel.name) {
                        node.color = '#ff8080'
                    } else if (model.kind == "comp") {
                        node.color = '#FFFFCC'
                    }

                    addNodeToList(node)

                    //arNodes.push(node);


                    //do parents first.
                    if (model.parent && followReferences) {
                      //  console.log('expanding ' + model.parent)
                        if (types[model.parent]) {
                         //   console.log(types[model.parent])

                            //create the 'parent' link
                            let edge = {id: 'e' + arEdges.length +1,
                                from: model.name,
                                to: model.parent,
                                color: 'red',
                                width: 4,
                                label: 'specializes',arrows : {to:true}}
                            arEdges.push(edge)



                            extractElements(types[model.parent],pathRoot)
                        } else {
                            errors.push(`missing type name ${model.parent}`)
                        }
                    }

                    if (model.diff) {
                        model.diff.forEach(function (ed) {
                            //console.log(ed.path)
                            if (ed.type && ed.type.length > 0) {
                                let type = ed.type[0]   //only look at the first code
                                //console.log(type)
                                if (types[type]) {
                                    //this is a known type. Is there a definition for this type (ie do we need to expand it)
                                    let childDefinition = types[type]

                                    //console.log(childDefinition)

                                    if (childDefinition.diff && followReferences) {
                                        //if there is a diff element in the type, then it can be expanded


                                        //create an edge. todo This is to ALL elements, so may want to filter
                                        let edge = {id: 'e' + arEdges.length +1,
                                            from: model.name,
                                            to: childDefinition.name,
                                            color : 'blue',
                                            dashes : true,
                                            label: ed.path,arrows : {to:true}}
                                        arEdges.push(edge)

                                        //console.log('expanding child: ' + childDefinition.name)
                                        let clone = angular.copy(ed)
                                        clone.path = pathRoot + "." + ed.path
                                        addToList(clone)
                                        //allElements.push(clone) //this is the BBE equivalent
                                        extractElements(childDefinition,pathRoot + "." + ed.path)
                                    } else {
                                        //list add the ed to the list
                                        let clone = angular.copy(ed)

                                        clone.path = pathRoot + '.' + ed.path
                                        addToList(clone)
                                        //allElements.push(ed)
                                    }


                                } else {
                                    errors.push(`missing type ${model.name}`)
                                }


                            } else {
                                errors.push(`ed ${model.name} ${ed.path} is missing type `)
                            }
                        })
                    }



                }



            },

            validateModel : function (vo) {

                //create a combined hash, all names must be unique in the model. assume hash on name
                let hash = {}
                let errors = []
                //all known types. Start with fhir types. will add the types defined in the model
                //let types = ['string','CodeableConcept','CodeableConcept','Quantity','HumanName']

                //all types point to their definition todo - add defs for fhir datatypse
                let types = {}
                types['string'] = {}
                types['CodeableConcept'] = {}
                types['Quantity'] = {}
                types['Identifier'] = {}
                types['HumanName'] = {}
                types['dateTime'] = {}


                //add to the models hash. Will update types with custom types (ie the models) using model.name
                //will check that all names are unique
                addToHash(vo.dataGroups)
                addToHash(vo.compositions)
                addToHash(vo.valueSets)     //treat vs as a type for the purposes of validation

               // console.log(types)

                //now check all the models individually
                Object.keys(hash).forEach(function (key) {
                    let model = hash[key]

                    //If there's a parent, then check it's a valid type
                    if (model.parent) {
                        if (! types[model.parent]) {
                            errors.push({msg:`Unknown parent type ${model.parent} in model ${model.name}`,model:model})
                        }
                    }

                    if (model.kind == 'vs') {
                        //validations that are specifically for ValueSets


                    } else {
                        //validations that are specifically for Compositions & datagroup
                        if (model.diff) {
                            model.diff.forEach(function (ed,inx) {
                                //this is an element definition

                                //check for required elements in ED. Currently only path.
                                if (! ed.path) {
                                    errors.push({msg:`Missing path in model ${model.name} at diff #${inx}`,model:model, ED:ed})
                                }

                                //check that the ED type is known
                                //todo - should our model allow multiple types
                                if (ed.type) {

                                    ed.type.forEach(function (type) {
                                        if ( !types[type]) {
                                            errors.push({msg:`Unknown type ${ed.type} in model ${model.name} at diff #${inx}`,model:model, ED:ed})
                                        }
                                    })

                                } else {
                                    errors.push({msg:`Missing type in model ${model.name} at diff #${inx}`,model:model, ED:ed})
                                }

                                if (ed.valueSet) {
                                    //check that the valueSet name is present in the world or is a url.
                                    //If a url, then not defined in the world
                                    if (! types[ed.valueSet] && ed.valueSet.substring(0,4) !== 'http') {
                                        errors.push({msg:`Missing valueSet name ${ed.valueSet} in model ${model.name} at diff #${inx}. (It's not a Url either)`,model:model, ED:ed})
                                    }
                                }

                                //todo check for duplicated names in the model

                            })
                        } else {
                            errors.push({msg:"Missing diff",model:model})
                        }
                    }



                })

                //only allowed elements in ED

                //all types are either to known FHIR datatypes or a composition or a datagroup

                return {errors:errors,types:types}


                function addToHash(hashModels) {
                    Object.keys(hashModels).forEach(function (key) {
                        let model = hashModels[key]
                        //the model name becomes a possible type

                        if (model.name) {
                            if (hash[model.name]) {
                                errors.push({msg:"Duplicate name",model:model})
                            } else {
                                hash[model.name] = model
                                types[model.name] = model
                            }
                        } else {
                            errors.push({msg:"Model missing name",model:model})
                        }

                    })
                }




                //



            },
            getDemo: function () {

                //construct a graph of the Logical model types.
                //Not sure if this belongs in here, but it will do for the moment.
                //We have compositions, DataGroups & Items  Not clear what the difference between a comp and a dg is
                //A compositions can 'descend' from others and reference datagroups and coomposotions

                //default multiplicity to single optional unless otherwise stated
                //if an object has something of the name name as a parent or reference it is overwritten - eg ValueSet

                let hashCompositions = {}
                let hashDataGroups = {}
                let hashVS = {}         //VS by name (not url)

                //---------- DataGroups
                //DataGroup for patient
                let dgPatient = {kind:"dg",name:'patient',title:"Patient data group",diff:[]}
                dgPatient.diff.push({path:'name',title:'Patient name',type:['HumanName']})
                dgPatient.diff.push({path:'gender',title:'Gender',type:['CodeableConcept'],valueSet:"https://genderoptions"})
                dgPatient.diff.push({path:'nhi',title:'NHI number',type:['Identifier']})
                hashDataGroups[dgPatient.name] = dgPatient

                //DataGroup bodysite
                let dgBodySite = {kind:"dg",name:'body-site',title:"BodySite",diff:[]}
                dgBodySite.diff.push({path:'structure',title:"Structure",type:['CodeableConcept'],code:[{code:'code1'}],valueSet:"https://bodysite/alloptions"}) //will be overwritten
                hashDataGroups[dgBodySite.name] = dgBodySite

                //DG generic specimen
                let dgSpecimen = {kind:"dg",name:'specimen',title:"Specimen",diff:[]}
                dgSpecimen.diff.push({path:'type',title:'Specimen type',type:['CodeableConcept']})
                dgSpecimen.diff.push({path:'collected',title:'When collected',type:['dateTime']})
                dgSpecimen.diff.push({path:'bodysite',title:'Body site',type:['body-site']})
                hashDataGroups[dgSpecimen.name] = dgSpecimen

                //DG history
                let dgHistory = {kind:"dg",name:'history',title:"History",diff:[]}
                dgHistory.diff.push({path:'co-morbidity',title:'Co-morbidities',type:['condition'],mult:'0..*'})
                dgHistory.diff.push({path:'family',title:'Family history',type:['fmh'],mult:'0..*'})
                hashDataGroups[dgHistory.name] = dgHistory

                //DG condition
                let dgCondition= {kind:"dg",name:'condition',title:"Condition",diff:[]}
                dgCondition.diff.push({path:'code',title:'Condition code',type:['CodeableConcept'],mult:'1..1'})
                hashDataGroups[dgCondition.name] = dgCondition

                //DG familymember hostory
                let dgFMH = {kind:"dg",name:'fmh',title:"Family member history",diff:[]}
                dgFMH.diff.push({path:'code',title:'Condition code',type:['CodeableConcept'],mult:'1..1'})
                dgFMH.diff.push({path:'relation',title:'Relationship',type:['CodeableConcept'],mult:'1..1'})
                hashDataGroups[dgFMH.name] = dgFMH

                //DG assessment
                let dgAssess = {kind:"dg",name:'assessment',title:"Assessment",diff:[]}
                dgAssess.diff.push({path:'behaviour',title:'Behaviour',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'primary-bodysite',title:'Primary bodysite',type:['body-site'],mult:'0..1'})
                dgAssess.diff.push({path:'secondary-bodysite',title:'Secondary bodysite',type:['body-site'],mult:'0..1'})
                dgAssess.diff.push({path:'morphology',title:'Morphology',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'gradingsystem',title:'Grading system',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'grade',title:'Grade',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'stagesystem',title:'Stage system',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'stage',title:'Stage',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'prognosticSystem',title:'Prognostic system',type:['CodeableConcept'],mult:'0..1'})
                dgAssess.diff.push({path:'prognosis',title:'Prognosis',type:['CodeableConcept'],mult:'0..1'})
                hashDataGroups[dgAssess.name] = dgAssess


/*
                //DG specimen for frozen section
                let dgSpecimenFrozen = {kind:"dg",name:'specimen-frozen',title:"Specimen for frozen section",parent:'specimen',diff:[]}

                dgSpecimenFrozen.diff.push({path:'bodysite',title:'Body site',type:['CodeablConcept'],valueSet:'breast-frozen-bodysite'})
                hashDataGroups[dgSpecimenFrozen.name] = dgSpecimenFrozen
*/

                //------------- ValueSets
                let vsAllBodySite = {kind:"vs",name:'all-bodysite',title:'All body sites',url:'',concepts :[]}
                vsAllBodySite.concepts.push({display:"Option 1"})
                vsAllBodySite.concepts.push({display:"Option 2"})
                vsAllBodySite.concepts.push({display:"Option 3"})
                hashVS[vsAllBodySite.name] = vsAllBodySite

                let vsBreastBiopsyBodySite = {kind:"vs",name:'breast-biopsy-bodysite',title:'body sites for breast biopsy',url:'',concepts :[]}
                vsBreastBiopsyBodySite.concepts.push({display:"Option 4"})
                vsBreastBiopsyBodySite.concepts.push({display:"Option 5"})
                vsBreastBiopsyBodySite.concepts.push({display:"Option 6"})

                hashVS[vsBreastBiopsyBodySite.name] = vsBreastBiopsyBodySite

                let vsFrozenBodySite = {kind:"vs",name:'breast-frozen-bodysite',title:'body sites for breast biopsy',url:'',concepts :[]}
                vsFrozenBodySite.concepts.push({display:"Option 4"})
                vsFrozenBodySite.concepts.push({display:"Option 5"})
                vsFrozenBodySite.concepts.push({display:"Option 6"})

                hashVS[vsFrozenBodySite.name] = vsFrozenBodySite


                //===================Compositions
                //Base composition for Path request
                let compPathRequest = {kind:"comp",name:'path-request',title: "Pathology request",diff:[]}
                compPathRequest.diff.push({path:'patient',title:"Patient",type:['patient'],mult:'1..1'})
                compPathRequest.diff.push({path:'history',title:"History",type:['history'],mult:'0..*'})
                compPathRequest.diff.push({path:'specimen',title:"Specimen",type:['specimen'],mult:'0..*'})
                compPathRequest.diff.push({path:'assessment',title:"Assessment",type:['assessment'],mult:'0..*'})

                //override the 'structure' path. completely replaces the  in the parent
                //compPathRequest.diff.push({path:'structure',type:["CodeableConcept"], valueSet:"all-bodysite"})



                //compPathRequest.diff.push({path:'dummy',type:["string"]})
                hashCompositions[compPathRequest.name] = compPathRequest


                //--------  Composition for Breast biopsy - 'is-a' Path request
                let compBreastBiopsy = {kind:"comp",name:'breast-biopsy',parent:"path-request",title: "Breast biopsy",diff:[]}
                //compBreastBiopsy.diff.push({path:'structure',type:['CodeableConcept'],valueSet:"http://bodysite/breastBiopsyRequestStructure"})


                compBreastBiopsy.diff.push({path:'specimen.bodysite.structure',type:["CodeableConcept"], valueSet:"breast-biopsy-bodysite"})

                compBreastBiopsy.diff.push({path:'added-element',type:["string"]})
                hashCompositions[compBreastBiopsy.name] = compBreastBiopsy

                //--------------Composition for Breast frozen section - 'is-a' Path request
                let compBreastFrozen = {kind:"comp",name:'breast-frozen',parent:"path-request",title: "Breast frozen section",diff:[]}
                //compBreastFrozen.diff.push({path:'structure',type:['CodeableConcept'],valueSet:"http://bodysite/breastFrozenRequestStructure"})

                //compBreastFrozen.diff.push({path:'specimen',type:['specimen-frozen']})



                hashCompositions[compBreastFrozen.name] = compBreastFrozen

                return {compositions:hashCompositions,dataGroups:hashDataGroups,valueSets:hashVS}

            }
        }
    })