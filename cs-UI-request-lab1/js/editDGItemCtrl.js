angular.module("pocApp")
    .controller('editDGItemCtrl',
        function ($scope,$filter,item,allTypes,hashAllDG,fullElementList,$uibModal) {
            $scope.item = item
            $scope.allTypes = allTypes
            $scope.input = {}
            $scope.fullElementList = fullElementList

            console.log(allTypes)

       //     $scope.mult = ['0..0','0..1','0..*','1..1','1..*']

            //when an item is passed in for editing
            if (item && item.ed) {
                $scope.input.description = item.ed.description
                $scope.input.title = item.ed.title
                $scope.input.mapping = item.ed.mapping
                $scope.input.valueSet = item.ed.valueSet
                $scope.input.sourceReference = item.ed.sourceReference
                $scope.input.path =  $filter('dropFirstInPath')(item.ed.path)
                $scope.input.controlHint =  item.ed.controlHint

                $scope.input.selectedType = item.ed.type[0]
                setControlOptions($scope.input.selectedType)

                $scope.fixedValue = item.ed.fixedCoding

                for (typ of allTypes) {
                    if (item.ed.type[0] == typ) {
                        $scope.input.type = typ
                    }
                }

                $scope.input.mult = item.ed.mult

            } else {
                $scope.input.mult = "0..1"// $scope.mult[1]      //default to 0..1

                for (typ of allTypes) {
                    if (typ == 'CodeableConcept') {
                        $scope.input.type = typ
                    }
                }
                $scope.isNew = true         //allows cancel
            }


            $scope.changeType = function (){
                $uibModal.open({
                    templateUrl: 'modalTemplates/changeType.html',
                    //backdrop: 'static',
                    size : 'xlg',
                    controller: 'changeTypeCtrl',

                    resolve: {
                        ed: function () {
                            if (item && item.ed) {
                                return item.ed
                            } else {
                                return {}
                            }

                        },
                        hashAllDG: function () {
                            return hashAllDG
                        }
                    }

                }).result.then(function (vo) {
                    if (vo.class == 'dg') {
                        $scope.input.selectedType = vo.value.name
                    } else {
                        $scope.input.selectedType = vo.value
                    }

                    setControlOptions($scope.input.selectedType)

                })
            }

            $scope.setTitle = function (title) {
                $scope.input.title = $scope.input.title || title


            }

            function setControlOptions(type) {

                switch (type) {
                    case "string" :
                        $scope.qControlOptions =  ["string","text"]
                        break
                    case "CodeableConcept" :
                        $scope.qControlOptions =  ["drop-down","autocomplete","lookup"]
                        break
                }


            }

            function setFixedValue(type) {


                $uibModal.open({
                    templateUrl: 'modalTemplates/fixValues.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'fixValuesCtrl',

                    resolve: {
                        type: function () {
                            return type
                        }
                    }

                }).result.then(function (vo) {
                    console.log(vo)
                })
            }



            $scope.save = function() {

                if (allTypes.indexOf($scope.input.selectedType) == -1) {
                    alert("Invalid type")
                    return
                }
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

                    //check that there are no spaces in the path
                    if ($scope.input.path.indexOf(" ") > -1) {
                        alert("The path cannot contain spaces")
                        return
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
                    //ed.type = [$scope.input.type]
                    ed.type = [$scope.input.selectedType]
                    ed.path = `new.${$scope.input.path}`        //the 'new.' is stripped off, as the full path is passed in for editing existing
                    ed.description = $scope.input.description
                    ed.mapping = $scope.input.mapping
                    ed.title = $scope.input.title
                    ed.mult = $scope.input.mult
                    ed.valueSet = $scope.input.valueSet
                    if ($scope.input.controlHint) {
                        ed.controlHint = $scope.input.controlHint
                    }
                    ed.sourceReference = $scope.input.sourceReference

                    $scope.$close(ed)

                } else {
                    item.ed.type = [$scope.input.selectedType]
                    item.ed.mapping = $scope.input.mapping
                    if ($scope.input.controlHint) {
                        item.ed.controlHint = $scope.input.controlHint
                    }
                    item.ed.description = $scope.input.description
                    item.ed.title = $scope.input.title
                    item.ed.mult = $scope.input.mult
                    item.ed.valueSet = $scope.input.valueSet
                    item.ed.sourceReference = $scope.input.sourceReference
                    $scope.$close(item.ed)
                }






            }
        }
    )