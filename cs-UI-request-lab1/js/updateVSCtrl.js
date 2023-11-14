angular.module("pocApp")
    .controller('updateCtrl',
        function ($scope,$http,$uibModal,$q) {

            $scope.input = {}
            $scope.isDirty = false;
            let nzDisplayLanguage = "en-x-sctlang-23162100-0210105"
            let snomed = "http://snomed.info/sct"
            let versionEcl = "http://snomed.info/sct/21000210109"      //the version that has the ECL statements

            //http://snomed.info/sct/21000210109
            let versionPrePub = "http://snomed.info/xsct/21000210109"  //the version that has concepts not yet published


            //retrieve ValueSets
            getValueSets = function () {
                //return a list of subsetted canshare valuesets

                let deferred = $q.defer()

                let qry = `ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c&_sort=title`
                //let qry = `ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c&status=${status}&_sort=title`
                console.log(qry)
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let bundle = data.data
                        if (bundle && bundle.entry) {
                            let ar = []
                            bundle.entry.forEach(function (entry) {
                                let item = {vs:entry.resource}
                                item.display = entry.resource.title || entry.resource.name

                                ar.push(item)
                            })
                            deferred.resolve(ar)
                        }
                    }, function (err) {
                        console.log(err)
                        deferred.reject(err)
                    }
                )

                return deferred.promise
            }

            getValueSets().then(
                function (ar) {
                    $scope.allVSItem = ar
                    //console.log(ar)
                    delete $scope.showLoadingMessage
                }
            )

            //add a concept to the
            $scope.addPPConcept = function () {

                $scope.input.prePubConcepts = $scope.input.prePubConcepts || []
                let concept = {code:$scope.input.newPPCode,display:$scope.input.newPPDisplay}
                $scope.input.prePubConcepts.push(concept)
                delete $scope.input.newPPCode
                delete $scope.input.newPPDisplay
                $scope.makeVS()
            }

            $scope.removePPConcept = function (inx) {
                $scope.input.prePubConcepts.splice(inx,1)
                $scope.makeVS()

            }

            $scope.checkNewVS = function (id) {
                let ok = true
                for (const item of $scope.allVSItem ) {
                    if (item.vs.id == id) {
                        ok = false
                        alert("This id has already been used")
                        delete $scope.input.id
                        break
                    }
                }
                if (ok) {
                    makeVS()
                }
            }

            function performUpdate(vs) {
                let qry = '/nzhts/ValueSet'
                $http.put(qry,vs).then(
                    function (data) {
                        alert('Update complete')
                        $scope.isDirty = false
                    }, function (err) {
                        alert(angular.toJson(err))
                    }
                )
            }

            $scope.updateVS = function (vs) {
                if (confirm("Are you sure you wish to update this valueSet")) {
                    performUpdate($scope.selectedVS)

                }
            }

            $scope.newVS = function () {
                if (confirm("Are you sure you wish to create this valueSet")) {
                    performUpdate($scope.selectedVS)
                }
                //alert("Not quite yet...")
            }

            $scope.createNew = function () {
                $scope.isNew = true
                delete $scope.input.id
                delete $scope.input.title
                delete $scope.input.description
                delete $scope.input.ecl
                $scope.input.status = 'active'

                $scope.makeVS()

            }

            $scope.testECL = function (ecl) {

                let encodedEcl = encodeURIComponent(ecl)
                $http.get(`nzhts/ecl?qry=${encodedEcl}`).then(
                    function (data) {
                        $scope.textEclVS = data.data

                    }, function (err) {
                        console.log(err)
                    })


                //fhir_vs=ecl/[ecl] - all concept ids that match the supplied (URI-encoded) expression constraint
            }

            $scope.canSave = function () {
                return $scope.input.id && $scope.input.title && $scope.input.description &&
                    $scope.input.ecl && $scope.isDirty
            }

            //whether to show a particular VS
            $scope.showVS = function (item) {

                if ($scope.input.onlyRetired) {
                    if (item.vs.status == 'retired') {
                        return true
                    }
                } else {
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




            }


            //parse the contents of the VS into the scope values
            function parseVS(vs) {
                delete $scope.parseError
                $scope.input.status = vs.status
                $scope.input.id = vs.id
                $scope.input.title = vs.title
                $scope.input.description = vs.description

                //there are now potentially 2 include statements
                   //system = http://snomed.info/sct, version = https://snomed.info/sct/21000210109 and a filter
                if (vs.compose && vs.compose.include) {
                    vs.compose.include.forEach(function (inc) {
                        let system = inc.system
                        let version = inc.version
                        let identified = false
                        if (system == snomed && version == versionEcl) {
                            //this is the main ecl statement
                            //$scope.input.ecl = vs.compose.include[0].filter[0].value
                            $scope.input.ecl = inc.filter[0].value
                        } else if(system == snomed && version == versionPrePub) {
                            //these are separate concepts
                            $scope.input.prePubConcepts = inc.concept
                        } else {
                            $scope.parseError = true
                            alert(`Unknown include. system:${system}, version:${version}`)
                        }

                    })
                }

            }

            $scope.selectVSItem = function (item) {
                $scope.isDirty = false
                delete $scope.textEclVS
                //retrieve the complete VS. we know the id, but we'll still search by url as that's the recommended
                // way to do it, and we want to show the url to the user...
                $scope.isNew = false
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
                                alert("There were ${data.data.entry.length} matching ValueSets. This is very likely an issue with duplicated resources on the terminology server")
                            } else {
                                $scope.selectedVS = data.data.entry[0].resource
                                parseVS($scope.selectedVS)
                                console.log($scope.selectedVS)
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


            $scope.makeVS = function () {
                let vo = {id:$scope.input.id,
                    title:$scope.input.title,
                    status : $scope.input.status,
                    description:$scope.input.description,
                    prePubConcepts: $scope.input.prePubConcepts,
                    ecl:$scope.input.ecl}
                $scope.selectedVS = makeVSFromVo(vo)
                $scope.isDirty = true
            }

            $scope.expandVSInTS = function (vs) {
                delete $scope.expandedVS
                let qry = `ValueSet/$expand?url=${vs.url}&_summary=false&displayLanguage=${nzDisplayLanguage}`

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
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }


            //The display for a concept code. Used when adding pre-published codes
            $scope.getDisplay = function (code) {

                let qry = `CodeSystem/$lookup?system=${snomed}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let paramResource = data.data
                        if (paramResource.parameter) {
                            for (const param of paramResource.parameter) {
                                if (param.name == 'display') {
                                    $scope.input.newPPDisplay = param.valueString
                                    break
                                }
                            }
                        }
                    }, function (err) {
                        delete $scope.input.newPPDisplay
                        alert("concept not found")
                    }
                ).finally(function(){
                        $scope.showWaiting = false
                    })

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


            function makeVSFromVo(vo) {
                let vs = {resourceType:"ValueSet",id:vo.id}
                vs.language = "en-x-sctlang-23162100-0210105"
                vs.url = `https://nzhts.digital.health.nz/fhir/ValueSet/${vo.id}`
                vs.status = vo.status
                vs.date = "2023-11-01"
                vs.name = vo.id
                vs.title = vo.title
                vs.experimental = false
                vs.version = "20231101"
                vs.identifier = [{system:"http://canshare.co.nz/fhir/NamingSystem/valuesets",value:vo.id}]
                vs.publisher = "Te Aho o Te Kahu"
                vs.contact = [{telecom:[{system:"email",value:"info@teaho.govt.nz"}]}]
                if (vo.description) {
                    vs.description = vo.description
                }


                //This is the main ECL part of the VS
                let filter = {property:"constraint",op:"=",value:`${vo.ecl}`}
                let include = {system:snomed,version:versionEcl,filter:[filter]}
                vs.compose = {include:[include]}

                if (vo.prePubConcepts && vo.prePubConcepts.length > 0) {
                    //These are concepts directly added to the VS that are in the publishing env. but not the main env.
                    let ppInclude = {system:snomed,version:versionPrePub,concept:[]}
                    vo.prePubConcepts.forEach(function (concept) {
                        ppInclude.concept.push(concept)
                    })
                    vs.compose.include.push(ppInclude)

                }

                return vs
            }

            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {
                // console.log('auth state change')
                if (user) {
                    $scope.user = {email:user.email,displayName : user.displayName}
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



        }
    )