angular.module('formsApp')
    .directive('rendersingleitem', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions

                item: '='
            },

            templateUrl: 'directive/renderSingleItem/renderSingleItemDir.html',
            controller: function($scope,$uibModal){

                $scope.local = {};


                $scope.selectFromTS = function (url) {

                    $uibModal.open({
                        templateUrl: 'modalTemplates/viewVS.html',
                        //backdrop: 'static',
                        size : 'lg',
                        controller: 'viewVSCtrl',

                        resolve: {
                            url: function () {
                                return url
                            }, refsetId : function () {
                                return "unknown"
                            }
                        }

                    })

                }

                $scope.$watch(
                    function() {return $scope.item},
                    function() {

                    }
                );

            }
        }
    });