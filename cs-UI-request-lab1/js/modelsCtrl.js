//https://imagemap.org/

angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,modelCompSvc,$window,
                  $timeout,$uibModal,$filter,modelTermSvc,modelDGSvc,QutilitiesSvc,igSvc) {


            $scope.version = "0.3.1"
            $scope.input = {}
            $scope.input.showFullModel = true

            $scope.igBase = "https://build.fhir.org/ig/davidhay25/canshare-LIM/branches/main/"

            $localStorage.selectedTag = $localStorage.selectedTag || 'main'
            $scope.input.selectedTag = $localStorage.selectedTag       //default tag for tag filtered list

            let search = $window.location.search;

            if (search) {

                let srch = search.substr(1)
                let ar = srch.split('=')
                if (ar.length == 2) {
                    if (ar[0] == 'dt') {
                        $scope.initialDT = ar[1]
                        console.log($scope.initialDT)

                        //wait a second then select the DT. todo really need to refactor this controller...
                        $timeout(function () {
                            if ($scope.hashAllDG[$scope.initialDT]) {
                                $scope.selectModel($scope.hashAllDG[$scope.initialDT])
                            }

                        },500)

                    }
                }
            }



            $scope.leftPanel = 'col-md-3'
            $scope.rightPanel = 'col-md-9'

            $scope.fhirRoot = "http://hl7.org/fhir/R4/"

            //allows a specific tab in the mail UI to be selected
            $scope.ui = {}
            $scope.ui.tabDG = 1;
            $scope.ui.tabComp = 0;
            $scope.ui.tabTerminology = 2;

            $scope.input.mainTabActive = $scope.ui.tabDG;

            //used in DG & Comp so when a type is a FHIR DT, we can create a link to the spec
            $scope.fhirDataTypes =modelsSvc.fhirDataTypes()

            //allows a specific tab in the showCompositions to e selected. Used by term summary (only need tree ATM)
            $scope.compUi = {}
            $scope.compUi.tree = 0
            $scope.input.compTabActive = $scope.compUi.tree

            $scope.hxDGLoad = []        //a history of DG's that were loaded by termSelectDGItem

            $('.mapbodyarea').on('click',function (e) {
                e.preventDefault()
                alert('ba')
            })

            $scope.toggleLeftPanel = function(){
                if ($scope.leftPanel == 'col-md-3') {
                    $scope.leftPanel = 'hidden'
                    $scope.rightPanel = 'col-md-12'
                } else {
                    $scope.leftPanel = 'col-md-3'
                    $scope.rightPanel = 'col-md-9'
                }
            }

            //whether the current user can edit. Will set up the back end logic later
            $scope.input.canEdit = true

            $scope.mCodeGroupPage = {}
            $scope.mCodeGroupPage.disease = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-disease.html"
            $scope.mCodeGroupPage.patient = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-patient.html"
            $scope.mCodeGroupPage.assessment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-assessment.html"
            $scope.mCodeGroupPage.treatment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-treatment.html"
            $scope.mCodeGroupPage.genomics = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-genomics.html"
            $scope.mCodeGroupPage.outcome = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-outcome.html"



            if (! $localStorage.world) {
                $localStorage.world = modelsDemoSvc.getDemo()
            }

            $scope.world = $localStorage.world

            let size = modelsSvc.getSizeOfObject($scope.world)

            console.log(`Size of world: ${size/1000} K`)

/* - leave until we figure out dependencies
            //download the Concept map and generate the hash that lists conditional refsets by code
            modelsSvc.getConceptMapHash().then(
                function (map) {
                    $scope.conceptMap = map
                    console.log(map)
                }
            )
*/

            //create a separate object for the DG - evel though still referenced by world. Will assist split between DG & comp
            $scope.hashAllDG = $localStorage.world.dataGroups

            //create a list of all DT + fhir types
            makeAllDTList = function() {
                $scope.tags = {}
                $scope.tagNames = []        //use an array for the list filtered by tag
                $scope.allTypes = modelsSvc.fhirDataTypes()

                let userTags = $localStorage.userTags || {}     //if the user has customized the tags - keyed by name


                //iterate through DT assembling the tag name list, tag hash
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    $scope.allTypes.push(key)
                    //now look for tags
                    let dt = $scope.hashAllDG[key]



                    let tagsForThisDG = userTags[key] || dt.tags

                    if (tagsForThisDG) {

                        //todo - changed the multiplicity of tag - now a space delimited string rather than an array
                        //todo will be able to delete this check after others have refreshed
                        if (Array.isArray(tagsForThisDG)) {
                            tagsForThisDG = tagsForThisDG[0]
                        }


                        let ar = tagsForThisDG.split(" ")
                        ar.forEach(function (tag) {
                            if ($scope.tagNames.indexOf(tag) == -1) {
                                $scope.tagNames.push(tag)
                            }
                            $scope.tags[tag] = $scope.tags[tag] || []
                            $scope.tags[tag].push(dt)
                        })
                    }
                })
            }
            makeAllDTList()

            //console.log($scope.tags)

            //when a tag is update in the UI - save a copy in the browser cache
            $scope.updateTag = function (tags) {

                $localStorage.userTags = $localStorage.userTags  || {}
                $localStorage.userTags[$scope.selectedModel.name] = tags

                makeAllDTList()
            }

            $scope.rememberSelectedTag = function (tag) {
                $localStorage.selectedTag = tag
            }



            //make a sorted list for the UI
            function sortDG() {
                $scope.sortedDGList = []
                Object.keys($scope.hashAllDG).forEach(function(key){
                    $scope.sortedDGList.push($scope.hashAllDG[key])
                })

                $scope.sortedDGList.sort(function (a,b) {
                    if (a.name.toLowerCase() < b.name.toLowerCase()) {
                        return -1
                    } else {
                        return 1
                    }
                })

            }
            sortDG()
            //same as for DG's - a step towards separate objects for DG & comp
            $scope.hashAllCompositions = $localStorage.world.compositions
            //make the term summary. These are the override elements in the models

            $scope.copyFshToClipboard = function (fsh) {

                navigator.clipboard.writeText(fsh).then(
                    () => {
                        alert('FSH text copied to clipboard');
                    },
                    () => {
                        alert('FSH text not copied to clipboard');
                    },
                )

            }

            $scope.copyToClipboard = function (json) {
                let text = angular.toJson(json,true)
                navigator.clipboard.writeText(text).then(
                    () => {
                        alert('Content copied to clipboard');
                    },
                    () => {
                        alert('Content not copied to clipboard');
                    },
                )

            }

            //can only delete user defined DGs
            $scope.deleteDG = function (dgName) {
                //if this DG is a parent of another, or references by another it cannot be removed
                let arRejectMessage = []
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    let dg = $scope.hashAllDG[key]
                    if (dg.parent == dgName) {
                        arRejectMessage.push(`This DG is a parent to ${dg.name}`)
                    }

                    dg.diff.forEach(function (ed) {
                        ed.type.forEach(function (typ) {
                            if (typ == dgName) {
                                arRejectMessage.push(`This DG is referenced by ${dg.name} (${ed.path})`)
                            }
                        })

                    })

                })
                if (arRejectMessage.length > 0) {
                    //let msg =
                    let fullMsg = `Cannot delete this DG. ${arRejectMessage.join(' ')}`
                    alert(fullMsg)
                } else {
                    if (confirm("Are you sure you wish to delete this DG? It cannot be recovered")) {
                        delete $scope.hashAllDG[dgName]
                        makeAllDTList()
                        $scope.refreshUpdates()
                    }
                }

            }

            //shows the image of the DG summary. todo - may need to clear other stuff
            $scope.showDGSummary = function () {
                delete $scope.selectedModel
                $scope.input.mainTabActive = $scope.ui.tabDG;
            }

            //make an array for the type-ahead lookup. - needs to be retionalized... when i remove world...
/* not just now - but keep
            $scope.arDG = []

            Object.keys($scope.hashAllDG).forEach(function (key) {
                let DG = $scope.hashAllDG[key]
                $scope.arDG.push({name:key})
            })
*/

            //$scope.addNewED = func

            //edits some of the attributes of a single ED
            $scope.editDGItem = function (item) {
                let originalED = {}
                let isNew = true
                if (item) {
                    //if item is null, then this is a new item
                    originalED = angular.copy(item.ed)        //used for changes display
                    isNew = false
                }

                $uibModal.open({
                    templateUrl: 'modalTemplates/editDGItem.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'editDGItemCtrl',

                    resolve: {
                        item: function () {
                            return item
                        },
                        allTypes : function () {
                            return $scope.allTypes
                        },
                        fullElementList : function () {
                            return $scope.fullElementList
                        }
                    }

                }).result.then(function (ed) {
                    //update specific items. Not the whole ED
                    //what changed
                    let changes = ""
                    let displayPath = ""  //this will be the path in the changes display
                    if (isNew) {
                        //if it's new, then add it as a child of the currently selected element
                        changes = "New element"

                        //need to determine the 'root' path.
                        let pathOfCurrentElement = ""  //$scope.selectedModel.name  //by default, add to the DG root
                        if ($scope.selectedNode) {
                            //If a selected element (which may be the root) then add as a child to that root
                            pathOfCurrentElement = $scope.selectedNode.data.ed.path

                            //need to remove the first segment in the path (it will be the DG name)
                            let ar = pathOfCurrentElement.split('.')
                            ar.splice(0,1)
                            pathOfCurrentElement = ar.join('.') + "."
                        }


                        //if a new element, then the string 'new' will have been pre-pended to the path...
                        let ar = ed.path.split('.')
                        ar.splice(0,1)
                        //ed.path = ar.join('.')

                        ed.path = `${pathOfCurrentElement}${ar.join('.')}`
                        $scope.selectedModel.diff.push(ed)
                        displayPath = ed.path

                    } else {
                        //If an edit, then need to see if the item is directly defined on the DG (which will be updated),
                        //or whether it is an inherited element, in which case an override element is added...
                        displayPath = $filter('dropFirstInPath')(ed.path)


                        if (ed.description !== originalED.description) {
                            changes += "Description changed. "
                        }
                        if (ed.title !== originalED.title) {
                            changes += "Title changed. "
                        }

                        if (ed.mapping !== originalED.mapping) {
                            changes += "Mapping notes changed. "
                        }

                        if (ed.mult !== originalED.mult) {
                            changes += "Cardinality changed."
                        }

                        if (ed.valueSet !== originalED.valueSet) {
                            changes += "ValueSet changed."
                        }

                        let found = false
                        //let changes = []    //this is the list of changes
                        //is the path in the DG diff?
                        for (const ed1 of $scope.selectedModel.diff) {
                            if (ed1.path == p) {
                                found = true
                                ed1.title = ed.title
                                ed1.mapping = ed.mapping
                                ed1.description = ed.description
                                ed1.mult = ed.mult
                                ed1.valueSet = ed.valueSet
                                break
                            }
                        }

                        if (! found) {
                            //The attribute that was edited (eg edscription) is inherited
                            //Need to create an 'override' element and add to the DG
                            let ar = ed.path.split('.')
                            ar.splice(0,1)
                            ed.path = ar.join('.')
                            $scope.selectedModel.diff.push(ed)
                        }

                    }


                    //record that changes were made
                    modelDGSvc.updateChanges($scope.selectedModel,
                        {edPath:ed.path,
                            msg:changes},$scope)

                    //rebuild fullList and re-draw the tree
                    refreshFullList($scope.selectedModel)

                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})

                })
            }




            //when a specific DG is selected in the term summary
            //used by updates list as well = hence moved to main controller
            $scope.termSelectDG = function (item,previous) {
                console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                $scope.selectedModel = $scope.hashAllDG[item.DGName]
                $scope.selectModel($scope.selectedModel)

                if (previous) {
                    $scope.hxDGLoad.push(previous)  //for the 'back' function
                }


            }

            //return to the previously selected DG
            $scope.back = function () {
                if ($scope.hxDGLoad.length > 0) {
                    let DGName = $scope.hxDGLoad.pop()
                    //console.lo
                    $scope.termSelectDG({DGName:DGName})
                }

            }

            //when a specific DG path is selected in the term summary
            //used by updates list as well = hence moved to main controller
            //item = {hiddenDGName:, path:}  (path doesn't have leading gg name



            $scope.termSelectDGItem = function (item) {
                console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                //Note that elements use a 'hidden' property to set the DG name
                $scope.selectedModel = $scope.hashAllDG[item.hiddenDGName]
                $scope.selectModel($scope.selectedModel)

                //selct the element in the DG tree. Need to wait for the tree to be built...
                $timeout(function () {
                    let fullPath = `${item.hiddenDGName}.${item.path}`

                    $("#dgTree").jstree("select_node",  fullPath);
                },500)



            }

            $scope.updateTermSummary = function () {
                $scope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list
                $scope.compTermSummary = modelTermSvc.makeCompOverrideSummary($scope.hashAllCompositions).list
                $scope.hashVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).hashVS

            }

            $scope.updateTermSummary()

            $scope.viewVS = function (item,refsetId) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return item
                        }, refsetId : function () {
                            return refsetId
                        }
                    }

                })
            }

            //process the world to get filter and other vars.
            //todo split world into comp & DG, dropping VS

            $scope.updateMetaValues = function() {
                $scope.tumourStreams = ["All"]
                $scope.compCategories = ["All"]

                Object.keys($scope.world.compositions).forEach(function (key) {
                    let comp = $scope.world.compositions[key]
                    comp.meta = comp.meta || {}

                    let tumourStream = comp.meta.tumourStream
                    if (tumourStream && $scope.tumourStreams.indexOf(tumourStream) == -1) {
                        $scope.tumourStreams.push(tumourStream)
                    }

                    let category = comp.meta.category
                    if (category && $scope.compCategories.indexOf(category) == -1) {
                        $scope.compCategories.push(category)
                    }

                })
            }

            $scope.updateMetaValues()
            $scope.input.selectedTumourStream = $scope.tumourStreams[0]
            $scope.input.selectedCompCategory = $scope.compCategories[0]


            $scope.refreshUpdates = function(){
                //xref is cross references between models/types
                $scope.xref = modelsSvc.getReferencedModels($scope.hashAllDG,$scope.hashAllCompositions)

                //updates to DG made over the ones in the code
                $scope.dgUpdates = modelDGSvc.makeUpdateList($scope.hashAllDG, $scope.xref )

            }
            $scope.refreshUpdates()

            $scope.$on('dgUpdated',function(ev,obj){
                console.log('i')
                $scope.refreshUpdates()
            })


            $scope.resetWorld = function () {

                if (confirm("Are you wish to restore to the default demo state (This will not remove custom DTs)")) {
                    //make a copy of the current DTs - this will include any DT created by the user
                    let temp = angular.copy($scope.hashAllDG)

                    $localStorage.world = modelsDemoSvc.getDemo()    //{dataGroups: compositions: }

                    //Now update the world with any user created DTs. todo - may do this with compositions as well
                    Object.keys(temp).forEach(function (key) {
                        let dt = temp[key]
                        $localStorage.world.dataGroups[key] = $localStorage.world.dataGroups[key] || dt
                    })

                    $scope.world = $localStorage.world
                    $scope.hashAllDG = $localStorage.world.dataGroups
                    $scope.hashAllCompositions = $localStorage.world.compositions
                    $scope.xref = modelsSvc.getReferencedModels($scope.hashAllDG,$scope.hashAllCompositions)

                    //makeAllDTList() - this mucked up the tags - seemed to remove them from the model...
                    validateModel()
                    clearB4Select()
                    sortDG()
                }

            }



            //used in the DG list filtering
            $scope.showDG = function(DG,filter) {
                if (filter) {

                    let show = false
                    if (DG.name && DG.name.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        show = true
                    }
                    if (DG.description && DG.description.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        show = true
                    }

                    return show

                } else {
                    return true
                }
            }

            $scope.listAllDG = function () {
                $scope.input.showDGList = true
                delete $scope.selectedModel
            }



            //---------- functions to edit a model from the tree

            //set the multiplicity of the element to 0..0
            $scope.removeElementDEP = function (element) {
                element.mult = "0..0"
                modelsSvc.updateOrAddElement($scope.selectedModel,element)
            }


            //allow the user to set the VS for a given element
            $scope.setValueSet = function (element) {
                //console.log(element)
                let vs = prompt("ValueSet url")
                if (vs) {
                    element.valueSet = vs       //for the immediate display

                    modelsSvc.updateOrAddElement($scope.selectedModel,element)

                }

            }

            //------------

            //select a DataGroup or composition from the list / table
            $scope.selectModelFromList = function (name,kind) {

                let m
                switch (kind) {
                    case "dg" :
                        m = $scope.world.dataGroups[name]
                        if (! m) {
                            alert (`No datagroup with the name: ${name}`)
                        }
                        break
                    default :
                        alert ("Only datagroups can be selected ATM")
                        break
                }

                if (m) {
                    $scope.selectedModel = m
                    $scope.selectModel($scope.selectedModel)
                    delete $scope.input.showDGList
                }

                //$scope.selectedModel = $scope.world.dataGroups[name]
                //$scope.selectModel($scope.selectedModel)

            }

            //Generate a bundle of SD's to save on a FHIR server
            //each model (comp or dg) will be an SD
            $scope.makeBundle = function () {
                $scope.lmBundle = modelsSvc.createLMBundle($localStorage.world)
            }

            $scope.validateBundle = function (bundle) {


                delete $scope.lmValidate
                let qry = "http://hapi.fhir.org/baseR4/Bundle/$validate"
                $http.post(qry,bundle).then(
                    function (data) {
                        $scope.lmValidate = data.data
                        $scope.lmValidateSummary = modelsSvc.summarizeValidation(data.data,bundle)

                    }, function (err) {
                        $scope.lmValidate = err.data
                        $scope.lmValidateSummary = modelsSvc.summarizeValidation(data.data,bundle)
                    }
                )





            }



            //create a new model
            $scope.newModel = function(kind) {
                let newModel = {kind:kind}
                $scope.editModel(newModel,true)
            }


            $scope.showComposition = function (comp) {
                let show = true
                if ($scope.input.selectedTumourStream !== 'All') {
                    if (comp.meta.tumourStream !== $scope.input.selectedTumourStream) {
                        show = false
                    }
                }

                if ($scope.input.selectedCompCategory !== 'All') {
                    if (comp.meta.category !== $scope.input.selectedCompCategory) {
                        show = false
                    }
                }


                return show
            }

            $scope.newComposition = function() {

                let name = prompt("What is the name (no spaces, & must be unique)")
                if (name) {
                    let newComp = {kind:'comp', name:name, title:name, sections:[]}
                    $localStorage.world.compositions[newComp.name] = newComp
                    $scope.selectedModel = newComp
                    $scope.selectComposition(newComp)
                }
                //$scope.editComposition(newComp,true)
            }


            //edit an existing model (DG)
            $scope.editModel = function (model,isNew) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/editDG.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller : "editDGCtrl",

                    resolve: {
                        model: function () {
                            return model
                        },
                        hashTypes: function () {
                            return $scope.hashAllDG
                            //return $scope.input.types
                        },
                        hashValueSets : function() {
                            return $localStorage.world.valueSets
                        },
                        isNew: function () {
                            return isNew
                        }
                    }

                }).result.then(function (newModel) {
                    if (newModel) {
                        //if a model is returned, then it is a new one and needs to be added to the world

                        $localStorage.world.dataGroups[newModel.name] = newModel
                        $scope.hashAllDG = $localStorage.world.dataGroups
                        sortDG()


                        let vo1 = modelsSvc.validateModel($localStorage.world)
                        $scope.errors = vo1.errors
                        $scope.input.types = vo1.types      //a hash keyed by name

                        //a hash by type of all elements that reference it
                        $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                        $scope.selectModel(newModel)

                    } else {
                        //the model may have been updated - select it to refresh the various tabs
                        //note this is the model passed in for editing
                        $scope.selectModel(model)
                    }



                    $scope.dgUpdates = modelDGSvc.makeUpdateList($scope.hashAllDG, $scope.xref )

                })

            }

            function validateModel() {
                // validate the model. This retruns a hash of all types defined in the model as well as errors
                let vo1 = modelsSvc.validateModel($localStorage.world)
                $scope.errors = vo1.errors
                $scope.input.types = vo1.types      //a hash keyed by name
                $scope.input.arTypes = Object.keys(vo1.types)       //list of types foe new element dropdown


                //a hash by type of all elements that reference it
                $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

            }
            validateModel()

            $scope.selectModelFromTypeUsage = function (model) {
                $scope.selectedModelFromTypeUsage = model
            }

            $scope.addElement = function (name,type) {
                //add a new element to the current model
                $scope.selectedModel.diff = $scope.selectedModel.diff || []
                $scope.selectedModel.diff.push({path:name,title:name,type:[type]})
                $scope.selectModel($scope.selectedModel)

            }

            $scope.updateFullModelShow = function () {
                //when the 'show full model' checkbox is checked
                delete $scope.selectedNode
                $timeout(function(){
                    $scope.selectModel($scope.selectedModel)
                },100)

            }

            function clearB4Select() {
                delete $scope.selectedModel
                delete $scope.selectedNode
                delete $scope.input.showDGList
                delete $scope.selectedCompositionNode
            }



            $scope.selectComposition = function(comp){
                clearB4Select()
                $scope.selectedModel = comp

                let vo = modelCompSvc.makeFullList(comp,$scope.input.types)
                $scope.allCompElements = vo.allElements
                $scope.hashCompElements = vo.hashAllElements


                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                $scope.treeData = treeData      //used in the Q builder

                console.log(treeData)
                makeCompTree(treeData,rootNodeId)

                igSvc.makeFshForComp(comp,$scope.allCompElements,$scope.hashCompElements)

                //$scope.compQ = QutilitiesSvc.makeQfromComposition(comp,vo.hashAllElements)


            }


            refreshFullList = function (dg) {
                let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,true)



                //$scope.fullElementList = vo.allElements
                $scope.graphData = vo.graphData

                //sort the elements list to better display slicing
                $scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)


               // console.log(modelsSvc.makeOrderedFullList(vo.allElements))

                $scope.dgFshLM = igSvc.makeFshForDG(dg,vo.allElements)

                makeGraph()

                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                makeDGTree(treeData)
            }

            //only used for DG now
            $scope.selectModel = function (dg) {
                clearB4Select()
                $scope.selectedModel = dg


                //create the list of override elements
                $scope.overrides = []
                //$scope.directElements = {}    //elements directly on the DG. These can have fixed values
                $scope.selectedModel.diff.forEach(function (ed) {

                    //if there's a dot in the ed path, then it refers to an element in a child...
                    if (ed.path.indexOf('.') > -1 ) {
                        $scope.overrides.push(ed)
                    }
                })

                //these are for the renderer from forms - todo to be deprecated
                //$scope.Qobject = modelsSvc.makeQfromModel(dg,$scope.input.types)
                //$scope.QR = {}




                refreshFullList(dg)

                $scope.dgQ = modelsSvc.makeQforDG($scope.fullElementList)

/*
                let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.input.showFullModel)
                $scope.fullElementList = vo.allElements
                $scope.graphData = vo.graphData

                $scope.dgFshLM = igSvc.makeFshForDG(dg,vo.allElements)

                makeGraph()

                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                makeDGTree(treeData)
*/
              //  $scope.testQ = QutilitiesSvc.makeItemFromDG(vo.allElements,$scope.hashAllDG)

            }

            function makeGraph() {

                let container = document.getElementById('graph');
                if (container) {
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            barnesHut: {
                                gravitationalConstant: -10000,
                            }
                        }
                    };
                    if ($scope.graph) {
                        $scope.graph.destroy()
                    }

                    $scope.graph = new vis.Network(container, $scope.graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.graph.on("stabilizationIterationsDone", function () {
                        $scope.graph.setOptions({physics: false});


                    });

                    $scope.graph.on("click", function (obj) {
                        delete $scope.selectedModelFromGraph
                        delete $scope.selectedModelFromGraphFull
                        let nodeId = obj.nodes[0];  //get the first node

                        let node = $scope.graphData.nodes.get(nodeId);

                        if (node.data && node.data.model) {
                            $scope.selectedModelFromGraph = node.data.model;

                            //now get the full list of elements for this DT. Used in the graph details view
                            let dg = $scope.hashAllDG[node.data.model.name]
                            let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,true)

                            $scope.selectedModelFromGraphFull = vo.allElements


                            $scope.$digest()
                        }
                    })
                }
            }

            $scope.fitGraph = function () {
                if ($scope.graph) {
                    $timeout(function(){$scope.graph.fit()},500)
                }
            }

            function makeDGTree(treeData) {
                $('#dgTree').jstree('destroy');

                let x = $('#dgTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes



                    //console.log($("#dgTree").jstree(true).get_json('#', { 'flat': true }))
                    console.log($("#dgTree").jstree(true).get_json('#'))

                    $scope.$digest();
                });

            }

            $scope.expandCompTree = function () {
                $('#compositionTree').jstree('open_all');
            }



            //make the tree of the composition
            function makeCompTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    $scope.$digest();
                });

            }



            /*$timeout(function(){
                    $scope.selectModel($scope.hashAllDG['Specimen'],$scope.hashAllDG)
            },500)*/





        }



    )