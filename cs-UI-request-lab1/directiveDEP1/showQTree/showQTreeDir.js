angular.module('formsApp')
    .directive('showqtree', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '='
            },

            templateUrl: 'directive/showQTree/showQTreeDir.html',
            //questionnaireSvc needs to have been loaded by the hosting page...
            controller: function ($scope,questionnaireSvc) {

                $scope.$watch(
                    function () {
                        return $scope.q
                    },
                    function () {


                        if ($scope.q) {
                            delete $scope.selectedNode
                            let vo = questionnaireSvc.makeTreeFromQ($scope.q)

                            //show sections
                            vo.treeData.forEach(function (item) {
                                item.state.opened = true
                                if (item.parent == 'root') {
                                    item.state.opened = false;
                                }
                            })

                            drawTree(vo.treeData)       //for drawing the tree

                        }

                    }
                )

                let drawTree = function(treeData){
                    //console.log(treeData)
                    treeData.forEach(function (item) {
                        item.state.opened = true
                        if (item.parent == 'root') {
                            item.state.opened = false;
                        }
                    })

                    $('#designTree').jstree('destroy');

                    let x = $('#designTree').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        //seems to be the node selection event...

                        if (data.node) {
                            $scope.selectedNode = data.node;
                            console.log(data.node)
                        }

                        $scope.$digest();       //as the event occurred outside of angular...
                    })


                }


            }
        }})