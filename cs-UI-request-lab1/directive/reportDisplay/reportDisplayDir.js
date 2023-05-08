angular.module('formsApp')
    .directive('reportdisplay', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                //{DR: observations:[] others:[]
                reportobject: '=',
            },

            templateUrl: 'directive/reportDisplay/reportDisplayDir.html',
            controller: function($scope,$sce){

                $scope.input = {};

                //used to display the HTML when displaying a document
                $scope.to_trusted = function(html_code) {
                    return $sce.trustAsHtml(html_code);
                }

                $scope.$watch(
                    function() {return $scope.reportobject},
                    function() {
                        if ($scope.reportobject && $scope.reportobject.DR && $scope.reportobject.DR.presentedForm) {
                            $scope.presentedForm = atob($scope.reportobject.DR.presentedForm[0].data)
                            console.log(atob($scope.reportobject.DR.presentedForm[0].data))

                        }

                    }
                );

            }
        }
    });