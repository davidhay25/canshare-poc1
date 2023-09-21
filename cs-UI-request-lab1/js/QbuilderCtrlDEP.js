angular.module("pocApp")
    .controller('QbuilderCtrl',
        function ($scope) {


            let Q = {text:"root",id:'root',item:[]}     //the Questionnaire data


            //add controls for the selected item
            $scope.addControl = function (id,type,text) {


                let row = `<div class='row'>`
                row += `<div class = 'col-md-2'>${text}</div>`
                row += `<div class = 'col-md-4'>${createInputBox(id)}</div>`
                row += `</div>`
                //let tb = createInputBox('id1')
                $("#Qform").append(row)

            }



            function createInputBox(id) {
                let tb = `<input type='text' class = 'form-control' type='text' id='${id}'/>`
                return tb
            }


            $scope.setupQ = function() {
                $scope.clone = angular.copy($scope.treeData)
                makeCompTree($scope.clone)

                console.log($scope.clone)

                //console.log(makeQtreeData(Q))
            }




            //delete the current node (and all of it's children)
            $scope.deleteNode = function(){
                let nodesToDelete = $scope.selectedQNode.children
                nodesToDelete.push($scope.selectedQNode.id)
                let lst = []
                $scope.clone.forEach(function (lne) {
                    if (nodesToDelete.indexOf(lne.id) == -1) {
                        lst.push(lne)
                    }
                })
                $scope.clone = lst
                makeCompTree($scope.clone)
                delete $scope.selectedQNode

            }

            //create the treeData array for the Q from the Q object
            function makeQtreeData(Q) {

                let treeData = []        //the

                function addItems(item,parent,lst) {
                    let node = {id:item.id,text:item.text,parent:parent}
                    lst.push(node)

                }


                Q.item.forEach(function (item) {
                    addItems(item,"#",treeData)
                })

                return treeData

            }

            //make the source tree - the composition
            function makeCompTree(treeData) {
                $('#QcompositionTree').jstree('destroy');

                $scope.qTree = $('#QcompositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedQNode = data.node;
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    $(this).jstree("open_all");
                    $scope.$digest();
                });

            }



        }
    )