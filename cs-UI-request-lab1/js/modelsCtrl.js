angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,$timeout) {

            //$scope.localStorage = $localStorage

            $scope.input = {}

            $localStorage.world = modelsSvc.getDemo()
                /*
            if (! $localStorage.world) {
                $localStorage.world = modelsSvc.getDemo()
            } else {
                //$scope.world = modelsSvc.getDemo()
            }
*/
            $scope.resetWorld = function () {
                //not working
                if (confirm("Are you wish to restore to the default demo state")) {
                    $localStorage.world = modelsSvc.getDemo()
                }

            }

            $scope.world = $localStorage.world      //so world can be accessed from html page



           // $scope.compositions = world.compositions
          //  $scope.dataGroups = world.dataGroups

            // validate the model. This retruns a hash of all types defined in the model as well as errors
            let vo1 = modelsSvc.validateModel($localStorage.world)
            $scope.errors = vo1.errors
            $scope.input.types = vo1.types      //a hash keyed by name

            //a hash by type of all elements that reference it
            $scope.analysis = modelsSvc.analyseWorld($scope.world,$scope.input.types)
            $scope.selectModelFromTypeUsage = function (model) {
                $scope.selectedModelFromTypeUsage = model
            }

            //$scope.input.arTypes = []
            $scope.input.arTypes = Object.keys(vo1.types)       //list of types foe new element dropdown

            $scope.addElement = function (name,type) {
                //add a new element to the current model
                $scope.selectedModel.diff = $scope.selectedModel.diff || []
                $scope.selectedModel.diff.push({path:name,title:name,type:[type]})
                $scope.selectModel($scope.selectedModel)

            }

            $scope.input.showFullModel = true
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
                let vsItem = $scope.world.valueSets[name]
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