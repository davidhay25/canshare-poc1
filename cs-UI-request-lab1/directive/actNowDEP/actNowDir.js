angular.module('formsApp')
    .directive('actnow', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                patient: '=',  //a bundle containing all the meds
                clinsumm: '='
            },

            templateUrl: 'directive/actNow/actNowDir.html',
            controller: function ($scope,anSvc) {

                $scope.input = {};

                //triggered when the Q associated with this directive is altered
                $scope.$watch(
                    function () {
                        return $scope.patient
                    },
                    function () {
                        if ($scope.patient) {
                            anSvc.createSummary($scope.patient).then(
                                function (vo) {
                                    $scope.clinicalSummary = vo.summary
                                    $scope.clinsumm = vo.bundle       //for the interface
                                   // console.log(summary)
                                }
                            )
                            //console.log($scope.patient)

                        }
                    }
                )

                $scope.selectCycleFromSummary = function(cycle) {
                    $scope.selectedCycleFromSummary = cycle
                    delete $scope.input.csSelectedResource
                    //console.log(cycle)
                }
            }
        }
    })
