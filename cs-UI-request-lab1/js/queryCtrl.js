angular.module("pocApp")
    .controller('queryCtrl',
        function ($scope,$http,$localStorage,$uibModal,$q,$timeout,querySvc) {

            $scope.localStorage = $localStorage

            $scope.input = {}

            $scope.languages = []       //languages that can be used for the expansion
            $scope.languages.push({display:"Default",code:""})      //todo find nz expansion
            $scope.languages.push({display:"CanShare",code:"en-x-sctlang-23162100-0210105"})

            // =============================================== functions to support ConceptMap work =================

            $scope.input.cmOptions = {}         //options by property
/*
            $timeout(function () {
                $scope.lookup ("394593009",snomed)

            },500)
*/
            $scope.input.excludeHL7 = true
            $scope.input.onlyCanShare = true
            $scope.input.loadComplete = true


            $scope.performTranslate = function () {
                delete $scope.resultParametersList
                delete $scope.resultParameters

                let p = $scope.generateTranslateQuery()
                console.log(p)

                $http.post('nzhts',p).then(
                    function (data) {
                        $scope.resultParameters = data.data
                        $scope.resultParametersList = []
                        //make a list of matches from the parameters
                        if ($scope.resultParameters.parameter){
                            $scope.resultParameters.parameter.forEach(function (param) {
                                if (param.name == 'match' && param.part) {
                                    param.part.forEach(function (part) {
                                        if (part.name == 'concept') {
                                            $scope.resultParametersList.push(part.valueCoding)
                                        }
                                    })
                                }

                            })
                        }


                        console.log(data)
                    },function (err) {
                        alert(angular.toJson(err.data))
                        console.log(err)
                    }
                )

                return


                let qry = `ConceptMap/$translate?url=http://canshare.co.nz/fhir/ConceptMap/canshare-ecog`
                qry += "&code=423740007&system=http://snomed.info/sct"
                console.log(qry)
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data)
                    },function (err) {
                        console.log(err)
                    }
                    )

            }

            


            querySvc.getConceptMaps().then(
                function (data) {
                    $scope.allConceptMaps = data
                    //console.log(data)
                },function (err) {
                    console.log(err)
                }
            )

            $scope.selectCMItem = function (item,expand) {
                $scope.selectedCM = item.cm
                delete $scope.fullSelectedCM
                delete $scope.resultParameters
                delete $scope.resultParametersList
                delete $scope.translateParameters

                $scope.loadingCM = true

                if ($scope.input.loadComplete) {
                    expand = true
                }

                querySvc.getOneConceptMap(item.cm.url,expand).then(
                    function (ar) {
                        $scope.fullSelectedCM = ar[0]       //todo what of there's > 1

                        //now get the set of 'dependsOn' properties (if any)
                        $scope.doProperties = querySvc.getCMProperties($scope.fullSelectedCM)

                        //decide whether to show 'canshare' tab
                        $scope.showTranslate = Object.keys($scope.doProperties).length > 0


                    }, function (err) {

                    }
                ).finally(function () {
                    $scope.loadingCM = false
                })

            }

            $scope.showCM = function (item) {
                result = true

                if ($scope.input.onlyCanShare) {
                    let identifier = item.cm.identifier
                    if (identifier) {
                        if (identifier.system  == 'http://canshare.co.nz/fhir/NamingSystem/conceptmaps') {
                            return true
                        } else {
                            return false
                        }
                    } else {
                        return false
                    }
                }



                if ($scope.input.excludeHL7) {
                    if (item.cm.url.indexOf("http://hl7.org/fhir/ConceptMap/")> -1) {
                        result = false
                    }
                }
                return result
            }


            //generate the translate query from the canshare lookup tab
            $scope.generateTranslateQuery = function() {


                let translateParameters = {resourceType:"Parameters", parameter:[]}

                //$scope.parameters = {resourceType:"Parameters", parameter:[]}

                //the conceptmap url
                translateParameters.parameter.push({name:"url",valueUri: $scope.fullSelectedCM.url })

                //add the target - what we are looking for. This is in the group.element.target.code
                //is it really? I wonder if it's group.element.code
                //Assuming that each CM is focussed on a single 'thing' to lookup - in group[0].element[0].code
                let codeWeWant = $scope.fullSelectedCM.group[0].element[0].code
                let displayWeWant = $scope.fullSelectedCM.group[0].element[0].display

                let systemWeWant = $scope.fullSelectedCM.group[0].source || "http://snomed.info/sct"

                //translateParameters.parameter.push({name:"sourceCoding",valueCoding:conceptWeWant})


                let conceptWeWant = {system:systemWeWant,code:codeWeWant,display:displayWeWant}

                translateParameters.parameter.push({name:"coding",valueCoding:conceptWeWant})

                //add the dependencies
                if ($scope.input.cmOptions) {
                    Object.keys($scope.input.cmOptions).forEach(function (key) {
                        let p = $scope.input.cmOptions[key]

                        let depParam1 = {name:"dependency",part :[]}
                        translateParameters.parameter.push(depParam1)
                        let part1 = {"name":"element","valueUri":key}
                        depParam1.part.push(part1)
                        //let ccValue = {coding:[{system:snomed,code:$scope.input.dep1}]}
                        let ccValue = {coding:[p]}
                        let part2 = {"name":"concept","valueCodeableConcept":ccValue}
                        depParam1.part.push(part2)
                    })
                }


                $scope.translateParameters = translateParameters

                return translateParameters
/*
                //the dependency
                if ( $scope.input.dep1) {
                    let depParam1 = {name:"dependency",part :[]}
                    $scope.parameters.parameter.push(depParam1)
                    let part1 = {"name":"element","valueUri":$scope.input.prop1}
                    depParam1.part.push(part1)
                    let ccValue = {coding:[{system:snomed,code:$scope.input.dep1}]}
                    let part2 = {"name":"concept","valueCodeableConcept":ccValue}
                    depParam1.part.push(part2)
                }

                if ( $scope.input.dep2) {
                    let depParam2 = {name:"dependency",part :[]}
                    $scope.parameters.parameter.push(depParam2)
                    let part1 = {"name":"element","valueUri":$scope.input.prop2}
                    depParam2.part.push(part1)
                    let ccValue = {coding:[{system:snomed,code:$scope.input.dep2}]}
                    let part2 = {"name":"concept","valueCodeableConcept":ccValue}
                    depParam2.part.push(part2)
                }

*/
            }




            $scope.setExampleDEP = function(example) {
                $scope.input.id = example.id
                $scope.input.target = example.target
                $scope.input.source = example.source
                $scope.input.prop1 = example.prop1
                $scope.input.dep1 = example.dep1

                $scope.input.prop2 = example.prop2
                $scope.input.dep2 = example.dep2

                $scope.generateMapAndTranslate()

            }

            $scope.selectQfromVSList = function(Q) {
                $scope.selectedQ = Q
                $scope.dummyQR = {}
                $scope.dummyFormData = {}
            }

            //refresh the list of Q that use a specific VS
            $scope.refreshVsQList = function(url) {
                let qry = `/term/findQusingVS?url=${url}`
                $scope.showWaiting = true
                $http.get(qry).then(function (data) {
                    $scope.showWaiting = false
                    $scope.qUsingVS = data.data
                    if (Object.keys($scope.qUsingVS).length == 0) {
                        alert("There currently are no forms using this ValueSet")
                    }
                    //console.log(data.data)
                })
            }


            //whether to show a particular VS
            $scope.showVS = function (item) {
                let filter = $scope.input.filterlist
                if (filter) {
                    if (item.display.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        return true
                    } else {
                        return false
                    }
                } else {
                    return true
                }

            }

            $scope.lookup = function (code,system) {
                system = system || snomed
                let qry = `CodeSystem/$lookup?system=${system}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {

                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            //backdrop: 'static',
                            //size : 'lg',
                            controller : "showParametersCtrl",
                            resolve: {
                                parameters: function () {
                                    return data.data
                                },
                                title : function () {
                                    return `Concept lookup (${code})`
                                },
                                code: function () {
                                    return code
                                },
                                system : function () {
                                    return system
                                }
                            }
                        })


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })
            }



            let termServer = "https://r4.ontoserver.csiro.au/fhir/"
            let snomed = "http://snomed.info/sct"


            //$scope.input.prop1 = "http://what-is-this"
            //$scope.input.prop2 = "http://what-is-this"

            //download the map indicated by the current id
            $scope.downloadMapDEP = function () {
                let url = `${termServer}/ConceptMap/${$scope.input.id}`
                $http.get(url).then(
                    function (data) {
                        $scope.cm = data.data
                        $timeout(function(){
                            alert("ConceptMap downloaded")
                        },100)

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }


            $scope.uploadMapDEP = function () {
                let url = `${termServer}/ConceptMap/${$scope.cm.id}`
                $http.put(url,$scope.cm).then(
                    function (data) {
                        alert("ConceptMap updated")
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }

            $scope.generateMapAndTranslateDEP = function(){
                $scope.generateMap()
                //========  now the translate call
                $scope.generateTranslate()
            }

            //Generate the ConceptMap
            $scope.generateMapDEP = function() {

                //======== first the concept map
                $scope.cm = {resourceType:"ConceptMap",status:"draft"}
                $scope.cm.id = $scope.input.id
                $scope.cm.url = `http://canshare.co.nz/fhir/ConceptMap/${$scope.input.id}`

                $scope.cm.group = []

                let group = {}
                group.source = snomed
                group.target = snomed
                group.element = []

                $scope.cm.group.push(group)
                let element = {}
                element.code = $scope.input.source
                group.element.push(element)
                element.target = []

                let target = {}
                target.code = $scope.input.target
                target.equivalence = "relatedto"
                target.dependsOn = []
                element.target.push(target)

                let do1 = {}        //first dependency
                if ($scope.input.dep1) {
                    do1.property = $scope.input.prop1
                    do1.system =  snomed
                    do1.value = $scope.input.dep1

                    target.dependsOn.push(do1)
                }

                let do2 = {}        //second dependency
                if ($scope.input.dep2) {
                    do2.property = $scope.input.prop2
                    do2.system =  snomed
                    do2.value = $scope.input.dep2

                    target.dependsOn.push(do2)
                }


            }


            //Generate the example translate parameters
            $scope.generateTranslateDEP = function() {
                $scope.parameters = {resourceType:"Parameters", parameter:[]}

                //the conceptmap url
                $scope.parameters.parameter.push({name:"url",valueUri:`http://canshare.co.nz/fhir/ConceptMap/${$scope.input.id}`})

                //? no code to be translated is needed

                //add the target - what we are looking for. This is in the group.elements.target.code
                let thingWeWant = {system:"http://snomed.info/sct",code:$scope.input.source}
                $scope.parameters.parameter.push({name:"coding",valueCoding:thingWeWant})

                //the dependency
                if ( $scope.input.dep1) {
                    let depParam1 = {name:"dependency",part :[]}
                    $scope.parameters.parameter.push(depParam1)
                    let part1 = {"name":"element","valueUri":$scope.input.prop1}
                    depParam1.part.push(part1)
                    let ccValue = {coding:[{system:snomed,code:$scope.input.dep1}]}
                    let part2 = {"name":"concept","valueCodeableConcept":ccValue}
                    depParam1.part.push(part2)
                }

                if ( $scope.input.dep2) {
                    let depParam2 = {name:"dependency",part :[]}
                    $scope.parameters.parameter.push(depParam2)
                    let part1 = {"name":"element","valueUri":$scope.input.prop2}
                    depParam2.part.push(part1)
                    let ccValue = {coding:[{system:snomed,code:$scope.input.dep2}]}
                    let part2 = {"name":"concept","valueCodeableConcept":ccValue}
                    depParam2.part.push(part2)
                }


            }

            $scope.executeTranslateDEP = function () {
                let url = `${termServer}ConceptMap/$translate`
                console.log($scope.parameters)
                $http.post(url,$scope.parameters).then(
                    function (data) {
                        alert(angular.toJson(data.data))
                        $scope.response = data.data
                    }, function (err) {
                        alert(angular.toJson(err.data))
                        $scope.response = err.data
                    }
                )

            }

            // ========================== end of conceptmap functions ====================

            //$scope.allVSItem = []      //this will be list of Valuesets. todo ?retrieve from server
            //$scope.allVSItem.push({display:"Data Absent Reasons",url:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-data-absent-reason"})


            $scope.vsAnalysis = function () {
                let url = "/analyseVS"
                $http.get(url).then(
                    function (data) {
                        $scope.rawAnalysis = data.data
                        $scope.rawAnalysis.conceptCount = Object.keys($scope.rawAnalysis.conceptVS).length
                    }
                )
            }




            $scope.expandFromAnalysisVS = function (url) {
                delete $scope.expandedVSFromAnalysisVS
                let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedVSFromAnalysisVS = data.data

                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }

            $scope.expandFromAnalysis = function (url) {

                delete $scope.expandedVS
                let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedVSFromAnalysis = data.data
                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
                
            }

            //get the canshare valuesets from the TS
            $scope.showLoadingMessage = true


            querySvc.getValueSets().then(
                function (ar) {
                    $scope.allVSItem = ar
                    //console.log(ar)
                    delete $scope.showLoadingMessage
                }
            )




            $scope.expandVSInTS = function (vs) {
                delete $scope.expandedVS
                let qry = `ValueSet/$expand?url=${vs.url}&_summary=false`

                if ($scope.input.selectedLanguage && $scope.input.selectedLanguage.code) {
                    qry += `&displayLanguage=${$scope.input.selectedLanguage.code} `
                }
                if ($scope.input.filter) {
                    qry += `&filter=${$scope.input.filter}`
                }

                $scope.expandQry = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedVS = data.data
                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            $scope.selectVSItem = function (item) {
                //retrieve the complete VS. we know the id, but we'll still search by url as that's the recommended
                // way to do it, and we want to show the url to the user...
                $scope.selectedItem = item
                delete $scope.expandedVS
                delete $scope.selectedVS
                delete $scope.expandQry
                delete $scope.qUsingVS
                delete $scope.dummyQR

                //let qry = `ValueSet.item.vs.id`
                let qry = `ValueSet?url=${item.vs.url}&_summary=false`
               // qry += "&_summary=false"

                //let qry = `ValueSet/$expand?url=${item.url}&_summary=false`


                console.log(qry)
                $scope.termServerQuery = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                       // $scope.selectedVS = data.data

                        //it's a query so a bundle is expected
                        if (data.data && data.data.entry) {
                            if (data.data.entry.length !== 1) {
                                alert("There were ${} matching ValueSets. This is very likely an issue with duplicated resrces on the terminology server")
                            } else {
                                $scope.selectedVS = data.data.entry[0].resource
                            }
                        } else {
                            alert("The ValueSet was not found")
                        }


                    }, function (err) {
                        console.log(err)
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            function setServer() {
                if ($localStorage.currentServer) {
                    $scope.selectedServer = $localStorage.currentServer
                    $scope.allServers.forEach(function (svr) {
                        if (svr.url == $scope.selectedServer.url) {
                            $scope.svr = svr
                        }
                    })
                } else {
                    $scope.selectedServer = $scope.allServers[0]
                }
            }

            $http.get('/termServers').then(
                function (data) {
                    $scope.allServers = data.data
                    setServer()
                   // $scope.currentServer = 
                }
            )

            $http.get('/searchLibrary').then(
                function (data) {
                    $scope.library = data.data


                }
            )




            //this function is passed into the modal dialog to support the patient lookup query
            //todo - I should be able to do the same thing for bundle versions...
            function search(qry) {
                let deferred = $q.defer()
                let fullQry = `${$scope.selectedServer.url}${qry}`
                console.log(fullQry)
                let encodedQry = encodeURIComponent(fullQry)
                $scope.showWaiting = true
                $http.get(`proxy?qry=${encodedQry}`).then(
                   // $http.get(`/termQuery?qry=${encodedQry}`).then(   //actually, termQuery is not specific to terminology...
                    function (data) {
                       deferred.resolve(data.data)
                    }, function (err) {
                        console.log(err.data)
                        deferred.reject()
                    }
                )
                return deferred.promise
            }

            $scope.executeFromLibrary = function (item) {
              //  if (confirm(`Please confirm you wish to execute the following libray item: ${item.display}`)) {
                    $uibModal.open({
                        backdrop: 'static',      //means can't close by clicking on the backdrop.
                        keyboard: false,       //same as above.
                        templateUrl: 'modalTemplates/makeLibraryQuery.html',
                        controller: 'makeLibraryQueryCtrl',
                        resolve: {
                            item: function () {
                                return item
                            },
                            serverBase : function () {
                                return $scope.selectedServer.url
                            },
                            library : function () {
                                return  $scope.library
                            },
                            search : function () {
                                return search
                            }
                        }
                    }).result.then(
                        function (qry) {
                            $scope.generalQuery = qry
                            $scope.executeGeneralQuery(qry)
                        })
               // }
            }


            $scope.executeFromHistory = function (qry) {
            //    if (confirm(`Please confirm you wish to execute the following query: ${qry}`)) {
                    $scope.executeGeneralQuery(qry)
                    $scope.generalQuery = qry
            //    }
            }

            $scope.removeHistory = function (inx) {
                $localStorage.genHistory.splice(inx,1)
            }

            $scope.trimDisplay = function(str,length) {
                if (str) {
                    if (str.length <= length) {
                        return str
                    } else {
                        str = str.substring(0,length-3) + "..."
                        return str
                    }
                }

            }

            $scope.executeGeneralQuery = function (qry) {
              //  if (confirm(`Please confirm you wisg to execute the following query: ${qry}`)){
                    delete $scope.ooGeneral
                    let fullQry = `${$scope.selectedServer.url}${qry}`

                    let encodedQry = encodeURIComponent(fullQry)
                    $scope.showWaiting = true
                    $http.get(`proxy?qry=${encodedQry}`).then(
                    //$http.get(`/termQuery?qry=${encodedQry}`).then(   //actually, termQuery is not specific to terminology...
                        function (data) {
                            console.log(data.data)

                            $localStorage.genHistory = $localStorage.genHistory || []
                            //save in the local history (no dups)
                            let addToHx = true
                            let ar = $localStorage.genHistory.filter(item => item == qry)
                            if (ar.length == 0) {
                                if ($localStorage.genHistory.length > 20) {
                                    $localStorage.genHistory.splice(9,1)
                                }
                                $localStorage.genHistory.splice(0,0,qry)
                            }




                            $scope.generalBundle = data.data    //a bundle containing all the DR versions
                        }, function (err) {
                            $scope.ooGeneral = err.data
                        }).then(function () {
                            $scope.showWaiting = false
                        }
                    )
             //   }

            }

            $scope.selectServer = function (svr) {
               // $scope.selectedServer = svr
                $localStorage.currentServer = svr //$scope.selectedServer
                setServer()
            }
            
            $scope.vsTypes = []
            $scope.vsTypes.push({display:'clinical T',code:'ct'})
            $scope.vsTypes.push({display:'clinical N',code:'cn'})

            $scope.vsTumourTypes = []
            $scope.vsTumourTypes.push({display:'Breast cancer',code:'breast-cancer'})
            $scope.vsTumourTypes.push({display:'Bowel cancer',code:'bowel-cancer'})

            $scope.selectVS = function (vs) {
                $scope.selectedVS = vs
                delete $scope.vsExpanded
                delete $scope.ooExpand
            }

            //$scope.localStorage = $localStorage

            $scope.expandVS = function (vs,filter) {
                delete $scope.ooExpand
                let qry = `${$scope.selectedServer.url}ValueSet/${vs.id}/$expand`
                if (filter) {
                    qry += `?filter=${filter}`
                }
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`/termQuery?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data.data)
                        $scope.vsExpanded = data.data    //a bundle containing all the DR versions
                    }, function (err) {
                        $scope.ooExpand = err.data
                    }).then(function () {
                        $scope.showWaiting = false
                    }
                )
            }

            $scope.getLastPartOfUrl = function (url) {
                if (url) {
                    let ar = url.split('/')
                    return ar[ar.length-1]
                }

            }

            $scope.findVS = function (type,tumourType,custom) {
                delete $scope.selectedVS
                delete $scope.oo
                delete $scope.vsBundle

                let qry = `${$scope.selectedServer.url}/ValueSet?`
                if (custom) {
                    qry += custom + "&"

                    //add the custom query to the local storage
                    $scope.localStorage.vsQuery = $scope.localStorage.vsQuery || []
                    if ($scope.localStorage.vsQuery.indexOf(custom) == -1) {
                        $scope.localStorage.vsQuery.push(custom)
                    }

                } else {
                    if (type) {
                        qry += `context=${type.code}&`
                    }

                    if (tumourType) {
                        qry += `context=${tumourType.code}&`
                    }
                }


                qry = qry.slice(0,-1)

                $scope.query = qry

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`/termQuery?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data.data)
                        $scope.vsBundle = data.data    //a bundle containing all the DR versions
                    }, function(err) {
                        $scope.oo = err.data
                    }).then(function(){
                    $scope.showWaiting = false
                })

            }


        }
    )