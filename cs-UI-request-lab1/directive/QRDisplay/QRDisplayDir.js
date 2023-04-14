angular.module('formsApp')
    .directive('qrdisplay', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                qr: '=',
                q: '='
            },

            templateUrl: 'directive/QRDisplay/QRDisplayDir.html',
            controller: function($scope,$timeout){

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

                $scope.$watch(
                    function() {return $scope.qr},
                    function() {
                        console.log('qr')
                        $timeout(function(){
                            //set all the drawings. Wait for the canvas elements to be rendered..
                            if ($scope.qr) {
                                try {
                                    $scope.qr.item.forEach(function (section) {
                                        section.item.forEach(function (child) {
                                            if (child.answer) {
                                                child.answer.forEach(function (ans) {
                                                    if (ans.valueAttachment) {
                                                        //so there should be a canvas element already created by the rendered with this linkId

                                                        let canvas2 = document.getElementById(`drawing-${child.linkId}`);
                                                        let context2 = canvas2.getContext('2d')
                                                        let img = new Image()
                                                        img.src = atob(ans.valueAttachment.data)
                                                        img.onload = function(){
                                                            context2.drawImage(img,0,0)
                                                        }
                                                    }
                                                })
                                            }

                                        })
                                    })
                                } catch(ex) {
                                    console.log(ex)
                                }

                            }


                        },500)

                    })

                function analyseQ(Q) {
                    //find all hidden fields. There are generally used in resource extraction
                    //Only check leaf elements - not sections or groups
                    let extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
                    $scope.input.hiddenFields = {}
                    $scope.hashDrawings = {}

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
/*
                                    //check to see if the item has ann attachment in the answer
                                    if (item.answer) {
                                        item.answer.forEach(function (ans) {
                                            if (ans.valueAttachment) {
                                                //create an element that the rendering html can use. It's not proper fhir element but that doesn't matter
                                                item.attachment = ans.valueAttachment
                                            }

                                        })
                                    }
                                    */


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