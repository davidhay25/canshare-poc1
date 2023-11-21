//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelsSvc,modelDGSvc,$timeout,librarySvc,traceSvc) {

        //todo - is this still being used?
            let fixedValueText = {}
            fixedValueText.coding = "What is the SNOMED code and display (separated by space)"
            fixedValueText.string = "What is the fixed string"
            fixedValueText.decimal = "What is the fixed decimal"

            $scope.dependencySourceDisplay = function (ed) {
                return `${ed.path} (${ed.title})`
            }

            $scope.cloneDG = function (dg) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/getName.html',
                    //backdrop: 'static',
                    //size : 'lg',
                    controller: 'getNameCtrl',
                    resolve: {
                        kind: function () {
                            return "dg"
                        }
                    }

                }).result.then(function (vo) {
                    modelsSvc.isUniqueNameOnLibrary(vo.name,'dg').then(
                        function () {
                            let newDG = angular.copy(dg)
                            newDG.name = vo.name
                            newDG.title = vo.title
                            newDG.description = vo.description
                            newDG.checkedOut = $scope.user.email
                            newDG.author = $scope.user.email

                            //save a copy to the Library (as we do with DGs). As it's new, it won't be downloaded
                            librarySvc.checkOut(newDG,$scope.user)
                            traceSvc.addAction({description:`Checkout as part of DG clone ${newDG.name}`,
                                action:"checkout",
                                model:newDG})

                            $scope.hashAllDG[newDG.name] = newDG
                            traceSvc.addAction({action:'clone-model',model:newDG})
                            $scope.$emit('updateDGList',newDG.name)

                            //$scope.selectModel(newDG)      //in modelsCtrl

                        }, function() {
                            alert(`Sorry, this name (${vo.name}) is not unique`)
                        }
                    )
                })
            }


            $scope.deleteDGDiff = function (inx) {
                if (confirm("Are you sure you wish to remove this Override? It will be removed from all children (unless they have overriden it)")) {
                    //traceSvc.addAction({action:'delete element',model:$scope.selectedModel,description:"From diff display"})

                    let pathToDelete = $scope.selectedModel.diff[inx].path
                    $scope.selectedModel.diff.splice(inx,1)

                    traceSvc.addAction({description:pathToDelete,
                        action:"delete-diff",
                        model:$scope.selectedModel})



                    $scope.refreshFullList($scope.selectedModel)


                    $scope.termSelectDG({DGName:$scope.selectedModel.name})
                }
            }


            $scope.hideInQ = function (edIn) {

                if (! $scope.user || $scope.selectedModel.checkedOut !== $scope.user.email) {
                    alert("You must check out the DG to make changes")
                    return
                }

                let path = $filter('dropFirstInPath')(edIn.path)

                let found = false
                for (const ed of $scope.selectedModel.diff) {
                    if (ed.path == path) {
                        ed.hideInQ = ! ed.hideInQ
                        let action = ed.hideInQ ? 'set-hideinq' : 'reset-hideinq'
                        $scope.selectedNode.data.ed.hideInQ = ed.hideInQ    //for the display

                        traceSvc.addAction({action:action,model:$scope.selectedModel,description:`path: ${path} - update diff`})
                        found = true

                        break
                    }
                }

                //create an override element
                if (! found) {
                    edIn.hideInQ = ! edIn.hideInQ
                    let action = edIn.hideInQ ? 'set-hideinq' : 'reset-hideinq'
                    edIn.path = path
                    $scope.selectedModel.diff.push(edIn)
                    traceSvc.addAction({action:action,model:$scope.selectedModel,description:`path: ${path} - add diff`})
                }

                $scope.refreshFullList($scope.selectedModel)
                $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:path})


            }

            //check out the current DG
            $scope.checkOut = function () {


                librarySvc.checkOut($scope.selectedModel,$scope.user,function (dg) {
                    //returns the DG downloaded from the library
                    if (dg) {
                        $scope.hashAllDG[dg.name] = dg
                        $scope.selectModel(dg)      //in modelsCtrl
                        traceSvc.addAction({action:'checkout',model:dg,description:"after"})
                    }


                })
            }

            $scope.checkIn = function () {
                //if (confirm("Are you sure you wish to check th"))
                traceSvc.addAction({action:'checkin',model:$scope.selectedModel})
                librarySvc.checkIn($scope.selectedModel,$scope.user)

            }

            $scope.revert = function () {
                if (confirm("Are you sure you wish to revert and lose any changes you have made?")) {
                    traceSvc.addAction({action:'revert-before',model:$scope.selectedModel})
                    librarySvc.revert($scope.selectedModel, $scope.user).then(
                        function (data) {
                            //returns the model from the library
                            $scope.hashAllDG[$scope.selectedModel.name] = data
                            traceSvc.addAction({action:'revert-after',model:data})
                            $scope.$emit('updateDGList',{name:$scope.selectedModel.name})

                            alert("Check out has been cancelled, and the Library version of this DG downloaded.")
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }

            $scope.showHistory = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/history.html',
                    //backdrop: 'static',
                    size : 'lg',
                    controller: 'historyCtrl',

                    resolve: {
                        name: function () {
                            return $scope.selectedModel.name
                        },
                        category: function () {
                            return "dg"
                        },
                        currentModel : function () {
                            return $scope.selectedModel
                        }
                    }
                })
            }

            //add an enableWhen within the scope of the current DG. Assume (for now) that the trigger is a coded value
            //value is assumed to be a Coding
            $scope.addEnableWhen = function(item,value,op) {
                //item is the controlling ed - the one whose value will hide/show the currently selected element

                //let sourcePath = item.shortPath       //this is the path of the source
                let sourcePath = item.ed.path       //not completely sure how these should work ATM
                let targetPath = $filter('dropFirstInPath')($scope.selectedNode.data.ed.path)
                let targetED = $scope.selectedNode.data.ed  //this ED - the one that will be shown / hidden

                //console.log(sourcePath,targetPath,value)

                //todo - what if there is no diff
                let found = false
                for (const ed of $scope.selectedModel.diff) {
                    if (ed.path == targetPath) {
                        found = true
                        ed.enableWhen = ed.enableWhen || []
                        let ew = {source:sourcePath,operator:op,value:value}
                        ed.enableWhen.push(ew)

                        traceSvc.addAction({action:'add-enablewhen',model:$scope.selectedModel,path:targetPath,description:'edit diff'})
                        break
                    }
                }

                if (! found) {
                    let diffEd = angular.copy(targetED)     //this is a copy of the 'source' - which will be hidden
                    diffEd.path = targetPath
                    diffEd.enableWhen = item.ed.enableWhen || []
                    let ew = {source:sourcePath,operator:"=",value:value}
                    diffEd.enableWhen.push(ew)
                    $scope.selectedModel.diff.push(diffEd)
                    traceSvc.addAction({action:'add-enablewhen',model:$scope.selectedModel,path:targetPath,description:'add diff'})
                }

                delete $scope.input.ewSourceValue
                delete $scope.input.ewSource
                //in modelsCtrl
                $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:targetPath})

            }

            $scope.removeEnableWhen = function (inx) {

                let path = $filter('dropFirstInPath')($scope.selectedNode.data.ed.path)

                for (const ed of $scope.selectedModel.diff) {
                    if (ed.path == path) {
                        if (ed.enableWhen && ed.enableWhen.length > inx) {
                            let ew = ed.enableWhen.splice(inx,1)

                            traceSvc.addAction({action:'remove-enablewhen',model:$scope.selectedModel,
                                path:path,description:angular.toJson(ew[0])})
                            //in modelsCtrl
                            $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:path})

                        }

                    }
                }


            }

            //When adding a new EW and the source has been selected. The possible values of that source need to be determined.
            $scope.ewSourceSelected = function (source) {
                //console.log(source)
                delete $scope.ewSourceValues
                $scope.input.ewSourceOp = "="       //default to =

                if (source) {

                    //need to get the list of options from the fullElement list
                    for (const item of $scope.fullElementList) {
                        console.log(item)
                        if (item.ed && item.ed.path == source.ed.path) {
                            modelDGSvc.expandEdValues(item.ed).then(
                                function (ar) {
                                    $scope.ewSourceValues = ar
                                },
                                function (err) {
                                    console.log(err)
                                }
                            )
                        }
                    }
              //  }
                    //$scope.fullElementList.forEach(function (item) {
/*
                    //get the ed from the current model as it may have been updated
                    let sourcePath = $filter('dropFirstInPath')(source.ed.path)

                    let sourceEd =  $scope.selectedModel.diff.filter(ed => ed.path == sourcePath)
                    if (sourceEd.length == 1) {
                        modelDGSvc.expandEdValues(sourceEd[0]).then(
                            function (ar) {
                                $scope.ewSourceValues = ar
                            },
                            function (err) {
                                console.log(err)
                            }
                        )
                    }

                    */



                }

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
                        },
                        user : function () {
                            return $scope.user
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



            $scope.setOtherAllowedStatus = function (ed,allowed) {
                console.log(allowed)


                //need to update the underlying model
                let path = $filter("dropFirstInPath")(ed.path)
                for (const ed1 of $scope.selectedModel.diff) {
                    if (ed1.path == path) {
                        ed1.otherAllowed = allowed
                    }
                }

            }
            
            //is this element able to be sliced
            $scope.canSlice = function (ed) {
                if (ed && ed.mult) {
                    //must be multiple
                    if (ed.mult.indexOf('..*')  == -1 ) {
                        return false
                    }

                    //Must be a diff with entries - ie a DG not a DT
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

                    //make sure this isn't a duplicate path
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == newPath) {
                            alert("This slice name has been used before. Try again.")
                            return
                            break
                        }
                    }


                    clone.path = newPath
                    clone.title = sliceName //`Slice ${sliceName} from ${basePath}`
                    clone.mult = "0..1"         //set to single, optional

                    //if the ed has already been sliced, then originalType saves what it was before setting to group
                    if (ed.originalType) {
                        clone.type = ed.originalType
                    }
                    clone.slicedFrom = ed.path      //link back to edlement that was sliced . So we know it's a slice, and what of
                    console.log(clone)

                    $scope.selectedModel.diff.push(clone)
                    traceSvc.addAction({action:'add-slice',path:newPath,model:$scope.selectedModel})

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



            $scope.setControlHint = function(ed,value) {
                let path = $filter("dropFirstInPath")(ed.path)
                for (const ed1 of  $scope.selectedModel.diff) {
                    if (ed1.path == path) {
                        ed1.controlHint = value
                        $scope.selectedNode.data.ed.controlHint = value  //so the Json is updated
                        break
                    }
                }
            }



            //delete the selected item. If the item exists in the DG then it can be removed. Don't set the mult to 0..0 as this prevents a new element with that path
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
                    //$scope.selectedModel.diff[inx].mult = '0..0'

                    $scope.selectedModel.diff.splice(inx,1)
                    traceSvc.addAction({action:'delete-element',model:$scope.selectedModel,
                        path:pathToDelete,description:'edit diff'})
                    //$scope.selectedModel.diff.splice(inx,1)
                } else {
                    //The attribute that was edited (eg edscription) is inherited
                    //Need to create an 'override' element and add to the DG

                    //set the minimum required elements..
                    let ed = {path:pathToDelete,mult:"0..0",type:['string']}
                    //ed.path = ar.join('.')
                    $scope.selectedModel.diff.push(ed)
                    traceSvc.addAction({action:'delete-element',model:$scope.selectedModel,
                        path:pathToDelete,description:'add diff'})
                }

                //rebuild fullList and re-draw the tree
                $scope.refreshFullList($scope.selectedModel)

                //$scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})


            }

            //retur true if the datatype can have a fixed or default value
            $scope.isFixedType = function (ed) {
                if (ed && ed.type) {
                    let type = ed.type[0]       //only look at the first
                    if (type == 'CodeableConcept' || type == 'Quantity' || type == 'Ratio') {
                        //if (type == 'CodeableConcept' || type == 'decimal' || type == 'string') {
                        return true
                    }
                }
            }

            //locate the model where this item was defined
            //todo - this needs a little work
            $scope.getSourceModelName = function (ed) {

                if (ed) {
                    return ed.sourceModelName
                }

/*
                //why do this?
                if (ed) {
                    for (const element of $scope.fullElementList) {
                        if (element.ed.path == ed.path) {
                            return element.sourceModelName
                            break
                        }
                    }
                }
                */
            }

            $scope.expandDTTree = function () {
                $('#dgTree').jstree('open_all');
            }

            //set the possiblu units for a Quantity DT
            $scope.setUnitsDEP = function (ed) {
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
                            traceSvc.addAction({action:'edit-units',model:$scope.selectedModel,path:p})
                            break
                        }
                    }
                })
            }

            $scope.editDGOptionsList = function (ed,readOnly) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    controller: 'optionsCtrl',
                    resolve: {
                        ed: function () {
                            return ed
                        },
                        readOnly : function () {
                            //return readOnly
                            return true
                        }
                    }

                }).result.then(function (updatedEd) {
                    //need to update the .diff in the selected model

                    let found = false
                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.options = updatedEd.options
                            traceSvc.addAction({action:'set-options',model:$scope.selectedModel,path:p,description:`edit diff`})
                            found = true

                            break
                        }
                    }

                    if (! found) {
                        //Need to create an 'override' element and add to the DG

                        //remove the type name
                        updatedEd.path = $filter('dropFirstInPath')(updatedEd.path)
                        $scope.selectedModel.diff.push(updatedEd)
                        traceSvc.addAction({action:'set-options',model:$scope.selectedModel,path:p,description:"add diff"})
                        //alert('diff added')
                    }



                })
            }

            //set the fixed value for a CC - creates / update override element
            //todo may be able to use this code for comp as well
            //use for both default and fixed
            //kind is 'fixed' or 'default'
            $scope.setFixedValue = function(ed,kind) {

                //figure out the type from the ed
                let type // = 'Coding'         //the default
                let current

                switch (ed.type[0]) {
                    case "CodeableConcept" :
                        type = 'Coding'
                        current = ed.fixedCoding
                        if (kind == 'default') {
                            current = ed.defaultCoding
                        }

                        break
                    case "Quantity" :
                        type = "Quantity"
                        current = ed.fixedQuantity
                        if (kind == 'default') {
                            current = ed.defaultQuantity
                        }

                        break
                    case "Ratio" :
                        type = 'Ratio'
                        current = ed.fixedRatio
                        if (kind == 'default') {
                            current = ed.defaultRatio
                        }
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
                        }, kind: function () {
                            return kind
                        }, current: function () {
                            return current
                        }
                    }

                }).result.then(function (vo) {
                    //the type of vo is appropriate to the type
                    let elValue = vo
                    let elName

                    switch (type) {
                        case "Coding":
                            elName = "fixedCoding"
                            if (kind == "default") {
                                elName = "defaultCoding"
                            }
                            break
                        case "Quantity":
                            elName = "fixedQuantity"
                            if (kind == "default") {
                                elName = "defaultQuantity"
                            }
                            break
                        case "Ratio":
                            elName = "fixedRatio"
                            if (kind == "default") {
                                elName = "defaultRatio"
                            }
                            break

                    }


                    let path = $filter('dropFirstInPath')(ed.path)


                    //remove the fixedCode from any existing element with this path
                    let found = false
                    for (const ed of $scope.selectedModel.diff) {
                        if (ed.path == path) {
                            ed[elName] = elValue
                            traceSvc.addAction({action:'set-fixed',model:$scope.selectedModel,path:path,description:`edit diff`})


                            found = true
                            break
                        }
                    }

                    if (! found) {
                        let overrideEd = angular.copy(ed)

                        overrideEd[elName] = elValue
                        overrideEd.path = path
                        $scope.selectedModel.diff.push(overrideEd)
                        traceSvc.addAction({action:'set-fixed',model:$scope.selectedModel,path:path,description:`add diff`})

                    }

                    ed[elName] = elValue   //for the display


                    //rebuild the full element list for the table
                    let vo1 = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                    $scope.fullElementList = vo1.allElements

                })


            }

            //remove the fixed or default element, but leave the (likely override) in place
            //as there may have been other parts in that element that were overriden - like multiplicity
            $scope.clearFixedValueDEP = function(ed,kind) {

                let path = $filter('dropFirstInPath')(ed.path)


                let found
                for (const ed1 of $scope.selectedModel.diff) {
                    if (ed1.path == path) {
                        found = true

                        //This will clear all fixed (or default) elements - though there should only be 1
                        Object.keys(ed).forEach(function (key) {

                            //if (key.substring(0,5) == 'fixed') {
                            if (key.substring(0,kind.length) == kind) {
                                delete ed[key]
                                delete ed1[key]
                                traceSvc.addAction({action:'remove-fixed',model:$scope.selectedModel,path:path})
                            }

                        })


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



    })