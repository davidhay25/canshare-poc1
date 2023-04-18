angular.module("pocApp")
    .controller('makeLibraryQueryCtrl',
        function ($scope,item,serverBase,$http,library,search) {

            $scope.item = item
            //let url = item.url      //the query with templetes
            $scope.library = library
            //which placeholders need to be filled
            if (item.url.indexOf("{patientid}") > -1) {
                $scope.showPatientSelector = true
            }

            if (item.url.indexOf("{identifier}") > -1) {
                $scope.showIdentifier = true
            }

            $scope.setSystem = function (system) {
                $scope.identifierSystem = system.value
                $scope.fillTemplate()
            }

            $scope.getName = function (patient) {
                let name = patient.name[0]
                let display = ""
                if (name) {
                    if (name.text) {
                        display = name.text || ""
                    } else {
                        if (name.given) {
                            display += name.given
                        }
                        display += name.family || ""
                    }

                }
                return display
            }
            $scope.findPatient = function (system,value,name) {
                let qry="identifier="
                if (system) {
                    qry  += system + "|"
                }
                if (value) {
                    qry += value
                }
                if (name) {
                    if (qry == 'identifier=') {
                        qry = `name=${name}`
                    } else {
                        qry += `&name=${name}`
                    }
                }

                qry = "Patient?" + qry

                //use the query function that was passed in to pefrom the search
                search(qry).then(
                    function (bundle) {
                        console.log(bundle)
                        $scope.patientsBundle = bundle
                    }
                )

            }

            //called when a patient is selected
            $scope.selectPatient = function (patient) {
                $scope.fillTemplate()   //in case there is an identifier too
                $scope.query =  $scope.query.replace('{patientid}',patient.id)
            }
            
            $scope.fillTemplate = function () {
                $scope.query = item.url
                if ($scope.showIdentifier) {
                    //fill in the identifier from the current entries
                    let identifier=""
                    if ($scope.identifierSystem) {
                        identifier = $scope.identifierSystem + "|"
                    }
                    if ($scope.identifierValue) {
                        identifier += $scope.identifierValue
                    }

                    $scope.query =  $scope.query.replace('{identifier}',identifier)
                }
            }

            $scope.execute = function(){
                $scope.$close($scope.query)
            }

        }
    )