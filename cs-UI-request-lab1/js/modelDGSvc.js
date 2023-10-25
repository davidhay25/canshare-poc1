angular.module("pocApp")

    .service('modelDGSvc', function($http,$q) {

        let config = {}


        return {

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
                console.log('===>',dg.name)
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

                /*

                if (dg.parent) {
                    let parentDG = hashAllDG[dg.parent]

                    while (parentDG) {
                        console.log('parent',parentDG.name)

                        if (hashParent[parentDG.name]) {
                            console.log(`The DG ${parentDG.name} is already a parent in the chain for ${dg.name}. It cannot appear more than once`)

                            return true
                        } else {
                            hashParent[parentDG.parent] = true
                        }

                        if (parentDG.parent) {
                            parentDG = hashAllDG[parentDG.parent]
                            console.log('ettting parent to ',parentDG)
                        } else {
                            delete parentDG
                        }




                    }
                }

*/

                return false

            },


            expandEdValues : function (ed) {
                let deferred = $q.defer()
                //return the list of possible options for en ed. There are 2 sources:
                //the 'options' array or the valueSet.

                if (ed.options) {
                    let ar = []
                    ed.options.forEach(function (opt) {
                        //assume text (.pt) only for now
                        //if there's no system, then the Q render will only check code. todo: need to add system
                        ar.push({code:opt.pt,display:opt.pt})

                    })
                    deferred.resolve(ar)

                } else if (ed.valueSet) {
                    //if there's a valueSet, then tru to expand it
                    let qry = `ValueSet/$expand?url=${ed.valueSet}&_summary=false`
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let expandedVS = data.data
                            let ar = []
                            for (const concept of expandedVS.expansion.contains) {
                                ar.push(concept)

                            }
                           // console.log(data.data)
                            deferred.resolve(ar)

                        }, function (err) {

                            console.error(`There was no ValueSet with the url:${ed.valueSet}`)
                        }
                    )
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
                //create a treeview ordered by parent
                //add the root
                let treeData = []
                let root = {id:"root",text: "DataGroup",parent:'#',data:{}}
                treeData.push(root)

                //make sorted list
                let ar = []
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]
                    ar.push(dg)
                })

                ar.sort(function (a,b) {
                    if (a.title > b.title) {
                        return 1
                    } else { return -1}
                })

                ar.forEach(function (dg) {
                //Object.keys(hashAllDG).forEach(function (key) {
                  //  let dg = hashAllDG[key]
                    let text = dg.title || dg.name
                    let parent = dg.parent || "root"
                   // console.log(text,parent)
                    let node = {id:dg.name,text:text,parent:parent,data:{dg:dg}}
                    treeData.push(node)
                })

                return {treeData:treeData}

            },

            makeFullGraph : function(in_hashAllDG,) {
                //create a single graph with all DGs. include hierarchy and references

                let hashIdNodesCreated = {}

                let hashAllDG = angular.copy(in_hashAllDG)
                let arNodes = []
                let arEdges = []

                //create the root node. This is the default parent (unless a DG already has one
                let rootNode = {id:"root", label: "root",shape: 'box',color:'white'}
                rootNode.data = {dg:{}}
                //arNodes.push(rootNode)


                Object.keys(hashAllDG).forEach(function (key) {

                    let DG = angular.copy(hashAllDG[key])



                    //create the node
                    //If there are multiple nodes with the same id, vis will crash
                    if (! hashIdNodesCreated[DG.name]) {
                        hashIdNodesCreated[DG.name] = true
                        let node = {id: DG.name, label: DG.name,shape: 'box'}
                        node.data = {dg:DG}
                        arNodes.push(node)
                    }



                    //add the defauls parent if needed
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

            updateChanges : function (DG,change,scope) {
                DG.changes = DG.changes || []
                DG.changes.push(change)
               // console.log('emitting')
                scope.$emit("dgUpdated",{})

            },

            makeDgDownload: function (allDG) {
                //create a download of all the DG
//console.log(allDG)

            },

            makeUpdateList: function (allDG,xref) {
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