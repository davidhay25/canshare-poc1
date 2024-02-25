angular.module("pocApp")
    .controller('editDGItemCtrl',
        function ($scope,$filter,item,allTypes,hashAllDG,fullElementList,$uibModal,$http,parentEd) {
            $scope.item = item      //will be {ed:} if editing an existing
            $scope.allTypes = allTypes
            $scope.input = {}
            $scope.fullElementList = fullElementList

            $scope.options = []     //a list of options. Will be saved as ed.options
            $scope.units = [] //a list of units. Will be saved as ed.units



            //parentEd is the ed to which the new one is going to be added. It's ignored during editing existing
            //we want to be sure that any path added at this level is unique (but OK at other levels)
            let posOfChildren = 1  //by default, will look for dups in the first segment. Don't always have a selected element - eg when a DG is first selected
            let hashChildNames = {} //all the existing child path names
            if (parentEd && parentEd.path) {
                let ar = parentEd.path.split('.')
                posOfChildren = ar.length     //this is where all the direct children will sit - 0 based
            }

            fullElementList.forEach(function (item) {
                let ed = item.ed
                if (ed && ed.path) {
                    let ar = ed.path.split('.')
                    if (ar.length >= posOfChildren) {
                        //this is a child - or a child of a child
                        let segmentName = ar[posOfChildren]
                        hashChildNames[segmentName] = true
                    }
                }

            })

            console.log(hashChildNames)



            let snomed = "http://snomed.info/sct"

            function makeQuantityDisplay(quantity) {
                let display = ""
                if (quantity.unit) {
                    display += `Unit: ${quantity.unit}  `
                }
                if (quantity.value) {
                    display += `Value: ${quantity.value}`
                }
                return display

            }


            //when an item is passed in for editing
            if (item && item.ed) {
                $scope.input.description = item.ed.description
                $scope.input.title = item.ed.title
                $scope.input.notes = item.ed.notes
                $scope.input.rules = item.ed.rules
                $scope.input.valueSet = item.ed.valueSet
                $scope.input.sourceReference = item.ed.sourceReference
                $scope.input.fsh = item.ed.fsh
                $scope.input.fhirPath = item.ed.fhirPath
                $scope.input.extUrl = item.ed.extUrl
                $scope.input.path =  $filter('dropFirstInPath')(item.ed.path)
                $scope.input.controlHint =  item.ed.controlHint
                $scope.input.otherType =  item.ed.otherType
                $scope.input.placeholder =  item.ed.placeholder

                $scope.input.hideInQ =  item.ed.hideInQ

                $scope.input.selectedType = item.ed.type[0]
                setControlOptions($scope.input.selectedType)

                //set the options list
                if (item.ed.options) {
                    $scope.options = item.ed.options
                    makeOptionsText()
                }

                //set the options list
                if (item.ed.units) {
                    $scope.units = item.ed.units

                }

                //displays for fixed
                if (item.ed.fixedCoding) {
                    $scope.fixed = {elName:'fixedCoding',value:item.ed.fixedCoding}
                    $scope.fixedDisplay = `${item.ed.fixedCoding.code} | ${item.ed.fixedCoding.display} | ${item.ed.fixedCoding.system}`
                }

                if (item.ed.fixedRatio) {
                    $scope.fixed = {elName:'fixedRatio',value:item.ed.fixedRatio}
                    $scope.fixedDisplay = `Numerator Unit: ${item.ed.fixedRatio.numerator.unit} Denominator Unit: ${item.ed.fixedRatio.denominator.unit} Denominator value: ${item.ed.fixedRatio.denominator.value}`
                }

                if (item.ed.fixedQuantity) {
                    $scope.fixed = {elName:'fixedQuantity',value:item.ed.fixedQuantity}
                    $scope.fixedDisplay = makeQuantityDisplay(item.ed.fixedQuantity)



                }

                //displays for default
                if (item.ed.defaultCoding) {
                    $scope.default = {elName:'defaultCoding',value:item.ed.defaultCoding}
                    $scope.defaultDisplay = `${item.ed.defaultCoding.code} | ${item.ed.defaultCoding.display} | ${item.ed.defaultCoding.system}`
                }

                if (item.ed.defaultRatio) {
                    $scope.default = {elName:'defaultRatio',value:item.ed.defaultRatio}
                    $scope.defaultDisplay = `Numerator Unit: ${item.ed.defaultRatio.numerator.unit} Denominator Unit: ${item.ed.defaultRatio.denominator.unit} Denominator value: ${item.ed.defaultRatio.denominator.value}`
                }

                if (item.ed.defaultQuantity) {
                    $scope.default = {elName:'defaultQuantity',value:item.ed.defaultQuantity}
                    $scope.defaultDisplay = makeQuantityDisplay(item.ed.defaultQuantity)


                }
                

                for (const typ of allTypes) {
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

            //retur true if the datatype can have a fixed value
            $scope.isFixedType = function (type) {

                if (type == 'CodeableConcept' || type == 'Quantity' || type == 'Ratio') {
                    //if (type == 'CodeableConcept' || type == 'decimal' || type == 'string') {
                    return true
                }

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

            function deleteOtherConditional(ed) {
                //remove any conditionals related to the 'otherType' - 74964007
                if (ed.enableWhen) {
                    let ar = []
                    //will hold new enable when

                }
            }

            function addOtherConditional() {

            }


            //doesn't set the path - as that is different when being used to create a new DG element
            function editED (ed) {
                ed.type = [$scope.input.selectedType]
                //ed.path = `new.${$scope.input.path}`        //the 'new.' is stripped off, as the full path is passed in for editing existing
                ed.description = $scope.input.description
                ed.notes = $scope.input.notes
                ed.rules = $scope.input.rules
                ed.title = $scope.input.title
                ed.units = $scope.units
                ed.mult = $scope.input.mult
                ed.valueSet = $scope.input.valueSet
                ed.hideInQ = $scope.input.hideInQ
                ed.placeholder = $scope.input.placeholder
                if ($scope.input.controlHint) {
                    ed.controlHint = $scope.input.controlHint
                }

                if ($scope.input.otherType) {
                    ed.otherType = $scope.input.otherType
                    /*
                    switch ($scope.input.otherType) {
                        case 'sometimes' :
                            addOtherConditional()
                            break
                        default :
                            deleteOtherConditional()
                            break
                    }
                    */

                } else {
                    //delete any otherType conditional that may be present
                    //deleteOtherConditional()
                }

                ed.sourceReference = $scope.input.sourceReference
                ed.fsh = $scope.input.fsh
                ed.fhirPath = $scope.input.fhirPath
                ed.extUrl = $scope.input.extUrl




                //There's a
                //$scope.fixed.elName is set by the modal - fixedCoding or fixedQuantity etc.

                if ($scope.fixed && $scope.fixed.elName) {
                    ed[$scope.fixed.elName] = $scope.fixed.value
                } else {
                    let type = $scope.input.selectedType
                    if (type == 'CodeableConcept') {type = 'Coding'}
                    let elName = `fixed${type}`
                    delete ed[elName]
                }

                if ($scope.default && $scope.default.elName) {
                    ed[$scope.default.elName] = $scope.default.value
                } else {
                    let type = $scope.input.selectedType
                    if (type == 'CodeableConcept') {type = 'Coding'}
                    let elName = `default${type}`
                    delete ed[elName]
                }

                ed.options = $scope.options

                return ed
            }

            $scope.clearFixedValue = function (kind) {
                if (kind == 'default') {
                    delete $scope.default
                    delete $scope.defaultDisplay

                } else if (kind == 'fixed') {
                    delete $scope.fixed
                    delete $scope.fixedDisplay
                }

            }

            $scope.save = function() {

                if (allTypes.indexOf($scope.input.selectedType) == -1) {
                    alert("Invalid type")
                    return
                }

                if ($scope.isNew) {
                    //don't allow an existing path to be added. This is legit as an override, but not through this dialog

                   if (hashChildNames[$scope.input.path] ){
                       alert("This path has already been used at this level in this DG")
                       return
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
                    ed.path = `new.${$scope.input.path}`        //the 'new.' is stripped off, as the full path is passed in for editing existing
                    editED(ed)


                    $scope.$close(ed)

                } else {
                    //this is an update

                    //this actually edits the passed in ed. So an element not updated
                    //will 'pass through' attributes not editable in this dialog


                    editED(item.ed)


                    $scope.$close(item.ed)
                }

            }




            //display the screen to get the fixed or default values
            $scope.setFixedValue = function(kind) {

                let ed = {}
                if (item && item.ed) {
                    ed = item.ed
                }


                //figure out the type from the ed
                let type
                let current


                switch ($scope.input.selectedType) {
                //switch (ed.type[0]) {
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
                    //vo is a value the type of vo is appropriate to the type - ie it is the value
                    //set $scope.fixed{elname,value} or $scope.default{elName,value} for the data
                    //set $scope.fixedDisplay or $scope.defaultDisplay for the display in the UI

                    let elValue = vo
                    let elName
                    //let displayKey = `${kind}Display`       //fixedDisplay or defaultDisplay

                    switch (type) {
                        case "Coding":
                            if (kind == "default") {
                                $scope.default = {elName:'defaultCoding',value:elValue}
                                $scope.defaultDisplay = `${elValue.code} | ${elValue.display} | ${elValue.system}`
                                //elName = "defaultCoding"
                            } else {
                                $scope.fixed = {elName:'fixedCoding',value:elValue}
                                $scope.fixedDisplay = `${elValue.code} | ${elValue.display} | ${elValue.system}`

                            }
                            break
                        case "Quantity":

                            if (kind == "default") {
                                $scope.default = {elName:'defaultQuantity',value:elValue}
                                $scope.defaultDisplay = makeQuantityDisplay(elValue)
                                //scope.defaultDisplay = `Unit: ${elValue.unit}`

                            } else {
                                $scope.fixed = {elName:'fixedQuantity',value:elValue}
                                $scope.fixedDisplay = makeQuantityDisplay(elValue)
                                //$scope.fixedDisplay = `Unit: ${elValue.unit}`
                            }
                            break
                        case "Ratio":

                            if (kind == "default") {
                                $scope.default = {elName:'defaultRatio',value:elValue}
                                $scope.defaultDisplay = `Numerator Unit: ${elValue.numerator.unit} Denominator Unit: ${elValue.denominator.unit} Denominator value: ${elValue.denominator.value}`
                            } else {
                                $scope.fixed = {elName:'fixedRatio',value:elValue}
                                $scope.fixedDisplay = `Numerator Unit: ${elValue.numerator.unit} Denominator Unit: ${elValue.denominator.unit} Denominator value: ${elValue.denominator.value}`

                                //$scope.input[displayKey] = `Numerator Unit: ${elValue.numerator.unit} Denominator Unit: ${elValue.denominator.unit} Denominator value: ${elValue.denominator.value}`
                            }
                            break

                    }

                })


            }


            // ---------- functions for unit list

            $scope.addUnit = function (unit) {
                $scope.units = $scope.units || []
                $scope.units.push(unit)
                delete $scope.input.unit
            }

            $scope.deleteUnit = function (inx) {
                $scope.units.splice(inx,1)
            }

            //------------ functions for options list ------------

            $scope.addOption = function () {
                $scope.options = $scope.options || []

                let code = $scope.input.newOptionCode
                if (code) {
                    code = code.replace(/ /g, "");
                } else {
                    code = ""
                }


                $scope.options.push({code:code,
                    display:$scope.input.newOptionDisplay,
                    fsn:$scope.input.newOptionFSN})         //was adding snomed here...
                delete $scope.input.newOptionCode
                delete $scope.input.newOptionDisplay
                delete $scope.input.newOptionFSN
            }

            //lookup from the TS
            $scope.lookupFSN = function (code) {

                let qry = `CodeSystem/$lookup?system=${snomed}&code=${code}`

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data)
                        let parameters = data.data

                        for (const param of parameters.parameter) {

                            if (param.name == 'display') {
                                $scope.input.newOptionDisplay = param.valueString
                            }

                            if (param.part) {
                                let parsedPart = {}

                                param.part.forEach(function (part) {
                                    parsedPart[part.name] = part.valueCoding || part.valueString
                                })

                                console.log(parsedPart)
                                // if (parsedPart.name == 'use' && parsedPart.valueCoding) {
                                if (parsedPart.use && parsedPart.use.code == '900000000000003001') {
                                    //this is the FSN
                                    if (parsedPart['value']) {
                                        $scope.input.newOptionFSN = parsedPart['value']
                                    }

                                }


                            }
                        }

                        //find the FSN. I really don't like parameters!




                    },function (err) {
                        alert("This Concept was not found on the National Terminology Server")
                        console.log(err)
                    }
                )


                // let concept = {system:$scope.input.system,code:$scope.input.code}

            }

            //Make a text list from the ed.options
            function makeOptionsText() {
                let txt = ""
                $scope.options.forEach(function (opt) {
                    txt += opt.display + "\n"
                })
                $scope.input.optionsText = txt
            }

            $scope.deleteOption = function (inx) {
                $scope.options.splice(inx,1)
            }

            //Parse the text list from
            $scope.parseList = function (txt) {
                $scope.options = []
                console.log(txt)
                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let option = {}
                    option.pt = lne
                    option.code = lne
                    option.display = lne
                    $scope.options.push(option)

                })
                alert("Options have been updated")
            }


            $scope.parseSnomed = function (txt) {
                $scope.options = []

                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let ar = lne.split('\t')

                    let option = {}
                    option.code = ar[0]
                    option.pt = ar[1]       //set the pt (preferred term) and the display the same. Not sure if we should be using pt anyway...
                    option.display = ar[1]
                    if (ar.length > 2) {
                        option.fsn = ar[2]
                    }

                    $scope.options.push(option)

                })
                alert("Options have been updated")

            }

        }
    )