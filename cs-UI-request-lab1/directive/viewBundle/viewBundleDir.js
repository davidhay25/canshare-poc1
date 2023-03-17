angular.module('pocApp')
    .directive('viewbundle', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions

                bundle: '=',
                validationoo : '='
            },

            templateUrl: 'directive/viewBundle/viewBundleDir.html',
            controller: function($scope,viewBundleSvc,$timeout){

                $scope.input = {showhide:{}};


                $scope.$watch(
                    function() {return $scope.validationoo},
                    function() {
                        if ($scope.validationoo) {
                            console.log($scope.validationoo)
                            let vo1 = viewBundleSvc.summarizeValidation($scope.validationoo,$scope.bundle)
                            console.log(vo1)
                            $scope.validationObject = vo1.resources
                            $scope.validationErrorCount = vo1.totalErrors
                            $scope.unknownIssues = vo1.unknownIssues

                        }
                    }
                )

                //used by validation view
                $scope.showResource = function(pos) {
                    let currentlyShowing = $scope.input.showhide[pos]

                    Object.keys($scope.input.showhide).forEach(function (key) {
                        $scope.input.showhide[key] = false
                    })

                    if (! currentlyShowing) {
                        $scope.input.showhide[pos] = true
                    }

                }


                $scope.fitChart = function () {
                    if ($scope.chart) {
                        $timeout(function(){$scope.chart.fit()},500)
                    }

                }

                $scope.$watch(
                    function() {return $scope.bundle},
                    function() {
                        delete $scope.input.selectedBundleEntry
                        if ($scope.bundle && $scope.bundle.entry) {
                            createGraph($scope.bundle)
                        }


                    }
                )

                function createGraph(bundle) {
                    let arResources = []
                    bundle.entry.forEach(function (entry) {
                        arResources.push(entry.resource)
                    })
                    let vo = viewBundleSvc.makeGraph({arResources: arResources})  //actually entries...

                    let container = document.getElementById('graph');
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            barnesHut: {
                                gravitationalConstant: -10000,
                            }
                        }
                    };
                    if ($scope.chart) {
                        $scope.chart.destroy()
                    }

                    $scope.chart = new vis.Network(container, vo.graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.chart.on("stabilizationIterationsDone", function () {

                        $scope.chart.setOptions( { physics: false } );
                    });

                    $scope.chart.on("click", function (obj) {
                        delete $scope.selectedResourceFromGraph
                        let nodeId = obj.nodes[0];  //get the first node
                        let node = vo.graphData.nodes.get(nodeId);

                        if (node.data && node.data.resource) {
                            $scope.selectedResourceFromGraph = node.data.resource;
                            $scope.$digest()
                        }



                    })

                }

            }
        }
    });