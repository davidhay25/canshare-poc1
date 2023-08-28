angular.module("pocApp")
    .controller('editDGItemCtrl',
        function ($scope,$filter,item,allTypes,fullElementList) {
            $scope.item = item
            $scope.allTypes = allTypes
            $scope.input = {}
            $scope.fullElementList = fullElementList

            console.log(allTypes)

            $scope.mult = ['0..0','0..1','0..*','1..1','1..*']

            //when an item is passed in for editing
            if (item && item.ed) {
                $scope.input.description = item.ed.description
                $scope.input.title = item.ed.title
                $scope.input.valueSet = item.ed.valueSet
                $scope.input.path =  $filter('dropFirstInPath')(item.ed.path)
                for (typ of allTypes) {
                    if (item.ed.type[0] == typ) {
                        $scope.input.type = typ
                    }
                }

                for (var m of $scope.mult) {
                    if (item.ed.mult == m) {
                        $scope.input.mult = m
                    }
                }
            } else {
                $scope.input.mult = $scope.mult[1]      //default to 0..1

                for (typ of allTypes) {
                    if (typ == 'CodeableConcept') {
                        $scope.input.type = typ
                    }
                }
                $scope.isNew = true         //allows cancel
            }

            $scope.setTitle = function (title) {
                $scope.input.title = $scope.input.title || title

            }

            $scope.save = function() {
                //let ar1 = $scope.input.path.split('.')
                //let trimmedPath = ar1.splice(0,1).join('.')
                if ($scope.isNew) {
                    //don't allow an existing path to be added. This is legit as an override, but not through this dialog
                    for (const item of fullElementList) {
                        let p = $filter('dropFirstInPath')(item.ed.path)
                        if (p && p == $scope.input.path) {
                            alert("This path has already been used in this DG")
                            return
                            break
                        }
                    }

                    //check the path. if it has a '.' then there must be a parent in the fullelement list
                    let ar = $scope.input.path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        let parent = ar.join('.')
                        let found = false
                        for (const item of fullElementList) {
                            let p = $filter('dropFirstInPath')(item.ed.path)
                            if (p && p == parent) {
                                found = true
                                break
                            }
                        }
                        if (! found) {
                            alert(`the path '${$scope.input.path}' means there must be a parent element of '${parent}' in the DG.`)
                            return
                        }
                    }

                    let ed = {}
                    ed.type = [$scope.input.type]
                    ed.path = `new.${$scope.input.path}`        //the 'new.' is stripped off, as the full path is passed in for editing existing
                    ed.description = $scope.input.description
                    ed.title = $scope.input.title
                    ed.mult = $scope.input.mult
                    ed.valueSet = $scope.input.valueSet

                    $scope.$close(ed)

                } else {
                    item.ed.description = $scope.input.description
                    item.ed.title = $scope.input.title
                    item.ed.mult = $scope.input.mult
                    item.ed.valueSet = $scope.input.valueSet
                    $scope.$close(item.ed)
                }




/*
                if ($scope.isNew) {
                    let ed = {}
                    ed.type = [$scope.input.type]
                    ed.path = `new.${$scope.input.path}`        //the 'new.' is stripped off, as the full path is passed in for editing existing
                    ed.description = $scope.input.description
                    ed.title = $scope.input.title
                    ed.mult = $scope.input.mult

                } else {
                    item.ed.description = $scope.input.description
                    item.ed.title = $scope.input.title
                    item.ed.mult = $scope.input.mult
                    $scope.$close(item.ed)
                }

                */

            }
        }
    )