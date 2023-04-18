angular.module('formsApp')
    .directive('viewbundle', function ($timeout) {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions

                bundle: '=',
                validationoo : '='
            },
            link: function(scope, element, attrs) {
            /*    console.log("vb link called")
                //create an id for the graph - there may be more than one instance of this directive in a form
                $timeout(function(){
                    scope.graphId = 'graph1' +  Math.random() * 1000;
                    const newDiv = document.createElement("div");
                    newDiv.setAttribute("id", scope.graphId);
                    newDiv.classList.add('graph')
                    //const parentElement = document.getElementById("graph");
                    const parentElement = document.getElementById("graph");
                    parentElement.appendChild(newDiv)
                    console.log(parentElement)
                },500)

*/
            },

            templateUrl: 'directive/viewBundle/viewBundleDir.html',
            controller: function($scope,viewBundleSvc,$timeout){

                $scope.input = {showhide:{}};

                let baseFhirUrl = "http://hl7.org/fhir/R4B/"     //hard code to R4B. may need to become a parameter...

                //select an entry from the bundle
                $scope.selectEntry = function(entry){
                    delete $scope.resourceVersions
                    let resource = entry.resource
                    if (resource.meta && resource.meta.versionId > 1) {
                        //create an array for the previous versions
                        $scope.resourceVersions = []
                        for (var i=resource.meta.versionId;i > 0; i--){
                            $scope.resourceVersions.push(i)
                        }
                    }

                    $scope.input.selectedBundleEntry = entry
                    $scope.linkToSpec = `${baseFhirUrl}${entry.resource.resourceType}.html`
                }

                //todo select a specific version of the current resource
                $scope.selectVersion = function(version) {
                    let url = ""
                    alert("Version retrieval not yet enabled")
                }

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

                //makes the selected resource the focus. Only resources it references and that reference it will be shwon in the graph
                $scope.makeFocus = function(resource) {
                    console.log(resource)
                    createGraph($scope.bundle,resource)

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

                function createGraph(bundle,focusResource) {
                    let arResources = []
                    bundle.entry.forEach(function (entry) {
                        arResources.push(entry.resource)
                    })
                    let vo = viewBundleSvc.makeGraph({arResources: arResources,focusResource:focusResource})  //actually entries...

                    console.log($scope.graphId)

                    let container = document.getElementById('graph');
                   // let container = document.getElementById($scope.graphId);
                    console.log(container)
                    if (container) {


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
                                $scope.linkToSpec = `${baseFhirUrl}${node.data.resource.resourceType}.html`
                                $scope.$digest()
                            }



                        })
                    }
                }

            }
        }
    });