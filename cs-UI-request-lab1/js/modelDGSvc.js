angular.module("pocApp")

    .service('modelDGSvc', function($http,$q,$localStorage,QutilitiesSvc) {

        let config = {}
        let vsUrlPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/" //the url prefix


        return {
            auditDGDiff : function (dg,hashAllDG) {
                //locate any 0..0 diff elements in the DG that do not correspond with parents. Occurs when parents are updated

                //first, go through the parental hierarchy and assemble a list of all elements in the hierarchy
                let hashAllParentalElements = {}
                let parentName = dg.parent  //the name of the parent

                while (parentName) {
                    let pDG = hashAllDG[parentName]
                    if (pDG) {
                        if (pDG.diff) {
                            pDG.diff.forEach(function (ed) {
                                if (ed.mult !== '0..0') {      //only concern ourselves with actual definitions atm
                                    hashAllParentalElements[ed.path] = {path:ed.path,defined:parentName,definedTitle:pDG.title, type:ed.type}
                                }
                            })
                        }
                        parentName = pDG.parent
                    } else {
                        alert(`The parent: ${parentName}  was not found`)
                        return {allElements: {},lstRedundantEd:[]}
                    }

                }

                //now go through the diff of the DG under check and see if any of the 0..0 elements there are not in the hierarchy
                let lstRedundant = []
                if (dg.diff) {
                    dg.diff.forEach(function (ed) {
                        let definition =  hashAllParentalElements[ed.path]  //is this element from a parent?

                        if (ed.mult == '0..0') {
                            //let definition =  hashAllParentalElements[ed.path]
                            if (definition) {
                                //Yes! this is zeroing out an element from the hierarchy
                                definition.mult = '0..0'
                            } else {
                                //this is zeroing out an element no longer in the hierarchy
                                lstRedundant.push(ed)
                            }
                        } else {
                            if (definition) {
                                definition.mult = ed.mult
                            } else {
                                //this ed is defined in the DG
                                //It's safe to add it to the hash at this point - even though it wasn't defined on a parent
                                hashAllParentalElements[ed.path] = {path:ed.path,defined:dg.name,definedTitle:dg.title, mult:ed.mult,type:ed.type}
                            }
                        }

                    })
                }

                //finally, create a sortedlist of the definitions (to make the display a little easier)
                let lst = []
                Object.keys(hashAllParentalElements).forEach(function (key) {
                    lst.push(hashAllParentalElements[key])
                })
                lst.sort(function (a,b) {
                    if (a.path > b.path) {
                        return 1
                    } else {
                        return -1
                    }

                })

                return {allElements: lst,lstRedundantEd:lstRedundant}

                //console.log(hashAllParentalElements)




            },
            getAllEW : function (lstElements,dgName) {
                //given the expanded element list - construct a list of all dependencies (enableWhen)
                let allDependencies = []

                //construct a hash of all elments in this DG
                let hashElements = {}
                lstElements.forEach(function (item) {
                    if (item.ed.mult !== '0..0') {
                        hashElements[item.ed.path] = item.ed
                    }
                })

                //now create the ew list
                lstElements.forEach(function (item) {
                    if (item.ed && item.ed.enableWhen && item.ed.mult !== '0..0') {
                        //note that the ew here is not the same as in the Q - for example it has 'source' rather than 'question'
                        item.ed.enableWhen.forEach(function (ew) {


                            //adjusts the source (controller) path for contained DG's with conditionals
                            let source = QutilitiesSvc.updateEWSourcePath(item.ed.path,ew.source)

                            //let sourceEd = hashElements[ew.source]
                            let sourceEd = hashElements[source]


                            /* - aug2024 - now sure that this is right
                            //for inherited elements the first segment is always the current dg name
                            let ar = item.ed.path.split('.')
                            ar[0] = dgName
                            let newPath = ar.join('.')
*/
                            let entry = {path:item.ed.path,ew:ew,ed:sourceEd}
                            //let entry = {path:newPath,ew:ew,ed:sourceEd}
                            if (! sourceEd) {
                                entry.error = `Warning! source ed not found at path ${ew.source}`
                            }

                            allDependencies.push(entry)
                        })
                    }

                })


                return allDependencies

            },
            auditDGDEP : function (hashAllDG) {
                //compare the DG hash with $localStorage. There could be a bug where localStorage is not being updated
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]
                    if (angular.toJson(dg) !== $localStorage.world.dataGroups[dg.name]) {
                        alert(`Warning! the Browser copy of the DG ${dg.name} doesn't match the copy in memory! You should re-load the page and check it. From modelDGSvc`)


                    }
                })
            },

            checkAllDG : function (hashAllDG) {
                //check DG for invalid construction that can crash the browser
                let that = this
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]

                    if (that.hasDuplicatedParent(dg,hashAllDG)){
                        //oops - there's a loop!
                        delete dg.parent
                        alert(`The DG: ${key} has a duplicated parent in the inheritance chain. The parent has been removed.`)
                    }

                })


            },

            hasDuplicatedParent : function(dg,hashAllDG) {
                //is there a repeated parent in the inheritance chain (will crash the browser
                //console.log('===>',dg.name)
                let hashParent = {}
                let model =  angular.copy(dg)
                while (model) {
                    if (model.parent) {
                        if (hashParent[model.parent]) {
                            alert(`The DG ${model.parent} is already a parent in this chain. It cannot appear more than once`)
                            return false
                        } else {
                            hashParent[model.parent] = true
                            model = hashAllDG[model.parent]
                        }
                    } else {
                        model = null
                    }
                }


                return false

            },


            expandEdValues : function (ed) {
                let deferred = $q.defer()
                //return the list of possible options for en ed. There are 2 sources:
                //the 'options' array or the valueSet. The valueSet has precedence


                if (ed && ed.valueSet) {
                    //if there's a valueSet, then try to expand it
                    let url = ed.valueSet
                    //the valueSet might be the full VS or just the name
                    if (! ed.valueSet.startsWith("http")){
                        url = `${vsUrlPrefix}${ed.valueSet}`
                    }

                    let qry = `ValueSet/$expand?url=${url}&_summary=false`
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let expandedVS = data.data
                            let ar = []
                            for (const concept of expandedVS.expansion.contains) {
                                ar.push(concept)

                            }
                            deferred.resolve(ar)

                        }, function (err) {

                            console.error(`There was no ValueSet with the url:${ed.valueSet}`)
                        }
                    )
                } else if (ed && ed.options) {
                    deferred.resolve(ed.options)
                }

                return deferred.promise
            },

            makeTreeViewOfCategories: function(hashCategories) {
                let treeData = []
                let root = {id:"root",text: "Categories",parent:'#',data:{}}
                treeData.push(root)

                Object.keys(hashCategories).forEach(function (key) {
                    let arCategory = hashCategories[key]

                    let node = {id:key,text: key,parent:'root',data:{}}
                    treeData.push(node)
                    arCategory.forEach(function (dg) {
                        let child = {id:dg.name,text: dg.title, parent:key,data:{dg:dg}}
                        treeData.push(child)
                    })

                })
                return {treeData:treeData}

            },

            analyseCategories: function(hashAllDG) {
                //create a hash by category of all DG
                let hashCategory = {}       //the return - keyed by categort code
                let hashDG = {}         //working - category for a DG keyed by DG name
                //first, add all the DG's that have the category directlt defined
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]
                    let cTag = findCategoryTag(dg)
                    if (cTag.code) {
                        hashCategory[cTag.code] = hashCategory[cTag.code] || []

                        hashCategory[cTag.code].push(dg)
                        hashDG[dg.name] = cTag.code         //we'll use this when we check for inherited catgories
                    }
                })

                //now run through all DGs again looking for inherited categories
                Object.keys(hashAllDG).forEach(function (key) {
                    let clone = hashAllDG[key]
                    while (clone.parent && ! hashDG[clone.name]) {
                        if (hashDG[clone.parent]) {
                            //the parent has a category
                            let category = hashDG[clone.parent]         //the parents category
                            hashCategory[category].push(clone)
                            hashDG[clone.parent] = category
                        }
                        clone = angular.copy(hashAllDG[clone.parent]) || {} //to allow for where the parent has not been downloaded

                    }
                })

                //console.log(hashCategory,hashDG)
                return hashCategory



                function findCategoryTag(DG) {
                    let cTag = {}
                    if (DG && DG.tags) {
                        //console.log(DG.name,DG.tags)
                        DG.tags.forEach(function (tag) {
                            if (tag.system == "dgcategory") {
                                cTag = tag
                            }
                        })
                    }
                    return cTag
                }
            },




            makeTreeViewOfDG : function(hashAllDG) {
                if (! hashAllDG) {
                    //return an empty tree
                    let root = {id:"root",text: "DataGroups tree",parent:'#',data:{}}
                    let treeData = [(root)]
                    return {treeData:treeData}
                }
                //create a treeview ordered by parent
                //add the root
                let treeData = []
                let root = {id:"root",text: "DataGroups tree",parent:'#',data:{}}
                treeData.push(root)

                //set up the sections (headings) tree
                let sectionTreeData = []
                let sectionRoot = {id:"Section",text: "Sections tree",parent:'#',data:{}}
                sectionTreeData.push(sectionRoot)

                //todo get


                //make a list
                let ar = []
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]
                    ar.push(dg)
                })

                //now sort by name for the full DG tree
                ar.sort(function (a,b) {
                    let aTitle = a.title || a.name
                    let bTitle = b.title || b.name
                    if (aTitle.toLowerCase() > bTitle.toLowerCase()) {
                        return 1
                    } else { return -1}
                })

                ar.forEach(function (dg) {
                    let text = dg.title || dg.name
                    let parent = dg.parent || "root"
                    let node = {id:dg.name,text:text,parent:parent,data:{dg:dg}}
                    treeData.push(node)

                })


                return {treeData:treeData,sectionTreeData : sectionTreeData}

            },

            makeSectionsTree : function(hashAllDG) {
                //oMake a tree that contains only the sections branch - ie all DG where the ultimate parent is "Section"

                let branchName = "Section"        //we want all DG's whose ultimate paretn is this one
                let sectionTreeData = []
                let sectionRoot = {id:"Section",text: "Sections tree",parent:'#',data:{}}
                sectionTreeData.push(sectionRoot)


                //create an alphabetized ;lis of DG
                let lst = []
                Object.keys(hashAllDG).forEach(function (key) {
                    lst.push(hashAllDG[key])
                })

                lst.sort(function (a,b) {
                    if (a.title > b.title) {
                        return 1
                    } else {
                        return -1
                    }
                })

                try {
                    lst.forEach(function (dg) {
                        if (dg.name !== branchName) {

                            //findUltimateParent can throw an exception if the parental hierarchy is incorrect - let it bubble up and alert
                            let ultimateParent = findUltimateParent(dg)

                            if (ultimateParent.name == branchName) {

                                let sectionNode = {id:dg.name,
                                    text:dg.title,
                                    parent:dg.parent,data:{dg:dg}}
                                sectionTreeData.push(sectionNode)
                            }
                        }

                    })
                } catch (ex) {
                    alert(ex)
                }


/*
                try {
                    Object.keys(hashAllDG).forEach(function (key) {
                        if (key !== branchName) {
                            let dgToFindUltimateParent = hashAllDG[key]
                            //console.log(key,dgToFindUltimateParent)
                            //findUltimateParent can throw an exception - let it bubble up
                            let ultimateParent = findUltimateParent(dgToFindUltimateParent)

                            if (ultimateParent.name == branchName) {

                                let sectionNode = {id:dgToFindUltimateParent.name,
                                    text:dgToFindUltimateParent.title,
                                    parent:dgToFindUltimateParent.parent,data:{dg:dgToFindUltimateParent}}
                                sectionTreeData.push(sectionNode)
                            }
                        }

                    })
                } catch (ex) {
                    alert(ex)
                }
*/

                return {treeData: sectionTreeData}

                function findUltimateParent(dg) {
                    let dgName = dg.name
                    let tmpDG = dg

                    let ctr = 0

                    while (tmpDG.parent) {
                        let parent = tmpDG.parent
                        let dgTitle = tmpDG.title
                        tmpDG = hashAllDG[tmpDG.parent]
                        if (! tmpDG) {
                            throw new Error(`DG ${parent} was not found. Referenced in ${dgTitle}`)
                            return
                        }

                        ctr++
                        if (ctr > 100) {
                            throw new Error(`Error finding ultimate parent of ${dgName}`)
                            return
                        }

                    }
                    return tmpDG

                }

            },

            makeFullGraph : function(in_hashAllDG,hideReferences) {

                //create a single graph with all DGs. hashierarchy and optionally references
                //shows on the main page

                let hashIdNodesCreated = {}

                let hashAllDG = angular.copy(in_hashAllDG)
                let arNodes = []
                let arEdges = []

                //create the root node. This is the default parent (unless a DG already has one
                let rootNode = {id:"root", label: "root",shape: 'box',color:'white'}
                rootNode.data = {dg:{}}


                Object.keys(hashAllDG).forEach(function (key) {

                    let DG = angular.copy(hashAllDG[key])



                    //create the node
                    //If there are multiple nodes with the same id, vis will crash
                    if (! hashIdNodesCreated[DG.name]) {
                        hashIdNodesCreated[DG.name] = true
                        let node = {id: DG.name, label: DG.name,shape: 'box'}
                        node.data = {dg:DG}
                        arNodes.push(node)
                    } else {
                        console.error(`Duplicate DG name: ${DG.name}`)
                    }



                    //add the default parent if needed
                    if (! DG.parent) {
                        DG.parent = "root"
                    }

                    //check for parent
                    if (DG.parent) {
                        //create the 'parent' link  todo - graph needs to add parent
                        let edge = {id: 'e' + arEdges.length +1,
                            from: DG.name,
                            //to: model.parent,
                            to: DG.parent,
                            color: 'red',
                            //width: 4,
                            label: 'specializes',arrows : {to:true}}
                        arEdges.push(edge)
                        //console.log(edge)
                    } else {
                        //there is
                    }

                    DG.diff.forEach(function (ed) {
                        let type = ed.type[0]           //assume one type only

                        //let leafPath = $filter('lastInPath')(ed.path)

                        if (! hideReferences) {
                            if (hashAllDG[type] && hashAllDG[type].diff) {
                                //this is a DG (rather than a FHIR DT) as it has a diff
                                //create a reference edge
                                let edge = {id: 'e' + arEdges.length +1,
                                    from: DG.name,
                                    //to: model.parent,
                                    to: hashAllDG[type].name,
                                    //color: 'red',
                                    //width: 4,
                                    label: ed.path,arrows : {to:true}}
                                arEdges.push(edge)


                            }
                        }



                    })



                })


                let nodes = new vis.DataSet(arNodes)
                let edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                let graphData = {
                    nodes: nodes,
                    edges: edges
                };

                return {graphData:graphData}

            },

            updateChangesDEP : function (DG,change,scope) {
                DG.changes = DG.changes || []
                DG.changes.push(change)
               // console.log('emitting')
                scope.$emit("dgUpdated",{})

            },



            makeUpdateListDEP: function (allDG,xref) {
                //create a list of all DG updates
                //let report = {newDG:[],newElement:[],changedElement:[]}
                let report = []

              //  console.log(xref)

                Object.keys(allDG).forEach(function (key) {
                    let dg = allDG[key]
                    if (dg.status == 'new') {
                        let item = {DGName:dg.name,msg:"New DataGroup",xref:xref[dg.name]}
                        report.push(item)

                    } else {
                        if (dg.changes) {
                            dg.changes.forEach(function (change) {
                                //{edPath: msg: }
                                let item = {DGName:dg.name,msg:change.msg,path:change.edPath,xref:xref[dg.name]}
                                report.push(item)
                            })
                        }

                    }
                })

                return report

            }
        }
    })