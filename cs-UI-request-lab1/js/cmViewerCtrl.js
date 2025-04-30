angular.module("pocApp")
    .controller('cmViewerCtrl',
        function ($scope,updateVSSvc,conceptMap,$uibModal) {
            $scope.input = {}
            $scope.conceptMap = conceptMap
            $scope.updateVSSvc = updateVSSvc


            $scope.selectCmElement = function (element) {
                $scope.input.cmElement = element
            }

            $scope.viewVS = function (url) {
                //display the contents of a single VS
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId: function () {
                            return ""
                        }
                    }

                })
            }


        }
    )