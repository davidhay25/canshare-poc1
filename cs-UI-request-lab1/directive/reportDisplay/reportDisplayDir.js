angular.module('pocApp')
    .directive('reportdisplay', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                //{DR: observations:[] others:[]
                reportobject: '=',
            },

            templateUrl: 'directive/reportDisplay/reportDisplayDir.html',
            controller: function($scope){

                $scope.input = {};

                $scope.$watch(
                    function() {return $scope.reportobject},
                    function() {

                    }
                );

            }
        }
    });