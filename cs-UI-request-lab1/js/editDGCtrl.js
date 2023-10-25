angular.module("pocApp")
    .controller('editDGCtrl',
        function ($scope,model,hashTypes,hashValueSets,isNew,modelsSvc,parent,modelDGSvc) {
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

                    if (isNew) {
                        $scope.input.possibleParents.push(key)
                    } else {
                        if (model && key !== model.name) {
                            //can't be a parent to itself
                            $scope.input.possibleParents.push(key)
                        }
                    }



                }
            })
            $scope.input.possibleParents.sort()


            
            $scope.import = function (data) {
                $scope.model.diff == $scope.model.diff || []
                let ar = data.split(/\r?\n/)
                ar.forEach(function (row) {
                    let arData = row.split(/\t/)
                    let ed = {}
                    ed.path = arData[0]
                    ed.title = arData[3]
                    ed.description = arData[8]
                    ed.mult = arData[9]
                    let type = arData[10] || 'string'

                    switch (type) {
                        case "Codeable" :
                            type = "CodeableConcept"
                            break

                    }
                    ed.type = [type]

                    if (arData[11]) {
                        ed.valueSet = arData[11]
                    }

                    //options (S)
                    if (arData[18]) {
                        let ar = arData[18].split(',')
                        ed.options = []
                        ar.forEach(function (opt) {
                            let opt1 = opt.replace(/["]/g, '')
                            ed.options.push({pt:opt1})
                        })
                    }

                    //fixed value (T)
                    if (arData[19]) {
                        let ar = arData[19].split('|')
                        ed.fixedCoding = {code:ar[0],display:ar[1]}

                    }
                    console.log(ed)
                    $scope.model.diff.push(ed)

                })
            }

            //check that there isn't a circular loop. Each DG should only once in the hierarchy
            function checkParentalHierarchy(parentName) {
                let hashParent = {}

                let model = $scope.allTypes[parentName]

                return ! modelDGSvc.hasDuplicatedParent(model,hashTypes)

               // if (model)
/*
                while (model) {
                    if (model.parent) {
                        if (hashParent[model.parent]) {
                            alert(`The DG ${model.parent} is already a parent in this chain. It cannot appear more than once`)
                            return false
                        } else {
                            hashParent[model.parent] = true

                        }
                    } else {
                        model = null
                    }
                }

                return true
*/

            }
            //leave at the top as called when creating a new DG with a parent
            $scope.setModelAttribute = function(attribute,value) {
                $scope.model[attribute] = value

                if (attribute == 'parent') {

                    //if changing the parent, then re-generate the expanded model

                    //check that there isn't a circular loop by checking that a given DG only
                    //occurs once in the chain


                    if (checkParentalHierarchy(value)) {
                        getFullElementList()
                    } else {
                        //turn off the parent
                        delete $scope.model.parent
                        delete $scope.input.newModelParent

                    }



                }

            }

            //start with the DGs...
            //create the list of DG's that can be added as child elements. Don't include this one...
            if (isNew) {
                $scope.input.types = Object.keys(hashTypes) //an array for the new type dropdown
            } else {
                $scope.input.types = []
                let ar = Object.keys(hashTypes)
                ar.forEach(function(type) {
                    if (type !== model.name) {
                        $scope.input.types.push(type)
                    }
                })
            }



            $scope.input.types.sort()
            //now add the FHIR datatypes
            $scope.input.types = modelsSvc.fhirDataTypes().concat($scope.input.types) //.concat(modelsSvc.fhirDataTypes())


            //get the full list of elements for a DG, following any inheritance chain..
            function getFullElementList() {
                if ($scope.model.name) {    //if creating a new child (with a parent) the name may not be there - or if the parent is set before the name
                    let vo = modelsSvc.getFullListOfElements($scope.model,hashTypes,true)
                    $scope.allElements = vo.allElements
                }

                //console.log(vo)


            }

            //if not new, set the UI names & parent
            if (! isNew) {

                //remove this model type from the list of possible models


                $scope.input.newModelName = model.name
                $scope.input.newModelTitle = model.title
                $scope.input.sourceReference = model.sourceReference
                $scope.input.newModelDescription = model.description
                if (model.parent) {
                    $scope.input.newModelParent = model.parent
                }

                getFullElementList()
              
            } else {
                if (parent) {
                    //$scope.input.newModelParent = model.parent
                    //if there's a parent passed in for a new DG, then set the parent dropdown

                    for (name of $scope.input.possibleParents) {
                        if (name == parent.name) {
                            $scope.input.newModelParent = name
                            $scope.setModelAttribute('parent',name)
                            break
                        }
                    }

                }
            }




            $scope.input.valueSets = Object.keys(hashValueSets)
            $scope.input.valueSets.sort()


            $scope.input.cards = ["0..1","1..1","0..*",'1..*']
            $scope.input.card = $scope.input.cards[0]


            $scope.tabSelected = function (tab) {
                $scope.selectedTab = tab
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

            //called for name onBlur to expand the DG if there is a parent.
            //mainly needed when a DG child is created and there's a parent before a name
            $scope.checkExpand = function () {

                $scope.model.name = $scope.input.newModelName
                $scope.model.title = $scope.model.title || $scope.model.name
                $scope.input.newModelTitle = $scope.model.title
                getFullElementList()




            }

            $scope.checkName = function (name) {

                if (name) {
                    if (name.indexOf(" ") > -1) {
                        alert("Name cannot contain spaces")
                        $scope.input.newModelName = $scope.input.newModelName.replace(/\s/g, "");
                        return
                    }

                    $scope.model.name = name  //we can use the 'isUnique' to know if the model can be added
                    /*
                                    let ar = $scope.input.types.filter(type => type == name)
                                    console.log(ar.length)
                                    $scope.isUnique = (ar.length == 0) //temp
                    */
                    //check on the library. Is this going to be a performance hit?
                    //  if ($scope.isUnique) {
                    modelsSvc.isUniqueNameOnLibrary(name,'dg').then(
                        function () {
                            //name is unique
                            $scope.isUnique = true
                        }, function (err) {
                            $scope.isUnique = false
                        }
                    )
                    // }


                }


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
            $scope.selectElementFromListDEP = function (element) {
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

            $scope.updateElementFromListDEP = function () {



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


            $scope.applyOverrideDEP = function (element,vsUrl) {
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

            $scope.removeOverrideDEP = function (element) {
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
                if ($scope.allElements) {
                    $scope.allElements.forEach(function (element) {
                        //element.ed.path = full path
                        let ar = element.ed.path.split('.')
                        if (ar[ar.length-1] == path) {
                            $scope.isDuplicatePath = true
                        }
                    })
                }

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
                //element.sourceReference = $scope.input.sourceReference
                element.type = [$scope.input.type]
                element.description = $scope.input.description

                if ($scope.input.valueSet) {
                    element.valueSet = $scope.input.valueSet
                }
/*
                if ($scope.input.code) {
                    element.code = [{code:$scope.input.code}]
                }
*/
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