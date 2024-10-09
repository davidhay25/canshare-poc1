angular.module("pocApp")
    .controller('customCodeSystemCtrl',
        function ($scope,$http) {

            $scope.input = {}

            $scope.ccDirty = false

            $scope.addCustomConcept = function () {
                let concept = {code:$scope.input.newCode,display:$scope.input.newDisplay}
                $scope.model.concepts.push(concept)
                delete $scope.input.newCode
                delete $scope.input.newDisplay

                $scope.generateResources()
            }

            $scope.removeCustomConcept = function (inx) {
                $scope.model.concepts.splice(inx,1)
                $scope.ccDirty = true
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
                                    $scope.ccDirty = false
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
                $scope.ccDirty = false
                $scope.selectedCsItem = item

                //If we expand the ValueSet, then we can re-create the codesystem
                //let qry = `ValueSet/$expand?url=${vs.url}&_summary=false`
                let qry = `ValueSet/$expand?url=${vs.url}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {

                        //now we can create the internal model from the expansion
                        let expandedVs = data.data
                        $scope.input.name = vs.id || vs.name.replace(/_/g,'-')     //the expanded vs doesn't include the vs name etc.
                        $scope.input.status = vs.status
                        $scope.input.title = vs.title
                        $scope.input.description = vs.description
                        $scope.model = {concepts:[]}
                        for (const concept of expandedVs.expansion.contains) {
                            delete concept.system       //not needed in the codesystem
                            $scope.model.concepts.push(concept)
                        }


                        $scope.generateResources()
                        $scope.ccDirty = false      //is set by generate resources

                       // $scope.canSetId = false


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
                let qry = `ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets%7c&_sort=title&_count=5000&_summary=false`
                console.log(qry)
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let bundle = data.data
                        if (bundle && bundle.entry) {
                            $scope.customVS = []
                            bundle.entry.forEach(function (entry) {
                                let item = {vs:entry.resource}
                                item.display = entry.resource.title || entry.resource.name

                                $scope.customVS.push(item)
                            })
                        }
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }

                    )

            }

            $scope.loadAllVS()

            $scope.newCS = function() {

                let msg = "Id of ValueSet (will become part of  url)"
                let newName = prompt(msg)
                if (newName) {
                    //$scope.canSetId = true
                    if (newName.indexOf(" ") > -1 || newName.indexOf('_') > -1) {
                        alert("Spaces and underscore not allowed")
                        return
                    }

                    let url = `https://nzhts.digital.health.nz/fhir/ValueSet/${newName}`
                    let qry = `ValueSet?url=${url}`
                    console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let bundle = data.data
                            if (bundle.entry && bundle.entry.length > 0) {
                                alert("This name has already been used")
                                return
                            }


                            //This will be a new valueset & codesystem
                            $scope.input.name = newName
                            delete $scope.input.title
                            delete $scope.input.description

                            $scope.model = {concepts:[],url:"",title:"",description:""}


                        }, function (err) {
                            alert("Error: " + angular.toJson(err))
                        }
                    )

                    //check the VS doesn't a;ready exist



                }


            }


            


            //generate he CS & VS from the
            $scope.generateResources = function() {

                let da = new Date().toISOString()
                let ar = da.split('T')
                let dateString = ar[0]
                let versionString = dateString.replace(/-/g, "");

                let status = $scope.input.status || 'active'


                $scope.ccDirty = true
                let name = $scope.input.name.replace(/_/g,'-')

                $scope.cs = {resourceType:"CodeSystem",status:status}
                $scope.cs.id = name       //can't have underscore in an id

                let vsUrl = `https://nzhts.digital.health.nz/fhir/ValueSet/${name}`
                let csUrl = `http://canshare.co.nz/fhir/CodeSystem/${name}`
                $scope.cs.url = csUrl
                $scope.cs.version = versionString
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




                $scope.vs = {resourceType:"ValueSet",status:status}
                $scope.vs.id = name
                $scope.vs.url = vsUrl
                $scope.vs.version = versionString
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