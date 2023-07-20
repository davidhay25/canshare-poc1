angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,modelCompSvc, $timeout,$uibModal,$filter) {

            //$scope.localStorage = $localStorage

            $scope.input = {}
            $scope.input.showFullModel = true

            $scope.mCodeGroupPage = {}
            $scope.mCodeGroupPage.disease = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-disease.html"
            $scope.mCodeGroupPage.patient = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-patient.html"
            $scope.mCodeGroupPage.assessment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-assessment.html"
            $scope.mCodeGroupPage.treatment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-treatment.html"
            $scope.mCodeGroupPage.genomics = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-genomics.html"
            $scope.mCodeGroupPage.outcome = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-outcome.html"

           // $localStorage.world = modelsSvc.getDemo()

            if (! $localStorage.world) {
                $localStorage.world = modelsDemoSvc.getDemo()
            }

            $scope.world = $localStorage.world




            //xref is cross references between models/types
            //hash[type name] - array of type name
            $scope.xref = modelsSvc.getReferencedModels($scope.world)


            $scope.resetWorld = function () {

                if (confirm("Are you wish to restore to the default demo state")) {
                    $localStorage.world = modelsDemoSvc.getDemo()
                    $scope.world = $localStorage.world
                    validateModel()
                }

            }


            //
/*
            //add the indicated DG to the section.
            //Create a section item and add it to the section
            $scope.addDGtoSection = function (section,DG) {
                console.log(DG)
                console.log(section)
                //sectionItem is {name: title: type: mult:}
                let sectionItem = {}
                sectionItem.name = DG.name;
                sectionItem.title = DG.title;
                sectionItem.type = [DG.name]
                sectionItem.mult = "0..1"
                $scope.selectedModel.sections.forEach(function (sect) {
                    console.log(sect)
                    if (sect.name == section.name) {
                        sect.items.push(sectionItem)
                    }
                })
                $scope.selectComposition($scope.selectedModel)
            }

            $scope.removeDGfromSection = function(item) {
                console.log(item)
            }
*/
            // ------------


            $scope.listAllDG = function () {
                $scope.input.showDGList = true
                delete $scope.selectedModel
            }



            //---------- functions to edit a model from the tree

            //set the multiplicity of the element to 0..0
            $scope.removeElement = function (element) {
                element.mult = "0..0"
                modelsSvc.updateOrAddElement($scope.selectedModel,element)
            }

            //removes the override
            $scope.reinstateElementDEP = function (element) {
                delete element.mult
                modelsSvc.removeElement($scope.selectedModel,element)
            }

            //allow the user to set the VS for a given element
            $scope.setValueSet = function (element) {
                //console.log(element)
                let vs = prompt("ValueSet url")
                if (vs) {
                    element.valueSet = vs       //for the immediate display

                    modelsSvc.updateOrAddElement($scope.selectedModel,element)

                }

            }

            //------------

            //select a DataGroup or composition from the list / table
            $scope.selectModelFromList = function (name,kind) {

                let m
                switch (kind) {
                    case "dg" :
                        m = $scope.world.dataGroups[name]
                        if (! m) {
                            alert (`No datagroup with the name: ${name}`)
                        }
                        break
                    default :
                        alert ("Only datagroups can be selected ATM")
                        break
                }

                if (m) {
                    $scope.selectedModel = m
                    $scope.selectModel($scope.selectedModel)
                    delete $scope.input.showDGList
                }

                //$scope.selectedModel = $scope.world.dataGroups[name]
                //$scope.selectModel($scope.selectedModel)

            }

            //Generate a bundle of SD's to save on a FHIR server
            //each model (comp or dg) will be an SD
            $scope.makeBundle = function () {
                $scope.lmBundle = modelsSvc.createLMBundle($localStorage.world)
            }

            $scope.validateBundle = function (bundle) {


                delete $scope.lmValidate
                let qry = "http://hapi.fhir.org/baseR4/Bundle/$validate"
                $http.post(qry,bundle).then(
                    function (data) {
                        $scope.lmValidate = data.data
                        $scope.lmValidateSummary = modelsSvc.summarizeValidation(data.data,bundle)

                    }, function (err) {
                        $scope.lmValidate = err.data
                        $scope.lmValidateSummary = modelsSvc.summarizeValidation(data.data,bundle)
                    }
                )



                /*
                return

                let qry = "http://hapi.fhir.org/baseR4/StructureDefinition/$validate"
                $http.post(qry,bundle.entry[0].resource).then(
                    function (data) {
                        $scope.lmValidate = data.data
                        $scope.lmValidateStatus = data.status
                    }, function (err) {
                        $scope.lmValidate = err.data
                        $scope.lmValidateStatus = data.status
                    }
                )
                */
/*

                */

            }

            $scope.importVS = function (txt) {
                console.log(txt)
                let ar = txt.split('\n')
                ar.forEach(function (lne) {
                    let ar1 = lne.split('\t')
                    console.log(ar1)
                })

            }

            //create a new model
            $scope.newModel = function(kind) {
                let newModel = {kind:kind}
                $scope.editModel(newModel,true)
            }

            $scope.newComposition = function() {
                let newComp = {kind:'comp'}
                $scope.editComposition(newComp,true)
            }

            $scope.editComposition = function (model,isNew) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/editComposition.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller : "editCompositionCtrl",

                    resolve: {
                        model: function () {
                            return model
                        },
                        hashTypes: function () {
                            return $scope.input.types
                        },
                        hashValueSets : function() {
                            return $localStorage.world.valueSets
                        },
                        isNew: function () {
                            return isNew
                        }
                    }

                }).result.then(function (newModel) {
                    if (newModel) {
                        //if a model is returned, then it is a new one and needs to be added to the world


                        if (newModel.kind == 'comp') {
                            $localStorage.world.compositions[newModel.name] = newModel
                        } else {
                            $localStorage.world.dataGroups[newModel.name] = newModel
                        }

                        let vo1 = modelsSvc.validateModel($localStorage.world)
                        $scope.errors = vo1.errors
                        $scope.input.types = vo1.types      //a hash keyed by name

                        //a hash by type of all elements that reference it
                        $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                        $scope.selectModel(newModel)

                    } else {
                        //the model may have been updated - select it to refresh the various tabs
                        //note this is the model passed in for editing
                        $scope.selectModel(model)
                    }

                })

            }


            //edit an existing model
            $scope.editModel = function (model,isNew) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/editModel.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller : "editModelCtrl",

                    resolve: {
                        model: function () {
                            return model
                        },
                        hashTypes: function () {
                            return $scope.input.types
                        },
                        hashValueSets : function() {
                            return $localStorage.world.valueSets
                        },
                        isNew: function () {
                            return isNew
                        }
                    }

                }).result.then(function (newModel) {
                    if (newModel) {
                        //if a model is returned, then it is a new one and needs to be added to the world


                        if (newModel.kind == 'comp') {
                            $localStorage.world.compositions[newModel.name] = newModel
                        } else {
                            $localStorage.world.dataGroups[newModel.name] = newModel
                        }

                        let vo1 = modelsSvc.validateModel($localStorage.world)
                        $scope.errors = vo1.errors
                        $scope.input.types = vo1.types      //a hash keyed by name

                        //a hash by type of all elements that reference it
                        $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                        $scope.selectModel(newModel)

                    } else {
                        //the model may have been updated - select it to refresh the various tabs
                        //note this is the model passed in for editing
                        $scope.selectModel(model)
                    }

                })

            }

            function validateModel() {
                // validate the model. This retruns a hash of all types defined in the model as well as errors
                let vo1 = modelsSvc.validateModel($localStorage.world)
                $scope.errors = vo1.errors
                $scope.input.types = vo1.types      //a hash keyed by name
                $scope.input.arTypes = Object.keys(vo1.types)       //list of types foe new element dropdown


                //a hash by type of all elements that reference it
                $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

            }
            validateModel()

            $scope.selectModelFromTypeUsage = function (model) {
                $scope.selectedModelFromTypeUsage = model
            }

            //drop the first element in the path - used by the table display
            $scope.condensedPathDEP = function (path) {
                if (path) {
                    let ar = path.split('.')
                    ar.splice(0,1)
                    return  ar.join('.')
                    /*
                    let padding = ""
                    for (var i = 0; i < ar.length; i++) {
                        padding += "&nbsp;&nbsp;"
                    }

                    return  padding + ar.join('.')
                    */
                }
            }

            //$scope.input.arTypes = []


            $scope.addElement = function (name,type) {
                //add a new element to the current model
                $scope.selectedModel.diff = $scope.selectedModel.diff || []
                $scope.selectedModel.diff.push({path:name,title:name,type:[type]})
                $scope.selectModel($scope.selectedModel)

            }



            $scope.updateFullModelShow = function () {
                //when the 'show full model' checkbox is checked
                delete $scope.selectedNode
                $timeout(function(){
                    $scope.selectModel($scope.selectedModel)
                },100)

            }

            function clearB4Select() {
                delete $scope.selectedModel
                delete $scope.selectedNode
                delete $scope.input.showDGList
                delete $scope.selectedCompositionNode
            }




            $scope.showVS = function (name) {
                //name could either be a url or the name of a VS in the world
                let vsItem = $localStorage.world.valueSets[name]
                if (vsItem) {
                    console.log(vsItem)

                } else {
                    alert(`There is no ValueSet in the model with the name: ${name}. `)
                }
            }

            $scope.selectModelByName = function (name) {

            }

            $scope.selectComposition = function(comp){
                clearB4Select()
                $scope.selectedModel = comp

                let vo = modelCompSvc.makeFullList(comp,$scope.input.types)
                $scope.allCompElements = vo.allElements

                //console.log(vo)
                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                makeCompTree(treeData,rootNodeId)

            }

            //only used for DG now
            $scope.selectModel = function (comp) {
                clearB4Select()
                $scope.selectedModel = comp


                //create the list of override elements
                $scope.overrides = []
                $scope.selectedModel.diff.forEach(function (ed) {
                    if (ed.path.indexOf('.') > -1 ) {
                        $scope.overrides.push(ed)
                    }

                })

                $scope.Qobject = modelsSvc.makeQfromModel(comp,$scope.input.types)
                $scope.QR = {}

                let vo = modelsSvc.getFullListOfElements(comp,$scope.input.types,$scope.input.showFullModel)

                $scope.fullElementList = vo.allElements
                $scope.graphData = vo.graphData
                makeGraph()

                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                makeTree(treeData)

            }

           // $scope.selectDataGroup = function (comp) {
             //   clearB4Select()
           //     $scope.selectedDataGroup = comp
          //  }

            function makeGraph() {

                let container = document.getElementById('graph');
                if (container) {
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            barnesHut: {
                                gravitationalConstant: -10000,
                            }
                        }
                    };
                    if ($scope.graph) {
                        $scope.graph.destroy()
                    }

                    $scope.graph = new vis.Network(container, $scope.graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.graph.on("stabilizationIterationsDone", function () {

                        $scope.graph.setOptions({physics: false});
                    });

                    $scope.graph.on("click", function (obj) {
                        delete $scope.selectedModelFromGraph
                        let nodeId = obj.nodes[0];  //get the first node

                        let node = $scope.graphData.nodes.get(nodeId);

                        if (node.data && node.data.model) {
                            $scope.selectedModelFromGraph = node.data.model;
                            $scope.$digest()
                        }
                    })
                }
            }

            $scope.fitGraph = function () {
                if ($scope.graph) {
                    $timeout(function(){$scope.graph.fit()},500)
                }
            }

            function makeTree(treeData) {
                $('#dgTree').jstree('destroy');

                let x = $('#dgTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                       // console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    $(this).jstree("open_all");
                    $scope.$digest();
                });

            }

            //make the tree of the composition
            function makeCompTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                let x = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    // $("#designTree").jstree("close_all");
                    //                 $("#designTree").jstree("open_node","root");

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                        //console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    $(this).jstree("close_all");
                    $(this).jstree("open_node",rootNodeId);
                   // console.log(rootNodeId)
                    $scope.$digest();
                });

            }
        }
    )