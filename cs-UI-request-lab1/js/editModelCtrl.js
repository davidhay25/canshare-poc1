angular.module("pocApp")
    .controller('editModelCtrl',
        function ($scope,model,hashTypes,hashValueSets,isNew,modelsSvc) {
            $scope.model=model
            $scope.input = {}
            $scope.isNew = isNew        //if new, then allow the model metadata to be set

            //create a list of potential parent types for a new composition
            $scope.input.possibleParents = []
            Object.keys(hashTypes).forEach(function (key) {
                if (hashTypes[key].kind == 'comp') {
                    $scope.input.possibleParents.push(key)
                }
            })

            //if not new, set the UI names & parent
            if (! isNew) {
                $scope.input.newModelName = model.name
                $scope.input.newModelTitle = model.title
                if (model.parent) {
                    $scope.input.newModelParent = model.parent
                }

                let vo = modelsSvc.getFullListOfElements(model,hashTypes,true)
                console.log(vo)
                $scope.allElements = vo.allElements
            }

            $scope.input.types = Object.keys(hashTypes) //an array for the new type dropdown
            $scope.input.types.sort()

            $scope.input.valueSets = Object.keys(hashValueSets)
            $scope.input.valueSets.sort()


            $scope.input.cards = ["0..1","1..1","0..*",'1..*']
            $scope.input.card = $scope.input.cards[0]

            $scope.setModelAttribute = function(attribute,value) {
                $scope.model[attribute] = value
            }

            $scope.checkName = function (name) {
                $scope.model.name = name  //we can use the 'isUnique' to know if the model can be added
                let ar = $scope.input.types.filter(type => type == name)
                console.log(ar.length)
                $scope.isUnique = (ar.length == 0) //temp
            }

            $scope.selectElement = function (element) {
                $scope.selectedElement = element
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
            }

            $scope.remove = function (inx) {
                if (confirm("Are you sure you wish to remove this element")) {
                    $scope.model.diff.splice(inx,1)
                }
            }

            $scope.moveUp = function (inx) {
                let ar = $scope.model.diff.splice(inx,1)
                $scope.model.diff.splice(inx-1,0,ar[0])
            }

            $scope.moveDn = function (inx) {
                let ar = $scope.model.diff.splice(inx,1)
                $scope.model.diff.splice(inx+1,0,ar[0])
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