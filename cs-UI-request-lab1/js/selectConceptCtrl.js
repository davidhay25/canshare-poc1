angular.module("pocApp")
    .controller('selectConceptCtrl',
        function ($scope,propDef) {
            //propDef is the property definition - $scope.cmProperties[key]

            $scope.local = {}
            $scope.options = propDef.options

            $scope.canShow = function (concept) {

                if (! $scope.filterString) {
                    return true
                }

                let display = concept.display.toLowerCase()
                let isMatch = true
                $scope.filterElements.forEach(function (ele) {
                    if (display.indexOf(ele) == -1) {
                        isMatch = false
                    }
                })
                return isMatch


            }
            $scope.selectConcept = function (concept) {
                $scope.local.selectedConcept = concept
            }

            $scope.filterList = function (filter) {
                $scope.filterString = filter.toLowerCase()
                let fc = filter.toLowerCase()
                $scope.filterElements = fc.split(" ")
                console.log(filter,$scope.filterElements)
            }

            $scope.select = function (){
                $scope.$close($scope.local.selectedConcept)
            }

        }
    )