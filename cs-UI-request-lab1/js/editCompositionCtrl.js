angular.module("pocApp")
    .controller('editCompositionCtrl',
        function ($scope,model,hashTypes,hashValueSets,isNew,modelsSvc) {

            $scope.model=model
            $scope.input = {}
            $scope.edit = {}
            $scope.isNew = isNew        //if new, then allow the model metadata to be set



            //create a list of potential parent types for a new composition
            $scope.input.possibleParents = []
            Object.keys(hashTypes).forEach(function (key) {
                if (hashTypes[key].kind == 'comp') {
                    $scope.input.possibleParents.push(key)
                }
            })

            function getFullElementList() {
                let vo = modelsSvc.getFullListOfElements($scope.model,hashTypes,true)
                console.log(vo)
                $scope.allElements = vo.allElements
            }

            //if not new, set the UI names & parent
            if (! isNew) {
                $scope.input.newModelName = model.name
                $scope.input.newModelTitle = model.title
                if (model.parent) {
                    $scope.input.newModelParent = model.parent
                }

                getFullElementList()
               // let vo = modelsSvc.getFullListOfElements(model,hashTypes,true)
               // console.log(vo)
               // $scope.allElements = vo.allElements
            }

            $scope.input.types = Object.keys(hashTypes) //an array for the new type dropdown
            $scope.input.types.sort()

            $scope.input.valueSets = Object.keys(hashValueSets)
            $scope.input.valueSets.sort()


            $scope.input.cards = ["0..1","1..1","0..*",'1..*']
            $scope.input.card = $scope.input.cards[0]

            $scope.tabSelected = function (tab) {
                $scope.selectedTab = tab
            }

            $scope.setModelAttribute = function(attribute,value) {
                $scope.model[attribute] = value

                if (attribute == 'parent') {
                    //if changing the parent, then re-generate the expanded model
                    getFullElementList()

                   // let vo = modelsSvc.getFullListOfElements($scope.model,hashTypes,true)
                   // console.log(vo)
                   // $scope.allElements = vo.allElements
                }

            }

            $scope.canEdit = function (element) {
                //can the element be overridden - ie it comes from a referenced datatype not defined directly on the model
                let ar = element.path.split('.')
                if (ar.length > 2) {
                    return true
                }
            }

            $scope.checkName = function (name) {
                $scope.model.name = name  //we can use the 'isUnique' to know if the model can be added
                let ar = $scope.input.types.filter(type => type == name)
                console.log(ar.length)
                $scope.isUnique = (ar.length == 0) //temp
            }

            $scope.isRequired = function (element) {
                if (element.mult && element.mult.substring(0,1) == 1) {
                    return true
                }

            }

            //return true if there is an override element in the model for this path..
            $scope.hasBeenOverridden = function(element) {
                //the path in the model.diff won't have the first field
                let ar = element.path.split('.')

                if (ar.length == 2){
                    return false // defined in the model
                }
                ar.splice(0,1)
                let pathToCompare = ar.join('.')
                let result = false
                $scope.model.diff.forEach(function (e) {
                    if (e.path == pathToCompare) {
                        result = true
                    }
                })
                return result
            }

            //select element from base model list (so can edit the elements defined by the model)
            $scope.selectElementFromList = function (element) {
                $scope.selectedElementFromList = element
                delete $scope.edit.code
                delete $scope.edit.title
                delete $scope.edit.mult

                //use local vars for updateing
                $scope.edit = $scope.edit || {}
                $scope.edit.title = element.title
                //$scope.edit.mult = element.title
                $scope.edit.mult = element.mult
                if (element.code && element.code.length > 0) {
                    $scope.edit.code = element.code[0].code
                }
            }

            $scope.updateElementFromList = function () {
                $scope.selectedElementFromList.title = $scope.edit.title
                $scope.selectedElementFromList.mult = $scope.edit.mult
                if ($scope.edit.code) {
                    $scope.selectedElementFromList.code = [{code:$scope.edit.code}]
                }

                delete $scope.edit.title
                delete $scope.edit.code
                delete $scope.edit.mult
                delete $scope.selectedElementFromList
                alert('Model has been updated')
            }


            //select an element from the expanded elements list
            $scope.selectElement = function (element) {
                //delete $scope.selectedOverrideElement
                //locate the element in the allElements array. This is that setting/removing override can update the contents

                for (const el of $scope.allElements) {
                    if (el.path == element.path) {
                        $scope.selectedElementOverridden = $scope.hasBeenOverridden(el)
                        $scope.selectedElement = el
                        break
                    }
                }
            }


            $scope.applyOverride = function (element,vsUrl) {
                let newElement = angular.copy(element)
                let ar = element.path.split('.')
                ar.splice(0,1)
                newElement.path = ar.join('.')
                newElement.valueSet = vsUrl
                $scope.model.diff.push(newElement)
                //rebuild the all elements
                let vo = modelsSvc.getFullListOfElements($scope.model,hashTypes,true)
                console.log(vo)
                $scope.allElements = vo.allElements

                $scope.selectElement(element)

            }

            $scope.removeOverride = function (element) {
                if (confirm("Are you sure you wish to remove this Override, returning the definition to the original")) {
                    let ar = element.path.split('.')
                    ar.splice(0,1)
                    let pathToCompare = ar.join('.')
                    let pos = -1
                    $scope.model.diff.forEach(function (e,inx) {
                        if (e.path == pathToCompare) {
                            pos=inx
                        }
                    })
                    if (pos > -1) {
                        $scope.model.diff.splice(pos,1)
                        delete $scope.selectedElementOverridden

                        //rebuild the all elements
                        let vo = modelsSvc.getFullListOfElements($scope.model,hashTypes,true)
                        console.log(vo)
                        $scope.allElements = vo.allElements

                        $scope.selectElement(element)

                    }
                }


            }

            //add a new item
            $scope.add = function () {
                let element = {}
                element.path = $scope.input.path
                element.title = $scope.input.title
                element.type = [$scope.input.type]


                if ($scope.input.valueSet) {
                    element.valueSet = $scope.input.valueSet
                }

                if ($scope.input.code) {
                    element.code = [{code:$scope.input.code}]
                }

                element.mult = $scope.input.card
                $scope.model.diff = $scope.model.diff || []
                $scope.model.diff.push(element)

                delete $scope.input.path
                delete $scope.input.title
                delete $scope.input.type
                delete $scope.input.code
                delete $scope.input.valueSet
                $scope.input.card = $scope.input.cards[0]

                getFullElementList()
            }

            $scope.remove = function (inx) {
                if (confirm("Are you sure you wish to remove this element")) {
                    $scope.model.diff.splice(inx,1)
                    getFullElementList()
                }
            }

            $scope.moveUp = function (inx) {
                let ar = $scope.model.diff.splice(inx,1)
                $scope.model.diff.splice(inx-1,0,ar[0])
                getFullElementList()
            }

            $scope.moveDn = function (inx) {
                let ar = $scope.model.diff.splice(inx,1)
                $scope.model.diff.splice(inx+1,0,ar[0])
                getFullElementList()
            }


            $scope.save = function () {
                if (isNew) {
                    if ($scope.isUnique) {
                        $scope.model.diff = $scope.model.diff || []
                        $scope.$close($scope.model)
                    } else {
                        alert("The name is not valid - likely a duplicate")
                    }
                } else {
                    $scope.$close()
                }

            }
        }
    )