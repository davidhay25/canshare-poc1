//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelsSvc,modelDGSvc,$timeout) {

        //todo - is this still being used?
            let fixedValueText = {}
            fixedValueText.coding = "What is the SNOMED code and display (separated by space)"
            fixedValueText.string = "What is the fixed string"
            fixedValueText.decimal = "What is the fixed decimal"

            $scope.changeDGType = function (ed) {
                //create a reusable 'type selection dialog' - will be potentially be widely used
                //needs to be hierarchy aware

                $uibModal.open({
                    templateUrl: 'modalTemplates/changeType.html',
                    //backdrop: 'static',
                    size : 'xlg',
                    controller: 'changeTypeCtrl',

                    resolve: {
                        ed: function () {
                            return ed
                        },
                        hashAllDG: function () {
                            return $scope.hashAllDG
                        }
                    }

                }).result.then(function (vo) {
                    //now we can change the type

                    let shortPath = $filter('dropFirstInPath')(ed.path)     //remove the leading type name

                    let newType
                    if (vo.class == 'dg') {
                        newType = vo.value.name
                    } else {
                        newType = vo.value
                    }

                    let found = false           //does the element being edited exist in the diff...
                    for (var ed1 of $scope.selectedModel.diff) {

                        let pathString = $scope.selectedModel.name + "." + ed1.path
                        if (ed.path == pathString) {
                            //this is the one to change
                            found = true
                            ed1.type = [newType]
                           // break don't break as we have to de-activate any child elements. They will be overrides of an existing DG

                        }

                        //if the path in the diff starts with the path being changed, then set the multiplicity to 0..0
                        //it's an override
                        if (ed1.path.startsWith( shortPath + ".") ) {
                            ed1.mult = '0..0'
                        }


                    }

                    if (!found) {
                        //the element was not found in the diff, so needs to be added to it as an override
                        //let ar = ed.path.split('.')
                       // ar.splice(0,1)
                       // ed.path = ar.join('.')

                        ed.path = $filter('dropFirstInPath')(ed.path)
                        ed.type = [newType]

                        $scope.selectedModel.diff.push(ed)

                    }

                    //force the re-draw
                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path: $filter('dropFirstInPath')(ed.path)})


                    console.log(vo)
                })


            }

            $scope.getCategory = function (DG) {
                if (!DG) {
                    return {}
                }
                let categoryTag = {}
                //first look in the DG itself
                categoryTag = findCategoryTag(DG)

                if (!categoryTag.code) {
                    //if there isn't a category on the DG, is there one on any of their parents
                    let clone = angular.copy(DG)
                    while (clone.parent && ! categoryTag.code) {
                        if ($scope.hashAllDG[clone.parent]) { //possible for the parent to not be downloaded from the library
                            categoryTag = findCategoryTag($scope.hashAllDG[clone.parent])
                            clone = angular.copy($scope.hashAllDG[clone.parent])
                            if (! clone) {
                                console.log('>>>', clone.parent)
                            }
                        }



                    }
                }

                function findCategoryTag(DG) {
                    let cTag = {}
                    if (DG && DG.tags) {
                        DG.tags.forEach(function (tag) {
                            if (tag.system == "dgcategory") {
                                cTag = tag
                            }
                        })
                    }
                    return cTag
                }


                return categoryTag
            }

            $scope.dglibraryInteraction = function (DG) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/libraryDG.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'libraryDGCtrl',

                    resolve: {
                        DG: function () {
                            return DG
                        }
                    }

                }).result.then(function (ed) {
                    //copy the units to the current item
                    //need to update the .diff in the selected model
/*
                    //todo - what is this code doing???
                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.units = ed.units
                            //ed.valueSet = vsUrl
                            break
                        }
                    }

                    */
                })
                
            }
            
            //is this element able to be sliced
            $scope.canSlice = function (ed) {
                if (ed && ed.mult) {
                    if (ed.mult.indexOf('..*')  == -1 ) {
                        return false
                    }

                    let type = ed.type[0]
                    let dg = $scope.hashAllDG[type]
                    if (dg && dg.diff.length > 0) {
                        return true
                    }

                    if (type == 'Group') {
                        return true
                    }
                }





            }

            //slicing makes a copy of the ed and adds it as a child
            //note that the path in the ed includes the dg name
            //limit slicing to DG's - ie with a .diff  If we need to slice, say, identifiers then make an Identifier DG
            $scope.slice = function (ed) {
                let sliceName = prompt("Enter the name for the slice (no spaces). It will become a child of this one. Esc to exit.")
                if (sliceName) {

                    if (sliceName.split(' ').length > 1) {
                        alert("Spaces are not allowed")
                        return
                    }


                    let clone = angular.copy(ed)  //copy to insert
                    let basePath = $filter('dropFirstInPath')(ed.path)
                    let newPath = `${basePath}.slice:${sliceName}`
                    clone.path = newPath
                    clone.title = `Slice ${sliceName} from ${basePath}`
                    clone.mult = "0..1"         //set to single, optional

                    //if the ed has already been sliced, then originalType saves what it was before setting to group
                    if (ed.originalType) {
                        clone.type = ed.originalType
                    }
                    clone.slicedFrom = ed.path      //link back to edlement that was sliced . So we know it's a slice, and what of
                    console.log(clone)
                    $scope.selectedModel.diff.push(clone)

                    //also need to change the type of the element that was sliced. hmmm.
                    //what happens if sliced twice - original dt lost? ?store original??

                    if (! ed.originalType) {
                        ed.originalType = ed.type
                    }

                    //set the type of the element being sliced to group
                    ed.type = ['Group']


                    //update the selectedModel
                    //if you're slicing an inherited path, will need to add an override element
                    let inx = -1
                    let found
                    for (const ed1 of $scope.selectedModel.diff) {
                        inx++
                        let shortPath = $filter('dropFirstInPath')(ed.path)
                        if (ed1.path == shortPath) {
                            ed.path = shortPath
                            $scope.selectedModel.diff.splice(inx,1,angular.copy(ed))
                            found = true
                            break
                        }
                    }

                    if (! found) {
                        ed.path = $filter('dropFirstInPath')(ed.path)
                        $scope.selectedModel.diff.push(ed)
                    }



                    //update the global change log
                    modelDGSvc.updateChanges($scope.selectedModel,
                        {edPath:newPath,
                            msg:`Sliced ${ed.path}`},
                        $scope)

                    //rebuild fullList and re-draw the tree
                    $scope.refreshFullList($scope.selectedModel)

                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:newPath})


                }

            }

            $scope.displayDGDialog = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/dgDialog.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'modelDGDialogCtrl',

                    resolve: {
                        ED: function () {
                            return ed
                        },
                        hashAllDG : function () {
                            return $scope.hashAllDG
                        },
                        fullElementList : function () {
                            return $scope.fullElementList
                        }
                    }

                }).result.then(function (ed) {
                    /*
                    //copy the units to the current item
                    //need to update the .diff in the selected model
                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.units = ed.units
                            //ed.valueSet = vsUrl
                            break
                        }
                    }
                    */
                })
                
            }



            $scope.getControlType = function (ed) {
                if (ed) {
                    let controlType = "input"
                    if (ed.options) {
                        controlType = 'dropdown'
                    }

                    //the root element has no type
                    if (ed.type) {
                        let type = ed.type[0]
                        if ($scope.hashAllDG[type] && $scope.hashAllDG[type].diff) {
                            controlType = "dg"
                        }
                    }


                    //console.log(controlType)
                    return controlType
                }


            }

            //delete the selected item. If the item exists in the DG then it can be removed (or possibly set the mult to 0..0)
            //if not (ie it's inherited) then create an override element
            $scope.deleteDGItem = function (item) {
                let ar = item.path.split(".")       //this i sthe full path - with prepended dg name
                let dgName = ar[0]      //so the DG name is the first segment (should be the same as selectedModel

                ar.splice(0,1)          //remove the first element
                let pathToDelete =  ar.join(".") // $filter('dropFirstInPath')(item.path)   //remove the DT name from the path

                //check that there aren't any child elements off this one
                let canDelete = true
                let dg = $scope.hashAllDG[dgName]
                if (dg && dg.diff) {
                    dg.diff.forEach(function (ed) {
                        //let path = ed.path
                        if (ed.path.startsWith(pathToDelete) && ed.path !== pathToDelete) { //don't want it matching on itself!
                            if (ed.mult !== '0..0') {
                                //if the child is deleted, then it's safe to delete this one...
                                canDelete = false
                            }

                        }
                    })

                } else {
                    alert(`DG ${dgName} cannot be found, or has no diff. You'll need to reset.`)
                    return
                }

                if (! canDelete) {
                    alert("You must delete any child nodes first.")
                    return
                }

                if (! confirm("Are you sure you wish to delete this element")) {
                    return
                }

                let inx = -1
                let ctr = -1
                //let changes = []    //this is the list of changes

                //is the path in the DG diff? (or is it inherited from an ancestor)
                for (const ed1 of $scope.selectedModel.diff) {
                    ctr ++
                    if (ed1.path == pathToDelete) {
                        inx = ctr
                        break
                    }
                }

                if (inx > -1) {
                    //set the mult to 0..0
                    $scope.selectedModel.diff[inx].mult = '0..0'

                    //$scope.selectedModel.diff.splice(inx,1)
                } else {
                    //The attribute that was edited (eg edscription) is inherited
                    //Need to create an 'override' element and add to the DG


                    //let ar = ed.path.split('.')
                    //ar.splice(0,1)
                    //set the minimum required elements..
                    let ed = {path:pathToDelete,mult:"0..0",type:['string']}
                    //ed.path = ar.join('.')
                    $scope.selectedModel.diff.push(ed)
                }

                //rebuild fullList and re-draw the tree
                $scope.refreshFullList($scope.selectedModel)

                //$scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})


            }

            //retur true if the datatype can have a fixed value
            $scope.isFixedType = function (ed) {
                if (ed && ed.type) {
                    let type = ed.type[0]       //only look at the first
                    if (type == 'CodeableConcept' || type == 'decimal' || type == 'string') {
                        return true
                    }
                }
            }

            //locate the model where this item was defined
            //todo - this needs a little work
            $scope.getSourceModelName = function (ed) {
//return "test"
                if (ed) {
                    return ed.sourceModelName
                }


                //why do this?
                if (ed) {
                    for (const element of $scope.fullElementList) {
                        if (element.ed.path == ed.path) {
                            return element.sourceModelName
                            break
                        }
                    }
                }
            }

            $scope.expandDTTree = function () {
                $('#dgTree').jstree('open_all');
            }

            //set the possiblu units for a Quantity DT
            $scope.setUnits = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/setUnits.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'setUnitsCtrl',

                    resolve: {
                        ED: function () {
                            return ed
                        }
                    }

                }).result.then(function (ed) {
                    //copy the units to the current item
                    //need to update the .diff in the selected model
                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.units = ed.units
                            //ed.valueSet = vsUrl
                            break
                        }
                    }
                })
            }

            $scope.editDGOptionsList = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'optionsCtrl',

                    resolve: {
                        ed: function () {
                            return ed
                        },
                        readOnly : function () {
                            return false
                        }
                    }

                }).result.then(function (updatedEd) {
                    //need to update the .diff in the selected model

                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.options = updatedEd.options
                            break
                        }
                    }
/*
                    //todo - why twice ???
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.name == ed.name) {
                            ed1.options = updatedEd.options  //this is the model ($localstorage)
                            break
                        }
                    }
*/
                    modelDGSvc.updateChanges($scope.selectedModel,
                        {edPath:p,
                            msg:`Update options list`},
                        $scope)


                })
            }

            //set the fixed value for a CC - creates / update override element
            //todo may be able to use this code for comp as well
            $scope.setFixedValue = function(ed) {

                //figure out the type from the ed
                let type = 'coding'         //the default
                switch (ed.type[0]) {
                    case "string" :
                        type = 'string'
                        break
                    case "decimal" :
                        type = 'decimal'
                        break
                }


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
                    //the type of vo is appropriate to the type
                    let elValue = vo
                    let elName

                    switch (type) {
                        case "coding":
                            elName = "fixedCoding"
                            break
                    }



                    let ar = ed.path.split('.')  //need to remove the first part of the path
                    ar.splice(0,1)
                    let path = ar.join('.')

                    //remove the fixedCode from any existing element with this path
                    let found = false
                    for (const ed of $scope.selectedModel.diff) {
                        if (ed.path == path) {
                            ed[elName] = elValue

                            modelDGSvc.updateChanges($scope.selectedModel,
                                {edPath:ed.path,
                                    msg:`Set fixed ${type} to ${angular.toJson(elValue)}`},
                                $scope)

                            found = true
                            break
                        }
                    }

                    if (! found) {
                        let overrideEd = angular.copy(ed)

                        //overrideEd.fixedCoding = {code:value}

                        overrideEd[elName] = elValue

                        overrideEd.path = path
                        $scope.selectedModel.diff.push(overrideEd)

                        modelDGSvc.updateChanges($scope.selectedModel,
                            {edPath:ed.path,
                                msg:`Set fixed ${type} to ${angular.toJson(elValue)}`},
                            $scope)

                    }

                    ed[elName] = elValue   //for the display
                    //ed.fixedCoding = {code:value}        //for the display


                    //rebuild the full element list for the table
                    let vo1 = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                    $scope.fullElementList = vo1.allElements




                })

return

                let value = prompt(`${fixedValueText[type]} for ${ed.path}`)

                if (value) {
                    //set the element name and value based on DataType. default to stirng
                    let elName = "fixedString"
                    let elValue = value
                    switch (type) {
                        case 'coding' :
                            //can enter code & display separated by space
                            let t = value.replace(/\s+/g, ' ').trim()
                            let ar = t.split(' ')
                            elName = "fixedCoding"
                            elValue = {code:ar[0]}
                            if (ar.length > 1) {
                                elValue.display = ar[1]
                            }
                            break
                        case 'decimal' :
                            elName = "fixedDecimal"
                            elValue = parseFloat(value)
                            break

                    }

                    let ar = ed.path.split('.')  //need to remove the first part of the path
                    ar.splice(0,1)
                    let path = ar.join('.')

                    //remove the fixedCode from any existing element with this path
                    let found = false
                    for (const ed of $scope.selectedModel.diff) {
                        if (ed.path == path) {
                            ed[elName] = elValue

                            modelDGSvc.updateChanges($scope.selectedModel,
                                {edPath:ed.path,
                                    msg:`Set fixed ${type} to ${angular.toJson(elValue)}`},
                                $scope)

                            found = true
                            break
                        }
                    }

                    if (! found) {
                        let overrideEd = angular.copy(ed)

                        //overrideEd.fixedCoding = {code:value}

                        overrideEd[elName] = elValue

                        overrideEd.path = path
                        $scope.selectedModel.diff.push(overrideEd)

                        modelDGSvc.updateChanges($scope.selectedModel,
                            {edPath:ed.path,
                                msg:`Set fixed ${type} to ${angular.toJson(elValue)}`},
                            $scope)

                    }

                    ed[elName] = elValue   //for the display
                    //ed.fixedCoding = {code:value}        //for the display


                    //rebuild the full element list for the table
                    let vo = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                    $scope.fullElementList = vo.allElements
                }
            }

            //remove the fixed element, but leave the (likely override) in place
            //as there may have been other parts in that element that were overriden - like multiplicity
            $scope.clearFixedValue = function(ed) {
                let ar = ed.path.split('.')  //need to remove the first part of the path
                ar.splice(0,1)
                let path = ar.join('.')

                let found
                for (const ed1 of $scope.selectedModel.diff) {
                    if (ed1.path == path) {
                        found = true

                        modelDGSvc.updateChanges($scope.selectedModel,
                            {edPath:ed1.path, msg:`clear fixed value`},$scope)


                        Object.keys(ed).forEach(function (key) {
                            if (key.substring(0,5) == 'fixed') {
                                delete ed[key]
                                delete ed1[key]
                            }

                        })

                        /*
                        delete ed.fixedCoding   //for the display
                        delete ed1.fixedCoding
                        delete ed.fixedDecimal   //for the display
                        delete ed1.fixedDecimal
                        delete ed.fixedString   //for the display
                        delete ed1.fixedString
*/
                        break
                    }
                }

                //this should no longer be triggerred as routine is only called when can be cleared
                if (! found) {
                    let sourceModeName = $scope.getSourceModelName(ed)
                    alert(`Fixed values can only be removed on the DG where it was set (${sourceModeName})`)
                }


                //rebuild the full element list for the table
                let vo = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                $scope.fullElementList = vo.allElements

                //$scope.$parent.dgUpdates = modelDGSvc.makeUpdateList($scope.hashAllDG, $scope.xref )

            }

            //change the valueset. This actually changes the model - the composition doesn't (it sets an override)
            $scope.changeDGValueSetDEP = function (ed) {
                let vsUrl = prompt("Enter the ValueSet url")
                if (vsUrl) {

                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.valueSet = vsUrl        //this is the model ($localstorage)
                            ed.valueSet = vsUrl         //this is the display


                            modelDGSvc.updateChanges($scope.selectedModel,
                                {edPath:ed.path,
                                    msg:`Set ValueSet to ${vsUrl}`},
                                $scope)

                            break
                        }
                    }

                }
            }


    })