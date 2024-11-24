angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,modelsSvc,modelCompSvc,$timeout, $uibModal,makeQSvc,utilsSvc,$window,
                  orderingSvc,snapshotSvc,vsSvc) {

            $scope.input = {}

            $scope.input.SDCOnly = true

            // ----------- consume events emitted by the v2 Q renderer ----
            $scope.$on('viewVS',function (event,vs) {
                $scope.viewVS(vs)
            })

            //display the technical items
            $scope.input.technical = true

            //in the table view, hide common DG like HCP as the details are not relevant to reviewers
            $scope.input.hideSomeDG = true

            //let DGsToHideInCompTable = ['NZPersonName','HealthcarePractitionerSummary','NZAddress']


            let search = $window.location.search;
            let modelName = null
            $scope.compVersion = null

            if (search) {

                modelName = search.substr(1)
                if ($window.location.hash) {
                    $scope.compVersion = $window.location.hash.substr(1)
                }

            }

            $scope.loadQ = function (qName) {
                let qry = `/Questionnaire/${qName}`
                $http.get(qry).then(
                    function (data) {
                        $scope.fullQ = data.data
                        $scope.hashEd = {}

                        //A report focussed on pre-popupation & extraction
                        let voReport =  makeQSvc.makeReport($scope.fullQ)
                        $scope.qReport =voReport.report
                        $scope.input.mainTabActive = 1

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            if (modelName) {
                if (modelName.startsWith('q-')) {
                    //a Q reference was passed
                    let qName = modelName.slice(2)
                    $scope.loadQ(qName)


                } else {
                    $http.get('/model/allDG').then(
                        function (data) {
                            //console.log(data.data)
                            $scope.hashAllDG = {}
                            data.data.forEach(function (dg) {
                                $scope.hashAllDG[dg.name] = dg

                                //has both dgs & fhir dta
                                // $scope.input.types = modelsSvc.getAllTypes($scope.hashAllDG)


                            })

                            //has both dgs & fhir dta
                            $scope.input.types = modelsSvc.getAllTypes($scope.hashAllDG)


                            //need to generate the snapshot for all DG. This is needed for the Q generation
                            //the snapshots are all held within the service...

                            snapshotSvc.makeSnapshots($scope.hashAllDG)

                            //assign the snapshot svc to the modelSvc so that it can read the snapshots of DGs
                            modelCompSvc.setSnapshotSvc(snapshotSvc)


                            //todo - if we decide that this app won't have the ability to select dg/comp
                            //then we don't need to get all the composiitons (will always need all the DGs)
                            //but keep it for now (though there is a performance hit...
                            $http.get('/model/allCompositions').then(
                                function (data) {
                                    //console.log(data.data)
                                    $scope.hashAllCompositions = {}
                                    data.data.forEach(function (comp) {
                                        $scope.hashAllCompositions[comp.name] = comp
                                    })


                                    //now that we have all the DG & Compositions, was a modelName passed in?

                                    if (modelName) {
                                        if ($scope.hashAllCompositions[modelName]) {
                                            //this was a composition
                                            $scope.modelType = 'comp'
                                            $scope.selectedModel = $scope.hashAllCompositions[modelName]
                                            $scope.selectComposition($scope.hashAllCompositions[modelName],$scope.compVersion)
                                            $scope.selectedFromUrl = true      //to indicate that the modelname was passed in on the url

                                            $scope.input.mainTabActive = 1

                                        } else if ($scope.hashAllDG[modelName]) {
                                            //this is a DG
                                            $scope.modelType = 'dg'
                                            $scope.selectedModel = $scope.hashAllDG[modelName]
                                            $scope.selectDG($scope.hashAllDG[modelName])

                                            $scope.selectedFromUrl = true      //to indicate that the modelname was passed in on the url
                                            $scope.input.mainTabActive = 1
                                        } else {

                                            alert(`The model name: ${modelName} was not found in the library for either Composition or DataGroup`)
                                        }

                                    } else {
                                        alert("You need to supply the name of a DG or Composition in the call")
                                    }

                                }
                            )

                        }
                    )
                }

            } else {
                //alert("You'll need to paste in a Questionnaire (Json) format")
            }


            function loadAllQNames() {
                $http.get('/Questionnaire/getSummary').then(
                    function (data) {
                        $scope.lstQ = data.data.lstQ
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }
            loadAllQNames()

            //paste in a Q
            $scope.pasteQ = function (Qstring) {
                let testQ = {}
                try {
                    testQ = JSON.parse(Qstring)
                } catch {
                    alert("This is not a valid Json string")
                }

                try {
                    $scope.hashEd = {}
                    //A report focussed on pre-popupation & extraction
                    let voReport =  makeQSvc.makeReport(testQ)
                    $scope.qReport =voReport.report
                    $scope.fullQ = $scope.fullQ
                    $scope.input.mainTabActive = 1
                } catch {
                    alert("This is a valid Json string, but there were errors parsing it.")

                }





            }


            $scope.rebuildQ = function () {
                if ( $scope.modelType == 'dg') {
                    //call the select function with the disable conditional flag set
                    $scope.selectDG($scope.selectedModel,true)
                } else {
                    $scope.selectComposition($scope.selectedModel,$scope.compVersion,true)
                }

            }

            $scope.testxquery = function (xqry) {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'xlg',
                    templateUrl: 'modalTemplates/xquery.html',

                    controller: 'xqueryCtrl',

                    resolve: {
                        query: function () {
                            return xqry
                        }
                    }

                }).result.then(function (concept) {
                    console.log(concept)


                })


            }

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




            //add a comment to the current comp
            $scope.addComment = function (note) {
                //let path = $scope.selectedCompositionNode.data.ed.path

                let path = $scope.currentLinkId


                //let ed = $scope.selectedCompositionNode.data.ed

                let compName = $scope.selectedComp.name

                let comment = {path:path,compName:compName, compVersion: $scope.compVersion,comment:note}   //will need to add path when saving to db
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
                let compName = $scope.selectedComp.name     //todo - modelName / selectedModel would be better names
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

                        //now construct a summary of comments by section. Really only makes sense for compositions
                        //todo  - this needs work as there is an incorect assumption - see note re ar.slice(3) below
                        $scope.commentsBySection = {}
                        $scope.allComments.forEach(function (comment) {
                            if (comment.path) {
                                let ar = comment.path.split('.')
                                let section = ar[1]     //section is always the 2nd element
                                let control = ar[ar.length-1]   //the name of the element. May be an issue if there is a duplaicted name - like status

                                $scope.commentsBySection[section] = $scope.commentsBySection[section] || []
                                let item = {control:control,comment:comment}
                                item.path = comment.path
                                item.shortPath = ar.slice(3).join('.')      //todo - this isn't always true -
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
            $scope.selectDG = function (dg,disableConditional) {
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
                    config.hashAllDG = $scope.hashAllDG

                    //disable the generation of conditional operations
                    if (disableConditional) {
                        config.enableWhen = false
                    }

                    if (dg.type) {
                        config.fhirType = dg.type // Used for definition based extraction
                    }

                    //need the named queries for Q variables
                    makeQSvc.getNamedQueries(function (hash) {
                        config.namedQueries = hash

                        let voQ = makeQSvc.makeHierarchicalQFromDG(dg,$scope.fullElementList,config) //,$scope.hashAllDG)
                        $scope.fullQ = voQ.Q
                        $scope.hashEd = voQ.hashEd
                        $scope.errorLog = voQ.errorLog
                        console.log(voQ.errorLog)

                        //A report focussed on pre-popupation & extraction
                        let voReport =  makeQSvc.makeReport($scope.fullQ)
                        $scope.qReport =voReport.report
                    })

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

            $scope.selectComposition = function (comp,version,hideConditional) {

                if (! comp) {
                    return
                }

                $scope.selectedComp = comp

                if (version) {
                    //if a version is specified then retrieve that version

                    let qry = `/comp/version/${comp.name}/${version}`
                    $http.get(qry).then(
                        function (data) {
                            let compVersion = data.data     //a compositon that has a snapshot

                            if (compVersion.Q && compVersion.snapshot) {


                                vsSvc.getAllVS(compVersion.snapshot, function () {
                                    $scope.fullQ = compVersion.Q         //will invoke the Q renderer directive
                                    $scope.hashEd = {} //EDs are needed for notes
                                    compVersion.snapshot.forEach(function (ed) {
                                        $scope.hashEd[ed.path] = ed
                                    })
                                    $scope.errorLog = compVersion.errorLog || [] //vo.errorLog

                                    //A report focussed on pre-popupation & extraction
                                    let voReport =  makeQSvc.makeReport(compVersion.Q)
                                    $scope.qReport =voReport.report



                                })

                            } else {
                                alert("The composition was retrieved, but it has no snapshot so cannot be viewed.")
                            }

                        },function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )

                } else {
                    let voComp = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)
                    makeQ(voComp,comp,hideConditional)
                }



                function makeQ(voComp,comp,hideConditional) {
                    vsSvc.getAllVS(voComp.allElements, function () {
                        //alert("all VS available")
                        $scope.showWaiting = false

                        makeQSvc.getNamedQueries(function (hashNamedQueries) {

                            //let compConfig = {hideConditional : hideConditional}
                            let compConfig = {hideEnableWhen : true}

                            let vo = makeQSvc.makeHierarchicalQFromComp(comp,$scope.hashAllDG,hashNamedQueries,compConfig)

                            $scope.fullQ = vo.Q         //will invoke the Q renderer directive
                            $scope.hashEd = vo.hashEd
                            $scope.errorLog = vo.errorLog

                            //A report focussed on pre-popupation & extraction
                            let voReport =  makeQSvc.makeReport($scope.fullQ)
                            $scope.qReport =voReport.report


                            console.log(vo.errorLog)

                        })




                    })
                }
            }

            $scope.showReportLine = function (SDCOnly,entry) {
                if (! SDCOnly) {return true}

                if (entry.isSDC) {return true}

                return false
            }





        })