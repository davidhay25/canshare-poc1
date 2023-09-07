//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelsSvc,modelDGSvc) {
        

            let fixedValueText = {}
            fixedValueText.coding = "What is the SNOMED code and display (separated by space)"
            fixedValueText.string = "What is the fixed string"
            fixedValueText.decimal = "What is the fixed decimal"



            //delete the selected item. If the item exists in the DG then it can be removed (or possibly set the mult to 0..0)
            //if not (ie it's inherited) then create an override element
            $scope.deleteDGItem = function (item) {
                let ar = item.path.split(".")
                let dgName = ar[0]

                let pathToDelete =  ar.join(".") // $filter('dropFirstInPath')(item.path)   //remove the DT name from the path

                //check that there aren't any child elements off this one
                let canDelete = true
                let dg = $scope.hashAllDG[dg]
                if (dg && dg.diff) {
                    dg.diff.forEach(function (ed) {
                        if (ed.path.startsWith(pathToDelete)) {
                            canDelete = false
                        }
                    })
                } else {
                    alert("DG has become corrupted. You'll need to reset.")
                }

                if (! canDelete) {
                    alert("You must delete any child nodes first.")
                    return
                }

                let inx = -1
                let ctr = -1
                //let changes = []    //this is the list of changes
                //is the path in the DG diff?
                for (const ed1 of $scope.selectedModel.diff) {
                    ctr ++
                    if (ed1.path == pathToDelete) {
                        inx = ctr
                        break
                    }
                }

                if (inx > -1) {
                    $scope.selectedModel.diff.splice(inx,1)
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

                $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})


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
            $scope.getSourceModelName = function (ed) {
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
                            //ed.valueSet = vsUrl
                            break
                        }
                    }

                    //todo - why twice ???
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.name == ed.name) {
                            ed1.options = updatedEd.options  //this is the model ($localstorage)
                            break
                        }
                    }

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

                //console.log(ed)


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