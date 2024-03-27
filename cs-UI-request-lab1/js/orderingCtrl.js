angular.module("pocApp")
    .controller('orderingCtrl',
        function ($scope) {

            $scope.local = {}

            //get the ed that corresponds to the path. Not that efficient but saves creating another hash...
            $scope.getElementEd = function (path) {
                for (const item of $scope.fullElementList) {
                    if (path == item.ed.path) {
                        return item.ed || {title:'Root'}
                        break
                    }
                }
            }

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