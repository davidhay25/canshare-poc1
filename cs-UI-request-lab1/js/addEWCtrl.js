angular.module("pocApp")
    .controller('addEWCtrl',
        function ($scope,modelsSvc, ED,DG,fullElementList,$timeout,$filter) {
            //ED is element definition that is the
            //DG is the full data group

            $scope.input = {}
            $scope.operations=["=","!="]
            $scope.input.ewOp = $scope.operations[0]


            let treeData = modelsSvc.makeTreeFromElementList(fullElementList)
            $timeout(function () {
                makeDGTree(treeData)
            },500)

            //display a single concept in the drop down
            $scope.showConcept = function (concept) {
                let display = concept.display || ""
                if (concept.code) {
                    display += " (" + concept.code + ")"
                }
                return display
            }

            //retrieve all the possible options for the selected CC element. Have as separate
            //function to support future VS lookup
            function getOptionsForCC(ed){
                return ed.options       //ie an array of conepts
            }

            function makeDGTree(treeData) {
                $('#dgEWTree').jstree('destroy');

                let x = $('#dgEWTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    // the node selection event...


                    $scope.options = []

                    $scope.selectedED = data.node.data.ed
                    if (data.node.data.ed && data.node.data.ed.type && data.node.data.ed.type[0] == 'CodeableConcept') {
                        $scope.options = getOptionsForCC(data.node.data.ed)
                    }
                    

                    $scope.addEnableWhen = function () {
                        let vo= {}
                        vo.ed = $scope.selectedED
                        vo.op = $scope.input.ewOp
                        vo.value = $scope.input.ewValue

                        $scope.$close(vo)
                        
                    }


                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes


                    $scope.$digest();
                });

            }


        }
    )