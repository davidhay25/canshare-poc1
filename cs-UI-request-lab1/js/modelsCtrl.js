//https://imagemap.org/
//https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/
angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelCompSvc,$window,makeQSvc,orderingSvc,makeCompQSvc,
                  dgInflaterSvc,snapshotSvc,
                  $timeout,$uibModal,$filter,modelTermSvc,modelDGSvc,igSvc,librarySvc,traceSvc,utilsSvc,$location) {


            //https://web.dev/articles/monitor-total-page-memory-usage
            //console.log(performance.measureUserAgentSpecificMemory())


            let autoQ = true   //whether to automatically generate a Q
            let removeZeroedOut = false  //when creating the full element list, remove mult = 0..0

            $scope.newInflater = true  //running the new inflater

            $scope.modelInfoClass = 'modelInfo'
            let host = $location.absUrl()
            if (host.indexOf('local') > -1) {
                $scope.modelInfoClass = 'modelInfoLocal'
            } else if ( host.indexOf('test.') > -1 ) {
                $scope.modelInfoClass = 'modelInfoTest'
            }


            //console.log($location.absUrl())


            $scope.version = utilsSvc.getVersion()
            $scope.input = {}
            $scope.input.showFullModel = true

            $scope.input.metaProcedures = ['Small diagnostic sample','Resection','Radiation therapy','SACT therapy']
            $scope.input.metaCategories = ['Histopathology request','Histopathology report','Treatment summary']

            $localStorage.trace = $localStorage.trace || {on:false,limit:500,contents:[]}

            $scope.toggleTrace = function () {
                $localStorage.trace.on = ! $localStorage.trace.on
            }

            //This is the browser cache object.
            $localStorage.world = $localStorage.world || {dataGroups:{},compositions:{}}
            $scope.world = $localStorage.world
            //create a separate object for the DG - evel though still referenced by world. Will assist split between DG & comp
            $scope.hashAllDG = $localStorage.world.dataGroups


            // -------------------------------------
            //snapshot generator functions
            let voSs = snapshotSvc.makeSnapshots($localStorage.world.dataGroups,true)
            $scope.snapshotLog = voSs.log
            $scope.lstAllDGSS = snapshotSvc.getDGList()     //all datagroups

            $scope.getLogDG = function (row) {
                $scope.selectedLogDg = snapshotSvc.getDG(row.dgName)
                $scope.selectedLogRow = row
            }

            //get a single DG
            $scope.getDGSS = function (dg) {
                $scope.selectedLogDg = dg
            }

            $scope.showSSLogRow = function (row) {
                if (! $scope.input.ssFilter) {return true}

                if (row.dgName == $scope.input.ssFilter.name) {
                    return true
                }

                /*
                let filter = $scope.input.ssFilter.toLowerCase()
                let msg = row.msg.toLowerCase()
                if (msg.indexOf(filter) > -1) {
                    return true
                }
*/
            }
            //------------

            //console.log(snapshotSvc.getFullElementList('ECOGStatus'))

            let size = modelsSvc.getSizeOfObject($scope.world)
            console.log(`Size of world: ${size/1024} K`)

            $scope.localStorage = $localStorage

            //>>>>>>>> this examines the entire model.
            function validateModel() {
                // validate the model. This retruns a hash of all types defined in the model as well as errors
                let vo1 = modelsSvc.validateModel($localStorage.world)
                $scope.errors = vo1.errors
                $scope.input.types = vo1.types      //a hash keyed by name
                $scope.input.arTypes = Object.keys(vo1.types)       //list of types foe new element dropdown

                //a hash by type of all elements that reference it
                $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

            }
            //temp validateModel()  //this will have an alert for all circular references - potentially a lot...
            //todo need a better validation ?

            $scope.input.types = $localStorage.world.dataGroups  //<<<< temp



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

            //look for DG errors like repeating parents in the hierarchy tree
            if (Object.keys($scope.hashAllDG).length > 0) {         //There are DG's stored locally
                modelDGSvc.checkAllDG($scope.hashAllDG)

                //If there's a DG with no diff, all sorts of bad stuff happens. Shouldn't occur, but if it does it's a pain
                //this at least prevents the app from crashing, so remedial action can be taken
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    $scope.hashAllDG[key].diff = $scope.hashAllDG[key].diff || []
                })

            } else {
                if (confirm("There don't appear to be any local DataGroups's. Would you like to refresh from the Library?")) {

                    let qry = '/model/allDG'
                    $http.get(qry).then(
                        function (data) {
                            //console.log(data)

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



            //a handler that will re-draw the list and tree views of the DGs.

            $scope.$on('updateDGList',function(ev,vo) {
                //console.log(vo)
                sortDG()    //update the sorted list of DG


                //--------- build the tree with all DG
               // if ($scope.hashAllDG) {
                    let vo1 = modelDGSvc.makeTreeViewOfDG($scope.hashAllDG)
                    showAllDGTree(vo1.treeData)
               // }
                if (vo && vo.name) {
                    $scope.selectModel($scope.hashAllDG[vo.name] )
                }

            })



            //record access
            //$http.post("model/access",{})

            $scope.igBase = "https://build.fhir.org/ig/davidhay25/canshare-LIM/branches/main/"

            $localStorage.selectedTag = $localStorage.selectedTag || 'main'
            $scope.input.selectedTag = $localStorage.selectedTag       //default tag for tag filtered list

            let tagSystem = {}
            tagSystem.bespoke = {code:'bespoke'}
            tagSystem.dgcategory = {code:'dgcategory'}


            //was the page called with a DG name?
            let search = $window.location.search;
            if (search) {
//console.log($location.absUrl())
                let srch = search.substr(1)
                let ar = srch.split('=')
                //console.log(srch,ar)
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

                /*
                navigator.clipboard.writeText(host).then(
                    () => {
                        alert(`Link: ${host} \ncopied to clipBoard`);
                    },
                    () => {
                        alert(`Link is ${host}`);
                    },
                )
                */




            }

            $scope.leftPanel = 'col-md-3'
            $scope.rightPanel = 'col-md-9'

            $scope.fhirRoot = "http://hl7.org/fhir/R4/"

            //allows a specific tab in the main UI to be selected
            $scope.ui = {}
            $scope.ui.tabDG = 1;
            $scope.ui.tabComp = 0;
            $scope.ui.tabSnapshot = 2;
            $scope.ui.tabTerminology = 3;
            $scope.ui.tabProfiling = 4;
            $scope.ui.tabSnapshot = 5;

            //remember the initial opening tab
            $localStorage.initialModelTab = $localStorage.initialModelTab || $scope.ui.tabComp
            $scope.input.mainTabActive = $localStorage.initialModelTab

            $scope.setInitialTab = function (inx) {
                $localStorage.initialModelTab = inx
            }
            //$scope.input.mainTabActive = $scope.ui.tabDG

            //used in DG & Comp so when a type is a FHIR DT, we can create a link to the spec
            $scope.fhirDataTypes = modelsSvc.fhirDataTypes()

            //allows a specific tab in the showCompositions to e selected. Used by term summary (only need tree ATM)
            $scope.compUi = {}
            $scope.compUi.tree = 0
            $scope.input.compTabActive = $scope.compUi.tree

            $scope.hxDGLoad = []        //a history of DG's that were loaded by termSelectDGItem. Used for the 'back' function

            $scope.canEdit = function (model) {

                if ($scope.user && model && model.checkedOut == $scope.user.email) {
                    return true
                }

            }

            //create an FSH with all DG
            $scope.makeAllFsh = function () {
                $scope.allFsh = ""
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    let dg = $scope.hashAllDG[key]
                    let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)
                    let fsh = igSvc.makeFshForDG(dg,vo.allElements)
                    $scope.allFsh += fsh
                    $scope.allFsh += '\n\n'

                    //console.log(fsh)

                })
            }


            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {
               // console.log('auth state change')
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
                    $localStorage.world = {compositions:{},dataGroups: {}}
                    $scope.hashAllDG = $localStorage.world.dataGroups
                    $scope.hashAllCompositions = $localStorage.world.compositions

                    alert("Reset complete.")
                    $scope.$emit('updateDGList',{})
                }
            }


            //show the Q preview. Lots of diagnostic stuff.
            $scope.previewQ = function (Q) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/previewQ.html',
                    //backdrop: 'static',
                    size : 'lg',
                    controller: 'previewQCtrl',
                    resolve: {
                        Q: function () {
                            return Q
                        },
                        Qtab : function () {
                            //the tab version of the Q
                            return $scope.fullQTab
                        }
                    }
                })
            }

            //all the questionnaire objects (not actual Q)
            //$scope.allQObject = $localStorage.allQObject

            $scope.showTrace = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/trace.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'traceCtrl',
                    resolve: {
                        hashAllDG: function () {
                            return $scope.hashAllDG
                        },
                        currentDG: function () {
                            return $scope.selectedModel
                        },
                        user: function () {
                            return $scope.user
                        }
                    }}).result.then(function (hashChanges) {

                        if ($scope.selectedModel && hashChanges[$scope.selectedModel.name]) {
                            //Has the current model been changed? If so, re-select
                            $scope.selectModel($scope.selectedModel)

                        }

                })


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

                    //cause a refresh. May or may not be a model selected
                    if ($scope.selectedModel) {
                        $scope.$emit('updateDGList',{name:$scope.selectedModel.name})
                    } else {
                        $scope.$emit('updateDGList',{})
                    }


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



            //whether the current user can edit. Will set up the back end logic later
            //$scope.input.canEdit = true

            $scope.mCodeGroupPage = {}
            $scope.mCodeGroupPage.disease = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-disease.html"
            $scope.mCodeGroupPage.patient = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-patient.html"
            $scope.mCodeGroupPage.assessment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-assessment.html"
            $scope.mCodeGroupPage.treatment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-treatment.html"
            $scope.mCodeGroupPage.genomics = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-genomics.html"
            $scope.mCodeGroupPage.outcome = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-outcome.html"






/* - leave until we figure out dependencies
            //download the Concept map and generate the hash that lists conditional refsets by code
            modelsSvc.getConceptMapHash().then(
                function (map) {
                    $scope.conceptMap = map
                    console.log(map)
                }
            )
*/



            $scope.export = function () {

                $uibModal.open({
                    templateUrl: 'modalTemplates/export.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'exportCtrl',

                    resolve: {
                        hashAllDG: function () {
                            return $scope.hashAllDG
                        },
                        hashAllCompositions: function () {
                            return $scope.hashAllCompositions
                        }
                    }

                }).result.then(function (vo) {
                    if (vo.dg) {
                        //a hash of dg
                        Object.keys(vo.dg).forEach(function (key) {
                            let dg = vo.dg[key]
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

                    alert("File has been imported. Please refresh the browser.")
                    $scope.$emit('updateDGList',{})

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
                for (const tag of $scope.selectedModel.tags) {
                    ctr ++
                    if (tag.system == tagSystem.bespoke.code && tag.code == tagName) {
                        $scope.selectedModel.tags.splice(ctr,1)
                        break
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
                $scope.allTypes = modelsSvc.fhirDataTypes()

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
                        vo = modelDGSvc.makeFullGraph($scope.hashAllDG,true)

                        makeGraphAllDG(vo.graphData)

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


                        //--- make the category hash for the category tree display of DG
                        let hashCategories = modelDGSvc.analyseCategories($scope.hashAllDG)
                        let vo2 = modelDGSvc.makeTreeViewOfCategories(hashCategories)
                        showCategoryDGTree(vo2.treeData)

                        //Jan15 - why is this here modelDGSvc.makeDgDownload($scope.hashAllDG)


                    } catch (ex) {
                        console.log(ex)
                        alert("There was an error creating the graph of all DT")
                    }




                },500)


            }
            $scope.makeAllDTList()         //initial invokation on load



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


                htmlElement = htmlElement || '#allDGTree'
                $(htmlElement).jstree('destroy');
                $scope.allDGTree = $(htmlElement).jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        let dg = data.node.data.dg

                        //use the dg out of $scope.hashAllDG - not the copy in the tree data
                        if (dg && $scope.hashAllDG[dg.name]) {
                            $scope.selectModel($scope.hashAllDG[dg.name])
                        }

                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id

                   // let treeObject = $(this).jstree(true).get_json('#', { 'flat': true })


                    $(this).jstree("open_node",id);

                    if ($scope.selectedModel) {
                        $(this).jstree("open_node",$scope.selectedModel.name);
                        $(this).jstree("select_node",$scope.selectedModel.name);
                    }




                    $scope.$digest();
                });
            }

            //display the tree with categories
            function showCategoryDGTree(treeData) {
                $('#categoryDGTree').jstree('destroy');

                $scope.categoryDGTree = $('#categoryDGTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        let dg = data.node.data.dg

                        //use the dg out of $scope.hashAllDG - not the copy in the tree data
                        $scope.selectModel($scope.hashAllDG[dg.name])
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);



                    /*.bind("loaded.jstree", function (event, data) {
                        console.log('loaded')
                        $(this).jstree("open_node","root");
                        if ($scope.selectedQNode) {
                            $(this).jstree("select_node",$scope.selectedQNode.id);
                            $(this).jstree("open_node",$scope.selectedQNode.id);
                            console.log('node populated: ' + $scope.selectedQNode.id)
                           // $(this).jstree("open_node",$scope.selectedQNode.id);
                        }
                    })*/


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
                    $scope.sortedDGList.push($scope.hashAllDG[key])
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
            sortDG()



            //same as for DG's - a step towards separate objects for DG & comp
            $scope.hashAllCompositions = $localStorage.world.compositions
            //make the term summary. These are the override elements in the models

            $scope.copyFshToClipboard = function (fsh) {


                $scope.localCopyToClipboard (fsh)
                alert("Fsh on clipboard")
/*
                navigator.clipboard.writeText(fsh).then(
                    () => {
                        alert('Q text copied to clipboard');
                    },
                    () => {
                        alert('Q text not copied to clipboard');
                    },
                )
                */

            }

            $scope.copyToClipboard = function (json) {
                let text = angular.toJson(json,true)

                $scope.localCopyToClipboard (text)

                /*
                navigator.clipboard.writeText(text).then(
                    () => {
                        alert('Content copied to clipboard');
                    },
                    () => {
                        alert('Content not copied to clipboard');
                    },
                )
                */

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

                        $scope.makeAllDTList()
                        $scope.refreshUpdates()
                        //alert("The DG has been removed. It is advisable to refresh the page.")
                    }
                }

            }

            //shows the image of the DG summary. todo - may need to clear other stuff
            $scope.showDGSummary = function () {
                delete $scope.selectedModel
                $scope.input.mainTabActive = $scope.ui.tabDG;
            }




            //edits some of the attributes of a single ED.
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
                                return null
                            }

                        },
                        initialTab : function () {
                            return initialTab
                        }
                    }

                }).result.then(function (ed) {
                    //update specific items. Not the whole ED
                    //what changed
                    //let changes = ""
                    let displayPath = ""  //this will be the path in the changes display
                    if (isNew) {
                        //if it's new, then add it as a child of the currently selected element
                      //  changes = "New element"

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
                        //ed.path = ar.join('.')

                        ed.path = `${pathOfCurrentElement}${ar.join('.')}`
                        $scope.selectedModel.diff.push(ed)
                        displayPath = ed.path
                        traceSvc.addAction({action:'new-element',model:$scope.selectedModel,path:displayPath})

                    } else {
                        //If an edit, then need to see if the item is directly defined on the DG (which will be updated),
                        //or whether it is an inherited element, in which case an override element is added...
                        displayPath = $filter('dropFirstInPath')(ed.path)

                        let found = false
                        //let changes = []    //this is the list of changes
                        //is the path in the DG diff?
                        for (const ed1 of $scope.selectedModel.diff) {
                            if (ed1.path == displayPath) {
                                found = true
                                //can't just replace from ed as not all elements can be altered
                                ed1.type = ed.type
                                ed1.title = ed.title
                                ed1.notes = ed.notes
                                ed1.rules = ed.rules
                                ed1.placeholder = ed.placeholder
                                ed1.description = ed.description
                                ed1.mult = ed.mult
                                ed1.valueSet = ed.valueSet
                                ed1.sourceReference = ed.sourceReference

                                ed1.insertAfter = ed.insertAfter

                                ed1.controlHint = ed.controlHint
                                ed1.otherType = ed.otherType
                                ed1.hideInQ = ed.hideInQ
                                ed1.autoPop = ed.autoPop

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

                                ed1.options = ed.options
                                ed1.units = ed.units
                                traceSvc.addAction({action:'edit-override',model:$scope.selectedModel,path:displayPath})

                                break
                            }
                        }

                        if (! found) {
                            //The attribute that was edited (eg edscription) is inherited
                            //Need to create an 'override' element and add to the DG
                            ed.path = $filter('dropFirstInPath')(ed.path)

                            $scope.selectedModel.diff.push(ed)
                            traceSvc.addAction({action:'add-override',model:$scope.selectedModel,path:ed.path})

                        }

                        $scope.updateTermSummary()
                    }
/*

                    //record that changes were made
                    modelDGSvc.updateChanges($scope.selectedModel,
                        {edPath:ed.path,
                            msg:changes},$scope)
*/
                    //rebuild fullList and re-draw the tree
                    $scope.refreshFullList($scope.selectedModel)

                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})

                })
            }




            //when a specific DG is selected in the term summary
            //used by updates list as well = hence moved to main controller
            $scope.termSelectDG = function (item,previous) {
                //console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                $scope.selectedModel = $scope.hashAllDG[item.DGName]
                $scope.selectModel($scope.selectedModel)


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
                 //console.log(item)

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
                },1000)
            }




            //update
            $scope.updateTermSummary = function () {
                //console.log('Updating term summary')

                $scope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list
                $scope.compTermSummary = modelTermSvc.makeCompOverrideSummary($scope.hashAllCompositions).list

               //$scope.hashVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).hashVS
                $scope.arVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).arVS

                $scope.notesSummary = modelTermSvc.makeNotesSummary($scope.hashAllDG,$scope.hashAllCompositions)
                $scope.codeSummary = modelTermSvc.makeCodeSummary($scope.hashAllDG)

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

               // return //temp
                $scope.xref = modelsSvc.getReferencedModels($scope.hashAllDG,$scope.hashAllCompositions)

                //updates to DG made over the ones in the code
                // no longer used $scope.dgUpdates = modelDGSvc.makeUpdateList($scope.hashAllDG, $scope.xref )

            }
            $scope.refreshUpdates()

            /*
            $scope.$on('dgUpdated',function(ev,obj){

                $scope.refreshUpdates()
            })

*/


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
            $scope.setValueSet = function (element) {

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
                                //let qry = `/model/comp/${newComp.name}`


                                $scope.hashAllCompositions[newComp.name] = newComp

                                //$localStorage.world.compositions[newComp.name] = newComp

                                $scope.selectComposition(newComp)
                            } else {
                                alert("Sorry, that name has already been used locally.")
                            }

                        },
                        function () {
                            alert("Sorry, that name has already been used on the Library.")
                            //name is not unique
                        }
                    )




                }

            }


            //edit an existing model (DG)
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
                            //return $scope.input.types
                        },
                        hashValueSets : function() {
                            return $localStorage.world.valueSets
                        },
                        isNew: function () {
                            return isNew
                        },

                        parent: function () {
                            return parent
                        }

                    }

                }).result.then(function (newModel) {
                    if (newModel) {
                        //if a model is returned, then it is a new one and needs to be added to the world
                        traceSvc.addAction({action:'new-model',model:newModel})

                        if ($scope.user) {
                            newModel.author = $scope.user.email
                            librarySvc.checkOut(newModel,$scope.user)
                        }
                        $scope.hashAllDG[newModel.name] = newModel
                        sortDG()
                        $scope.input.types[newModel.name] = newModel    //todo - this is a duplicate of hashAllDG

                        //a hash by type of all elements that reference it
                        $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                        $scope.makeAllDTList()      //updated

                        $scope.selectModel(newModel)

                    } else {
                        //the model may have been updated - select it to refresh the various tabs
                        //note this is the model passed in for editing
                        traceSvc.addAction({action:'edit-model',model:model})
                        $scope.selectModel(model)
                    }



                    $scope.dgUpdates = modelDGSvc.makeUpdateList($scope.hashAllDG, $scope.xref )

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
                //delete $scope.input.showDGChildren
            }



            $scope.selectComposition = function(comp){
                clearB4Select()
                $scope.selectedComposition = comp

                /* - don't think this is useful - but don't delete yet...
                    let vo1 =  modelCompSvc.allDGsInComp(comp,$scope.hashAllDG)
                    $scope.lstUsedDG = vo1.lstUsedDG //hashUsedDG
                */



                $scope.$broadcast("compSelected")   //for the profiling

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

                // - original list let vo = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)

                //a bit of an experiment here. Given that we are using a single DG as the 'section' DG
                //we should be able to use that to generate the full list - rather than the recursive modelCompSvc.makeFullList
                //and it means the re-ordering should work...]
                //AND we're re-using the DG generation code...
                //oops - there are actually multiple DGs in a section - but updated...
/*
                vo.allElements.forEach(function (item) {
                    console.log(item.ed.path)
                })
                */

                //note that this excludes mult 0..0
                let vo = modelCompSvc.makeFullListv2(comp,$scope.input.types,$scope.hashAllDG)      //overites the previou slist

                $scope.allCompElements = vo.allElements     //used by the Table and Q generation (at least)


                if (autoQ) {
                    //generate the Q
                    makeCompQSvc.makeQ($scope.allCompElements,function (Q) {

                        // console.log("Q created and copied to clipboard!")

                        $scope.fullQ = Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)
                        //$scope.Qlog = voQ.log   //the log of activity that occurred as the Q was created
                        //this is a version structured for tabs.
                        $scope.fullQTab = Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)

                        /*

                                                console.log(Q)
                                            navigator.clipboard.writeText(angular.toJson(Q)).then(
                                                () => {
                                                    //alert(`Link: ${host} \ncopied to clipBoard`);
                                                },
                                                () => {
                                                    //alert(`Link is ${host}`);
                                                },
                                            )
                                            */

                    })
                }


                //$scope.hashCompElements = vo.hashAllElements



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


            //refresh the complete list of elements for this DG
            //also draw the graph & tree
            $scope.refreshFullList = function (dg) {


                delete $scope.errorLog




                let vo = {}

                /* todo - will need to generate the graph and relationships in thw new way...

                //determine all the elements in this DG by recursing up the inheritance hierarchy
                //and 'across' elements that are referenced DGs. Note that a referenced DG may have its own hierarchy
                let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)
                $scope.graphData = vo.graphData
                $scope.relationshipsSummary = vo.relationshipsSummary   //all the relationships - parent and reference - for this type
*/

                /*
                //there's currently an issue with the DG assembly in some cases. Looking into it, but for now this will at least stop a crash
                if (modelsSvc.fixDgDiff(dg,vo.allElements)) {
                    //there were issues that were fixed - need to re-generate the full list
                    vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)

                    if (vo.log && vo.log.length > 0) {
                      //  $scope.errorLog = vo.log
                    }
                }

                */

                if ($scope.newInflater) {
                    console.log('------------')

                    vo.allElements = snapshotSvc.getFullListOfElements(dg.name)

                    //vo.allElements = dgInflaterSvc.getFullListOfDGElements(dg,$scope.input.types,$scope.hashAllDG).allElements
                    console.log('------------')
                } else {

                }

                if (! $scope.newInflater) {
                    if (removeZeroedOut) {
                        $scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements.filter(item => item.ed.mult !== '0..0'))
                    } else {
                        $scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)
                    }
                } else {
                    $scope.fullElementList = vo.allElements
                }


                //sort the elements list to better display slicing
                //$scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)

                $scope.fullElementHash = {}         //I seem to need this quite a lot. Though memory usage is getting high...
                //create the list of all paths in the DG. Used by the 'ordering'
                $scope.allPaths = []
                let cntHidden = 0, cntVisible=0
                $scope.fullElementList.forEach(function (item) {
                    $scope.fullElementHash[item.ed.path] = item.ed
                    if (item.ed.mult !== '0..0') {
                        cntVisible ++
                        $scope.allPaths.push(item.ed.path)
                    } else {
                        cntHidden++
                    }
                })

                $scope.hiddenSummary = `${cntVisible}/${cntHidden}`

                console.log(`Visible: ${cntVisible}  Hidden:${cntHidden}`)


                orderingSvc.sortFullListByInsertAfter($scope.fullElementList,dg,$scope.hashAllDG)   //adjust according to 'insertAfter' values
                $scope.dgReferencesOrdering = orderingSvc.getOrderingForReferences($scope.fullElementList,dg,$scope.hashAllDG)

                //create the list of potential enableWhen sources
                $scope.ewSources = []
                $scope.fullElementList.forEach(function (item) {
                    if (item.ed.type && item.ed.type[0] == 'CodeableConcept') {
                        let t = {ed:item.ed,shortPath: $filter('dropFirstInPath')(item.ed.path)}
                        $scope.ewSources.push(t)
                    }
                })

                $scope.dgFshLM = igSvc.makeFshForDG(dg,vo.allElements)

                makeGraph()

                //a Q representation of the DG

                if (autoQ) {
                    let voQ = makeQSvc.makeQFromDG($scope.fullElementList,$scope.hashAllDG)
                    console.log(voQ.Q)
                    $scope.dgQ = voQ.Q
                }



                //The DG element tree
                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                makeDGTree(treeData)
                
                //all the dependencies (enableWhen)
                $scope.allDependencies = modelDGSvc.getAllEW($scope.fullElementList,$scope.selectedModel.name)


            }

            //only used for DG now
            $scope.selectModel = function (dg) {
                if (dg) {
                    traceSvc.addAction({action:'select',model:dg})

                    //note to self - there is a lot of audit stuff that is likely
                    //not needed now 'cause we trap recursive references. If there appears to be a need, perhaps a separate invokable command...
                    // temp - not using the audit now I think$scope.dgAudit = modelDGSvc.auditDGDiff(dg,$scope.hashAllDG)


                    /* not sure about these 'errors' - seem to be many false positives.
                    //make sure that $localStorage has been updated
                    if (angular.toJson(dg) !== angular.toJson($localStorage.world.dataGroups[dg.name])) {
                        alert(`Warning! the Browser copy of the DG ${dg.name} doesn't match the copy in memory! You should re-load the page and check it. From modelsCtrl:select`)
                    }
*/
                    clearB4Select()
                    $scope.selectedModel = dg

                    /* - not really using version count at present.
                    //get the count of the  versions. May not need this.
                    let url = `/model/DG/${dg.name}/history/count`
                    $http.get(url).then(
                        function (data) {
                            $scope.historyCount = data.data
                        }
                    )
                    */

                    //get the profile FSH for this DG
                    delete $scope.input.dgFsh
                    let url1 = `/fsh/DG/${dg.name}`
                    $http.get(url1).then(
                        function (data) {
                            $scope.input.dgFsh = data.data
                            $scope.$broadcast('dgSelected')     //so the FSH can be re-drawn
                            //console.log(data.data)
                        }, function (err) {
                            //why do this on error??? $scope.$broadcast('dgSelected')
                            console.log(err.data)
                        }
                    )

                    $scope.fhirResourceType = igSvc.findResourceType(dg,$scope.hashAllDG)

                    //check the current checkedout state on the library.
                    //Always update the local version checkedout (not data) with the one from the library
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
                        }
                    )


                    $scope.refreshUpdates()     //update the xref



                    $scope.refreshFullList(dg)      //the complete list of elements for this DG + graph & Q
                }

            }


            //this is the DG graph
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
                            let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)

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
                //enable drag / drop for re-ordering
                $('#dgTree').jstree('destroy');

                let x = $('#dgTree').jstree(
                    {'core':
                        {'multiple': false,
                        'data': treeData,
                        'themes': {name: 'proton', responsive: true}},
                        'check_callback' : true,
                        plugins:['dnd'],
                        dnd: {
                            'is_draggable' : function(nodes,e) {
                                return true
                                /* could inhibit certain groups
                               let node = nodes[0]
                               $scope.dndSource = node.data.ed
                               console.log($scope.dndSource)


                               delete $scope.dndSource
                               let node = nodes[0]
                               if (node.data && node.data.item && node.data.item.type == 'group') {
                                   return false
                               } else {
                                   $scope.dndSource = node.data.item
                                   return true
                               }
                               */

                            }
                        }
                    }



                ).on('changed.jstree', function (e, data) {
                    // the node selection event...


                    if (data.node) {
                        $scope.selectedNode = data.node;
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


                    $scope.$digest()
                })
            }

            $scope.$on('redrawTree',function(){
                console.log('redraw')
                $scope.refreshFullList($scope.selectedModel)

              //  orderingSvc.sortFullListByInsertAfter($scope.fullElementList,$scope.selectedModel,$scope.hashAllDG)
              //  let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
              //  makeDGTree(treeData)
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
                        let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                        makeDGTree(treeData)

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

            function makeDGTreeSAVE(treeData) {
                $('#dgTree').jstree('destroy');

                let x = $('#dgTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    // the node selection event...


                    if (data.node) {
                        $scope.selectedNode = data.node;
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
                    let treeObject = $(this).jstree(true).get_json('#', { 'flat': false })


                    $scope.$digest();
                });

            }





            $scope.fitAllDGGraph = function () {
                if ($scope.graphAllDG) {
                    $timeout(function(){$scope.graphAllDG.fit()},500)
                }
            }

            function makeGraphAllDG(graphData) {
                $scope.allGraphData = graphData

                let container = document.getElementById('graphAllDG');
                if (container) {
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            barnesHut: {
                                gravitationalConstant: -10000,
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


}



)