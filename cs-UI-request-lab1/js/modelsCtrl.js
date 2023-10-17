//https://imagemap.org/

angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,modelCompSvc,$window,makeQSvc,
                  $timeout,$uibModal,$filter,modelTermSvc,modelDGSvc,igSvc,librarySvc) {


            $scope.version = "0.4.12"
            $scope.input = {}
            $scope.input.showFullModel = true

           //text.x = "y"

            $scope.$on('updateDGList',function(ev,vo) {
                console.log(vo)
                sortDG()    //update the sorted list of DG
                if (vo && vo.name) {
                    $scope.selectModel($scope.hashAllDG[vo.name] )
                }

            })



            //record access
            $http.post("model/access",{})

            $scope.igBase = "https://build.fhir.org/ig/davidhay25/canshare-LIM/branches/main/"

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
                    if (ar[0] == 'dt') {
                        $scope.initialDT = ar[1]
                        //console.log($scope.initialDT)

                        //wait a second then select the DT. todo really need to refactor this controller...
                        $timeout(function () {
                            if ($scope.hashAllDG[$scope.initialDT]) {
                                $scope.selectModel($scope.hashAllDG[$scope.initialDT])
                            }

                        },500)

                    }
                }
            }



           // $scope.leftPanel = 'col-md-3'
           // $scope.rightPanel = 'col-md-9'

            $scope.leftPanel = 'col-md-3'
            $scope.rightPanel = 'col-md-9'

            $scope.fhirRoot = "http://hl7.org/fhir/R4/"

            //allows a specific tab in the mail UI to be selected
            $scope.ui = {}
            $scope.ui.tabDG = 1;
            $scope.ui.tabComp = 0;
            $scope.ui.tabQ = 2;
            $scope.ui.tabTerminology = 3;

            //remember the initial opening tab
            $localStorage.initialModelTab = $localStorage.initialModelTab || $scope.ui.tabComp
            $scope.input.mainTabActive = $localStorage.initialModelTab
            $scope.setInitialTab = function (inx) {
                $localStorage.initialModelTab = inx
            }
            //$scope.input.mainTabActive = $scope.ui.tabQ

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



            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {
               // console.log('auth state change')
                if (user) {
                  //  console.log('logged in')
                    $scope.user = {email:user.email,displayName : user.displayName}
                  //  console.log($scope.user)
                    //$scope.loadAllQ()
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
                    alert('You have been logged out')


                }, function(error) {
                    alert('Sorry, there was an error logging out - please try again')
                });

            };

            $scope.resetAll = function () {
                if (confirm("This will remove all DGs and refresh the example resources. Are you sure?")) {
                    $localStorage.world = modelsDemoSvc.getDemo()

                    alert("Reset complete. Please refresh the browser.")
                }
            }

            $scope.clearLocal = function () {
                if (confirm("This will remove all DGs and create an empty environment. Are you sure")) {
                    $localStorage.world = {compositions:{},dataGroups: {},valueSets:{}}


                    alert("Reset complete. Please refresh the browser.")
                }
            }

            $scope.getSortedDGListDEP = function () {
                let ar = []
                Object.keys($scope.hashAllDG).forEach(function (key) {
                    ar.push($scope.hashAllDG[key])
                })
                ar.sort(function (a,b) {
                    if (a.name.toLowerCase() > b.name.toLowerCase()) {
                        return true
                    } else {
                        return false
                    }
                })
                console.log(ar)
                return ar
            }


            //all the questionnaire objects (not actual Q)
            $scope.allQObject = $localStorage.allQObject

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
                            return $scope.allQObject
                        },
                        user : function () {
                            return $scope.user
                        }
                    }

                }).result.then(function (vo) {

                    if (vo && vo.comp) {
                        //a composition was passed in. Update (or add to) the $scope.hashAllCompositions
                        $scope.hashAllCompositions[vo.comp.name] = vo.comp

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


                    // //rebuild fullList and re-draw the tree
                    //alert("The local copies have been updated. You should re-load the page to see the changes. ")
                     //$scope.refreshFullList($scope.selectedModel)
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

/* $scope.toggleLeftPanel = function(){
                if ($scope.leftPanel == 'col-md-3') {
                    $scope.leftPanel = 'hidden'
                    $scope.rightPanel = 'col-md-12'
                } else {
                    $scope.leftPanel = 'col-md-3'
                    $scope.rightPanel = 'col-md-9'
                }
            }*/

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

            console.log($scope.hashAllDG)

            //If there's a DG with no diff, all sorts of bad stuff happens. Shouldn't occur, but if it does its a pain
            //this at least prevents the app form crashing, so remedial action can be taken
            Object.keys($scope.hashAllDG).forEach(function (key) {
                $scope.hashAllDG[key].diff = $scope.hashAllDG[key].diff || []
            })

            //


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

                    alert("File has been imported. Please reload the page.")

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

                //$scope.selectModel($scope.selectedModel)
                delete $scope.input.newBespokeTag
            }

            //clear the tag from the DG (if it exists) and the $scope.tags
            $scope.removeTagFromDT = function (tagName) {

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
            makeAllDTList = function() {
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
                let vo = modelDGSvc.makeFullGraph($scope.hashAllDG)

                //todo - should move the js to the bottom of the page so it's loaded before the script runs...!
                $timeout(function () {

                    return // <<<<<<
                    makeGraphAllDG(vo.graphData)

                    //--------- build the tree with all DG
                    let vo1 = modelDGSvc.makeTreeViewOfDG($scope.hashAllDG)
                    showAllDGTree(vo1.treeData)

                    //--- make the category hash for the category tree display of DG
                    let hashCategories = modelDGSvc.analyseCategories($scope.hashAllDG)
                    let vo2 = modelDGSvc.makeTreeViewOfCategories(hashCategories)
                    showCategoryDGTree(vo2.treeData)

                    modelDGSvc.makeDgDownload($scope.hashAllDG)

                },500)




            }
            makeAllDTList()         //initial invokation on load

            //console.log($scope.tags)

            //when a tag is update in the UI - save a copy in the browser cache
            $scope.updateTag = function (tags) {

                $localStorage.userTags1 = $localStorage.userTags1  || {}
                $localStorage.userTags1[$scope.selectedModel.name] = tags

                makeAllDTList()
            }

            $scope.rememberSelectedTag = function (tag) {
                $localStorage.selectedTag = tag
            }


            //display the tree with all DG
            function showAllDGTree(treeData) {
                $('#allDGTree').jstree('destroy');

                $scope.allDGTree = $('#allDGTree').jstree(
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
                    if (confirm("Are you sure you wish to remove this DG from the local store? If uploaded to the library, it will still be there.")) {
                        delete $scope.hashAllDG[dgName]
                        makeAllDTList()
                        $scope.refreshUpdates()
                        alert("The DG has been removed. It is advisable to refresh the page.")
                    }
                }

            }

            //shows the image of the DG summary. todo - may need to clear other stuff
            $scope.showDGSummary = function () {
                delete $scope.selectedModel
                $scope.input.mainTabActive = $scope.ui.tabDG;
            }



            //delete the selected item. If the item exists in the DG then it can be removed (or possibly set the mult to 0..0)
            //if not (ie it's inherited) then create an override element
            $scope.deleteDGItemDEP = function (item) {
                let pathToDelete =  $filter('dropFirstInPath')(item.path)



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

            }


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
                        },
                        hashAllDG : function () {
                            return $scope.hashAllDG
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

                    } else {
                        //If an edit, then need to see if the item is directly defined on the DG (which will be updated),
                        //or whether it is an inherited element, in which case an override element is added...
                        displayPath = $filter('dropFirstInPath')(ed.path)

                        if (ed.type[0] !== originalED.type[0]) {
                            changes += "Type changed. "
                        }

                        if (ed.description !== originalED.description) {
                            changes += "Description changed. "
                        }
                        if (ed.title !== originalED.title) {
                            changes += "Title changed. "
                        }

                        if (ed.notes !== originalED.notes) {
                            changes += "Notes changed. "
                        }

                        if (ed.mult !== originalED.mult) {
                            changes += "Cardinality changed."
                        }

                        if (ed.valueSet !== originalED.valueSet) {
                            changes += "ValueSet changed."
                        }
                        if (ed.sourceReference !== originalED.sourceReference) {
                            changes += "Source reference changed."
                        }

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
                                ed1.description = ed.description
                                ed1.mult = ed.mult
                                ed1.valueSet = ed.valueSet
                                ed1.sourceReference = ed.sourceReference
                                ed1.controlHint = ed.controlHint
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

                        $scope.updateTermSummary()
                    }


                    //record that changes were made
                    modelDGSvc.updateChanges($scope.selectedModel,
                        {edPath:ed.path,
                            msg:changes},$scope)

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

            //when a specific DG path is selected in the term summary
            //used by updates list as well = hence moved to main controller
            //item = {hiddenDGName:, path:}  (path doesn't have leading gg name



            $scope.termSelectDGItem = function (item) {
                // console.log(item)

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

            //update
            $scope.updateTermSummary = function () {
                $scope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list
                $scope.compTermSummary = modelTermSvc.makeCompOverrideSummary($scope.hashAllCompositions).list
                $scope.hashVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).hashVS
                $scope.notesSummary = modelTermSvc.makeNotesSummary($scope.hashAllDG,$scope.hashAllCompositions)
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

                $scope.refreshUpdates()
            })


            $scope.resetWorld = function () {

                if (confirm("Are you wish to restore the core DT to their original state (This will not remove custom DTs)")) {
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
            //filter is the selected bespoke code (if any)
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


            //create a new model. If parent is set, then a new model automatically has that model as the parent
            $scope.newModel = function(kind,parent) {
                let newModel = {kind:kind,diff:[]}
                $scope.editModel(newModel,true,parent)
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

                    modelsSvc.isUniqueNameOnLibrary(name,'comp').then(
                        function () {
                            //name is unique
                            let isUnique =  ! $scope.hashAllCompositions[name]

                            if (isUnique) {
                                let newComp = {kind:'comp', name:name, title:name, sections:[]}
                                $localStorage.world.compositions[newComp.name] = newComp
                                //$scope.selectedModel = newComp
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
                        },

                        parent: function () {
                            return parent
                        }

                    }

                }).result.then(function (newModel) {
                    if (newModel) {
                        //if a model is returned, then it is a new one and needs to be added to the world

                        if ($scope.user) {
                            newModel.author = $scope.user.email

                            librarySvc.checkOut(newModel,$scope.user)

                        }


                        $localStorage.world.dataGroups[newModel.name] = newModel
                        $scope.hashAllDG = $localStorage.world.dataGroups
                        sortDG()


                        let vo1 = modelsSvc.validateModel($localStorage.world)
                        $scope.errors = vo1.errors
                        $scope.input.types = vo1.types      //a hash keyed by name

                        //a hash by type of all elements that reference it
                        $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                        makeAllDTList()      //updated

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
                //delete $scope.input.showDGChildren
            }



            $scope.selectComposition = function(comp){
                clearB4Select()
                $scope.selectedModel = comp

                let vo = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)

                $scope.allCompElements = vo.allElements
                $scope.hashCompElements = vo.hashAllElements

                let download = modelCompSvc.makeDownload(vo.allElements)
                console.log(download)

                //$scope.downloadLinkCompTsv = window.URL.createObjectURL(new Blob([angular.toJson(download,true) ],{type:"text/tsv"}))
                $scope.downloadLinkCompTsv = window.URL.createObjectURL(new Blob([download ],{type:"text/csv"}))
                $scope.downloadLinkCompTsvName = `comp-${comp.name}.csv`

                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                //temp - not sure this is correct$scope.treeData = treeData      //used in the Q builder


                makeCompTree(treeData,rootNodeId)


                igSvc.makeFshForComp(comp,$scope.allCompElements,$scope.hashCompElements)



            }


            //refresh the complete list of elements for this DG
            //also draw the graph & tree
            $scope.refreshFullList = function (dg) {


                //determine all the elements in this DG by recursing up the inheritance hierarchy
                //and 'across' elements that are referenced DGs. Note that a referenced DG may have its own hierarchy
                let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)


                $scope.graphData = vo.graphData
                $scope.relationshipsSummary = vo.relationshipsSummary   //all the relationships - parent and reference - for this type

                //sort the elements list to better display slicing
                $scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)

                //create the list of potential enableWhen sources
                $scope.ewSources = []
                $scope.fullElementList.forEach(function (item) {
                    if (item.ed.type && item.ed.type[0] == 'CodeableConcept') {
                        let t = {ed:item.ed,shortPath: $filter('dropFirstInPath')(item.ed.path)}
                        $scope.ewSources.push(t)
                    }
                })
//console.log($scope.ewSources)

               // console.log(modelsSvc.makeOrderedFullList(vo.allElements))

                $scope.dgFshLM = igSvc.makeFshForDG(dg,vo.allElements)

                makeGraph()

                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                makeDGTree(treeData)

            }

            //only used for DG now
            $scope.selectModel = function (dg) {
                if (dg) {
                    clearB4Select()
                    $scope.selectedModel = dg

                    let url = `/model/DG/${dg.name}/history/count`
                    $http.get(url).then(
                        function (data) {
                            $scope.historyCount = data.data
                        }
                    )


                    $scope.refreshUpdates()     //update the xref and the list of all updates

                    //create the list of override elements
                    $scope.overrides = []
                    //$scope.directElements = {}    //elements directly on the DG. These can have fixed values
                    $scope.selectedModel.diff.forEach(function (ed) {
                        //if there's a dot in the ed path, then it refers to an element in a child...
                        if (ed.path.indexOf('.') > -1 ) {
                            $scope.overrides.push(ed)
                        }
                    })

                    $scope.refreshFullList(dg)      //the complete list of elements for this DG
                }

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
                $('#dgTree').jstree('destroy');

                let x = $('#dgTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    // the node selection event...

                    if (data.node) {

                        $scope.selectedNode = data.node;
                    }

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
                    $scope.fullQ =  makeQSvc.makeQFromTree(treeObject)
                    console.log($scope.fullQ)
                    $scope.$digest();
                });

            }




            /*$timeout(function(){
                    $scope.selectModel($scope.hashAllDG['Specimen'],$scope.hashAllDG)
            },500)*/


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
                        /*
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
                        */
                    })
                }


        }


}



)