angular.module('pocApp')
    .directive('viewbundle', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions

                bundle: '='
            },

            templateUrl: 'directive/viewBundle/viewBundleDir.html',
            controller: function($scope){

                $scope.input = {};





                $scope.$watch(
                    function() {return $scope.validationobject},
                    function() {

                    }
                );

            }
        }
    });