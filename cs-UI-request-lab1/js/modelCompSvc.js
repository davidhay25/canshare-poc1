angular.module("pocApp")

    .service('modelCompSvc', function($q,$http,modelsSvc,$filter,orderingSvc) {

        let config = {}


        return {
            makeFullListv2 : function (inComp,inTypes,inHashAllDG) {
                //Generate the full list by iterating over the sections. Assume each section has a single 'sectionDG'

                let fullList = []

                let compName = inComp.name

                //the composition name needs to be first
                fullList.push({ed:{path:compName},name:compName})

                inComp.sections.forEach(function (sect) {
                    let sectName = sect.name
                    let item = sect.items[0]        //actually, could iterate over multiple dg if needed....
                    //section may not have items...
                    if (item) {
                        let dgName = item.name
                        let dg = inHashAllDG[dgName]
                        let vo = modelsSvc.getFullListOfElements(dg,inTypes,inHashAllDG)
                        let allElements = vo.allElements

                        orderingSvc.sortFullListByInsertAfter(allElements,dg,inHashAllDG)
                        let ar = allElements.filter(item => item.ed.mult !== '0..0')

                        //each section needs an entry
                        //todo - is more detail needed in the ed???
                        fullList.push({ed:{path:`${compName}.${sectName}`,title:sect.title,mult:sect.mult}})

                        //fullList.push({ed:{path:`${compName}.${sectName}.${dgName}`}})

                        ar.forEach(function (item){
                            let ed = angular.copy(item.ed)
                            //ed.path = `${compName}.${sectName}.${dgName}.${ed.path}`
                            ed.path = `${compName}.${sectName}.${ed.path}`
                            fullList.push({ed:ed})


                        })
                    }



                })

                return {allElements: fullList}


/*

                let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)
                if (vo.log && vo.log.length > 0) {
                    $scope.errorLog = vo.log
                }


                $scope.graphData = vo.graphData
                $scope.relationshipsSummary = vo.relationshipsSummary   //all the relationships - parent and reference - for this type

                //sort the elements list to better display slicing
                $scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)
                $scope.fullElementHash = {}         //I seem to need this quite a lot. Though memory usage is getting high...
                //create the list of all paths in the DG. Used by the 'ordering'
                $scope.allPaths = []
                $scope.fullElementList.forEach(function (item) {
                    $scope.fullElementHash[item.ed.path] = item.ed
                    if (item.ed.mult !== '0..0') {
                        $scope.allPaths.push(item.ed.path)
                    }
                })


                orderingSvc.sortFullListByInsertAfter($scope.fullElementList,dg,$scope.hashAllDG)   //adjust according to 'insertAfter' values
                $scope.dgReferencesOrdering = orderingSvc.getOrderingForReferences($scope.fullElementList,dg,$scope.hashAllDG)
*/

            },

            allDGsInCompDEP: function(comp,hashAllDG){
                //return a list of all DG's used in a given composition

                let hashUsedDG = {}

                //add all the elements that are DG's to the list
                function processDG(dg,path) {

                    if (dg.diff) {
                        dg.diff.forEach(function (ed) {
                            let type = ed.type[0]
                            if (hashAllDG[type]) {
                                //this is a DG. Add it to the list then check recursively
                                hashUsedDG[type] = hashUsedDG[type] || []
                                let newPath = `${path}.${dg.name}.${ed.path}`
                                hashUsedDG[type].push({path:newPath,title:ed.title})
                                processDG(hashAllDG[type],newPath)
                            }
                        })
                    }
                }


                comp.sections.forEach(function (sect) {
                    //console.log(sect)
                    sect.items.forEach(function (item) {
                        //name, title,type
                        let type = item.type[0]
                        if (hashAllDG[type]) {
                            hashUsedDG[type] = hashUsedDG[type] || []
                            hashUsedDG[type].push({path:sect.name + ": ",title:sect.title})
                            //console.log(type)
                            processDG(hashAllDG[type],sect.name + ": ")
                        }

                    })
                })

                let lst = []

                Object.keys(hashUsedDG).forEach(function(key) {
                    let o = hashUsedDG[key]
                    let item = {name:key,paths:hashUsedDG[key]}
                    lst.push(item)
                })

                lst.sort(function (a,b) {
                    if (a.name.toLowerCase() > b.name.toLowerCase()) {
                        return 1
                    } else {
                        return -1
                    }
                })

                return {hashUsedDG:hashUsedDG,lstUsedDG : lst}

            },

            filterList : function(lst,removeFirst) {
                //return a list removing all elements with a mult of 0..0 or a parent with that mult
                //lst is array of {ed:}
                //if removeFirst is true, then remove the foirst element as this is the DG root ele,ment
                let filteredList = []
                let lstExclude = []
                //create a list of all paths that are 0..0  They, and their children, will be excluded
                //let hashExclude = {}
                lst.forEach(function (item) {
                    if (item.ed.mult == '0..0') {
                        //hashExclude[item.ed.path] = true
                        lstExclude.push(item.ed.path)
                    }
                })

                //now construct the filtered list
                lst.forEach(function (item) {
                    let path = item.ed.path
                    let include = true
                    for (const excl of lstExclude) {
                        //if (path.startsWith(excl) || path == excl){
                        if (path.isChildPath(excl) || path == excl){
                            include = false
                            break
                        }

                    }
                    if (include) {
                        filteredList.push(item)
                    }

                })

                if (removeFirst) {
                    filteredList.splice(0,1)
                }

                return filteredList

            },

            makeTSVDownload : function (lstElements) {
                //create a simple download of all items in the Composition
                let lst = []
                let lne = `Path\tTitle\tDescription\tType\tValueSet\tCard.`
                lne += "\r\n"
                lst.push(lne)

                lstElements.forEach(function (item) {
                    let shortPath = $filter('dropFirstInPath')(item.ed.path)

                    let lne = `${shortPath}\t${getValue(item.ed.title)}`
                    lne += "\t" + getValue(item.ed.description)
                    if (item.ed.type) {
                        lne += "\t" + item.ed.type[0]
                    } else {
                        lne += "\t"
                    }
                    //lne += "\t" + item.ed.type[0]
                    lne += "\t" + getValue(item.ed.valueSet)
                    lne += "\t" + getValue(item.ed.mult)

                    /*
                    if (item.ed.type) {
                        lne += "\t" + item.ed.type[0]
                        //lne += "," + item.ed.type[0]
                    } else {
                        lne += "\t"
                    }

                    */
                    lne += "\r\n"
                    //console.log(lne)\
                    if (item.ed.mult !== '0..0') {
                        lst.push(lne)
                    }

                })


                let result = lst.toString()
                result = result.replace(/\,/g, "")  //no idea why it's inserting commas...
                return result

                function getValue(s){
                    if (s) {
                        return s
                    } else {
                        return""
                    }

                }

            },

            makeFullList: function (inComp,inTypes,inHashAllDG) {

                //shouldn't happen
                if (!inComp) {
                    console.error("Called makeFullList with empty comp")
                    return
                }

                let arLog = []    //error messages - eg missing DG

                let comp = angular.copy(inComp)         //as we will be modifying the composition
                let hashAllDG = angular.copy(inHashAllDG)

                //generate a full list of elements for a composition. Like DG but need to accomodate sections
                //section name is in the path...

                //assume that composition do not have a hierarcy

                //processing the DG hierarchy is destructive (the parent element is removed after processing
                //to avoid infinite recursion
                let types = angular.copy(inTypes)

                let allElements = []

                let hashAllElements = {}        //keyed on path

                //create as ed to act as the root
                let edRoot = {path:comp.name,title:comp.title}
                hashAllElements[comp.name] = {ed:edRoot}

                //allElements.push(edRoot)

                //processes a single DG, adding child elements (recursively) to the hash
                function processDG(DG,pathRoot) {

                //    console.log("ProcessDG:" + DG.name)
                    if (DG.parent) {
                        //todo
                        let parentModel = types[DG.parent]
                        delete DG.parent
                        processDG(parentModel,pathRoot)
                    } else {
                        //This is a 'leaf' DG. Iterate through the diff
                        DG.diff.forEach(function (ed) {

                            let type = ed.type[0]
                            let model = types[type]
                            if (model && model.name) {
                                model.kind = 'dg'  //<<<<<<<<< todo added oct2 - not sure of implications
                                //console.log(types[type])
                                let childPath = `${pathRoot}.${model.name}`
                                hashAllElements[childPath] = {ed:model,host:ed}
                                processDG(model,childPath)

                            } else {
                                //this is a FHIR DT
                                let path = `${pathRoot}.${ed.path}`
                                ed.kind = 'element'
                                hashAllElements[path] = {ed:ed}
                            }
                        })
                    }

                }

                //process a single section item. Create and add the section to the hash, then call processDG to get the child elements of the DG
                function processSectionItem(sectionItem,pathRoot) {
                   // console.log("ProcessSectionItem:"+sectionItem.name)
                    //extract all the elements in the DG,
                    let localPath = sectionItem.name         //the path in the section. Often the DG name
                    let type = sectionItem.type[0]   //one type only
                    //let mult = sectionItem.mult     //how many times this item (DT, DG) can appear in the section

                    //let type = DG.name   //one type only
                    let model = types[type]    //this could be a FHIR DT or a DG. A DG will have a name, a DT will not

                    if (model && model.name) {
                        //This is a DG. todo need to think about DG inheritance

                        let childPathRoot
                        //let childPathRoot = `${pathRoot}.${model.name}`

                        childPathRoot = `${pathRoot}.${localPath}`
                        model.kind = "dg"   //<<<<<<<<< oct 2
                        hashAllElements[childPathRoot] = {ed:model,host:sectionItem}


                        let vo = modelsSvc.getFullListOfElements(model,types,hashAllDG)
                        let allElementsThisDG = modelsSvc.makeOrderedFullList(vo.allElements)     //orders the list and removes group original children

                        //todo >>>> here is where the 'insertAfter' re-ordering should go..



                        //The first element in this list is actually the DG - not an element.
                        //I'm a little nervous about changing that, so we'll just ignore the first one

                        allElementsThisDG.forEach(function (item,inx) {

                            if (inx > 0) {          //ignoring the first one
                                let ed = item.ed

                                if (! ed.kind) {
                                    ed.kind = 'no kind set'     //actually, this should never occur as there's always a type...

                                    if (ed.type) {
                                        let type = ed.type[0]
                                        if (types[type] && types[type].name) {
                                            ed.kind = 'dg'
                                        } else {
                                            ed.kind = 'element'
                                        }

                                    }

                                }

                                //ed.kind = 'element'
                               //jan 16 ed.kind = ed.kind ||  'no kind set'  //'element'  //<<< aded oct 2
                                let shortPath = $filter('dropFirstInPath')(ed.path)

                                //jan 16 let p
                                //jan 16if (ed.type) { p = ed.type[0]}
                                //console.log(shortPath,ed.path,ed.mult,p)

                                let path = `${childPathRoot}.${shortPath}`
                                hashAllElements[path] = {ed:ed}
                            }

                        })


                    } else {
                        console.log('missing name: ',model)
                        //this is a Z element - ie a FHIR DT directly attached to the section
                        // or a missing DG

                        arLog.push(`Missing type: ${type} path: ${localPath}`)

                       // alert(`Missing type: ${type} (may be a z element - will need fixing if so)`)
                    }

                }

                //note the assumptions of a single level hierarchy - a parent cannot have another parent
                function processComp(comp) {

                        //todo - check for removed sections in th eoverride


                        comp.sections.forEach(function (section) {

                            //let pathRoot = `${comp.name}.section-${section.name}`   //section root is model name + section name
                            let pathRoot = `${comp.name}.${section.name}`   //section root is model name + section name
                            hashAllElements[pathRoot] = {ed:section}
                            //each item is assumed to be a DG - think about others (Z & override) later
                            section.items.forEach(function (item) {
                               //{name: title: type: mult:}

                                processSectionItem(item,pathRoot)


                            })

                            //let DG = types[section.name]


                        })

                }

                processComp(comp)

                //Now process any overrides
                if (comp.override) {
                    Object.keys(comp.override).forEach(function (path) {
                        hashAllElements[path] = {ed:comp.override[path]}
                    })
                }

                let ar = []
                Object.keys(hashAllElements).forEach(function (key) {
                    let item = hashAllElements[key]         // {ed: sectionItem: }
                    delete item.ed.diff //don't think the diff is needed here...
                    let clone = angular.copy(item)        //don't want to update the actual model
                    clone.ed.path = key

                    ar.push(clone)
                })

                if (arLog.length > 0) {
                    let msg = ""
                    for (const s of arLog) {
                        msg += s + '\n'
                    }
                    alert(msg)
                }


                return {allElements:ar,hashAllElements:hashAllElements}




            }
        }
    })