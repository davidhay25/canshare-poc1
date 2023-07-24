angular.module("pocApp")
    .controller('modelTermCtrl',
        function ($scope,$timeout) {

            //when a specific DG is selected in the term summary
            $scope.termSelectDG = function (item) {
                console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                $scope.selectedModel = $scope.hashAllDG[item.DGName]

                $scope.selectModel($scope.selectedModel)

            }

            //selects both a DG and an element within that DG

            $scope.termSelectDGItem = function (item) {
                console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                //Note that elements use a 'hidden' property to set the DG name
                $scope.selectedModel = $scope.hashAllDG[item.hiddenDGName]

                $scope.selectModel($scope.selectedModel)

                //seelct the element in the DG tree. Need to wait for the tree to be built...
                $timeout(function () {
                    let fullPath = `${item.hiddenDGName}.${item.path}`

                    $("#dgTree").jstree("select_node",  fullPath);
                },500)


                /*

                //Locate the ed within the model.diff with this path
                $scope.selectedModel.diff.forEach(function (ed) {
                    if (ed.path == item.path) {
                        $scope.selectedNode = {data:{ed:ed}}
                        console.log($scope.selectedNode)
                    }

                })
*/


            }



            //hiddenDGName

        })