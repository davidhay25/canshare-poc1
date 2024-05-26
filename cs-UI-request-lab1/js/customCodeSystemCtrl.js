angular.module("pocApp")
    .controller('customCodeSystemCtrl',
        function ($scope,$http) {

            $scope.input = {}

            $scope.addCustomConcept = function () {
                let concept = {code:$scope.input.newCode,display:$scope.input.newDisplay}
                $scope.model.concepts.push(concept)
                delete $scope.input.newCode
                delete $scope.input.newDisplay
                $scope.generateResources()
            }



            $scope.saveCustomVS = function () {
                let msg = "Are you sure you wish to update this valueSet and CodeSystem"

                if (confirm(msg)) {
                    let qry = '/nzhts/CodeSystem'
                    $http.put(qry,$scope.cs).then(
                        function () {
                            let qry = '/nzhts/ValueSet'
                            $http.put(qry,$scope.vs).then(
                                function (data) {
                                    alert('Both ValueSet and CodeSystem update complete')
                                },function (err) {
                                    alert('The CodeSystem was updated, but not the ValueSet:' + angular.toJson(err.data))
                                }
                            )

                        }, function (err) {
                            console.log(err)
                            alert(`Neither CodeSystem nor ValueSet was updated: ${angular.toJson(err)}`)
                        }
                    )

                }
            }

            $scope.selectCustomVSItem = function (item) {

                let vs = item.vs

                //If we expand the ValueSet, then we can re-create the codesystem

                let qry = `ValueSet/$expand?url=${vs.url}&_summary=false`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {

                        //now we can create the internal model from the expansion
                        let expandedVs = data.data
                        $scope.input.name = vs.name     //the expanded vs doesn't include the vs name etc.
                        $scope.input.title = vs.title
                        $scope.input.description = vs.description
                        $scope.model = {concepts:[]}
                        for (concept of expandedVs.expansion.contains) {
                            delete concept.system       //not needed in the codesystem
                            $scope.model.concepts.push(concept)
                        }


                        $scope.generateResources()

                        $scope.canSetId = false


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            //load all codesystems
            $scope.loadAllVS = function () {
                getValueSets("http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets%7c").then(
                    function (ar) {
                        console.log(ar)
                        $scope.customVS = angular.copy(ar)

                        $scope.customVS.sort(function (a,b) {
                            if (a.vs.meta.lastUpdated > b.vs.meta.lastUpdated) {
                                return -1
                            } else {
                                return 1
                            }

                        })

                    },function (err) {
                        console.log(err)
                    }
                )
            }

            $scope.loadAllVS()

            $scope.newCS = function() {

                $scope.canSetId = true
                delete $scope.input.name
                delete $scope.input.title
                delete $scope.input.description

                $scope.model = {concepts:[],url:"",title:"",description:""}
            }

            $scope.newCS()
            
            $scope.removeCustomConcept = function (inx) {
                $scope.model.concepts.splice(inx,1)
            }

            //generate he CS & VS from the
            $scope.generateResources = function() {
                let name = $scope.input.name
                $scope.cs = {resourceType:"CodeSystem",status:'active'}
                $scope.cs.id = name

                let vsUrl = `https://nzhts.digital.health.nz/fhir/ValueSet/${name}`
                let csUrl = `http://canshare.co.nz/fhir/CodeSystem/${name}`
                $scope.cs.url = csUrl
                let csIdentifier = {system:"http://canshare.co.nz/fhir/NamingSystem/codesystems",value:name}
                $scope.cs.identifier = [csIdentifier]
                $scope.cs.name = name
                $scope.cs.title = $scope.input.title
                $scope.cs.description = $scope.input.description
                $scope.cs.valueSet = vsUrl
                $scope.cs.content = "complete"
                $scope.cs.caseSensitive = true
                $scope.cs.publisher = "Te Aho o Te Kahu"
                $scope.cs.contact = [{telecom:[{system:'email',value:'info@teaho.govt.nz'}]}]
                $scope.cs.concept = $scope.model.concepts


                $scope.vs = {resourceType:"ValueSet",status:'active'}
                $scope.vs.id = name
                $scope.vs.url = vsUrl
                //$scope.vs.contained = [$scope.cs]

                //this identifier will have the ValueSet appear in the main list
                let vsIdentifier = {system:"http://canshare.co.nz/fhir/NamingSystem/valuesets",value:name}
                $scope.vs.identifier = [vsIdentifier]

                //this identifier indicates that it is a non-snomed VS
                let vsCustomIdentifier = {system:"http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets",value:name}
                $scope.vs.identifier.push(vsCustomIdentifier)

                $scope.vs.name = name
                $scope.vs.title = $scope.input.title
                $scope.vs.description = $scope.input.description
                $scope.vs.publisher = "Te Aho o Te Kahu"
                $scope.vs.contact = [{telecom:[{system:'email',value:'info@teaho.govt.nz'}]}]
                $scope.vs.compose = {include:[{system:csUrl}]}


               // $scope.model.concepts.forEach(function (concept) {

              //  })




                }

        })