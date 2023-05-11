angular.module("pocApp")
    .controller('queryCtrl',
        function ($scope,$http,$localStorage,$uibModal,$q,$timeout) {

            $scope.localStorage = $localStorage

            $scope.input = {}


            // =============================================== functions to support ConceptMap work =================

            //load the tsv file extracted from the spreadsheet that defines the conceptmaps




            $scope.input.id = "cs-test1"

            $scope.examples = []            //an array of possible values
            let example1 = {display:"Line 16",id:"cs-test16",target:"399687005",dep1:"394803006",prop1:'http://what-is-this'}
            $scope.examples.push(example1)

            let example2 = {display:"Line 18",id:"cs-test16",target:"399687005",dep1:"394803006",prop1:'http://what-is-this',dep2:'372137005',prop2:'http://what-is-this'}
            $scope.examples.push(example2)


            let example3 = {display:"Line 22",id:"cs-test16",target:"253211000210102",source:"512001000004108",dep1:"394803006",prop1:"cancer-service"}
            $scope.examples.push(example3)

            $scope.setExample = function(example) {
                $scope.input.id = example.id
                $scope.input.target = example.target
                $scope.input.source = example.source
                $scope.input.prop1 = example.prop1
                $scope.input.dep1 = example.dep1

                $scope.input.prop2 = example.prop2
                $scope.input.dep2 = example.dep2

                $scope.generateMapAndTranslate()

            }

            $scope.lookup = function (code) {
                let url = `${termServer}CodeSystem/$lookup?system=${snomed}&code=${code}`
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)
                        //alert(data.data)

                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            backdrop: 'static',
                            //size : 'lg',
                            controller: function($scope,parameters){
                                $scope.parameters = parameters
                            },
                            resolve: {
                                parameters: function () {
                                    return data.data
                                }
                            }

                        }).result.then(
                            function (vo) {


                            }
                        )


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }



            let termServer = "https://r4.ontoserver.csiro.au/fhir/"
            let snomed = "http://snomed.info/sct"


            //$scope.input.prop1 = "http://what-is-this"
            //$scope.input.prop2 = "http://what-is-this"

            //download the map indicated by the current id
            $scope.downloadMap = function () {
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


            $scope.uploadMap = function () {
                let url = `${termServer}/ConceptMap/${$scope.cm.id}`
                $http.put(url,$scope.cm).then(
                    function (data) {
                        alert("ConceptMap updated")
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }

            $scope.generateMapAndTranslate = function(){
                $scope.generateMap()
                //========  now the translate call
                $scope.generateTranslate()
            }

            //Generate the ConceptMap
            $scope.generateMap = function() {

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
            $scope.generateTranslate = function() {
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

            $scope.executeTranslate = function () {
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
                if (str.length <= length) {
                    return str
                } else {
                    str = str.substring(0,length-3) + "..."
                    return str
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