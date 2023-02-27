angular.module('pocApp')
    .directive('qrdisplay', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                qr: '=',
            },

            templateUrl: 'directive/QRDisplay/QRDisplayDir.html',
            controller: function($scope,$http){

                $scope.input = {};

                $scope.$watch(
                    function() {return $scope.QR},
                    function() {

                    }
                );

            }
        }
    });