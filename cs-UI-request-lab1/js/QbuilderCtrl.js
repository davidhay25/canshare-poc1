angular.module("pocApp")
    .controller('QbuilderCtrl',
        function ($scope) {



            $scope.setupQ = function() {
                makeCompTree($scope.treeData)
            }




            //make the source tree - the composition
            function makeCompTree(treeData) {
                $('#QcompositionTree').jstree('destroy');

                $scope.compTree = $('#QcompositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    $scope.$digest();
                });

            }



        }
    )