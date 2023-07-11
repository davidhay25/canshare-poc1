angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,$timeout,$uibModal,$filter) {

            //$scope.localStorage = $localStorage

            $scope.input = {}
            $scope.input.showFullModel = true

           // $localStorage.world = modelsSvc.getDemo()

            if (! $localStorage.world) {
                $localStorage.world = modelsDemoSvc.getDemo()
            }

            $scope.world = $localStorage.world

            $scope.resetWorld = function () {

                if (confirm("Are you wish to restore to the default demo state")) {
                    $localStorage.world = modelsDemoSvc.getDemo()
                    $scope.world = $localStorage.world
                    validateModel()
                }

            }

            $scope.dotCountDEP = function (s) {

                let ar = s.match(/\./g)
                console.log(ar)
                if (ar) {
                    console.log(ar.length)
                    return ar.length

                } else {
                    return 0
                }

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
                console.log(element)
                let vs = prompt("ValueSet url")
                if (vs) {
                    element.valueSet = vs       //for the immediate display


                    modelsSvc.updateOrAddElement($scope.selectedModel,element)
/*
                    //if there's already an overide in the model, then update it.
                    let relativePath =  $filter('dropFirstInPath')(element.path);
                    let found = false
                    $scope.selectedModel.diff.forEach(function(ed) {
                        if (ed.path == relativePath)  {
                            ed.valueSet = vs
                            found = true
                        }
                    })
                    //if not, then add it
                    if (! found) {
                        let newElement = angular.copy(element)
                        newElement.path = relativePath
                        $scope.selectedModel.diff.push(newElement)
                    }

                    */
                }

            }

            //------------

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

                //modelsSvc.getFullListOfElements(comp,$scope.input.types,$scope.input.showFullModel)

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
                $('#compositionTree').jstree('destroy');

                let x = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    $(this).jstree("open_all");
                    $scope.$digest();
                });

            }
        }
    )