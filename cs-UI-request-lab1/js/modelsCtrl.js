//https://imagemap.org/
//https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/
angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelCompSvc,$window,orderingSvc,
                  snapshotSvc,vsSvc,makeQSvc,playgroundsSvc,$localForage,documentSvc, reportSvc,
                  $timeout,$uibModal,$filter,modelTermSvc,modelDGSvc,igSvc,librarySvc,traceSvc,utilsSvc,$location) {

            //change the background colour of the DG summary according to the environment
            $scope.modelInfoClass = 'modelInfo'
            let host = $location.absUrl()
            if (host.indexOf('local') > -1) {
                $scope.modelInfoClass = 'modelInfoLocal'
            } else if ( host.indexOf('test.') > -1 ) {
                $scope.modelInfoClass = 'modelInfoTest'
            }



           // $scope.fhirBase = "http://hl7.org/fhir/R4B/"

            $scope.Math = Math;

            $scope.userMode = $localStorage.userMode || "playground"      //possible modes are 'library' or 'playground'
            //$scope.userMode = "library"

            $scope.version = utilsSvc.getVersion()
            $scope.input = {}
            $scope.input.showFullModel = true

            $scope.input.metaProcedures = ['Small diagnostic sample','Resection','Radiation therapy','SACT therapy']
            $scope.input.metaCategories = ['Histopathology request','Histopathology report','Treatment summary']

            //always reset trace. an emergency fix - I'll remove trace later
            $localStorage.trace = {on:false,limit:500,contents:[]}
            $localStorage.trace.on = false

            $scope.toggleTraceDEP = function () {
                $localStorage.trace.on = ! $localStorage.trace.on
            }

            $scope.canShowComponent = function (dg,filter) {
                if (! filter) {
                    return true
                }
                if (dg) {
                    let f = filter.toLowerCase()
                    let name = dg.name.toLowerCase()
                    if (name.indexOf(f) > -1) {
                        return true
                    }

                    if (dg.title) {
                        let t = dg.title.toLowerCase()
                        if (t.indexOf(f) > -1) {
                            return true
                        }
                    }


                }


            }


            //This is the browser cache object.
            $localStorage.world = $localStorage.world || {dataGroups:{},compositions:{},Q:{}}
            $localStorage.world.Q =  $localStorage.world.Q || {}

            $scope.world = $localStorage.world

            $scope.localStorage = $localStorage
            $scope.input.types = $localStorage.world.dataGroups  //<<<< temp



            //create a separate object for the DG - evel though still referenced by world. Will assist split between DG & comp
            $scope.hashAllDG = $localStorage.world.dataGroups


            //look for DG errors like repeating parents in the hierarchy tree
            if (Object.keys($scope.hashAllDG).length > 0 ) {         //There are DG's stored locally]
                //this was introduced when there were lots of issues - I don't *think* it's needed any more
                //keep for now modelDGSvc.checkAllDG($scope.hashAllDG)

                //If there's a DG with no diff, all sorts of bad stuff happens. Shouldn't occur, but if it does it's a pain
                //this at least prevents the app from crashing, so remedial action can be taken
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    $scope.hashAllDG[key].diff = $scope.hashAllDG[key].diff || []

                    for (let ed of $scope.hashAllDG[key].diff) {
                        if (! ed.type) {
                            ed.type = ['Group']
                            alert(`Warning! Element ${ed.path} of DG ${key} had no type. Setting to Group`)
                        }
                    }

                })

            } else {

                if ($scope.userMode == 'library') {
                    if (confirm("There don't appear to be any local DataGroups's. Would you like to refresh from the Library?")) {

                        let qry = '/model/allDG'
                        $http.get(qry).then(
                            function (data) {

                                let arDG = data.data
                                arDG.forEach(function (dg) {
                                    if (dg.kind == 'dg') {
                                        $scope.hashAllDG[dg.name] = dg
                                    }

                                })
                                alert("All DataGroups have been downloaded. To access Compositions, click the Library button at the top of the screen, then the Compositions tab and select the Compositions you wish to download and view")

                            })
                    } else {
                        alert("The app won't work correctly. I suggest you start again and agree to the Library refresh")

                    }
                }
            }


            $scope.editAdHocExtensionDEP = function (ed,dg) {
                //element can be ed or  DG. Both have adHocExtension
                // let adHocExten
                $uibModal.open({
                    templateUrl: 'modalTemplates/adHocExtension.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'adHocExtensionCtrl',
                    resolve: {
                        currentExt: function () {
                            if (ed) {
                                return ed.adHocExtension
                            } else {
                                return dg.adHocExtension
                            }

                        },
                        currentPath : function () {
                            if (ed) {
                                return ed.path
                            } else {
                                return dg.name
                            }

                        },fullElementList : function () {
                            return $scope.fullElementList

                        }
                    }
                }).result.then(function (ext) {

                    if (ext) {
                        if (ed) {
                            let displayPath = $filter('dropFirstInPath')(ed.path)
                            for (let ed1 of $scope.selectedModel.diff) {
                                if (ed1.path == displayPath) {
                                    ed1.adHocExtension = ext
                                    break
                                }
                            }


                        } else {
                            $scope.selectedModel.adHocExtension = ext
                        }

                    }
                })
            }



            //create a diff between the current model and the copy in the componnet store (if any)
            $scope.createDiff = function () {

                let localDG =  snapshotSvc.getFrozenDG($scope.selectedModel.name)    //get the frozen version - ie with a snapshot in the diff
                let componentDG = $scope.componentVersion   //The one currently in the component store

                $uibModal.open({
                    templateUrl: 'modalTemplates/dgDiff.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'dgDiffCtrl',
                    resolve : {
                        localDG : function() {
                            return localDG
                        },
                        componentDG: function () {
                            return componentDG
                        },
                        otherDisplay: function () {
                            return "Component"
                        }
                    }
                })




            }


            $scope.updateComponent = function (type,model) {

                if (type == 'dg') {
                    let msg = "Copy the expanded version of this DG to the Component store. Can subsequently be imported into Collections."
                    if ($scope.userMode == 'playground') {
                        msg = "Update in the  Component store"
                    }
                    if (confirm(msg)) {
                        let frozen = snapshotSvc.getFrozenDG(model.name)
                        frozen.source = $scope.userMode
                        frozen.sourceId = $scope.world.id

/*
                        //the key is the unique identifier as the name will not be unique from a collection
                        //The key should already exist - if it does then leave it. Otherwise create it
                        if (! frozen.key) {
                            frozen.key = model.name     //default to the name (in the LIM)
                            if ($scope.userMode == 'playground') {
                                frozen.key = `${model.name}-${$scope.world.id}`    //in a collection, append the collection id
                            }
                            //ensure that the key in the local model is in the model
                            model.key = frozen.key
                        }

*/



                        saveModel(frozen)
                    }
                }

                if (type == 'comp') {

                    //make the DG replica of a composition
                    let frozen = snapshotSvc.getFrozenComp($scope.selectedComposition,$scope.allCompElements)
                    frozen.source = $scope.userMode
                    saveModel(frozen)

                }

                function saveModel(frozen) {




                    $http.put(`/frozen/${frozen.name}`,frozen).then(
                        function (data) {
                            alert("Component updated")
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }


            }



            $scope.showContainerQ = function (name) {
                //alert(name)
                let model = $scope.hashAllDG[name]
                $scope.loadReview('dg',model)
            }

            $scope.loadReview = function (kind,model) {
                //allCompElements

                let allElements

                if (kind == 'comp') {
                    allElements = $scope.allCompElements
                    model = model || $scope.selectedComposition
                } else {
                    model = model || $scope.selectedModel //default to the current model
                    allElements = snapshotSvc.getFullListOfElements(model.name) //$scope.fullElementList
                }


                vsSvc.getAllVS(allElements, function () {
                    $scope.showWaiting = false

                    //the second option expands the valuesets as options into the Q - todo make this an option

                    //need the named queries for Q variables
                    makeQSvc.getNamedQueries(function (hashNamedQueries) {

                        //need to create a Q name that is unique
                        let qName = model.name
                        if ($scope.userMode == 'playground') {
                            qName = `${$scope.world.name}-${model.name}`
                        }
                        qName = qName.replace(/\s+/g, "");

                        let voQ
                        if (kind == 'dg') {
                            let config = {expandVS:true,enableWhen:true}
                            config.namedQueries = hashNamedQueries
                            config.hashAllDG = $scope.hashAllDG
                            config.fhirType = model.type// Used for definition based extraction
                            config.expandVS = false     //use proxy to expand vs
                            config.name = qName


                            voQ = makeQSvc.makeHierarchicalQFromDG(model,allElements,config)
                        } else {
                            let compConfig = {hideEnableWhen : false}
                            voQ = makeQSvc.makeHierarchicalQFromComp(model,$scope.hashAllDG,hashNamedQueries,compConfig)
                        }


                        let qry = `/Questionnaire/${qName}`


                        let t = {Q:voQ.Q,errorLog:voQ.errorLog, lidHash: voQ.lidHash}
                        $http.put(qry,t).then(
                            function () {
                              //  if (confirm("Load questionnaire viewer?")) {
                                    const url = `modelReview.html?q-${qName}`
                                    const features = 'noopener,noreferrer'
                                    window.open(url, '_blank', features)
                              //  }

                            }, function (ex) {
                                alert(angular.toJson(ex.data))
                            }
                        )
                    })

                })

            }



            //----------------------

            //playground was the initial code for collections
            $scope.openPlaygrounds = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/playGrounds.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'playgroundsCtrl',
                    resolve : {
                        userMode : function() {
                            return $scope.userMode
                        },
                        playground: function () {
                            return $scope.world
                        },
                        initialPlayground: function () {
                            return $localStorage.initialPlayground
                        },

                        user : function () {
                            return $scope.user
                        }
                    }
                    }).result.then(function (playground) {
                        if (playground) {
                            //a new playground has been created or loaded.
                            //todo - why do both 'worlds need to be set?

                            $localStorage.world = playground
                            $scope.world = playground

                            $localStorage.initialPlayground = angular.copy(playground) //save the loaded version so we know if it has been changed

/*
                            //reset the dirty flag of all DGs
                            for (const key of Object.keys($localStorage.world.dataGroups)) {
                                let DG = $localStorage.world.dataGroups[key]
                                DG.dirty = false
                            }
*/
                            $scope.input.types = $localStorage.world.dataGroups  //todo - fix this<<<< temp
                            $scope.hashAllDG = $localStorage.world.dataGroups

                            /* - don't delete, just not sure of the best approach
                            //retrieve the history (if any)
                            delete $scope.playGroundHistory
                            $http.get(`/playground/history/${playground.id}`).then(
                                function (data) {
                                    $scope.playGroundHistory = data.data
                                }
                            )
*/
                            $scope.init()

                        }
                })

            }

            $scope.updatePlayground = function (both) {

                //save the current playground to the library
                $scope.world.id = $scope.world.id || utilsSvc.getUUID()

                $http.get(`/playground/${$localStorage.world.id}`).then(
                    function (data) {
                        let pgFromServer = data.data
                        if (pgFromServer.lockedTo) {
                            if (!  $scope.user || pgFromServer.lockedTo !== $scope.user.email) {
                                alert (`Form is locked by ${$localStorage.world.lockedTo}. Only they can make changes. You can still make a copy or save to your local store.`)
                                return
                            }
                        }
                        //safe to update
                        updatePlayground()

                    },function (err) {
                        if (err.status == 404) {
                            updatePlayground()
                        } else {
                            alert(angular.toJson(err.data))
                        }

                    }
                )

                function updatePlayground() {
                    $localStorage.world.updated = new Date()
                    if ($localStorage.world.version) {
                        $localStorage.world.version ++
                    } else {$localStorage.world.version = 1}

                    /*
                    //reset the dirty flag of all DGs
                    for (const key of Object.keys($localStorage.world.dataGroups)) {
                        let DG = $localStorage.world.dataGroups[key]
                        DG.dirty = false
                    }
                    */

                    $http.put(`/playground/${$localStorage.world.id}`,$localStorage.world).then(
                        function (data) {

                            //reset the change checked
                            $localStorage.initialPlayground = angular.copy($localStorage.world)

                            if (both) {
                                //update repo and local
                                $scope.savePGtoLocal(true,true,function () {
                                    alert("Repository has been updated.")
                                })

                            } else {

                                let msg = "The Form has been updated."
                                if (! $localStorage.world.description) {
                                    msg += " You can edit the description in this page."
                                }
                                alert(msg)
                            }

                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }

            $scope.savePGtoLocal = function (hideAlert,noversionupdate,cb) {
                let key = `pg-${$scope.world.id}`
                $scope.world.id = $scope.world.id || utilsSvc.getUUID()
                $scope.world.updated = new Date()

                if (!noversionupdate) {
                    if ($scope.world.version) {
                        $scope.world.version ++

                    } else {$scope.world.version = 1}
                }


                $localForage.setItem(key, $scope.world).then(function (value) {
                    if (!hideAlert) {
                        alert("Saved in Local Store")
                    }
                    if (cb) {
                        cb()
                    }
                }).catch(function(err) {
                    alert(angular.toJson(err))
                    console.log(err);
                });
            }

            //Import a DG from 'frozen' into a collection.
            $scope.importDG = function (inx) {
                let dg = $scope.importableDG[inx]
                let name = dg.name

                librarySvc.checkIds(dg)     //check all id's present and unique

                let newName = prompt("What is the name for the imported DG (No spaces)",name)
                if (newName) {
                    newName = newName.replace(/\s/g, '')    //remove any spaces
                    dg.name = newName

                    if (newName !== name) {
                        //this is a new component - check to see if there is already one with  that name
                        $http.get(`/frozen/${newName}`).then(
                            function () {
                                alert("There is already a component with that name. You will need to choose another.")
                            }, function (err) {
                                //nothing there - can add
                                if (err.status == 404) {
                                    $scope.hashAllDG[dg.name] = dg
                                    $scope.init()
                                    alert(`DG has been imported`)
                                } else {
                                    alert(`There was an issue and the Component was not downloaded: ${err.data.msg}`)
                                }

                            }
                        )
                    } else {
                        //if the name is not being changed, then don't need to check (we know it's there and accept that it can be updated!)
                        $scope.hashAllDG[dg.name] = dg
                        $scope.init()
                        alert(`DG has been imported`)
                    }


                }

            }
            $scope.updateDG = function (inx) {
                alert("Not yet implemented. Will update the DG from the component. Need a diff of some sort")
            }

            //--------------

            resetLocalEnvironment = function () {
                $localStorage.world = {compositions:{},dataGroups: {}}
                $scope.world = $localStorage.world

                $scope.hashAllDG = $localStorage.world.dataGroups
                $scope.hashAllCompositions = $localStorage.world.compositions
            }

            $scope.changeUserMode = function (evt,newMode) {
                evt.preventDefault()

                if (newMode == 'library') {
                    //changing from playground. Can only do this if logged in.
                    if ($scope.user && $scope.user.email) {

                        let diffs = playgroundsSvc.currentPlaygroundDiff($scope.world,$localStorage.initialPlayground)  //hash of DG's that have changed
                        if (Object.keys(diffs).length > 0) {
                            let msg = "There are changes to DGs in this Collection. You can view them from the Collections button. Are you sure you wish to enter LIM mode and lose these changes?"
                            if (! confirm(msg)) {
                                return
                            }
                        } else {
                            let msg = "Are you sure you wish to enter LIM mode? This will replace the current Form."
                            if (! confirm(msg)) {
                                return
                            }
                        }



                       // let msg = "Are you sure you wish to enter LIM mode? This will replace the current Form."
                       // if (confirm(msg)) {
                            resetLocalEnvironment()
                            delete $scope.initialPlayground  //initialPlayground doesn't apply in LIM mode
                            delete $localStorage.initialPlayground

                            let qry = '/model/allDG'
                            $http.get(qry).then(
                                function (data) {
                                    $scope.hashAllDG = {}
                                    let arDG = data.data
                                    for (const dg of arDG) {
                                        $localStorage.world.dataGroups[dg.name] = dg
                                        $scope.hashAllDG[dg.name] = dg
                                    }

                                    //alert("Reset complete. You'll need to use the Library to download the DG's")
                                    alert("Reset complete. It may take a few seconds for the UI to update. Updating the browser is a good idea too.")
                                    //$scope.$emit('updateDGList',{})

                                    $scope.init()
                                    $scope.userMode = newMode
                                    $localStorage.userMode = newMode

                                }, function (err) {
                                    alert(angular.toJson(err))
                                }
                            )



                     //   }
                    } else {
                        alert("You need to be logged in to use Library mode")
                    }


                } else if (newMode == 'playground') {
                    //changing from Library mode to playground

                    let cntDG = countCheckedOut($scope.hashAllDG)
                    let cntComp = countCheckedOut($scope.hashAllCompositions)
                    if ((cntDG + cntComp) > 0) {
                        let msg = `There are ${cntDG} DG's  and ${cntComp} Compositions still checked out. Are you sure you wish to enter Collections mode`
                        if (! confirm(msg)) {
                            return
                        }

                    } else {
                        let msg = "Are you sure you wish to enter Collections mode? This will replace the current model."
                        if (! confirm(msg)) {
                            return
                        }
                    }


                    resetLocalEnvironment()

                    alert("Reset complete. You can create a new Collection - or download an existing one.")

                   // $scope.$emit('updateDGList',{})
                    $scope.userMode = newMode
                    $localStorage.userMode = newMode
                    $scope.init()


                    function countCheckedOut(hash) {
                        let cnt = 0
                        Object.keys(hash).forEach(function (name) {
                            if (hash[name].checkedOut) {
                                cnt ++
                            }
                        })
                        return cnt
                    }

                }



            }

            // -------------------------------------
            //snapshot generator functions
            $scope.snapshotSvc = snapshotSvc    //so the web pages can call it directly

            $scope.ssHx = []

            $scope.makeSnapshots = function() {

                let voSs = snapshotSvc.makeSnapshots($scope.hashAllDG)


                $scope.snapshotLog = voSs.log
                $scope.ssErrorTypes = ['All']
                for (let log of voSs.log) {
                    if (log.isError) {
                        if ($scope.ssErrorTypes.indexOf(log.isError) == -1) {
                            $scope.ssErrorTypes.push(log.isError)
                        }
                    }
                }


                $scope.lstAllDGSS = snapshotSvc.getDGList()     //all datagroups by name
                $scope.lstAllDGSSTitle = snapshotSvc.getDGListTitle()

                //assign the snapshot svc to the modelSvc so that it can read the snapshots of DGs
                modelCompSvc.setSnapshotSvc(snapshotSvc)

                //all adhoc extensions in the model
                $scope.allAdHocExt = snapshotSvc.getAllAdHocExt()


                $scope.usageSummary = snapshotSvc.dgUseSummary()
                $scope.leafDGs = snapshotSvc.leafDGs()
                $scope.diffAnalysis = snapshotSvc.diffAnalysis($scope.hashAllDG)

            }

            //$scope.makeSnapshots()  //<<<<<<<<<,

            //--------------------------



            let size = modelsSvc.getSizeOfObject($scope.world)
            console.log(`Size of world: ${size/1024} K`)



            //return true if the path is present in the local diff
            $scope.presentInDiff = function (inPath) {
                let path = $filter('dropFirstInPath')(inPath)
                if ($scope.selectedModel && $scope.selectedModel.diff) {
                    for (const ed of $scope.selectedModel.diff) {
                        if (ed.path == path) {
                            return true
                            break
                        }
                    }
                }

            }


            //allow filtering the code usage report
            $scope.canShowCodeReportLine = function (code) {
                if (code && $scope.input.filterCodeReport) {
                    if (code.indexOf($scope.input.filterCodeReport) > -1 ){
                        return true
                    } else {
                        return false
                    }
                } else {
                    return true
                }
            }


            //a handler that will re-draw the list and tree views of the DGs. nCalled when the set of DG's
            //has been updated
            //differs from init in that it just re-draws the DG list
            $scope.$on('updateDGList',function(ev,vo) {

                sortDG()    //update the sorted list of DG

                let vo1 = modelDGSvc.makeTreeViewOfDG($scope.hashAllDG)
                showAllDGTree(vo1.treeData)

                //if a model name has been passed in, then re-select that model
                if (vo && vo.name) {
                    $scope.selectModel($scope.hashAllDG[vo.name] )
                }

            })


            $localStorage.selectedTag = $localStorage.selectedTag || 'main'
            $scope.input.selectedTag = $localStorage.selectedTag       //default tag for tag filtered list

            let tagSystem = {}
            tagSystem.bespoke = {code:'bespoke'}
            tagSystem.dgcategory = {code:'dgcategory'}


            //was the page called with a DG name?
            let search = $window.location.search;
            if (search) {

                let srch = search.substr(1)
                let ar = srch.split('=')

                if (ar.length == 2) {
                    if (ar[0] == 'dg') {
                         let initialDG = ar[1]

                        //wait a second then select the DT. todo really need to refactor this controller...
                        $timeout(function () {
                            $scope.input.mainTabActive = $scope.ui.tabDG
                            if ($scope.hashAllDG[initialDG]) {
                                $scope.selectModel($scope.hashAllDG[initialDG])
                            }else {
                                alert(`Can't find the DG with the name ${initialDG}`)
                            }

                        },1000)

                    }
                    if (ar[0] == 'comp') {
                        let initialComp = ar[1]

                        //wait a second then select the DT. todo really need to refactor this controller...
                        $timeout(function () {
                            $scope.input.mainTabActive = $scope.ui.tabComp


                            if ($scope.hashAllCompositions[initialComp]) {
                                $scope.selectComposition($scope.hashAllCompositions[initialComp])
                            } else {
                                alert(`Cant find the composition with the name ${initialComp}`)
                            }

                        },1000)

                    }
                }
            }

            $scope.showLink = function (type) {
                let host = $location.absUrl().split('?')[0]

                if (type == 'dg') {
                    host += "?dg=" + $scope.selectedModel.name
                }
                if (type == 'comp') {
                    host += "?comp=" + $scope.selectedComposition.name
                }

                $scope.localCopyToClipboard (host)
                alert(`Link: ${host} \ncopied to clipBoard`);

            }

            $scope.leftPanel = 'col-md-3'
            $scope.rightPanel = 'col-md-9'

            $scope.fhirRoot = "http://hl7.org/fhir/R4/"

            //allows a specific tab in the main UI to be selected
            $scope.ui = {}
            $scope.ui.tabDG = 0;
            $scope.ui.tabComp = 1;
            $scope.ui.tabTerminology = 2;

            //remember the initial opening tab
            if ($localStorage.initialModelTab !== undefined ) {
                $scope.input.mainTabActive = $localStorage.initialModelTab
            }

            if ($localStorage.selectModelTab !== undefined ) {
                $scope.input.selectTabActive = $localStorage.selectModelTab
            }

            $scope.setInitialTab = function (inx) {
                $localStorage.initialModelTab = inx
            }

            $scope.setSelectTab = function (inx) {
                $localStorage.selectModelTab = inx
            }


            //used in DG & Comp so when a type is a FHIR DT, we can create a link to the spec
            $scope.fhirDataTypes = utilsSvc.fhirDataTypes()

            //allows a specific tab in the showCompositions to e selected. Used by term summary (only need tree ATM)
            $scope.compUi = {}
            $scope.compUi.tree = 0
            $scope.input.compTabActive = $scope.compUi.tree

            $scope.hxDGLoad = []        //a history of DG's that were loaded by termSelectDGItem. Used for the 'back' function


            //can a new item be added here
            $scope.canAdd = function (model,node) {
                if ($scope.canEdit(model)) {
                    //we're in edit mode - is the current node a suitable parent
                    if (node && node.data && node.data.ed && node.data.ed.type) {
                        let type = node.data.ed.type[0]
                        if (type == "Group") {
                            return true
                        }
                    } else {
                        //no node selected - will add to root
                        return true
                    }
                }

            }

            //can an item be edited
            $scope.canEdit = function (model) {
                
                model = model || $scope.selectedModel

                if ($scope.userMode == 'playground') {
                    //in a playground (collection) locking is at the collection level, not the DG
                    if ($scope.user && $scope.world &&  $scope.world.lockedTo == $scope.user.email)   {
                        return true
                    }


                } else if ($scope.user && model && model.checkedOut == $scope.user.email) {
                    return true
                }
            }

            //create an FSH with all DG
            $scope.makeAllFsh = function () {
                $scope.allFsh = ""
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    let dg = $scope.hashAllDG[key]


                    let allElements = snapshotSvc.getFullListOfElements(dg.name)
                    let fsh = igSvc.makeFshForDG(dg,allElements)



                    $scope.allFsh += fsh
                    $scope.allFsh += '\n\n'



                })
            }


            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    $scope.user = {email:user.email,displayName : user.displayName}

                    modelsSvc.setUser($scope.user)
                    $scope.$digest()
                } else {
                    delete $scope.user

                    //$scope.loadAllQ()
                    $scope.$digest()
                }



            });

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;
                    modelsSvc.setUser({})
                    alert('You have been logged out')


                }, function(error) {
                    alert('Sorry, there was an error logging out - please try again')
                });

            };


            $scope.clearLocal = function () {
                if (confirm("This will remove all DGs and create an empty environment. Are you sure")) {
                    resetLocalEnvironment()

                    //$localStorage.world = {compositions:{},dataGroups: {}}
                    //$scope.hashAllDG = $localStorage.world.dataGroups
                    //$scope.hashAllCompositions = $localStorage.world.compositions

                    alert("Reset complete.")
                    //$scope.$emit('updateDGList',{})
                    $scope.init()
                }
            }


            //The main library button
            $scope.library = function () {

                $uibModal.open({
                    templateUrl: 'modalTemplates/library.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'libraryCtrl',

                    resolve: {
                        allDG: function () {
                            return $scope.hashAllDG
                        },
                        allComp: function () {
                            return $scope.hashAllCompositions
                        },
                        allQObject : function () {
                            return {} //$scope.allQObject
                        },
                        user : function () {
                            return $scope.user
                        },
                        userMode : function () {
                            return $scope.userMode
                        }
                    }

                }).result.then(function (vo) {

                    if (vo && vo.comp) {
                        //a composition was passed in. Update (or add to) the $scope.hashAllCompositions
                        //updated: now an array of comp
                        for (const c of vo.comp) {
                            $scope.hashAllCompositions[c.name] = c
                        }


                    }

                    if (vo && vo.dg) {
                        //A DG was selected
                        $scope.hashAllDG[vo.dg.name] = vo.dg
                        sortDG()
                        alert("DG has been downloaded. Please refresh the browser.")
                    }

                    $scope.init()


                    /*
                    //cause a refresh. May or may not be a model selected
                    if ($scope.selectedModel) {
                        $scope.$emit('updateDGList',{name:$scope.selectedModel.name})
                    } else {
                        $scope.$emit('updateDGList',{})
                    }
*/

                })
            }

            $scope.toggleLeftPanel = function(){
                if ($scope.leftPanel == 'col-md-3') {
                    $scope.leftPanel = 'hidden'
                    $scope.rightPanel = 'col-md-12'
                } else {
                    $scope.leftPanel = 'col-md-3'
                    $scope.rightPanel = 'col-md-9'
                }
            }


            $scope.export = function () {

                $uibModal.open({
                    templateUrl: 'modalTemplates/export.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'exportCtrl',

                    resolve: {
                        hashAllDG: function () {
                            return $scope.hashAllDG
                        },
                        hashAllCompositions: function () {
                            return $scope.hashAllCompositions
                        },
                        meta :function () {
                            let meta = {name:$scope.world.name,id:$scope.world.id}
                            meta.description = $scope.world.description
                            meta.version = $scope.world.version
                            meta.lockedTo = $scope.world.lockedTo
                            return meta
                        },
                        userMode : function () {
                            return $scope.userMode
                        }
                    }

                }).result.then(function (vo) {
                    //vo is actually the downloaded world object
                    $localStorage.initialPlayground = vo    //so we can track changes


                    if (vo.dg) {
                        //a hash of dg
                        Object.keys(vo.dg).forEach(function (key) {
                            let dg = vo.dg[key]

                            if ($scope.user) {
                                dg.checkedOut = $scope.user.email
                            }

                            $scope.hashAllDG[dg.name] = dg
                        })

                    }

                    if (vo.comp) {
                        //a hash of dg
                        Object.keys(vo.comp).forEach(function (key) {
                            let comp = vo.comp[key]
                            $scope.hashAllCompositions[comp.name] = comp
                        })

                    }


                    //should be present in all
                    vo.meta = vo.meta || {}

                    $scope.world.name = vo.meta.name || "No name"
                    $scope.world.name = `${$scope.world.name}-imported`
                    $scope.world.id = utilsSvc.getUUID()    //if saved will be a new collection
                    $scope.world.description = vo.meta.description || ""
                    $scope.world.version = vo.meta.version || 0
                    delete $scope.world.lockedTo

                    //make sure the local user can edit it
                    if ($scope.user) {
                        $scope.world.lockedTo = $scope.user.email
                    }

                    $scope.init()

                })

            }

            //return a string list of the tags for this DG
            //todo this could be optimized...
            $scope.getTagListForDG = function (DG) {
                let arTags = []
                if (DG) {
                    Object.keys($scope.tags).forEach(function (tagName) {
                        $scope.tags[tagName].forEach(function (dg) {
                            if (dg && dg.name == DG.name) {
                                arTags.push(tagName)
                            }
                        })
                    })
                }

                return arTags
            }


            $scope.addTagToDT = function (tagName) {
                traceSvc.addAction({action:'add-tag',model:$scope.selectedModel})
                $scope.selectedModel.tags = $scope.selectedModel.tags || []
                $scope.selectedModel.tags.push({system:tagSystem.bespoke.code,code:tagName})

                $scope.tags[tagName] = $scope.tags[tagName] || []
                $scope.tags[tagName].push($scope.selectedModel)



                //now to add this to the local user store = a
                $localStorage.userTags1  = $localStorage.userTags1 || {}
                $localStorage.userTags1[tagName] = $localStorage.userTags1[tagName] || []
                $localStorage.userTags1[tagName].push($scope.selectedModel.name)

                if ($scope.tagNames.indexOf(tagName) == -1) {
                    $scope.tagNames.push(tagName)
                }


                delete $scope.input.newBespokeTag
            }

            //clear the tag from the DG (if it exists) and the $scope.tags
            $scope.removeTagFromDT = function (tagName) {
                traceSvc.addAction({action:'remove-tag',model:$scope.selectedModel})
                //remove from the DG (if present)
                let ctr = -1
                if ($scope.selectedModel.tags) {
                    for (const tag of $scope.selectedModel.tags) {
                        ctr ++
                        if (tag.system == tagSystem.bespoke.code && tag.code == tagName) {
                            $scope.selectedModel.tags.splice(ctr,1)
                            break
                        }
                    }
                }

                //remove from the tags object
                ctr = -1
                for (const dg of $scope.tags[tagName]) {
                    ctr ++
                    if (dg.name == $scope.selectedModel.name) {
                        $scope.tags[tagName].splice(ctr,1)
                        break
                    }
                }

                //and remove from the userTags1
                if ($localStorage.userTags1 && $localStorage.userTags1[tagName]) {
                    let userTags1 = $localStorage.userTags1[tagName]
                    let g = userTags1.indexOf($scope.selectedModel.name)
                    if (g > -1) {
                        userTags1.splice(g,1)
                    }
                }


            }

            //create a list of all DT + fhir types
            //also assemble a list of bespoke tage (ie tags where the system is 'bespoke'
            $scope.makeAllDTList = function() {

                $scope.tags = {} //a hash keyed on tag code containing an array of DG with that tag

                $scope.tagNames = []        //use an array for the list filtered by tag. This is a string list of codes where system == bespoke
                $scope.allTypes = utilsSvc.fhirDataTypes()

                //This allows tags that survive re-setting. A hash, keyed by DG name with a collection of bespoke codings
                let userTags1 = $localStorage.userTags1 || {}     //if the user has customized the tags - keyed by name

                //iterate through DT assembling the tag name list, tag hash
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    $scope.allTypes.push(key)
                    //now look for tags

                    let dt = $scope.hashAllDG[key]
                    if (dt.tags && Array.isArray(dt.tags)) {   //as was using string
                        dt.tags.forEach(function (tag) {
                            if (tag.system == tagSystem.bespoke.code) {
                                //this is a bespoke tag. It can also be in core
                                let tagName = tag.code

                                //this is the list of tagnames. used to populate the dropdown tag selector...
                                if ($scope.tagNames.indexOf(tagName) == -1) {
                                    $scope.tagNames.push(tagName)
                                }

                                //This is tha set of DG's that have this particular tag
                                $scope.tags[tagName] = $scope.tags[tagName] || []
                                $scope.tags[tagName].push(dt)
                            }
                        })
                    }


                })

                //now add any tags from the user store. This supports local tags that may have been removed from the DG
                if ($localStorage.userTags1) {     //   a hash keyed by tagName with an array og DG names
                    Object.keys($localStorage.userTags1).forEach(function (tagName) {
                        let arDGName = $localStorage.userTags1[tagName]      //the local list of DG's with this tag

                        //go through each of the DG names against this tag...
                        arDGName.forEach(function (dgName) {

                            //need to check that the local tagged DG actually exists in the local collection
                            if ($scope.hashAllDG[dgName]) {
                                // ... and add if not already there
                                if ($scope.tags[tagName]) {
                                    let arDG = $scope.tags[tagName]         //this is an array of DG
                                    let ar1 = arDG.filter(dg => dg.name == dgName)

                                    if (ar1.length == 0) {
                                        $scope.tags[tagName].push($scope.hashAllDG[dgName])
                                    }

                                } else {
                                    $scope.tags[tagName] = [$scope.hashAllDG[dgName]]
                                    $scope.tagNames.push(tagName)
                                }
                            }





                        })
                    })
                }

                //----------build the graph of all DT



                $timeout(function () {

                    let vo
                    try {


                        //--------- build the tree with all DG
                        //todo - this call is duplicated...
                        let vo1 = modelDGSvc.makeTreeViewOfDG($scope.hashAllDG)
                        showAllDGTree(vo1.treeData)         //this is the inheritance
                        try {
                            //the tree data for the sections branch of DG
                            let sections = modelDGSvc.makeSectionsTree($scope.hashAllDG)
                            showAllDGTree(sections.treeData,'#sectionDGTree')
                        } catch (ex) {
                            console.log(ex)
                            alert("Error building sections tree")
                        }


                        /* category no longer used
                        //--- make the category hash for the category tree display of DG
                        let hashCategories = modelDGSvc.analyseCategories($scope.hashAllDG)
                        let vo2 = modelDGSvc.makeTreeViewOfCategories(hashCategories)
                        showCategoryDGTree(vo2.treeData)

                        */
                        //Jan15 - why is this here modelDGSvc.makeDgDownload($scope.hashAllDG)


                    } catch (ex) {
                        console.log(ex)
                        alert("There was an error creating the graph of all DT")
                    }


                },500)
            }


            //when a tag is update in the UI - save a copy in the browser cache
            $scope.updateTag = function (tags) {

                $localStorage.userTags1 = $localStorage.userTags1  || {}
                $localStorage.userTags1[$scope.selectedModel.name] = tags

                $scope.makeAllDTList()
            }

            $scope.rememberSelectedTag = function (tag) {
                $localStorage.selectedTag = tag
            }


            //display the tree with all DG
            function showAllDGTree(treeData,htmlElement) {




                /* - useful code from chatGPT for finding duplicates
                const ids = treeData.map(node => node.id.toLowerCase());
                const hasDuplicates = ids.some((id, idx) => ids.indexOf(id) !== idx);
                console.log('Duplicates found:', hasDuplicates);
*/



                htmlElement = htmlElement || '#allDGTree'
                $(htmlElement).jstree('destroy');
                $scope.allDGTree = $(htmlElement).jstree(
                    {'core':
                            {
                                'multiple': false, 'data': treeData,
                            worker: true,
                            animation:0,
                            'themes': {
                                name: 'proton', responsive: true
                            }}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {

                        let dgName = data.node.data.dgName

                        //use the dg out of $scope.hashAllDG - not the copy in the tree data
                        if ($scope.hashAllDG[dgName]) {
                            $scope.selectModel($scope.hashAllDG[dgName])
                        }
                    }

                    try {
                        $scope.$digest();       //as the event occurred outside of angular...
                    } catch (ex) {

                    }

                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id

                    $(this).jstree("open_node",id);

                    if ($scope.selectedModel) {
                        $(this).jstree("open_node",$scope.selectedModel.name);
                        $(this).jstree("select_node",$scope.selectedModel.name);
                    }

                    $scope.$digest();
                });
            }



            //make a sorted list for the UI
            function sortDG() {
                if (!$scope.hashAllDG) { //happens after clear local
                    return
                }

                $scope.sortedDGList = []
                Object.keys($scope.hashAllDG).forEach(function(key){
                    let dg = $scope.hashAllDG[key]      //keep the reference to hashAllDG

                    /*
                    //this seems a little scruffy...  - why am I doing this again??? todo - investigate
                    let tDg = snapshotSvc.getDG(key)
                    if (tDg && tDg.snapshot) {
                        dg.snapshot = tDg.snapshot
                    }
*/

                    $scope.sortedDGList.push(dg)
                })

                $scope.sortedDGList.sort(function (a,b) {
                    try {
                        if (a.title.toLowerCase() < b.title.toLowerCase()) {
                            return -1
                        } else {
                            return 1
                        }
                    } catch (ex) {
                        //swallow errors where title is missing (shouldn't happen)
                    }

                })

            }
            //sortDG()    //<<<<<<<<<<<<<<<,



            //same as for DG's - a step towards separate objects for DG & comp
            $scope.hashAllCompositions = $localStorage.world.compositions
            //make the term summary. These are the override elements in the models

            $scope.copyFshToClipboard = function (fsh) {
                $scope.localCopyToClipboard (fsh)
                alert("Fsh on clipboard")
            }

            $scope.copyToClipboard = function (json) {
                let text = angular.toJson(json,true)
                $scope.localCopyToClipboard (text)
            }

            //remove a DG from the local store
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
                            //if the diff is a deleted one, then don't worry about it
                            //todo - could there be a way of removing the diff from the source?
                            if (ed.mult !== '0..0' && typ == dgName) {
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
                    if (confirm("Are you sure you wish to remove this DG from the local store? If uploaded to the library, it will still be there.")) {

                        traceSvc.addAction({action:'delete-local',model:$scope.hashAllDG[dgName]})
                        delete $scope.hashAllDG[dgName]
                        delete $scope.selectedModel
                        delete $scope.selectedNode

                        $scope.makeAllDTList()
                        $scope.refreshUpdates()
                        sortDG()        //will update the list view

                       // $scope.makeAllDTList()      //updated
                       // $scope.makeSnapshots()
                        //alert("The DG has been removed. It is advisable to refresh the page.")
                    }
                }

            }

            //shows the image of the DG summary. todo - may need to clear other stuff
            $scope.showDGSummary = function () {
                delete $scope.selectedModel
                $scope.input.mainTabActive = $scope.ui.tabDG;
            }

            //insert an element from another Comp / DG.
            $scope.insertDGItem = function (currentPath) {
                if (! $scope.selectedNode) {
                    alert("Please select a node to insert into")
                    return
                }
                $uibModal.open({
                    templateUrl: 'modalTemplates/selectED.html',
                    backdrop: 'static',
                    size: 'xlg',
                    controller: 'selectEDCtrl',

                    resolve: {
                        DG: function () {
                            return $scope.selectedModel
                        },
                        insertNode : function () {
                            return $scope.selectedNode
                        }, viewVS : function () {
                            return $scope.viewVS    //this is a function
                        }
                    }
                }).result.then(
                    function(lst) {
                        //return list of EDs to add
                        let rootPath = ""       //where to insert the DG if on a group
                        let insertPoint = $scope.selectedModel.diff.length       //where to insert the EDs - by default at the end...
                        if ($scope.selectedNode) {
                            let path = $scope.selectedNode.data.ed.path      //this is the full path with the DG name as a prefix
                            let ar = path.split('.')
                            if (ar.length > 1) {
                                //if the path is 1 then the new eds are added to the root - no change needed
                                //otherwise we remove the first segment to get the root path and locate the position of the insert point in the diff
                                ar.splice(0,1)
                                rootPath = ar.join('.')  // + '.'
                                insertPoint = $scope.selectedModel.diff.findIndex(item => item.path === rootPath) +1  //to ensure it is after
                                if (rootPath) {
                                    rootPath += '.'
                                }
                            }

                        }

                        //update the path (if needed) and set the attribute that indicates where the ed came from
                        for (let ed of lst) {
                            ed.path = `${rootPath}${ed.path}`
                            ed.linkedFrom = $scope.selectedModel.linkedDG
                        }

                        $scope.selectedModel.diff.splice(insertPoint,0, ...lst)     //insert the Eds
                        $scope.updateTermSummary()
                        $scope.makeSnapshots()

                        //rebuild fullList and re-draw the tree
                        $scope.refreshFullList($scope.selectedModel)

                    }
                )


            }

            //edits some attributes of a single ED.
            $scope.editDGItem = function (item,initialTab) {
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
                        },
                        hashAllDG : function () {
                            return $scope.hashAllDG
                        },
                        parentEd : function () {


                            //$scope.selectedModel.diff.
                            if ($scope.selectedNode && $scope.selectedNode.data) {
                                return $scope.selectedNode.data.ed
                            } else {
                                //return the root
                                return $scope.fullElementList[0].ed
                                //return null
                            }

                        },
                        initialTab : function () {
                            return initialTab
                        }
                    }

                }).result.then(function (ed) {
                    //$scope.selectedModel.dirty = true

                    let displayPath = ""  //this will be the path in the changes display
                    if (isNew) {
                        //if it's new, then add it as a child of the currently selected element

                        ed.id = utilsSvc.getUUID()  //the unique identifier. used for dependencies.

                        //need to determine the 'root' path.
                        let pathOfCurrentElement = ""  //$scope.selectedModel.name  //by default, add to the DG root
                        if ($scope.selectedNode) {
                            //If a selected element (which may be the root) then add as a child to that root
                            pathOfCurrentElement = $scope.selectedNode.data.ed.path

                            //need to remove the first segment in the path (it will be the DG name)
                            //unless the selectedElement is actually the first element in the tree - the root
                            let ar = pathOfCurrentElement.split('.')
                            if (ar.length > 1) {
                                ar.splice(0,1)
                                pathOfCurrentElement = ar.join('.') + "."
                            } else {
                                pathOfCurrentElement = ""
                            }
                        }

                        //if a new element, then the string 'new' will have been pre-pended to the path...
                        let ar = ed.path.split('.')
                        ar.splice(0,1)

                        ed.path = `${pathOfCurrentElement}${ar.join('.')}`

                        //The path check in the dialog doesn't look for deleted elements, so we need to check here
                        let ar1 = $scope.selectedModel.diff.filter(localEd => localEd.path == ed.path)
                        if (ar1.length == 0) {


                            $scope.selectedModel.diff.push(ed)
                            displayPath = ed.path
                            traceSvc.addAction({action:'new-element',model:$scope.selectedModel,path:displayPath})

                        } else {
                            alert("There's a deleted element with this path. It cannot be added.")
                        }


                    } else {
                        //If an edit, then need to see if the item is directly defined on the DG (which will be updated),
                        //or whether it is an inherited element, in which case an override element is added...

                        displayPath = $filter('dropFirstInPath')(ed.path)

                        let found = false

                        //is the path in the DG diff?
                        for (const ed1 of $scope.selectedModel.diff) {
                            if (ed1.path == displayPath) {
                                found = true
                                //can't just replace from ed as not all elements can be altered
                                //note that attributes not explicitely replaced (like id) remain
                                ed1.type = ed.type
                                ed1.title = ed.title
                                ed1.notes = ed.notes
                                ed1.rules = ed.rules
                                setValue(ed1,'placeHolder',ed.placeHolder,'string')

                                //ed1.placeHolder = ed.placeHolder
                                ed1.description = ed.description
                                ed1.mult = ed.mult
                                ed1.valueSet = ed.valueSet
                                ed1.sourceReference = ed.sourceReference

                                ed1.insertAfter = ed.insertAfter

                                setValue(ed1,'controlHint',ed.controlHint,'string')
                                //ed1.controlHint = ed.controlHint
                                ed1.otherType = ed.otherType
                                setValue(ed1,'hideInQ',ed.hideInQ,'bool')
                                //ed1.hideInQ = ed.hideInQ
                                setValue(ed1,'hiddenInQ',ed.hiddenInQ,'bool')


                                ed1.helpText = ed.helpText
                                ed1.collapsible = ed.collapsible

                                ed1.prePop = ed.prePop
                                ed1.definition = ed.definition
                                ed1.extractExtensionUrl = ed.extractExtensionUrl
                                ed1.identifierSystem = ed.identifierSystem


                                setValue(ed1,'conditionalVS',ed.conditionalVS,'array')
                                //ed1.conditionalVS = ed.conditionalVS

                                ed1.hideLabel = ed.hideLabel
                                ed1.labelText = ed.labelText


                                if (ed.profile) {
                                    ed1.profile = {}
                                    ed1.profile.fsh = ed.profile.fsh
                                    ed1.profile.fhirPath = ed.profile.fhirPath
                                    ed1.profile.extUrl = ed.profile.extUrl
                                    ed1.profile.isReference = ed.profile.isReference
                                } else {
                                    delete ed1.profile
                                }


                                ed1.fixedCode = ed.fixedCode
                                ed1.fixedCoding = ed.fixedCoding
                                ed1.fixedQuantity = ed.fixedQuantity
                                ed1.fixedRatio = ed.fixedRatio

                                ed1.defaultCode = ed.defaultCode
                                ed1.defaultCoding = ed.defaultCoding
                                ed1.defaultQuantity = ed.defaultQuantity

                                ed1.defaultRatio = ed.defaultRatio

                                setValue(ed1,'options',ed.options,'array')
                                //ed1.options = ed.options
                                setValue(ed1,'units',ed.units,'array')
                                //ed1.units = ed.units
                                ed1.selectedNQ = ed.selectedNQ
                                setValue(ed1,'gTable',ed.gTable,'bool')
                                //ed1.gTable = ed.gTable
                                setValue(ed1,'sdcGrid',ed.sdcGrid,'bool')
                                //ed1.sdcGrid = ed.sdcGrid
                                ed1.adHocExt = ed.adHocExt
                                ed1.instructions = ed.instructions
                                ed1.itemCode = ed.itemCode
                                ed1.displayAfter = ed.displayAfter
                                ed1.displayBefore = ed.displayBefore

                                setValue(ed1,'qFixedValues',ed.qFixedValues,'array')
                                /*
                                if (ed.qFixedValues && ed.qFixedValues.length > 0) {
                                    ed1.qFixedValues = ed.qFixedValues
                                } else {
                                    delete ed1.qFixedValues
                                }
*/




                                //dec 24 - update json
                                $scope.edForJsonDisplay = ed1

                                break
                            }
                        }

                        if (! found) {
                            //The attribute that was edited (eg edscription) is inherited
                            //Need to create an 'override' element and add to the DG

                            //now see if this is element is in the snapshot. If it is, then need to use the same Id - conditionals use it
                            //otherwise, create a new one
                            let ar = $scope.fullElementList.filter(item => item.ed.path == ed.path)
                            if (ar.length > 0) {
                                //should only be one... todo ?raise an error
                                ed.id = ar[0].ed.id    //re-use the id
                            } else {
                                ed.id = utilsSvc.getUUID()  //this is a new ed
                            }


                            ed.path = $filter('dropFirstInPath')(ed.path)   //eds in the diff don't have the leading dgname

                            $scope.selectedModel.diff.push(ed)
                            //traceSvc.addAction({action:'add-override',model:$scope.selectedModel,path:ed.path})

                        }

                        //rebuild the snapshots
                        $scope.updateTermSummary()
                    }

                    $scope.makeSnapshots()

                    //rebuild fullList and re-draw the tree
                    $scope.refreshFullList($scope.selectedModel)



                })

                function setValue(ed,prop,value,type) {

                    //May not be safe to do this - could be an override - todo needs more thought
                    ed[prop] = value

                    return

                    //to delete
                    //hideLabel
                    //gtable
                    //otherAllowed


                    switch (type) {
                        case 'bool' :
                        case 'string':
                            delete ed[prop]
                            if (value) {
                                ed[prop] = value
                            }
                            break
                        case 'array' :

                            if (ed[prop] && ed[prop].length == 0) {
                                delete ed[prop]
                            }
                            break
                        default :
                            break

                    }

                }
            }

            //when a specific DG is selected in the term summary
            //used by updates list as well = hence moved to main controller
            $scope.termSelectDG = function (item,previous) {


                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                $scope.selectedModel = $scope.hashAllDG[item.DGName]
                $scope.selectModel($scope.selectedModel)

                $("#allDGTree").jstree().deselect_all(true);
                $('#allDGTree').jstree('select_node', item.DGName);

                if ($("#sectionDGTree").jstree().deselect_all) {
                    $("#sectionDGTree").jstree().deselect_all(true);
                    $('#sectionDGTree').jstree('select_node', item.DGName);
                }



                //$scope.selectModel

                if (previous) {
                    $scope.hxDGLoad.push(previous)  //for the 'back' function
                }

            }

            //return to the previously selected DG
            $scope.back = function () {
                if ($scope.hxDGLoad.length > 0) {
                    let DGName = $scope.hxDGLoad.pop()
                    $scope.termSelectDG({DGName:DGName})
                }

            }

            //when a specific DG path is selected in the term summary - ie
            //used by updates list as well -- and others -  hence moved to main controller
            //item = {hiddenDGName:, path:}  (path doesn't have leading dg name
            $scope.termSelectDGItem = function (item) {


                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //if item.hiddenDGName is not the same as the current model then select it.
                //Note that elements use a 'hidden' property to set the DG name

                if (! $scope.selectedModel || $scope.selectedModel.name !== item.hiddenDGName) {
                    $scope.selectedModel = $scope.hashAllDG[item.hiddenDGName]
                    $scope.selectModel($scope.selectedModel)
                }


                //the path may or may not have the DG name as the first segment - todo - clean this up
                let path = item.path || ""
                let ar = path.split('.')
                if (ar[0] !== item.hiddenDGName) {
                    path = `${item.hiddenDGName}.${item.path}`
                }

               $scope.input.dgTabActive = 0        //ensure the tree tab is displayed



                //selct the element in the DG tree. Need to wait for the tree to be built...
                $timeout(function () {

                    $('#dgTree').jstree('deselect_all')

                    //from chatgpt
                    var tree = $('#dgTree').jstree(true);

                    tree.select_node(path);


                    $('#dgTree').trigger('select_node.jstree', {node: tree.get_node(path)});

                    //NO - don't do this here!! The select event won't fire...
                   // $scope.input.dgTabActive = 0        //ensure the tree tab is displayed
                },1500)
            }


            //update
            $scope.updateTermSummary = function () {


                $scope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list
                $scope.compTermSummary = modelTermSvc.makeCompOverrideSummary($scope.hashAllCompositions).list

               //$scope.hashVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).hashVS
                $scope.arVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).arVS

                $scope.notesSummary = modelTermSvc.makeNotesSummary($scope.hashAllDG,$scope.hashAllCompositions)
                $scope.codeSummary = modelTermSvc.makeCodeSummary($scope.hashAllDG)

            }
            //$scope.updateTermSummary()  //<<<<<<<<<<<<,

            $scope.viewVS = function (url,refsetId) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
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

            $scope.refreshUpdates = function(){
                //xref is cross references between models/types - used in the 'Relationships' tab

                $scope.xref = modelsSvc.getReferencedModels($scope.hashAllDG,$scope.hashAllCompositions)

            }
            //$scope.refreshUpdates() //<<<<<<<<<<<,




            //used in the DG list filtering
            //filter is the selected bespoke code (if any)
            $scope.showDG = function(DG,filter) {
                if (filter) {
                    let show = false
                    if (DG.name && DG.name.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
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

            //allow the user to set the VS for a given element
            $scope.setValueSetDEP = function (element) {

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



            }


            //create a new model. If parent is set, then a new model automatically has that model as the parent
            $scope.newModel = function(kind,parent) {
                let newModel = {kind:kind,diff:[]}
                $scope.editModel(newModel,true,parent)
            }

            $scope.showComposition = function (comp) {
                let show = true
                if ($scope.input.selectedTumourStream !== 'All') {
                    if (comp && comp.meta && comp.meta.tumourStream !== $scope.input.selectedTumourStream) {
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

                let title = prompt("What is the name (no spaces, & must be unique)")
                if (title) {
                    let name = title.replace(/\s/g, '') //remove any spaces

                    modelsSvc.isUniqueNameOnLibrary(name,'comp').then(
                        function () {
                            //name is unique - ie the comp was not found on the server
                            //todo why check locally as well?
                            let isUnique =  ! $scope.hashAllCompositions[name]

                            if (isUnique) {
                                let newComp = {kind:'comp', name:name, title:title, sections:[]}
                                newComp.checkedOut = $scope.user.email

                                //save a copy to the Library (a we do with DGs)
                                librarySvc.checkOut(newComp,$scope.user)


                                $scope.hashAllCompositions[newComp.name] = newComp

                                $scope.selectComposition(newComp)
                            } else {
                                alert("Sorry, that name has already been used locally.")
                            }

                        },
                        function () {
                            alert("Sorry, that name has already been used in the Library.")
                            //name is not unique
                        }
                    )

                }

            }


            //edit an existing model (DG) or add a new one
            $scope.editModel = function (model,isNew, parent) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/editDG.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller : "editDGCtrl",

                    resolve: {
                        model: function () {
                            return model
                        },
                        hashTypes: function () {
                            return $scope.hashAllDG
                        },
                        hashValueSets : function() {
                            return $localStorage.world.valueSets
                        },
                        isNew: function () {
                            return isNew
                        },

                        parent: function () {
                            return parent
                        },
                        userMode : function () {
                            return $scope.userMode
                        },
                        viewVS : function () {
                            return $scope.viewVS    //this is a function
                        }

                    }

                }).result.then(function (newModel) {
                   // $scope.selectedModel.dirty = true
                    if (newModel) {
                        //a model object is always returned for update or new

                        if (isNew) {
                            //this is a new model
                            newModel.id = utilsSvc.getUUID()
                            newModel.source = $scope.userMode

                            //Only update the Library (LIM) in LIM mode...
                            if ($scope.user && $scope.userMode == 'library') {
                                newModel.author = $scope.user.email
                                librarySvc.checkOut(newModel, $scope.user)
                            }


                            //----
                            //if it's a new child and the parent has any enableWhens that they will
                            // have the root segment in the source as the parent dh name so a diff is needed that replaces
                            // it with the new name. The same thing happens with clone...
                            //Mar28 - not needed with the change to using id's in the enableWhens..
                            if (false && newModel.parent) {
                                let parentDG = $scope.hashAllDG[newModel.parent]
                                if (parentDG && parentDG.diff) {
                                    newModel.diff = newModel.diff || []

                                    parentDG.diff.forEach(function (ed) {

                                        if (ed.enableWhen || (ed.conditionalVS && ed.conditionalVS.length > 0)) {
                                            let newEd = angular.copy(ed)

                                            if (newEd.enableWhen) {
                                                newEd.enableWhen.forEach(function (ew) {
                                                    let ar = ew.source.split('.')
                                                    if (ar[0] == parentDG.name) {
                                                        ar[0] = newModel.name
                                                        ew.source = ar.join('.')
                                                    }
                                                })
                                            }

                                            if (newEd.conditionalVS) {
                                                newEd.conditionalVS.forEach(function (cvs) {
                                                    let ar = cvs.path.split('.')
                                                    if (ar[0] == parentDG.name) {
                                                        ar[0] = newModel.name
                                                        cvs.path = ar.join('.')
                                                    }
                                                })
                                            }


                                            newModel.diff.push(newEd)
                                        }

                                    })
                                }
                            }


                            $scope.hashAllDG[newModel.name] = newModel
                            sortDG()    //make a sorted list for the UI
                            $scope.input.types[newModel.name] = newModel    //todo - this is a duplicate of hashAllDG

                            //a hash by type of all elements that reference it
                            //$scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                            $scope.makeAllDTList()      //updated
                            $scope.makeSnapshots()

                            $scope.selectModel(newModel)


                        } else {
                            //this is an update
                            $scope.hashAllDG[newModel.name] = newModel  //so it gets updated in the browser cache
                            $scope.selectedModel = newModel             //the currently selected DG
                            //the model may have been updated - select it to refresh the various tabs
                            //note this is the model passed in for editing

                            $scope.makeAllDTList()      //as a parent may have been udpated or deleted
                            //     console.timeEnd("Make all DT list")
                            //     console.time("Make snapshots")
                            $scope.makeSnapshots()
                            //    console.timeEnd("Make snapshots")
                            //    console.time("Select model")
                            $scope.selectModel(newModel)
                            //   console.timeEnd("Select model")
                        }

                    }


                })

            }



            $scope.selectModelFromTypeUsage = function (model) {
                $scope.selectedModelFromTypeUsage = model
            }


            function clearB4Select() {
                delete $scope.selectedModel
                delete $scope.selectedNode
                delete $scope.input.showDGList
                delete $scope.selectedCompositionNode

                $('#htmlHISO').contents().find('html').html('');
                //delete $scope.input.showDGChildren
            }



            $scope.updateHISODoc = function () {
                //generate the HISO document

                let htmlContent = documentSvc.makeHISODocument($scope.selectedComposition, $scope.allCompElements,$scope.hashAllDG)

                $('#htmlHISO').contents().find('html').html(htmlContent)

                $scope.downloadLinkDoc = window.URL.createObjectURL(new Blob([htmlContent],
                    {type: "text/html"}));

                //$scope.downloadLinkJsonName = "downloaded"
                var now = moment().format();
                $scope.downloadLinkDocName =  `${$scope.selectedComposition.name}-${now}.html`

                //$scope.downloadLinkDocName =  'myDoc-' + now + '.html';
            }


            $scope.selectComposition = function(comp){
                clearB4Select()
                $scope.selectedComposition = comp

                /* - don't think this is useful - but don't delete yet...
                    let vo1 =  modelCompSvc.allDGsInComp(comp,$scope.hashAllDG)
                    $scope.lstUsedDG = vo1.lstUsedDG //hashUsedDG
                */



                // $scope.$broadcast("compSelected")   //for the profiling - todo - cancel

                //check the current checkedout state on the library.
                //Always update the local version checkedout (not data) with the one from the library
                let name = comp.name
                let qry = `/model/comp/${name}`
                $http.get(qry).then(
                    function (data) {
                        let libraryComp = data.data
                        $scope.selectedComposition.checkedOut = libraryComp.checkedOut

                        if ($scope.hashAllCompositions[name]) {
                            $scope.hashAllCompositions[name].checkedOut = libraryComp.checkedOut
                        } else {
                            alert(`Composition ${name} not found in the local storage`)
                        }
                    }
                )


                //note that this excludes mult 0..0
                //uses the snapshot svc
                //return {allElements:ar,hashAllElements:hashAllElements}
                let vo = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)      //overites the previou slist

                $scope.allCompElements = vo.allElements     //list of all elements. used by the Table and Q generation (at least)

                /* - Feb25 - nor working*/





                /*
                                const blob = new Blob(['\ufeff', htmlContent], {
                                    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                });


                                $scope.downloadLinkHISO = window.URL.createObjectURL(blob)
                                $scope.downloadLinkHISOName = `myDoc.docx`


                */


                //build the Q. This is to find any errors - we don't otherwise use the Q in this app anymore
                //actually - it is used when saving a version -

                makeQSvc.getNamedQueries(function (hashNamedQueries) {
                    delete $scope.compQErrors
                    try {
                        let vo1 = makeQSvc.makeHierarchicalQFromComp(comp,$scope.hashAllDG,hashNamedQueries)
                        $scope.compQErrors = vo1.errorLog

                    } catch(ex) {
                        console.log(ex)
                        alert("There was an issue creating the Questionnaire")
                    }

                })




                let download = modelCompSvc.makeTSVDownload(vo.allElements)

                $scope.downloadLinkCompTsv = window.URL.createObjectURL(new Blob([download ],{type:"text/tsv;charset=utf-8;"}))
                $scope.downloadLinkCompTsvName = `comp-${comp.name}.tsv`


                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                makeCompTree(treeData,rootNodeId)



                //generates the FSH representation of the Composition as a Logical Model
                //$scope.compFsh = igSvc.makeFshForComp(comp,$scope.allCompElements,$scope.hashCompElements)
                $scope.compFsh = igSvc.makeFshForComp(comp,$scope.allCompElements)

            }


            //refresh the complete list of elements for the currently selected DG
            //used when the DG contents may have changed, but the same model has remained selected ($scope.selectModel selects a new model)
            //also draw the graph & tree
            $scope.refreshFullList = function (dg) {

                delete $scope.errorLog
                $scope.relationshipsSummary = snapshotSvc.getRelationshipsSummary(dg.name)
                $scope.dgNamedQueries = snapshotSvc.getNamedQueries(dg.name)
                $scope.variablesForDG =snapshotSvc.getVariables(dg.name)
                $scope.dgContainingThis = snapshotSvc.dgContainedBy(dg.name)    //all DGs that have a reference to this one or any of its children


                //get this model from the compoenent store.
                delete $scope.componentVersion


                let name = dg.name
                /*
                if ($scope.userMode == 'playground') {
                    name = `${name}-${$scope.world.id}` //for collections, append the collection id to the saved name...
                }
*/
                //get the current component version of this (if any) for the diff...
                $http.get(`/frozen/${name}`).then(
                    function (data) {
                        $scope.componentVersion = data.data
                        console.log(data.data)

                    }, function(err) {
                        console.log(`${name} not found in component store (Not necessarily an error`)
                    }
                )



                    //just testing
                //snapshotSvc.getExtractableDG(dg.name)

                $scope.refreshUpdates()     //update the xref


                //by supplying the dg in the call, the eds will be annotatded with 'definedOnDG' for those in the diff
                $scope.fullElementList = snapshotSvc.getFullListOfElements(dg.name)// vo.allElements


                $scope.hashFullElementsById = {}
                $scope.fullElementHash = {}         //I seem to need this quite a lot. Though memory usage is getting high...
                //create the list of all paths in the DG. Used by the 'ordering'
                $scope.allPaths = []  //used for the manual re-ordering

                $scope.fullElementList.forEach(function (item) {
                    if (item && item.ed) {
                        $scope.fullElementHash[item.ed.path] = item.ed
                        $scope.hashFullElementsById[item.ed.id] = item.ed

                        if (item.ed.mult !== '0..0') {
                            $scope.allPaths.push(item.ed.path)
                        }
                    }

                })


                //adjust according to 'insertAfter' values. Note that if the user updates the order, the updateList will be empty
                orderingSvc.sortFullListByInsertAfter($scope.fullElementList,dg,$scope.hashAllDG)

                //this is intended to allow a DG to apply the ordering to referenced DGs - but it's confusing. working on a better solution
                //$scope.dgReferencesOrdering = orderingSvc.getOrderingForReferences($scope.fullElementList,dg,$scope.hashAllDG)

                // ordering move instructions by element to move. So we can have a display to detect elements with multiple move instructions {dupsExist:dupsExist,hash:hash}
                $scope.orderingByToMove = orderingSvc.getOrderingByToMove(dg)
                $scope.referencedDGOrdering = orderingSvc.createMoveFromReferences($scope.fullElementList,$scope.selectedModel,$scope.hashAllDG)

                $scope.dgFshLM = igSvc.makeFshForDG(dg,$scope.fullElementList)

                //the DG's referenced by / contained this DG
                let vo = modelDGSvc.makeGraphOneDG(dg,$scope.fullElementList,$scope.hashAllDG)
                makeGraph(vo.graphData)



                //always get all the valueset contents
                var startTime = performance.now()
                vsSvc.getAllVS($scope.fullElementList, function () {
                    var endTime = performance.now()
                    console.log(`Call to getAllVS took ${endTime - startTime} milliseconds`)
                })




                //The DG element tree
                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                drawDGTree(treeData)
                
                //all the dependencies (enableWhen)
                $scope.allDependencies = modelDGSvc.getAllEW($scope.fullElementList,$scope.selectedModel.name)


            }


            //Select a new DG  (originally called a model)
            //when called, it always updates the checked out status from the library
            $scope.selectModel = function (dg) {
                if (dg) {

                    //ensure DG view selected
                    $scope.input.mainTabActive = $scope.ui.tabDG

                    clearB4Select()
                    $scope.selectedModel = dg

                    //ensure that every ed has an id. If the DG does, then the EDs will as well...
                  //  if (! $scope.selectedModel.id) {

                      //  modelDGSvc.updateDGId($scope.selectedModel)    //add id's to DG & ED plus update conditionals
                      //  $scope.hashAllDG[dg.name] = $scope.selectedModel //needed to update the local storage
                  // }


                    $scope.fhirResourceType = igSvc.findResourceType(dg,$scope.hashAllDG)   //not sure if this is used wo fsh stuff

                    //in library mode check the current checkedout state on the library.
                    //Always update the local version checkedout (not data) with the one from the library
                    if ($scope.userMode == 'library') {
                        let name = dg.name
                        let qry = `/model/DG/${name}`
                        $http.get(qry).then(
                            function (data) {
                                let libraryDG = data.data
                                $scope.selectedModel.checkedOut = libraryDG.checkedOut
                                if ($scope.hashAllDG[name]) {
                                    $scope.hashAllDG[name].checkedOut = libraryDG.checkedOut
                                } else {
                                    alert(`DG ${name} not found in the local storage`)
                                }
                            }, function (err) {
                                console.log(err)
                            }
                        )
                    }


                 //   $scope.refreshUpdates()     //update the xref
                    $scope.refreshFullList(dg)      //the complete list of elements for this DG + graph & Q
                }

            }


            //this is the DG graph
            function makeGraph(graphData) {

               // return      //not currently used

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

                    $scope.graph = new vis.Network(container, graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.graph.on("stabilizationIterationsDone", function () {
                        $scope.graph.setOptions({physics: false});


                    });

                    $scope.graph.on("click", function (obj) {
                        delete $scope.selectedModelFromGraph
                        delete $scope.selectedModelFromGraphFull
                        let nodeId = obj.nodes[0];  //get the first node

                        let node = graphData.nodes.get(nodeId);

                        if (node.data && node.data.model) {
                            $scope.selectedModelFromGraph = node.data.model;


                            //now get the full list of elements for this DT. Used in the graph details view
                            let dg = $scope.hashAllDG[node.data.model.name]
                            let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)

                            $scope.selectedModelFromGraphFull = vo.allElements

                        }
                        $scope.$digest()
                    })
                }
            }

            $scope.fitGraph = function () {
                if ($scope.graph) {
                    $timeout(function(){$scope.graph.fit()},500)
                }
            }

            function drawDGTree(treeData) {
                //enable drag / drop for re-ordering in library mode
                $('#dgTree').jstree('destroy');

                let config = {'core':
                        {'multiple': false,
                            'animation' : 0,
                            'data': treeData,
                            'themes': {name: 'proton', responsive: true}},
                    'check_callback' : true,
                    plugins:['dnd','state'],
                    dnd: {
                        'is_draggable' : function(nodes,e) {
                            if ($scope.userMode == 'playground') {
                                return false
                            } else {
                                return $scope.canEdit($scope.selectedModel)
                            }


                        }
                    }
                }

                let x = $('#dgTree').jstree(
                    config
                ).on('select_node.jstree', function (e, data) {
                    // the node selection event...



                    if (data.node) {
                        $scope.selectedNode = data.node;
                        $scope.edForJsonDisplay = data.node.data.ed
                    }

                    //set up the EnableWhen (conditional show)
                    delete $scope.ewSourceValues
                    delete $scope.input.ewSource
                    delete $scope.input.ewSourceValue

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes

                    //select the root node - displays the DG details
                    $(this).jstree('select_node', id);


                    $scope.$digest()
                })

            }

            $scope.$on('redrawTree',function(){
                $scope.refreshFullList($scope.selectedModel)
            })

            $(document).on('dnd_stop.vakata', function (e, data) {
                let sourceId = getId(data.element.id)
                let targetId = getId(data.event.target.id)

                if (sourceId && targetId) {
                    let sourceTitle = getElement(sourceId).title || sourceId
                    let targetTitle = getElement(targetId).title || targetId
                    if (confirm(`Are you sure you wish to move ${sourceTitle} after ${targetTitle}`)) {


                        $scope.selectedModel.ordering = $scope.selectedModel.ordering || []
                        $scope.selectedModel.ordering.push({toMove:sourceId,insertAfter:targetId})

                        //re-order the full list & re-draw the tree
                        orderingSvc.sortFullListByInsertAfter($scope.fullElementList,$scope.selectedModel,$scope.hashAllDG)

                        //$scope.dgReferencesOrdering = orderingSvc.getOrderingForReferences($scope.fullElementList,$scope.selectedModel,$scope.hashAllDG)
                        $scope.orderingByToMove = orderingSvc.getOrderingByToMove($scope.selectedModel) // elements with multiple move instructions {dupsExist:dupsExist,hash:hash}

                        let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                        drawDGTree(treeData)

                        $scope.$digest()

                    }
                }



                function getId(s) {
                    if (s) {
                        let ar = s.split('_')
                        return ar[0]
                    }
                }

                //This is not efficient - I s
                function getElement(path) {

                    let el = $scope.fullElementHash[path]
                    return el || {}
                }

            })

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
                    //let treeObject = $(this).jstree(true).get_json('#', { 'flat': false })


                    $scope.$digest();
                });

            }

            $scope.fitAllDGGraph = function () {
                if ($scope.graphAllDG && $scope.graphAllDG.view) {
                    $timeout(function(){$scope.graphAllDG.fit()},500)
                }
            }

            //is called by init()
            $scope.createAllDGGraph = function () {
                let vo = modelDGSvc.makeFullGraph($scope.hashAllDG,false,false)
                makeGraphAllDG(vo.graphData)
            }

            //Initialization on first load or after playground select
            //has to be at the bottom as other functions called
            $scope.init = function () {
                $scope.makeSnapshots()  //<<<<<<<<<,
                $scope.makeAllDTList()


                $('#dgFromAllGraph').jstree('destroy');


                //the graph is slow to build in large sets...
                if (Object.keys($scope.hashAllDG).length < 30) {
                    $scope.createAllDGGraph()
                } else {
                    if ($scope.graphAllDG) {
                        $scope.graphAllDG.destroy()

                    }

                }

                /* temp */
                sortDG()
                $scope.updateTermSummary()
                $scope.updateMetaValues()
                $scope.refreshUpdates()

                $scope.input.selectedTumourStream = $scope.tumourStreams[0]
                $scope.input.selectedCompCategory = $scope.compCategories[0]

                delete $scope.selectedModel

                //DGs that can be imported into this model from the library
                playgroundsSvc.getImportableDG($scope.hashAllDG).then(
                    function (data) {
                        $scope.importableDG = data
                    }
                )



            }
            $scope.init()



            function makeGraphAllDG(graphData) {

                $scope.allGraphData = graphData

                let container = document.getElementById('graphAllDG');
                if (container) {
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            solver: 'barnesHut',
                            barnesHut: {
                                gravitationalConstant: -2000,
                                centralGravity: 0.3,
                                springLength: 95,
                                springConstant: 0.04,
                                damping: 0.09
                            }
                        },
                        layout : {
                            hierarchical : false
                        }
                    };

                    if ($scope.graphAllDG) {
                        $scope.graphAllDG.destroy()
                    }

                    $scope.graphAllDG = new vis.Network(container, graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.graphAllDG.on("stabilizationIterationsDone", function () {
                        $scope.graphAllDG.setOptions({physics: false});


                    });

                    $scope.graphAllDG.on("click", function (obj)
                    {

                        let nodeId = obj.nodes[0];  //get the first node
                        let node = $scope.allGraphData.nodes.get(nodeId);
                        $scope.selectedNodeFromFull = node.data


                        //this is the tree in the 'all DG' graph. It's not interactive
                        if ($scope.selectedNodeFromFull && $scope.selectedNodeFromFull.dg) {
                            let fullElementList = snapshotSvc.getFullListOfElements($scope.selectedNodeFromFull.dg.name)// vo.allElements
                            let treeData = modelsSvc.makeTreeFromElementList(fullElementList)
                            $('#dgFromAllGraph').jstree('destroy');
                            $('#dgFromAllGraph').jstree(
                                {'core':
                                        {'multiple': false,
                                            'data': treeData,
                                            'themes': {name: 'proton', responsive: true}}
                                }
                            ).bind("loaded.jstree", function (event, data) {
                                let id = treeData[0].id
                                $(this).jstree("open_node", id);
                                //let treeObject = $(this).jstree(true).get_json('#', { 'flat': false })


                            })
                        }




                        $scope.$digest()

                    })
                }


        }

            $scope.localCopyToClipboard = function(text) {
                let textArea = document.createElement("textarea");
                textArea.value = text;

                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    let successful = document.execCommand('copy');
                    let msg = successful ? 'successful' : 'unsuccessful';
                    console.log('Fallback: Copying text command was ' + msg);
                } catch (err) {
                    alert('Fallback: Oops, unable to copy', err);
                }

                document.body.removeChild(textArea);
            }

            $scope.checkIds = function () {
                $scope.idAnalysis = reportSvc.checkIds($scope.hashAllDG)
            }


}



)