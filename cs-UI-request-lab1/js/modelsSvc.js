angular.module("pocApp")

    .service('modelsSvc', function($q,$filter,$http) {
        let cache = {}

        this.fhir = {}

        return {

            isUniqueNameOnLibrary : function (name, modelType) {
                let deferred = $q.defer()
                //check that the name is unique for the modelType (comp, dt) Case sensitive.
                //just check the library
                //todo

                let url = `/model/DG/${name}`
                if (modelType == 'comp') {
                    `/model/comp/${name}`
                }

                $http.get(url).then(
                    function (data) {
                        //if something it returned, then this is not a unique name
                        deferred.reject(data.data)  //reject it, returning the one that was found
                    },
                    function (err) {
                        if (err.status == 404) {
                            deferred.resolve()      //a 404, all good
                        } else {
                            alert(angular.toJson(err))
                            deferred.reject()       //something else? reject
                        }

                    }
                )



                return deferred.promise

            },


            getSizeOfObject : function( object ) {
                //the memory usage of an obect - from https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object#11900218
                var objectList = [];
                var stack = [ object ];
                var bytes = 0;

                while ( stack.length ) {
                    var value = stack.pop();

                    if ( typeof value === 'boolean' ) {
                        bytes += 4;
                    }
                    else if ( typeof value === 'string' ) {
                        bytes += value.length * 2;
                    }
                    else if ( typeof value === 'number' ) {
                        bytes += 8;
                    }
                    else if
                    (
                        typeof value === 'object'
                        && objectList.indexOf( value ) === -1
                    )
                    {
                        objectList.push( value );

                        for( var i in value ) {
                            stack.push( value[ i ] );
                        }
                    }
                }
                return bytes;
            },


            getConceptMapHash : function () {
                let idOfConceptMap = "canshare-tnm-vs"
                let deferred = $q.defer()

                let qry = `ConceptMap/${idOfConceptMap}`
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let cm = data.data
                        let hashMaps = {}
                        cm.group.forEach(function (group) {
                            group.element.forEach(function (element) {
                                let coding = {code:element.code,display:element.display}
                                hashMaps[element.code] = {coding:coding,targets:element.target}

                            })

                        })

                       // console.log(data.data)
                        deferred.resolve(hashMaps)

                    },function (err) {
                        //todo what to do?
                        deferred.reject({})
                    }
                )

                return deferred.promise

            },

            getReferencedModels : function (hashDG,hashComp) {
                //create a hash showing references between models

                //hashReferences is keyed by A DG. It contains a list of all other DG's that reference it - including parental
                let hashReferences = {}


                //DG's
                Object.keys(hashDG).forEach(function (key) {
                    let DG = hashDG[key]

                    let model = angular.copy(DG) //we're going to chane model so need a copy..

                    let currentModelParent = model.parent

                    while (model && model.parent) {
                       // console.log(`Examining ${DG.name}: ${model.parent} is the parent of ${model.name}`)


                        model = hashDG[model.parent]
                        if (model) {
                            hashReferences[model.name] = hashReferences[model.name] || []
                            hashReferences[model.name].push({name:DG.name,kind:model.kind,mode:'parent'})
                        } else {
                            alert(`The DG ${key} has a parent of ${currentModelParent} which is not a DG`)
                        }

                    }

                    if (DG.diff) {
                        DG.diff.forEach(function (ed) {
                            if (ed.type) {
                                ed.type.forEach(function (typ) {
                                   // console.log(typ)
                                    hashReferences[typ] = hashReferences[typ] || []
                                    hashReferences[typ].push({name:DG.name,kind:DG.kind,path:ed.path,mode:'uses',mult:ed.mult})
                                })
                            }
                        })
                    }
                })

                Object.keys(hashComp).forEach(function (key) {
                    let comp = hashComp[key]
                    if (comp.sections) {
                        comp.sections.forEach(function (section) {
                            if (section.items) {
                                section.items.forEach(function (item) {
                                    if (item.type) {
                                        item.type.forEach(function (typ) {
                                            hashReferences[typ] = hashReferences[typ] || []
                                            hashReferences[typ].push({name:comp.name,kind:comp.kind,path:item.name,mult:item.mult})
                                        })
                                    }

                                })
                            }

                        })
                    }
                })

                return hashReferences

            },

            updateOrAddElement : function(model,element) {
                //if there's already an overide in the model, then update it.
                //note sepecific elements only, ie: valueSet
                let relativePath =  $filter('dropFirstInPath')(element.path);
                let found = false
                model.diff.forEach(function(ed) {
                    if (ed.path == relativePath)  {
                        ed.valueSet = element.valueSet
                        ed.mult = element.mult
                        found = true
                    }
                })
                //if not, then add it
                if (! found) {
                    let newElement = angular.copy(element)
                    newElement.path = relativePath
                    model.diff.push(newElement)
                }
            },

            summarizeValidation : function(OO,bundle) {
                //todo - do we need this???
                //present the validation issues in the OO with the bundle entry
                //copied from commonSvc, removing the Q specific stuff

                //let cloneBundle = angular.copy()    //we're going to add issues directly to the resource...

                //create an index of resources in the bundle
                let totalErrors = 0
                let lstResources = []
                let unknownIssues = []      //issues that can't be associated with a specific resource
                let enhancedErrors = []     //errors with improved notification

                //let hashResources = {}


                if (bundle && bundle.entry) {
                    bundle.entry.forEach(function (entry,inx) {
                        lstResources.push({resource:entry.resource,pos:inx,issues:[]})
                    })
                }


                //add all the issues in the OO to the list
                if (OO && OO.issue) {
                    OO.issue.forEach(function (iss) {
                        if (iss.location) {
                            let loc = iss.location[0]
                            let ar = loc.split('[')
                            if (ar.length > 1) {
                                let l = ar[1]   // 2].resource
                                let g = l.indexOf(']')
                                let pos = l.slice(0,g)
                                //console.log(pos,loc)

                                let item = {severity:iss.severity,location:loc,pos:pos,diagnostics:iss.diagnostics}

                                if (iss.severity == 'error') {
                                    totalErrors++
                                }

                                let resourceAtIndex = lstResources[pos]
                                if (resourceAtIndex) {
                                    resourceAtIndex.issues.push(item)
                                }



                            } else {
                                unknownIssues.push(iss)
                            }


                        } else {
                            //this is an OO with no location. I didn't think this should happen & we don't know which resource caused it...
                            unknownIssues.push(iss)
                        }

                    })
                }


                return {resources:lstResources,totalErrors:totalErrors,unknownIssues:unknownIssues,enhancedErrors:enhancedErrors}



            },

            fhirDataTypes : function(){

                return ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']
            },

            //create a bundle of LogicalModels
            createLMBundle : function (world) {
                let fhirDataTypes = this.fhirDataTypes()
                let urlBase = "http://canshare.co.nz/fhir/StructureDefinition"
                let bundle = {resourceType:"Bundle",type:"transaction",entry:[]}
                let merged = angular.copy({...world.compositions, ...world.dataGroups})     //all EDs
                Object.keys(merged).forEach(function (key) {
                    let model = merged[key]
                    let SD = {resourceType:"StructureDefinition"}

                    SD.text = {status:'generated'}
                    SD.text.div = `<div xmlns="http://www.w3.org/1999/xhtml">Logical model for ${model.title}</div>`

                    SD.id = `canshare-${model.name}`
                    SD.url = `${urlBase}/${model.name}`

                    SD.identifier = [{system:"http://canshare.co.nz/fhir/NamingSystem/logicalModels",value:model.name}]
                    SD.kind = "logical"
                    SD.status = "active"
                    SD.name = model.name
                    SD.type = `${urlBase}/${model.name}`
                    SD.fhirVersion = "4.0.1"
                    SD.abstract = false
                    //SD.baseDefinition = "http://hl7.org/fhir/StructureDefinition/Base"
                    SD.baseDefinition = "http://hl7.org/fhir/StructureDefinition/Element"
                    SD.derivation = "specialization"
                    SD.differential = {element:[]}

                    let elBase = {id:model.name,path:model.name,short:model.title}
                    elBase.definition = model.title     //todo - ?description in model
                    SD.differential.element.push(elBase)

                    if (model.diff) {
                        model.diff.forEach(function (ed) {
                            let path = `${model.name}.${ed.path}`  //assume flat structure ATM
                            let element = {id:path,path:path, short:ed.name}
                            element.min = 0
                            element.max = "1"
                            //assume only a single DT
                            if (fhirDataTypes.indexOf(ed.type[0].code) > -1) {
                                //this is a fhir data type
                                element.type = [{code:ed.type[0].code}]
                            } else {
                                element.type = [{code:"Reference"}]
                            }

                            SD.differential.element.push(element)

                        })
                    }
                    let entry = {resource: SD}
                    entry.request = {method:'PUT',url:`StructureDefinition/${SD.id}`}

                    bundle.entry.push(entry)

                })
                return bundle
            },

            makeQforDGDEP : function (fullElementList) {
                //make the items object a Q for a DG
                //todo - use by Composition Q eventually


                function createObjectFromPathList(pathValueList) {
                    const result = {};

                    pathValueList.forEach(item => {
                        const { path, value } = item;
                        const pathArray = path.split('.');
                        let currentObj = result;

                        for (let i = 0; i < pathArray.length - 1; i++) {
                            const key = pathArray[i];
                            if (!currentObj[key]) {
                                currentObj[key] = {};
                            }
                            currentObj = currentObj[key];
                        }

                        currentObj[pathArray[pathArray.length - 1]] = value;
                    });

                    return result;
                }

// Example list of items with paths and values

                let pathValueList = []
                fullElementList.forEach(function (item) {
                    let ed = item.ed
                    let path = item.ed.path
                    pathValueList.push({path:path,value:ed})
                })

                /*
                const pathValueList = [
                    { path: 'parent.child.grandchild', value: 42 },
                    { path: 'parent.anotherChild', value: 'hello' },
                    { path: 'something', value: [1, 2, 3] }
                ];
*/
                const resultObject = createObjectFromPathList(pathValueList);
                console.log(resultObject);

                return resultObject


                //-------------

                let currentItem = {item:[]}     //the item that currently has the ed
                let currentDepth = 0
                let pathRoot = "test"
                let hash = {}

                fullElementList.forEach(function (item) {
                    let ed = item.ed
                    let path = item.ed.path
                    let ar = path.split('.')
                    let leaf = ar[ar.length-1]   //the name od the element




                    let depth = path.split('.').length
                    if (depth !== currentDepth) {
                        //this is a nested entry
                        let previousItem = currentItem
                        let currentItem = {}

                    } else {

                    }


                    
                })

                


                return rootItem


            },

            makeQfromModelDEP : function(model, types) {
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



            },


            makeTreeFromElementList : function(arElements){
                //construct a tree assuming that arElements is in path order
                let that = this
                let rootEd = arElements[0].ed
                rootEd.kind = 'root'
                let treeData = []

                let treeIcons = {}
                treeIcons.section = "icon-qi-horizontal.png"
                treeIcons.dg = "icon-q-group.png"
                treeIcons.slice = "icon-q-group.png"


                //add the root
                let root = {id:rootEd.path,text: rootEd.title,parent:'#',data:{ed:rootEd}}
                treeData.push(root)

                for (let i=1; i < arElements.length; i++){          //skip the root
                    let ed = arElements[i].ed
                    let host = arElements[i].host         //will only be present in a composition section
                    //console.log(ed.path)
                    let ar = ed.path.split('.')
                    let leafPath = ar.pop()     // the name is the last item.
                    let parent = ar.join(".")  //the
                    let id = ed.path

                    //create the tree text
                    let text
                    if (host && host.title) {
                        text = host.title
                    }

                    text = text || ed.title || leafPath
                    //text =  text || leafPath

                    let node = {id:id,text:text,parent:parent,data:{ed:ed,host:host}}

                    node.icon = `icons/icon_primitive.png`  //the default icon

                    //console.log(ed.kind)
                    if (ed.kind) {

                        //let iconFile = `icons/${treeIcons[ed.kind]}`
                        if (treeIcons[ed.kind]) {
                            node.icon = `icons/${treeIcons[ed.kind]}`
                        }

                        switch (ed.kind) {
                            case 'slice' :
                                node['a_attr'] = { "style": "color : purple" }
                                break
                        }
                    }
                    if (ed.zElement) {
                        node.icon = `icons/icon-q-open-choice.png`
                    }

                    if (ed.type && ed.type[0] == 'CodeableConcept') {
                        node.icon = "icons/icon_datatype.gif"
                    }


                    if (ed.fixedCoding || ed.fixedString) {
                        node['a_attr'] = { "style": "color : blue" }
                    }

                    //required

                    if (ed.mult) {
                        //required bolding
                        if (ed.mult.indexOf('1..') > -1) {
                            //node['a_attr'] = { "style": "color : red" }
                            node['a_attr'] = { "style": "font-weight:bold" }
                        }
                        //multiple
                        if (ed.mult.indexOf('..*') > -1) {
                            node.text += " *"
                        }

                    }

                    /*
                    if (ed.mult && ed.mult.indexOf('1..') > -1) {
                        //node['a_attr'] = { "style": "color : red" }
                        node['a_attr'] = { "style": "font-weight:bold" }
                    }
*/

                    if (ed.mult && ed.mult == '0..0') {
                        //don't add removed elements
                    } else {
                        treeData.push(node)
                    }

                }

                //console.log(treeData)
                return treeData


            },

            makeOrderedFullList : function (elements) {
                //generate a list of elements for a given DG (based on the allElements array) that follows the slicing order
                //elements is the complete list of elements, including those derived from parents referenced eds

                //first construct an object that represents the hierarchy (rather than a flat list of elements).
                let dgName = elements[0].ed.path
                let hash = {}
                let rootPath

                elements.forEach(function (item,inx) {
                    let ed = item.ed
                    let path = ed.path
                    hash[path] = {ed:ed,children:[]}  //add to the hash in case it is a parent...

                    //add the ed to the parent
                    let ar = ed.path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        let parentPath = ar.join('.')
                        if (!hash[parentPath]) {
                            alert(`The paths in DG ${dgName} have become corrupted. The path ${parentPath} could not be found. You'll need to reset.`)
                        } else {
                            hash[parentPath].children.push(hash[path])
                        }
                    } else {
                        //this is the top node

                        rootPath = ar[0]
                    }
                })

                // now we can build the ordered list
                //console.log(hash)

                let arLines = []

                //the recursive processing function
                function processNode(ar,node,spacer) {
                    //sep 8 - there was a 'children' element - don't think we want that
                    let clone = angular.copy(node)
                    delete clone.children
                    //console.log(clone)
                    ar.push(clone)
                    //ar.push(node)

                    if (node.children) {
                        node.children.forEach(function (child) {
                            processNode(ar,child,spacer)
                        })
                    }
                }

                processNode(arLines,hash[rootPath],"")

                //There's a particular issue in that slicing changes the datatype for the 'parent' element to Group
                //but parents of that element may still persist (they get added as the parents are processed first
                //so create a list of all elements with a type of Group. Then, from the originalType we can create
                // a list of elements that came directly from the type and remove them (or set mult = 0..0)
                //only do this if the element was sliced (originalType present).

                let arHiddenElements = []  //an array of elements whose children should be hidden unless they are slices

                arLines.forEach(function (item) {
                    if (item.ed && item.ed.type) {
                        let type = item.ed.type[0]
                        if (type == 'Group' && item.ed.originalType) {  //presence of originalType indicates this element was sliced
                            console.log("Group!",item.ed)
                            arHiddenElements.push(item.ed.path)
                            //if there are any elements that
                        } else{
                            arHiddenElements.forEach(function (prefix) {
                                let pathToTest = item.ed.path
                                if (pathToTest.startsWith(prefix) && pathToTest.indexOf('slice:') == -1) {
                                    item.ed.mult = "0..0"
                                }
                            })
                        }
                    }

                })




                return arLines



            },

            getFullListOfElements(inModel,inTypes,hashAllDG) {
                //console.trace()
                //create a complete list of elements for a DG (Compositions have a separate function)

                //processing the DG hierarchy is destructive (the parent element is removed after processing
                //to avoid infinite recursion
                let types = angular.copy(inTypes)
                //ensure the types has the FHIR dts as well
                let fdt = this.fhirDataTypes()
                fdt.forEach(function (dt) {
                    types[dt] = dt
                })

                let relationshipsSummary = {parents:[],references:[],children:[]}       //all the relationships for this DG (reference 1 level only)

                let model = angular.copy(inModel)

                let topModel = angular.copy(model)
                let allElements = []
                let errors = []

                let hashEdges = {}      //a has to track edges between nodes to adoid duplication

                let arNodes = []      //for the graph
                let arEdges = []      //for the graph

                //first follow the parental hierarchy to populate the initial list
                //updates allElements as it extracts
                //as it moves up the hierarchy, add the element to the list (based on the path) unless there is
                //already one there (so it replaced the parental one)

                //create as ed to act as the root
                let edRoot = {ed:{path:model.name,title:model.title,description:model.description}}
                allElements.push(edRoot)

                extractElements(model,model.name)

                let nodes = new vis.DataSet(arNodes)
                let edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                let graphData = {
                    nodes: nodes,
                    edges: edges
                };

                //now populate the children array - ie models that have this dg as a parent
                Object.keys(hashAllDG).forEach(function (key) {
                    if (hashAllDG[key].parent == inModel.name) {
                        relationshipsSummary.children.push(key)
                    }
                })

                return {allElements: allElements,graphData:graphData,relationshipsSummary:relationshipsSummary}

                // add to list of elements, replacing any with the same path (as it has been overwritten)
                //todo - what was 'host' for?
                function addToList(ed,host,sourceModel) {
                    //is there already an entry with this path
                    let path = ed.path

                    let pos = -1
                    allElements.forEach(function (element,inx) {
                        // if (element.path == path) {   //changed Jul-29
                        if (element.ed.path == path) {     //should only be one (unless there are duplicate names in the model
                            pos = inx
                        }
                    })

                    let itemToInsert = {ed:ed,host}
                    if (host) {     //todo not sure if this is still used...
                        itemToInsert.host = host
                    }

                    //record the sourceModel - ie where in the hierarchy this element came from
                    if (sourceModel) {
                        itemToInsert.ed.sourceModelName = sourceModel.name
                    }

                    if (pos > -1) {
                        //replace the existing path

                        allElements.splice(pos,1,itemToInsert)
                    } else {
                        allElements.push(itemToInsert)          //this is what was working - just at the end
                    }
                }

                //add graph node to the node list, replacing any with the same id
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

                //process a single element at the root of the DG
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

                    //do parents first.
                    if (model.parent ) {
                        if (types[model.parent]) {
                            //this is called whenever there is a DG to be expanded
                            if (pathRoot.split('.').length == 1) {
                                //if there is no '.' then this must be a DG parent
                                relationshipsSummary.parents.splice(0,0,model.parent)         //the name of the parent
                            } else {
                                //this must be a DG referenced by an element within the DG (or one of its ancestors)
                                relationshipsSummary.references.push({path:pathRoot,type:model.name})
                            }


                            //to prevent infinite recursion
                            let parent = model.parent
                            delete model.parent

                            //create the 'parent' link  todo - graph needs to add parent
                            let edge = {id: 'e' + arEdges.length +1,
                                from: model.name,
                                //to: model.parent,
                                to: parent,
                                color: 'red',
                                width: 4,
                                label: 'specializes',arrows : {to:true}}
                            arEdges.push(edge)

                            extractElements(types[parent],pathRoot)
                        } else {
                            errors.push(`missing type name ${model.parent}`)
                            console.log(`missing type name ${model.parent}`)
                        }
                    }

                    if (model.diff) {
                        model.diff.forEach(function (ed) {
                            if (ed.type && ed.type.length > 0) {
                                let type = ed.type[0]   //only look at the first code
                                if (types[type]) {
                                    //this is a known type. Is there a definition for this type (ie do we need to expand it)
                                    //a fhir datatype will not have a diff...
                                    let childDefinition = types[type]


                                    if (childDefinition.diff ) {
                                        //if there is a diff element in the type, then it can be expanded

                                        let relativePath =  $filter('dropFirstInPath')(`${pathRoot}.${ed.path}`)

                                        //let fullPath =   `${pathRoot}.${ed.path}`
                                        relationshipsSummary.references.push({path:relativePath,type:childDefinition.name})

                                        //avoid duplicates. where one DG refers to Observation multiple times, each results in Observation -> HCP
                                        let refHash = `${model.name}-${childDefinition.name}-${ed.path}`

                                        //only add an edge for a given source / target / path once
                                        if (! hashEdges[refHash]) {
                                            hashEdges[refHash] = true
                                            //create an edge. todo This is to ALL elements, so may want to filter
                                            let label = `${ed.path} ${ed.mult}`
                                            let edge = {id: 'e' + arEdges.length +1,
                                                from: model.name,
                                                to: childDefinition.name,
                                                color : 'blue',
                                                dashes : true,
                                                label: label,
                                                arrows : {to:true}}
                                            arEdges.push(edge)
                                        }



                                        //console.log('expanding child: ' + childDefinition.name)
                                        let clone = angular.copy(ed)
                                        clone.path = pathRoot + "." + ed.path
                                        // function addToList(ed,host,sourceModel) {
                                        addToList(clone,ed,model) //model will be the source

                                        extractElements(childDefinition,pathRoot + "." + ed.path)
                                    } else {
                                        //list add the ed to the list
                                        //this is a fhir dt
                                        let clone = angular.copy(ed,null,model) //include the model so the source of the ed is known

                                        clone.path = pathRoot + '.' + ed.path
                                        // function addToList(ed,host,sourceModel) {
                                        addToList(clone,null,model)

                                    }


                                } else {
                                    errors.push(`missing type ${model.name}`)
                                    alert(`The type ${type} could not be found looking at DG ${model.name}`)
                                }


                            } else {
                                alert(`ed ${model.name} ${ed.path} is missing the type `)
                                errors.push(`ed ${model.name} ${ed.path} is missing the type `)
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

                let types = {}
                this.fhirDataTypes().forEach(function (code) {
                    types[code] = {}
                })



                //add to the models hash. Will update types with custom types (ie the models) using model.name
                //will check that all names are unique
                addToHash(vo.dataGroups)
                addToHash(vo.compositions)
                //addToHash(vo.valueSets)     //treat vs as a type for the purposes of validation

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

                            /* currently not validating VS
                            if (ed.valueSet) {
                                //check that the valueSet name is present in the world or is a url.
                                //If a url, then not defined in the world
                                if (! types[ed.valueSet] && ed.valueSet.substring(0,4) !== 'http') {
                                    errors.push({msg:`Missing valueSet name ${ed.valueSet} in model ${model.name} at diff #${inx}. (It's not a Url either)`,model:model, ED:ed})
                                }
                            }
                            */

                            //todo check for duplicated names in the model

                        })
                    } else {
                        if (model.kind == 'dg') {
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



            }
        }
    })