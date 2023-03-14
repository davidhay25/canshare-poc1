angular.module('pocApp')
    .directive('qrdisplay', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                qr: '=',
                q: '='
            },

            templateUrl: 'directive/QRDisplay/QRDisplayDir.html',
            controller: function($scope,$http){

                $scope.input = {};

                //triggered when the Q associated with this directive is altered
                $scope.$watch(
                    function() {return $scope.q},
                    function() {
                        if ($scope.q) {
                            console.log("Q passed in " + $scope.q.id)
                            //analyse the Q for display purposes. eg hidden elements
                            analyseQ($scope.q)
                            console.log($scope.input.hiddenFields)
                        }

                    }
                );

                function analyseQ(Q) {
                    //find all hidden fields. There are generally used in resource extraction
                    //Only check leaf elements - not sections or groups
                    let extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
                    $scope.input.hiddenFields = {}

                    Q.item.forEach(function (section) {
                        if (section.item) {
                            section.item.forEach(function (item) {
                                if (item.item) {
                                    item.item.forEach(function (gc) {
                                        let ext = findExtension(gc,extHidden)
                                        if (ext.length > 0) {
                                            if (ext[0].valueBoolean) {
                                                $scope.input.hiddenFields[gc.linkId] = true
                                            }
                                        }

                                    })

                                } else {
                                    //this is a leaf
                                    let ext = findExtension(item,extHidden)
                                    if (ext.length > 0) {
                                        if (ext[0].valueBoolean) {
                                            $scope.input.hiddenFields[item.linkId] = true
                                        }
                                    }
                                }

                            })
                        }
                    })


                }

                findExtension = function(item,url) {
                    //return an array with all matching extensions.
                    let ar = []

                    if (item && item.extension) {
                        for (var i=0; i <  item.extension.length; i++){
                            let ext = item.extension[i]
                            if (ext.url == url) {
                                ar.push(ext)
                            }
                        }
                    }
                    return ar

                }

/*
                $scope.$watch(
                    function() {return $scope.QR},
                    function() {
                        if ($scope.q) {
                            console.log("Q passed in")
                        }
                    }
                );

                */

            }
        }
    });