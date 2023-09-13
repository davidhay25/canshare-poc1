angular.module("pocApp")

    .service('modelDGSvc', function() {

        let config = {}


        return {

            makeTreeViewOfDG : function(hashAllDG) {
                //create a treeview ordered by parent
                //add the root
                let treeData = []
                let root = {id:"root",text: "Root",parent:'#',data:{}}
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
                    console.log(text,parent)
                    let node = {id:dg.name,text:text,parent:parent,data:{dg:dg}}
                    treeData.push(node)
                })

                return {treeData:treeData}

            },

            makeFullGraph : function(in_hashAllDG,) {
                //create a single graph with all DGs. include hierarchy and references

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
                    let node = {id: DG.name, label: DG.name,shape: 'box'}
                    node.data = {dg:DG}
                    arNodes.push(node)
/*
                    //add a reference to the root for all nodes
                    let edge = {id: 'root-' +arEdges.length +1,
                        from: DG.name,
                        //to: model.parent,
                        to: "root",

                        label: '',arrows : {to:true}}
                    arEdges.push(edge)
*/

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
                console.log('emitting')
                scope.$emit("dgUpdated",{})

            },

            makeDgDownload: function (allDG) {
                //create a download of the DG
            },

            makeUpdateList: function (allDG,xref) {
                //create a list of all DG updates
                //let report = {newDG:[],newElement:[],changedElement:[]}
                let report = []

                console.log(xref)

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