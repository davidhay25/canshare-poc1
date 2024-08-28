angular.module("pocApp")
    .controller('updateCtrl',
        function ($scope,$http,$uibModal,$q,updateVSSvc,utilsSvc) {

            $scope.version = utilsSvc.getVersion()

            $scope.input = {}
            $scope.isDirty = false;
            let nzDisplayLanguage = "en-x-sctlang-23162100-0210105"
            let snomed = "http://snomed.info/sct"

            //let extMemberCount = "http://canshare.co.nz/fhir/StructureDefinition/vs-expanded-count"

            //the version is used to identify which include section is used for which purpose
            // >>>>>>>> this approach won't work any more to discriminate between the
            //different include elements - but I'll keep them as separate versions in case we need them to be different
            let versionEcl = "http://snomed.info/sct/21000210109"      //the version that has the ECL statements

            //the url for the unpublished concepts. this will be the system value in the valueset,
            //and the url for the CodeSystem
            let systemPrePub = "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished"
            let csId = "canshare-unpublished-concepts"   //the id for the CodeSystem


            //get the CodeSystem used for pre published codes
            updateVSSvc.getCodeSystem(csId,systemPrePub).then(
                function (cs) {
                    $scope.prePubCS = cs

                    //there was a validation issue with the CodeSystem so we're fixing them here.
                    //$scope.prePubCS.name = "Canshare_unpublished_concepts"
                    //$scope.prePubCS.caseSensitive = true


                }, function (err) {
                    alert(err)
                }
            )


            $scope.executeBespoke = function (qry) {
                let encodedQry = encodeURIComponent(qry)
                let fullQry = `/nzhts?qry=${encodedQry}`
                $http.get(fullQry).then(
                    function (data) {
                        console.log(data)
                    },function () {

                    }
                )

            }




            //retrieve all ValueSets
            getValueSets = function (identifier) {
                //return a list of subsetted canshare valuesets
                identifier = identifier || "http://canshare.co.nz/fhir/NamingSystem/valuesets%7c"

                let deferred = $q.defer()

                let qry = `ValueSet?identifier=${identifier}&_sort=title&_count=5000&_summary=false`
                console.log(qry)
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let bundle = data.data
                        if (bundle && bundle.entry) {
                            let ar = []
                            bundle.entry.forEach(function (entry) {
                                //let vs = entry.resp

                                //we don't want non-snomed in this list
                                //"http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets
                                let vs = entry.resource
                                let canInclude = true
                                for (const identifier of entry.resource.identifier) {
                                    if (identifier.system == "http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets") {
                                        canInclude = false
                                    }
                                }

                                if (canInclude) {
                                    let item = {vs:entry.resource}
                                    item.display = entry.resource.title || entry.resource.name
                                    //item.lastUpdated = new Date(entry.resource.meta.lastUpdated)
                                    ar.push(item)
                                }



                            })

                            deferred.resolve(ar)
                        } else {
                            deferred.resolve([])
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

                    //create download
                    let download = updateVSSvc.makeDownload($scope.allVSItem)

                    $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([download ],{type:"text/tsv"}))
                    $scope.downloadLinkCsvName = `allValueSets.tsv`

                    //console.log(ar)
                    delete $scope.showLoadingMessage

                    //create sorted list by last update
                    $scope.sortedVS = angular.copy(ar)

                    $scope.sortedVS.sort(function (a,b) {
                        if (a.vs.meta.lastUpdated > b.vs.meta.lastUpdated) {
                            return -1
                        } else {
                            return 1
                        }

                    })

                }
            )



            //add a concept to the list directly included in the VS. In an include section with the snomed system
            $scope.addDisplayConcept = function () {

                $scope.input.displayConcepts = $scope.input.displayConcepts || []
                let concept = {code:$scope.input.newDisplayCode,display:$scope.input.newDisplayDisplay}
               // updateVSSvc.setConceptType(concept,'display') //adds the concepttype extension

                $scope.input.displayConcepts.push(concept)
                delete $scope.input.newDisplayCode
                delete $scope.input.newDisplayDisplay
                $scope.makeVS()
            }

            $scope.removeDisplayConcept = function (inx) {
                $scope.input.displayConcepts.splice(inx,1)
                $scope.makeVS()

            }


            //add a concept to the list of pre-published items
            $scope.addPPConcept = function () {

                $scope.input.prePubConcepts = $scope.input.prePubConcepts || []
                let concept = {code:$scope.input.newPPCode, display:$scope.input.newPPDisplay}
               // updateVSSvc.setConceptType(concept,'prepub') //adds the concepttype extension
                $scope.input.prePubConcepts.push(concept)

                if (updateVSSvc.addConceptToCodeSystem( $scope.prePubCS,concept)) {
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

                //Update the CodeSystem then the ValueSet...

                updateVSSvc.updateCodeSystem($scope.prePubCS,$scope.csDirty).then(
                    function () {
                        $scope.csDirty = false
                        let qry = '/nzhts/ValueSet'
                        $http.put(qry,vs).then(
                            function (data) {
                                if (! $scope.csDirty) {
                                    alert('ValueSet update complete')
                                } else {
                                    alert('Both ValueSet and CodeSystem update complete')
                                }


                            },function (err) {
                                alert('The CodeSystem was updated, but not the ValueSet:' + angular.toJson(err.data))
                            }
                        )



                    }, function (err) {
                        console.log(err)
                        alert(`Neither CodeSystem nor ValueSet were updated: ${angular.toJson(err)}`)
                    }
                )


            }

            //called by the 'Update VS button
            $scope.updateVS = function (vs) {
                let msg = "Are you sure you wish to update this valueSet"
                if ($scope.csDirty) {
                    msg += " and CodeSystem"
                }
                if (confirm(msg)) {

                    console.log(angular.toJson($scope.selectedVS,null,2))



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
                delete $scope.input.displayConcepts

                delete $scope.expandedVS
                delete $scope.selectedVS
                delete $scope.expandQry
                delete $scope.qUsingVS
                //delete $scope.dummyQR
                delete $scope.input.prePubConcepts




                $scope.input.status = 'active'

                $scope.makeVS()

                $scope.input.mainTabActive = 0      //select the detail tab

            }

            $scope.testECL = function (ecl) {

                let vo = {ecl:ecl}


                $http.post(`nzhts/ecl`,vo).then(
                    function (data) {
                        $scope.textEclVS = data.data

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    })



            }

            $scope.canSave = function () {
                return $scope.input.id && $scope.input.title && $scope.input.description &&
                    $scope.input.ecl && $scope.isDirty
            }

            //whether to show a particular VS
            $scope.showVS = function (item) {

                if (! $scope.input.includeRetired) {
                    if (item.vs.status == 'retired') {
                        return false
                    }
                }

                let filter = $scope.input.filterlist
                if (! filter) {
                    return true
                }

                if ((item.display.toLowerCase().indexOf(filter.toLowerCase()) > -1) ||
                    (item.vs.id.toLowerCase().indexOf(filter.toLowerCase()) > -1)) {

                    return true
                } else {
                    return false
                }

/*
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
                */

            }


            //parse the contents of the VS into the scope values
            function parseVS(vs) {
                delete $scope.parseError
                $scope.input.status = vs.status
                $scope.input.id = vs.id
                $scope.input.title = vs.title
                $scope.input.description = vs.description

                delete $scope.input.displayConcepts
                delete $scope.input.prePubConcepts
                delete $scope.input.ecl


                //there are now potentially 3 include statements
                //ecl: system = http://snomed.info/sct, version = https://snomed.info/sct/21000210109 and a filter element
                //direct:


                if (vs.compose && vs.compose.include) {

                    vs.compose.include.forEach(function (inc) {
                        let system = inc.system
                        let version = inc.version
                        let identified = false

                        //if the include has a filter, then it's the ecl. Otherwise it's a diect concept
                        if (inc.filter) {
                            //this is the ecl
                            $scope.input.ecl = inc.filter[0].value
                        } else if (inc.concept) {
                            //these are directly included concepts might be display or pre-pub (unpublished)
                            inc.concept.forEach(function (concept) {
                                //if the system is snomed, then it is display - otherwise pre-pub
                                if (inc.system == snomed) {
                                    $scope.input.displayConcepts = $scope.input.displayConcepts || []
                                    $scope.input.displayConcepts.push(concept)
                                } else {
                                    $scope.input.prePubConcepts = $scope.input.prePubConcepts || []
                                    $scope.input.prePubConcepts.push(concept)
                                }



                            })
                        } else {
                            alert(`Unknown include element: ${angular.toJson(inc)}`)
                        }

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
                delete $scope.bundleVersions
                delete $scope.selectedVersion
                //delete $scope.dummyQR
                delete $scope.input.prePubConcepts
                delete $scope.input.displayConcepts

                let qry = `ValueSet?url=${item.vs.url}&_summary=false`

                $scope.input.mainTabActive = 0      //select the detail tab

                console.log(qry)
                $scope.termServerQuery = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        //it's a query so a bundle is expected
                        if (data.data && data.data.entry) {
                            if (data.data.entry.length !== 1) {
                                alert(`There were ${data.data.entry.length} matching ValueSets with the url ${item.vs.url}. This is very likely an issue with duplicated resources on the terminology server`)
                            } else {
                                $scope.selectedVS = data.data.entry[0].resource
                                parseVS($scope.selectedVS)

                                //if there's no member count, then get it
                                if (! updateVSSvc.getMemberCount($scope.selectedVS)) {
                                    $scope.updateMemberCount($scope.selectedVS) //will expand the VS, update the member count & set dirty

                                }



                                console.log($scope.selectedVS)
                                console.log($scope.input.prePubConcepts)
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

                delete $scope.syndicationStatus
                let syndQry = `/nzhts/syndStatus?resourceType=ValueSet&id=${item.vs.id}`
                $http.get(syndQry).then(
                    function (data) {
                        let param = data.data
                        param.parameter.forEach(function (p) {
                            if (p.name == 'isSyndicated') {
                                $scope.syndicationStatus = p.valueBoolean ? "Syndicated" : "Not syndicated"
                            }
                        })
                        console.log(data.data)

                    }
                )


            }

            //update the member count for the selected VS. Adds the membercount extension
            $scope.updateMemberCount = function (vs) {

                let qry = `ValueSet/$expand?url=${vs.url}&_summary=false&displayLanguage=${nzDisplayLanguage}`
                let currentMemberCount = updateVSSvc.getMemberCount(vs)

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        if (data.data.expansion && data.data.expansion.contains) {
                            let memberCount = data.data.expansion.contains.length
                            //alert(memberCount)

                            if (memberCount !== currentMemberCount) {
                                updateVSSvc.setMemberCount(vs,memberCount)
                                $scope.isDirty = true
                            }

                        }


                        //extMemberCount

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }
            setMemberCountDEP = function (vs,count) {
                vs.extension = vs.extension  || []
                let found = false
                for (ext of vs.extension) {
                    if (ext.url == extMemberCount) {
                        ext.valueInteger = count
                        found = true
                        break
                    }
                }
                if (! found) {
                    vs.extension.push({url:extMemberCount,valueInteger : count})
                }

            }


            $scope.getMemberCount = function (vs) {
                return updateVSSvc.getMemberCount(vs)
              /*  if (vs && vs.extension) {
                    for (ext of vs.extension) {
                        if (ext.url == extMemberCount) {
                            return ext.valueInteger
                            break
                        }
                    }
                }
                */
            }

            $scope.getVersions = function (vs) {

                let qry = `ValueSet/${vs.id}/_history?_summary=false`

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        //it's a query so a bundle is expected
                        if (data.data && data.data.entry) {
                            console.log(data)
                            $scope.bundleVersions = data.data
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

            $scope.selectVersion = function (vs) {
                $scope.selectedVersion = vs
            }

            //when a history item is selected
            $scope.revert = function (vs) {
                $scope.selectedVS = vs
                parseVS($scope.selectedVS)
                $scope.isDirty = true
                $scope.input.mainTabActive = 0      //select the detail tab

            }

            $scope.makeVS = function () {
                let vo = {id:$scope.input.id,
                    title:$scope.input.title,
                    status : $scope.input.status,
                    description:$scope.input.description,
                    displayConcepts: $scope.input.displayConcepts,
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

                if (vo.displayConcepts && vo.displayConcepts.length > 0) {
                    //These are concepts added to the VS that are in the publishing env. but not the main env.

                    let displayInclude = {system:snomed,concept:[]}
                    vo.displayConcepts.forEach(function (concept) {
                        displayInclude.concept.push(concept)
                    })
                    vs.compose.include.push(displayInclude)

                }

                if (vo.prePubConcepts && vo.prePubConcepts.length > 0) {
                    //These are concepts directly added to the VS that are in the publishing env. but not the main env.
                    let ppInclude = {system:systemPrePub,concept:[]}
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