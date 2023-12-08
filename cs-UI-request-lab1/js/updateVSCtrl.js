angular.module("pocApp")
    .controller('updateCtrl',
        function ($scope,$http,$uibModal,$q,updateVSSvc) {

            $scope.input = {}
            $scope.isDirty = false;
            let nzDisplayLanguage = "en-x-sctlang-23162100-0210105"
            let snomed = "http://snomed.info/sct"

            //the version is used to identify which include section is used for which purpose
            // >>>>>>>> this approach won't work any more to discriminate between the
            //different include elements - but I'll keep them as separate versions in case we need them to be different
            let versionEcl = "http://snomed.info/sct/21000210109"      //the version that has the ECL statements
            let versionDirect = "http://snomed.info/sct/21000210109"             //concepts directly included in the VS. Often changing the display
            let versionPrePub = "http://snomed.info/sct/21000210109"  //the version that has concepts not yet published


            //get the CodeSystem used for pre published codes
            updateVSSvc.getCodeSystem().then(
                function (cs) {
                    $scope.prepubCS = cs
                }, function (err) {
                    alert(err)
                }
            )


            //an extension that describes the type of concept when directly included in the VS
            //So I can split them up in the UI
            //code - values: 'prepub' (pre published) 'display' (changing the display)
         //   let extUrl = "http://canshare.co.nz/fhir/StructureDefinition/concept-type"

            /*
            //get the type of the concept - from the extension. values 'prepub' and 'display'
            function getConceptType(el) {
                let code
                if (el.extension) {
                    el.extension.forEach(function (ext) {
                        if (ext.url == extUrl) {
                            code = ext.valueCode
                        }

                    })
                }
                return code
            }

            //set the concept type = 'prepub' and 'display'
            //right now we can assume that this will be the only extension we use.
            function setConceptType(el,type) {
                //If there's already an extension on this element then just remve it
                if (el.extension) {
                    el.extension.length = 0
                } else {
                    el.extension = []
                }

                let ext = {url:extUrl,valueCode:type}
                el.extension.push(ext)
            }


            */

            //retrieve ValueSets
            getValueSets = function () {
                //return a list of subsetted canshare valuesets

                let deferred = $q.defer()

                let qry = `ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c&_sort=title`

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



            //add a concept to the list directly included in the VS. In an include section with the version 'versionDirect'
            $scope.addDirectConcept = function () {

                $scope.input.directConcepts = $scope.input.directConcepts || []
                let concept = {code:$scope.input.newDirectCode,display:$scope.input.newDirectDisplay}
                updateVSSvc.setConceptType(concept,'display') //adds the concepttype extension

                $scope.input.directConcepts.push(concept)
                delete $scope.input.newDirectCode
                delete $scope.input.newDirectDisplay
                $scope.makeVS()
            }

            $scope.removeDirectConcept = function (inx) {
                $scope.input.directConcepts.splice(inx,1)
                $scope.makeVS()

            }


            //add a concept to the list of pre-published items
            $scope.addPPConcept = function () {

                $scope.input.prePubConcepts = $scope.input.prePubConcepts || []
                let concept = {code:$scope.input.newPPCode,display:$scope.input.newPPDisplay}
                updateVSSvc.setConceptType(concept,'prepub') //adds the concepttype extension
                $scope.input.prePubConcepts.push(concept)
                if (updateVSSvc.addConceptToCodeSystem( $scope.prepubCS,concept)) {
                    $scope.csDirty = true
                }
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

                        if ($scope.csDirty) {
                            updateVSSvc.updateCodeSystem($scope.prepubCS).then(
                                function () {
                                    $scope.csDirty = false
                                    alert('Both ValueSet and CodeSystem update complete')

                                }, function (err) {
                                    console.log(err)
                                    alert(`The ValueSet was updated, but not the CodeSystem: ${angular.toJson(err)}`)
                                }
                            )

                        } else {
                            alert('ValueSet update complete')
                        }


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

                //there are now potentially 3 include statements
                //ecl: system = http://snomed.info/sct, version = https://snomed.info/sct/21000210109 and a filter element
                //direct:


                if (vs.compose && vs.compose.include) {

                    vs.compose.include.forEach(function (inc) {
                        let system = inc.system
                        let version = inc.version
                        let identified = false

                        //if the include has a filter, then it's the ecl. Otherwise it's a diect concept

                        if (system == snomed) {
                            if (inc.filter) {
                                //this is the ecl
                                $scope.input.ecl = inc.filter[0].value
                            } else if (inc.concept) {
                                //these are directly included concepts
                                inc.concept.forEach(function (concept) {
                                    let type = updateVSSvc.getConceptType(concept)  //

                                    type = type || 'display'    //<<< todo as can't remove otherwise

                                    switch (type) {
                                        case 'prepub' :
                                            //a concept not yet published
                                            $scope.input.prepubConcepts = $scope.input.prepubConcepts || []
                                            $scope.input.prepubConcepts.push(concept)
                                            break
                                        case 'display' :
                                            //included so a different display can be added
                                            $scope.input.directConcepts = $scope.input.directConcepts || []
                                            $scope.input.directConcepts.push(concept)
                                            break
                                        default :
                                            alert(`Unknown concept type: ${type}`)


                                    }

                                })
                            } else {
                                alert(`Unknown include element: ${angular.toJson(inc)}`)
                            }

                        } else {
                            alert("Non snomed code in the VS. Are you sure of this?")
                        }


                        /*
                        if (system == snomed && version == versionEcl) {
                            //this is the main ecl statement
                            $scope.input.ecl = inc.filter[0].value
                        } else if(system == snomed && version == versionPrePub) {
                            //these are pre-published concepts
                            $scope.input.prePubConcepts = inc.concept
                        } else if(system == snomed && version == versionDirect) {
                            //these are direct concepts
                            $scope.input.directConcepts = inc.concept
                        } else {
                            $scope.parseError = true
                            alert(`Unknown include. system:${system}, version:${version}`)
                        }

                        */

                    })
                }

            }

            //When a ValueSet is selected from the list
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


                let qry = `ValueSet?url=${item.vs.url}&_summary=false`

                console.log(qry)
                $scope.termServerQuery = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
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
                    directConcepts: $scope.input.directConcepts,
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
            $scope.getDisplay = function (code,control) {

                let qry = `CodeSystem/$lookup?system=${snomed}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let paramResource = data.data
                        if (paramResource.parameter) {
                            for (const param of paramResource.parameter) {
                                if (param.name == 'display') {
                                    $scope.input[control] = param.valueString
                                    //$scope.input.newPPDisplay = param.valueString

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

                let da = new Date().toISOString()
                let ar = da.split('T')
                let dateString = ar[0]
                let versionString = dateString.replace(/-/g, "");

                let vs = {resourceType:"ValueSet",id:vo.id}
                vs.language = "en-x-sctlang-23162100-0210105"
                vs.url = `https://nzhts.digital.health.nz/fhir/ValueSet/${vo.id}`
                vs.status = vo.status
                vs.date = dateString
                vs.name = vo.id
                vs.title = vo.title
                vs.experimental = false
                vs.version = versionString
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

                if (vo.directConcepts && vo.directConcepts.length > 0) {
                    //These are concepts directly added to the VS that are in the publishing env. but not the main env.
                    //let directInclude = {system:snomed,version:versionDirect,concept:[]}
                    let directInclude = {system:snomed,concept:[]}
                    vo.directConcepts.forEach(function (concept) {
                        directInclude.concept.push(concept)
                    })
                    vs.compose.include.push(directInclude)

                }

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