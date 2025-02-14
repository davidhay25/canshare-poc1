angular.module("pocApp")
    .controller('adHocExtensionCtrl',
        function ($scope,currentExt,$uibModal,fullElementList,currentPath) {


            $scope.currentExt = angular.copy(currentExt)

            $scope.selectExt = function (ext) {
                $scope.selectedExt = ext
            }

            if (currentExt && currentExt.length > 0) {
                $scope.selectExt(currentExt[0])
            }

            $scope.save = function () {
                $scope.$close($scope.currentExt)
            }

            $scope.addExt = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/makeSDCExtension.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'makeSDCExtensionCtrl',
                    resolve: {
                        elements: function () {
                            return fullElementList
                            //return []
                        },currentPath : function () {
                            return currentPath
                            //return item.ed.path
                        }
                    }
                }).result.then(function (ext) {

                    if (ext) {
                        $scope.currentExt = currentExt || []
                        $scope.currentExt.push(ext)
                    }
                })
            }

            $scope.deleteExt = function (inx) {
                $scope.currentExt.splice(inx)
            }




        }
    )