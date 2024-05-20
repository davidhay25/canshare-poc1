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


            $scope.newCS = function() {
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

                let vsUrl = `https://nzhts.digital.health.nz/fhir/ValueSet/canshare-${name}`
                let csUrl = `http://canshare.co.nz/fhir/CodeSystem/${name}`
                $scope.cs.url = csUrl
                let csIdentifier = {system:"http://canshare.co.nz/fhir/NamingSystem/codesystems",value:name}
                $scope.cs.identifier = [csIdentifier]
                $scope.cs.name = name
                $scope.cs.title = $scope.input.title
                $scope.cs.description = $scope.input.description
                $scope.cs.valueSet = vsUrl
                $scope.cs.content = "complete"
                $scope.cs.publisher = "Te Aho o Te Kahu"
                $scope.cs.contact = [{telecom:[{system:'email',value:'info@teaho.govt.nz'}]}]
                $scope.cs.concept = $scope.model.concepts



                $scope.vs = {resourceType:"ValueSet",status:'active'}
                $scope.vs.url = vsUrl
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