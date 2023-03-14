angular.module('pocApp')
    .directive('viewvalidation', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions

                validationobject: '=',
                unknownissues: '='
            },

            templateUrl: 'directive/viewValidation/viewValidationDir.html',
            controller: function($scope){

                $scope.input = {};
                $scope.input.showhide = []

                $scope.showResource = function(pos) {
                    let currentlyShowing = $scope.input.showhide[pos]
                    for (let i=0; i<$scope.input.showhide.length; i++) {
                        $scope.input.showhide[i] = false
                    }
                    if (! currentlyShowing) {
                        $scope.input.showhide[pos] = true
                    }

                }



                $scope.$watch(
                    function() {return $scope.validationobject},
                    function() {

                    }
                );

            }
        }
    });