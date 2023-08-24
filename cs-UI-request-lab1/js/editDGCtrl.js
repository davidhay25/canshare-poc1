angular.module("pocApp")
    .controller('editDGCtrl',
        function ($scope,model,hashTypes,hashValueSets,isNew,modelsSvc) {
            $scope.model=model
            $scope.input = {}
            $scope.edit = {}
            $scope.isNew = isNew        //if new, then allow the model metadata to be set

            //construct a has of all types (DT + FHIR) for the full list of elements routine
            $scope.allTypes = angular.copy(hashTypes)

            //create a list of potential parent types for a new DG -
            $scope.input.possibleParents = []
            Object.keys(hashTypes).forEach(function (key) {
                if (hashTypes[key].kind == 'dg') {      //should only be DG
                    $scope.input.possibleParents.push(key)
                }
            })

            //get the full list of elements for a DG, following any inheritance chain..
            function getFullElementList() {
                let vo = modelsSvc.getFullListOfElements($scope.model,hashTypes,true)
                console.log(vo)
                $scope.allElements = vo.allElements

            }

            //if not new, set the UI names & parent
            if (! isNew) {
                $scope.input.newModelName = model.name
                $scope.input.newModelTitle = model.title
                $scope.input.newModelTitle = model.description
                if (model.parent) {
                    $scope.input.newModelParent = model.parent
                }

                getFullElementList()
              
            }

            //start with the DGs...
            $scope.input.types = Object.keys(hashTypes) //an array for the new type dropdown
            $scope.input.types.sort()

            //now add the FHIR datatypes
            $scope.input.types = modelsSvc.fhirDataTypes().concat($scope.input.types) //.concat(modelsSvc.fhirDataTypes())


            //modelsSvc.fhirDataTypes()



            $scope.input.valueSets = Object.keys(hashValueSets)
            $scope.input.valueSets.sort()


            $scope.input.cards = ["0..1","1..1","0..*",'1..*']
            $scope.input.card = $scope.input.cards[0]

            //set the override code. Like comp overrides, this sets an element with the appropriate
            //path in the DG. todo checked nested DT paths...
            //todo generalize to change other attrobutes - like title & mutiplicity
            $scope.setFixedCode = function (element) {
                let code = prompt("Enter the code")
                if (code) {
                    let path = element.ed.path
                    let ar = path.split('.')
                    let nameInOriginal = ar[ar.length-1]
                    ar.splice(0,1)
                    let pathInThisEd = ar.join('.')
                    let pathInTarget
                    if (ar.length == 1) {
                        //if the pathlength is 1, then we're overriding an element on the root of the target model
                        pathInTarget = ar[0]
                    } else {
                        //otherwise we're overriding a nested path in the target (under a group node)
                        ar.splice(0,1)
                        pathInTarget = ar.join('.')  //we assume that the first 2 elements in the path are the type name, and name of this element
                    }

                    let sourceModel = hashTypes[element.sourceModelName]
                    if (sourceModel) {
                        //locate the original ed from the source
                        sourceModel.diff.forEach(function (ed) {
                            if (ed.path == pathInTarget) {
                                //if (ed.path == nameInOriginal) {
                                //this is the ed that is to be overriden. So a copy (with an updated path
                                //is saved in this DT
                                let newEd = angular.copy(ed)
                                newEd.fixedCoding = {code:code}
                                newEd.status = 'new'
                                newEd.path = pathInThisEd
                                $scope.model.diff.push(newEd)

                                $scope.model.changes = $scope.model.changes || []
                                msg = `Fix value to ${code}`
                                $scope.model.changes.push({edPath: path, msg:msg})

                            }
                        })
                        getFullElementList()

                    } else {
                        alert(`Model: ${element.sourceModelName} not found.` )
                    }
                }
            }

            $scope.tabSelected = function (tab) {
                $scope.selectedTab = tab
            }

            $scope.setModelAttribute = function(attribute,value) {
                $scope.model[attribute] = value

                if (attribute == 'parent') {
                    //if changing the parent, then re-generate the expanded model
                    getFullElementList()

                   
                }

            }
            
            $scope.checkItemName = function () {
                
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
//console.log(element)
                if (! $scope.model || !$scope.model.diff) {
                    //when adding a new DG
                    return false
                }

                //todo - not sure why there are elements with no ed...
                if (! element.ed || !element.ed.path) {
                    console.log ("missing ed or path",element)
                   return  false
                }

                let ar = element.ed.path.split('.')

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



                if ($scope.selectedElementFromList.title !== $scope.edit.title) {
                    $scope.model.changes = $scope.model.changes || []
                    msg = `Title changed from '${$scope.selectedElementFromList.title}' to '${$scope.edit.title}'`
                    $scope.model.changes.push({edPath: $scope.selectedElementFromList.path, msg:msg})

                }

                if ($scope.selectedElementFromList.mult !== $scope.edit.mult) {
                    $scope.model.changes = $scope.model.changes || []
                    msg = `Cardinality changed from '${$scope.selectedElementFromList.mult}' to '${$scope.edit.mult}'`
                    $scope.model.changes.push({edPath: $scope.selectedElementFromList.path, msg:msg})
                }


                $scope.selectedElementFromList.title = $scope.edit.title
                $scope.selectedElementFromList.mult = $scope.edit.mult
                $scope.selectedElementFromList.status = 'changed'
                if ($scope.edit.code) {

                    if ($scope.selectedElementFromList.code !== $scope.edit.code) {
                        $scope.model.changes = $scope.model.changes || []
                        msg = `Code changed from '${$scope.selectedElementFromList.code}' to '${$scope.edit.code}'`
                        $scope.model.changes.push({edPath: $scope.selectedElementFromList.path, msg:msg})
                    }

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

            //check if this path has been used in the DG
            $scope.checkDuplicatePath = function(path) {
                $scope.isDuplicatePath = false
                $scope.allElements.forEach(function (element) {
                    //element.ed.path = full path
                    let ar = element.ed.path.split('.')
                    if (ar[ar.length-1] == path) {
                        $scope.isDuplicatePath = true
                    }
                })
            }

            //called when a new element is being added. This is linked to the element name
            $scope.setTitle = function (name) {
                $scope.input.title = name.charAt(0).toUpperCase() + name.slice(1)

                //check to see if this name is the same as an inherited one
                //checkDuplicatePath(name)
            }

            //add a new item
            $scope.add = function () {
                let element = {}
                element.status = 'new'
                //$scope.model.status = 'changed'
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

                $scope.model.changes = $scope.model.changes || []
                msg = `Added new element`
                $scope.model.changes.push({edPath: element.path, msg:msg})

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

                    $scope.model.changes = $scope.model.changes || []
                    msg = `remove element`
                    $scope.model.changes.push({edPath: $scope.model.diff[inx].path, msg:msg})

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
                        $scope.model.status = 'new'
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