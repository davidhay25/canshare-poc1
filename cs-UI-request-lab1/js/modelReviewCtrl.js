angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,modelsSvc,modelCompSvc,$timeout, $uibModal,makeQSvc,utilsSvc,$window,
                  orderingSvc,snapshotSvc,vsSvc) {

            $scope.input = {}


            // ----------- consume events emitted by the v2 Q renderer ----
            $scope.$on('viewVS',function (event,vs) {
                $scope.viewVS(vs)
            })

            //display the technical items
            $scope.input.technical = true

            //in the table view, hide common DG like HCP as the details are not relevant to reviewers
            $scope.input.hideSomeDG = true

            let DGsToHideInCompTable = ['NZPersonName','HealthcarePractitionerSummary','NZAddress']


            let search = $window.location.search;
            let modelName = null
            if (search) {
                modelName = search.substr(1)
            }


            $http.get('/model/allDG').then(
                function (data) {
                    //console.log(data.data)
                    $scope.hashAllDG = {}
                    data.data.forEach(function (dg) {
                        $scope.hashAllDG[dg.name] = dg

                        //has both dgs & fhir dta
                        $scope.input.types = modelsSvc.getAllTypes($scope.hashAllDG)


                    })

                    //need to generate the snapshot for all DG. This is needed for the Q generation
                    //the snapshots are all held within the service...

                    snapshotSvc.makeSnapshots($scope.hashAllDG,true)

                    //assign the snapshot svc to the modelSvc so that it can read the snapshots of DGs
                    modelCompSvc.setSnapshotSvc(snapshotSvc)


                    //todo - if we decide that this app won't have the ability to select dg/comp
                    //then we don't need to get all the composiitons (will always need all the DGs)
                    $http.get('/model/allCompositions').then(
                        function (data) {
                            //console.log(data.data)
                            $scope.hashAllCompositions = {}
                            data.data.forEach(function (comp) {
                                $scope.hashAllCompositions[comp.name] = comp
                            })


                            /*
                            //now we have both DG's and compositions we can build the hash of all types
                            let world = {dataGroups:$scope.hashAllDG,compositions:$scope.hashAllCompositions}
                            let vo1 = modelsSvc.validateModel(world)
                            $scope.input.types = vo1.types      //a hash keyed by name

                            console.log(vo1.errors)
*/
                            //now that we have all the DG & Compositions, was a modelName passed in?

                            if (modelName) {
                                if ($scope.hashAllCompositions[modelName]) {
                                    $scope.selectComposition($scope.hashAllCompositions[modelName])
                                    $scope.selectedFromUrl = true      //to indicate that the modelname was passed in on the url
                                } else if ($scope.hashAllDG[modelName]) {

                                    $scope.selectDG($scope.hashAllDG[modelName])
                                    $scope.selectedFromUrl = true      //to indicate that the modelname was passed in on the url
                                } else {

                                    alert(`The model name: ${modelName} was not found in the library for either Composition or DataGroup`)
                                }



                            }




                        }
                    )

                }
            )

            $scope.hasFixedValue = function (ed) {
                if (ed) {
                     if (ed.fixedCode || ed.fixedRatio || ed.fixedQuantity || ed.fixedCoding) {
                        return true
                    }
                }
            }

            $scope.hasDefaultValue = function (ed) {
                if (ed) {
                    if (ed.defaultCode || ed.defaultRatio || ed.defaultQuantity || ed.defaultCoding) {
                        return true
                    }
                }
            }



            //the equivalent of the cardinality
            $scope.getObligation = function (ed) {
                if (ed) {
                    if (ed.mult.startsWith('1')) {
                        return "Mandatory"
                    }

                    if (ed.enableWhen && ed.enableWhen.length > 0) {
                        return "Conditional"
                    }

                    return "Optional"
                }


            }

            //show a comment line in one of the 'allcomments' displays
            $scope.showCommentLine = function (comment) {
                if ($scope.input.newCommentsOnly) {
                    if (comment.disposition && comment.disposition.display) {
                        return false
                    }
                }
                return true
            }

            //if showAllCommentSummary is true (ie the summary tab is being shown) display the full list of comments in the right pane
            $scope.showAllCommentSummary = true
            $scope.tabSelect = function (tabname) {
                //console.log(tabname)
                if (tabname == 'summary') {
                    $scope.showAllCommentSummary = true
                } else {
                    $scope.showAllCommentSummary = false
                }
            }

            $scope.version = utilsSvc.getVersion()

            $scope.getPathSegments = function (path) {
                if (path) {
                    return path.split('.')
                }

            }

            //When an ed is selected in a table
            $scope.selectED = function (ed) {
                $scope.selectedED = ed
                $scope.currentLinkId = ed.path

                //this is just making up a node to match the tree
                //todo - change details to just use ED - issue is section multiplicity
                $scope.selectedCompositionNode = {data:{ed:ed}}

                //now create the set of comments for this path
                $scope.commentsThisPath = $scope.commentsThisComp[$scope.selectedCompositionNode.data.ed.path]


            }

            //when an element is selected in a form
            $scope.$on('elementSelected',function(event,vo) {


                console.log('ignoring selection - hash does not align with id')
                return


                let linkId = vo.cell.item.linkId

                //need to get the selectedED (to add to the comment)
                $scope.currentLinkId = linkId
                //todo - what if this is an ED?
                $scope.selectedED = $scope.hashCompElements[linkId].ed



                $scope.commentsThisPath = $scope.commentsThisComp[linkId]

                console.log(linkId)

                //this is just making up a node to match the tree
                $scope.selectedCompositionNode = {data:{}}
                if ($scope.hashCompElements[linkId]) {
                    $scope.selectedCompositionNode.data.ed = $scope.hashCompElements[linkId].ed
                }

                console.log(vo)
            })


            //called by the table view to determine if a row is displayed
            $scope.showTableRow = function (ed) {
                if (ed.mult == '0..0') {
                    return false
                }

                //path = {compname}.{section}.{sectionDG}.{topchildindg}

                let arPath = ed.path.split('.')
                if (arPath.length < 4) {
                    //ignore the section and section group paths
                    return false
                }

                let canShow = true

                if ($scope.input.tableFilter) {
                    if (ed.title) {
                        let title = ed.title.toLowerCase()
                        let srch = $scope.input.tableFilter.toLowerCase()
                        if (title.indexOf(srch) == -1) {
                            canShow = false
                        }
                    }
                }

                //If there's a specific section requested - only show conetnts of that section

                if ($scope.input.tableSection) {
                    if ($scope.input.tableSection.name == 'all') {
                        //return canShow
                    } else {
                        //need to check the second element of the ed path which is the section name...
                        //let ar = ed.path.split('.')
                        if (arPath[1] !== $scope.input.tableSection.name) {
                            canShow = false
                        }
                    }
                }

                //If the row is a child of type HealthcarePractitionerSummary then hide
                //$scope.pathsToIgnore is created when the comp is selected
                //todo - make optional, extend to others if it wprks
                //todo add NZPersonName
                //todo - maybe assemble the list of $scope.pathsToIgnore when the comp is selected. There may be an issue with order...
                if ($scope.input.hideSomeDG) {
                    //if the type is HCP then add to ignorepath
                        //if (ed.type && ed.type[0] == 'HealthcarePractitionerSummary') {

                    Object.keys($scope.pathsToIgnore).forEach(function (key) {
                        //if (ed.path.startsWith(key)  &&  ed.path.length > key.length ) {
                        if (ed.path.isChildPath(key)  ) {
                            canShow = false
                        }

                    })


                    /*
                    if (ed.type && DGsToHideInCompTable.indexOf(ed.type[0]) > -1) {
                        $scope.pathsToIgnore[ed.path] = true

                    } else {
                        Object.keys($scope.pathsToIgnore).forEach(function (key) {
                            if (ed.path.startsWith(key)) {
                                canShow = false
                            }

                        })
                    }
                    */
                }












                return canShow

            }


            //add a comment to the current comp
            $scope.addComment = function (note) {
                //let path = $scope.selectedCompositionNode.data.ed.path

                let path = $scope.currentLinkId


                //let ed = $scope.selectedCompositionNode.data.ed

                let compName = $scope.selectedComp.name

                let comment = {path:path,compName:compName, comment:note}   //will need to add path when saving to db
                comment.id = 'id-'+ new Date().getTime()
                comment.author = $scope.input.author
                comment.ed = $scope.selectedED




                let url = "review"
                $http.post(url,comment).then(
                    function (data) {

                        $scope.setCommentsThisModel(function(){
                            $scope.commentsThisPath = $scope.commentsThisComp[path]
                        })



                    }, function (err) {
                        alert (angular.toJson(err))
                    }
                )


               // temp[path].push(comment)

                //$localStorage.world.comments[compName].push(comment)
                delete $scope.input.comment




            }

            $scope.expandCompTree = function () {
                $('#compositionTree').jstree('open_all');
            }

            //passes in a single review to update
            $scope.addDisposition = function(comment) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/disposition.html',
                    backdrop: 'static',
                    controller: function ($scope, comment) {
                        $scope.input = {}
                        $scope.comment = comment
                        csDisposition = "http://canshare.com/fhir/CodeSystem/disposition-code"

                        $scope.input = {}

                        $scope.input.dispositionOptions = []
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'accept',
                            'display': "Change fully accepted"
                        })
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'mod',
                            'display': "Change partially accepted"
                        })
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'decline',
                            'display': "Change not accepted"
                        })

                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'noted',
                            'display': "Noted"})

                        $scope.saveDisposition = function() {
                            comment.disposition = $scope.input.disposition
                            comment.dispositionNote = $scope.input.dispositionNote
                            $scope.$close(comment)
                        }





                    },
                    resolve: {
                        comment: function () {
                            return angular.copy(comment)
                        }
                    }

                }).result.then(function (c) {
                    //c is an updated comment

                    let compName = $scope.selectedComp.name

                    let qry = `review/${compName}`
                    $http.put(qry,c).then(
                        function (data) {
                            console.log(data)

                            $scope.setCommentsThisModel()


                            comment = c         //so the change will
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )

/*

                    let hashCommentsForPath = $localStorage.world.comments[compName]

                    //todo - not saving. move to db.

                    Object.keys(hashCommentsForPath).forEach(function (key) {
                        if (key == c.path) {

                            hashCommentsForPath[key].forEach(function(com){
                                if (com.id == c.id) {
                                    com.disposition = c.disposition
                                    com.dispositionNote = c.dispositionNote

                                }
                            })

                        }
                    })

                    */




                    //comment.disposition = c.disposition
                })
            }


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

            //get all the comments for the given model (comp or dg)
            $scope.setCommentsThisModel = function(vo) {
                let compName = $scope.selectedComp.name
                delete $scope.allComments
                $scope.commentsThisComp = {}

                let url = `review/${compName}`
                $http.get(url).then(
                    function (data) {
                        console.log(data)
                        //what gets returned is an array of comments for this composition (based on name)
                        //the array may be empty
                        //convert it to a hash keyed on path with the contents as an array of comments

                        $scope.allComments = data.data
                        if (data.data && data.data.length > 0) {

                            data.data.forEach(function (comment) {
                                let path = comment.path
                                $scope.commentsThisComp[path] = $scope.commentsThisComp[path] || []
                                $scope.commentsThisComp[path].push(comment)
                            })
                        }

                        //console.log($scope.commentsThisComp)

                        //now construct a summary of comments by section
                        $scope.commentsBySection = {}
                        $scope.allComments.forEach(function (comment) {
                            if (comment.path) {
                                let ar = comment.path.split('.')
                                let section = ar[1]     //section is always the 2nd element
                                let control = ar[ar.length-1]   //the name of the element. May be an issue if there is a duplaicted name - like status

                                $scope.commentsBySection[section] = $scope.commentsBySection[section] || []
                                let item = {control:control,comment:comment}
                                item.path = comment.path
                                item.shortPath = ar.slice(3).join('.')
                                $scope.commentsBySection[section].push(item)
                            }


                        })

                        //now sort by control name
                        Object.keys($scope.commentsBySection).forEach(function (key) {
                            let obj = $scope.commentsBySection[key]
                            obj.sort(function (a,b) {
                                if (a.control > b.control) {
                                    return 1
                                } else {
                                    return -1
                                }
                            })
                        })

                        if (vo) {
                            vo()
                        }

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }

            //todo - ? disable select capability
            $scope.selectDG = function (dg) {
                console.log(dg)
                //todo just for dev atm - not sure if
                $scope.selectedComp = dg
                $scope.setCommentsThisModel()   //retrieve comments for this model
                $scope.fullElementList = snapshotSvc.getFullListOfElements(dg.name)

                //adjust according to 'insertAfter' values
                orderingSvc.sortFullListByInsertAfter($scope.fullElementList,dg,$scope.hashAllDG)


                //retrieve all the ValueSets in this DG. They are cached in the service
                $scope.showWaiting = true
                vsSvc.getAllVS($scope.fullElementList, function () {
                    //alert("all VS available")
                    $scope.showWaiting = false

                    //the second option expands the valuesets as options into the Q - todo make this an option
                    let config = {expandVS:true,enableWhen:true}
                    //let voQ = makeQSvc.makeHierarchicalQFromDG($scope.fullElementList,true) //,$scope.hashAllDG)
                    let voQ = makeQSvc.makeHierarchicalQFromDG($scope.fullElementList,config) //,$scope.hashAllDG)
                    $scope.fullQ = voQ.Q
                    $scope.hashEd = voQ.hashEd
                    $scope.errorLog = voQ.errorLog
                    console.log(voQ.errorLog)

                    //The DG element tree
                    let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                    //makeDGTree(treeData)


                    let rootNodeId = $scope.fullElementList[0].path
                    //let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)


                    console.log(treeData)
                    makeDGTree(treeData,rootNodeId)

                })





            }

            $scope.getRowColour = function (ed) {
                let colour
                switch (ed.kind) {
                    case 'section' :
                        colour = "#eee"
                        break

                }

                if (ed.type && ed.type[0] == 'Group') {
                    colour = "#eee"
                }

                return colour
            }

            $scope.selectComposition = function (comp) {

                if (! comp) {
                    return
                }

                //retrieve all the ValueSets in this DG. They are cached in the service
                //$scope.showWaiting = true

                /*
                vsSvc.getAllVS($scope.fullElementList, function () {
                    //alert("all VS available")
                    $scope.showWaiting = false
                })
*/

                $scope.selectedComp = comp

                //we need to get all the valueses in the composition - which meand we need
                //all the elements...
                $scope.showWaiting = true
                let voComp = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)


                vsSvc.getAllVS(voComp.allElements, function () {
                    //alert("all VS available")
                    $scope.showWaiting = false


                    let vo = makeQSvc.makeHierarchicalQFromComp(comp,$scope.hashAllDG)

                    $scope.fullQ = vo.Q         //will invoke the Q renderer directive
                    $scope.hashEd = vo.hashEd
                    $scope.errorLog = vo.errorLog

                    console.log(vo.errorLog)
                })





/*




                return

                $scope.showWaiting = true
                vsSvc.updateVSFromUrlHash(vo.hashVS,function(){
                    $scope.showWaiting = false
                })
                //test stuff


                console.log(comp)
                $scope.setCommentsThisModel()   //todo - pass in model

                let vo1 = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)
                $scope.allCompElements = vo1.allElements
                $scope.hashCompElements = vo1.hashAllElements

                delete  $scope.fullQ
                delete  $scope.Qlog

                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeCompTree($scope.allCompElements)

                $scope.treeData = treeData      //used in the Q builder

                //console.log(treeData)
                makeCompTree(treeData,rootNodeId)

                //test stuff
                //let rootNodeId = $scope.allCompElements[0].path
                //let treeData1 = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                //makeDGTree(treeData1,rootNodeId)

                //generate the Q for the composition
                makeCompQSvc.makeQ($scope.allCompElements,$scope.hashAllDG,function (Q) {
                    $scope.fullQ = Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)
                })


                //stuff for the table...

                //used to exclude paths like HCP from the table
                $scope.pathsToIgnore = {}

                $scope.input.tableSections = [{name:'all',title:'All sections'}]
                comp.sections.forEach(function (section) {
                    $scope.input.tableSections.push({name:section.name,title:section.title})
                })
                $scope.input.tableSection = $scope.input.tableSections[0]

                //get the set of all paths to ignore. These are those where the DG type is in  DGsToHideInCompTable
                //when rendering the table, any paths starting with any of this set will be ignored
                //this is to avoid cluttering the table view
                $scope.allCompElements.forEach(function (item) {
                    if (item.ed.type && DGsToHideInCompTable.indexOf(item.ed.type[0]) > -1) {
                        $scope.pathsToIgnore[item.ed.path] = true

                    }
                })
                console.log($scope.pathsToIgnore)
*/
            }


            function makeDGTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                        $scope.commentsThisPath = $scope.commentsThisComp[$scope.selectedCompositionNode.data.ed.path]
                        $scope.currentLinkId = $scope.selectedCompositionNode.data.ed.path

                        console.log(data.node)


                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);


                });

            }


            function makeCompTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                        $scope.commentsThisPath = $scope.commentsThisComp[$scope.selectedCompositionNode.data.ed.path]


                        $scope.selectedED = data.node.data.ed
                        $scope.currentLinkId = $scope.selectedCompositionNode.data.ed.path

                        console.log(data.node)



                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);

                    let treeObject = $(this).jstree(true).get_json('#', { 'flat': false })


                    let strategy = null
                    //asyncCall(treeObject,$scope.selectedComp,                        strategy)


                    //$scope.$digest();
                });

            }

            async function asyncCallDEP(treeObject,comp,strategy) {
                console.log('calling');
                console.time('q')


                //$scope.fullQ = await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)

                let voQ = await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)

                //$scope.fullQ = await makeQSvc.makeQFromTree(treeObject,comp,strategy)
                $scope.fullQ = voQ.Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)
                $scope.Qlog = voQ.log   //the log of activity that occurred as the Q was created
                //this is a version structured for tabs.
                //$scope.fullQTab = voQ.Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)
                $scope.$digest();

            }

            /*
            //todo - temp, for debugging
            $timeout(function(){
                $scope.selectComposition($scope.hashAllCompositions['PathRequest'])
               // makeAllCommentsSummary()
            },500)

*/

        })