angular.module("pocApp")
    .controller('uploadCmCtrl',
        function ($scope,$http) {


            $scope.cmUpload = {}

            $scope.parseUCM = function () {

                try {
                    $scope.cmUpload = angular.fromJson($scope.input.cmJson)
                    $scope.cmUpload.experimental = true     //default experimantal = don't syndicate

                    //delete any supplied id - the user needs to supply this
                    delete $scope.cmUpload.id

                    //The source CS is kept separate as it is checked at save time as well as when entered...
                    //this is because it *might* be present in the CM
                    //note that we're assuming the target CS is OK...
                    if ($scope.cmUpload.group && $scope.cmUpload.group.length > 0) {
                        $scope.input.sourceCS = $scope.cmUpload.group[0].source

                    } else {
                        alert("There must be at least one Group element in the CM (We only look at the first)")
                        delete  $scope.cmUpload
                    }

                } catch (ex) {
                    alert("Not valid Json")
                }

            }

            //set the url and identifier
            $scope.setUrl = function (id) {
                delete $scope.message
                delete $scope.exists
                $scope.cmUpload.url = `http://canshare.co.nz/fhir/ConceptMap/${id}`
                let identifier = {system:'http://canshare.co.nz/fhir/NamingSystem/conceptmaps-analytics',value:id}
                $scope.cmUpload.identifier = identifier     //single identifier only

                let qry = `/nzhts/ConceptMap/${id}`
                $http.get(qry).then(
                    function (data) {
                        $scope.message = "This ConceptMap already exists and will be updated"
                        $scope.exists = true
                    }, function (err) {
                        if (err.status == 404) {
                            $scope.message = "This is a new ConceptMap and will be created"
                        } else {
                            alert('Server error:' + angular.toJson(err.data))
                        }
                    }
                )

            }



            //check that the url represents a valid CodeSystem (exists on the server)
            let checkCSExists = function (url,cb) {

                let qry = `CodeSystem?url=${url}`
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        if (data.data && data.data.entry && data.data.entry.length > 0) {
                            cb(true)
                        }
                    }, function () {
                        cb(false)
                    }
                )
            }

            //used when entering a source CodeSystem url
            $scope.checkCS = function (url) {
                checkCSExists(url,function (found) {
                    if (! found) {
                        alert(`There was no CodeSystem found with the url ${url}`)
                    }
                })
            }

            //construct the url and identifier based on the id
            $scope.uploadUCM = function (id) {
                if (confirm("Are you sure you wish to upload this ConceptMap")) {

                    //check that the source CodeSystem exists
                    let url = $scope.input.sourceCS
                    checkCSExists(url,function (found) {
                        if (found) {
                            //can save. Set the source in the first group. Note that we check when parsing that there is a group
                            $scope.cmUpload.group[0].source = url

                            let qry = `/nzhts/ConceptMap/${id}`
                            console.log($scope.cmUpload)
                            $http.put(qry,$scope.cmUpload).then(
                                function () {
                                    alert("ConceptMap has been uploaded")
                                    $scope.getAnalyticsConceptMaps()    //update the main list
                                }, function (err) {
                                    alert(`There was an error: ${angular.toJson(err)}`)
                                }
                            )
                        } else {
                            //Can't save CM
                            alert(`There was no CodeSystem found with the url ${url} in the source system. Please update and try again.`)
                        }

                    })




                }

            }


        }
    )