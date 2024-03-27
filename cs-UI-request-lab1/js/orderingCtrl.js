angular.module("pocApp")
    .controller('orderingCtrl',
        function ($scope) {

        $scope.local = {}


            $scope.moveUp = function (inx) {
                let ar = $scope.selectedModel.ordering.splice(inx,1)
                $scope.selectedModel.ordering.splice(inx-1,0,ar[0])
            }

            $scope.moveDn = function (inx) {
                let ar = $scope.selectedModel.ordering.splice(inx,1)
                $scope.selectedModel.ordering.splice(inx+1,0,ar[0])
            }

            $scope.addInsertAfter = function (toMove,insertAfter) {
                console.log(toMove,insertAfter)
                $scope.selectedModel.ordering = $scope.selectedModel.ordering || []
                $scope.selectedModel.ordering.push({toMove:toMove,insertAfter:insertAfter})
                delete $scope.local.toMove
                delete $scope.local.insertAfter
            }

            $scope.removeInsertAfter = function (index) {
                $scope.selectedModel.ordering.splice(index,1)
            }


    })