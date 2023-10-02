angular.module('formsApp')
    .directive('rendersingleitem', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions

                item: '='
            },

            templateUrl: 'directive/renderSingleItem/renderSingleItemDir.html',
            controller: function($scope,$uibModal,$http){

                $scope.local = {};


                //if this is a drop-down, then fill the item.ddOptions array

                if ($scope.item.displayHint = "drop-down") {
                    $scope.item.ddOptions = []
                    if ($scope.item.ed.valueSet) {
                        //if there's a valueSet, then tru to expand it
                        let qry = `ValueSet/$expand?url=${$scope.item.ed.valueSet}&_summary=false`
                        let encodedQry = encodeURIComponent(qry)

                        $http.get(`nzhts?qry=${encodedQry}`).then(
                            function (data) {
                                let expandedVS = data.data

                                for (const concept of expandedVS.expansion.contains) {
                                    $scope.item.ddOptions.push(
                                        {
                                            valueCoding: {
                                                system: concept.system,
                                                code: concept.code,
                                                display: concept.display
                                            }
                                        })
                                }

                                console.log(data.data)


                            }, function (err) {
                                $scope.item.ddOptions.push({valueCoding: {display: "VS not found"}})
                                console.log(`There was no ValueSet with the url:${url}`)
                            }
                        )
                    } else if ($scope.item.ed.options) {
                        //or, if there are options then use that
                        $scope.item.ed.options.forEach(function (option) {

                            $scope.item.ddOptions.push({valueCoding: {display: option.pt}})
                        })
                    }
                }

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