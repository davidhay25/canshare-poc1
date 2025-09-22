
/*
* The controller for the ConceptMap udpdate app (split off from the update VS app)
* This is mostly the dynamic UI maps - the analytics maps have a separate controller
*             //versioning doc: http://docs.google.com/document/d/1kVkdTc4wrHrU-04z30WCbMGr9XHBFeSNaBLycVvZZ_U/edit?tab=t.0
*                               //https://docs.google.com/spreadsheets/d/1S-08cA1m-CAy8humztO0S5Djr_wtXibmNn6w4_uFCIE/edit#gid=285304653
* */


angular.module("pocApp")
    .controller('updateCMCtrl',
        function ($scope,$http,$uibModal,$q,updateVSSvc,utilsSvc,terminologyUpdateSvc,$localStorage,$interval,cmTesterSvc,querySvc) {

            $scope.version = utilsSvc.getVersion()

            $scope.input = {}
            $scope.input.topTabActive = 0
            $scope.isDirty = false;
            let nzDisplayLanguage = "en-x-sctlang-23162100-0210105"
            let snomed = "http://snomed.info/sct"

            $scope.input.csMapOnly = true

            $scope.updateVSSvc = updateVSSvc

            //delete any previous batch - cal remove later
            delete $localStorage.previousVSBatch
            delete $localStorage.previousCMSS

            //let extMemberCount = "http://canshare.co.nz/fhir/StructureDefinition/vs-expanded-count"

            //the version is used to identify which include section is used for which purpose
            // >>>>>>>> this approach won't work any more to discriminate between the
            //different include elements - but I'll keep them as separate versions in case we need them to be different
            let versionEcl = "http://snomed.info/sct/21000210109"      //the version that has the ECL statements

            //the url for the unpublished concepts. this will be the system value in the valueset,
            //and the url for the CodeSystem
            let systemPrePub = "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished"
            let csId = "canshare-unpublished-concepts"   //the id for the CodeSystem


            function setUpConfigFile(data) {
                $scope.cmConfig = data
                cmTesterSvc.setConfig(data)

                $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson($scope.cmConfig,true) ],{type:"application/json"}))
                $scope.downloadLinkJsonName = `cmConfig.json`
            }

            $http.get('/cmConfig').then(
                function (data) {
                    setUpConfigFile(data.data)
                }
            )


            $scope.addConfigLine = function (type) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addCMConfigEntry.html',
                    backdrop: 'static',
                    //size: 'xlg',
                    controller: function ($scope) {
                        $scope.input = {}
/*
                        $scope.types = []
                        $scope.types.push({name:"stagingProperties",display:"Staging property"})
                        $scope.types.push({name:"gradingProperties",display:"Grading property"})
                        $scope.input.type= $scope.types[0]
*/
                        $scope.save = function () {
                            let entry = {}
                            //entry.type = $scope.input.type
                            entry.property = $scope.input.property

                            entry.item = {concept:{code:$scope.input.code}}
                            entry.item.UI = $scope.input.display

                            //set staging1 true so will appear in the bottom left
                            if (type == 'stagingProperties') {
                                entry.item.staging1 = true
                            }


                           // entry.code = $scope.input.code
                            //entry.display = $scope.input.display
                            $scope.$close(entry)
                        }

                    }
                }).result.then(function (entry) {

                    console.log(entry)

                    let vo = $scope.cmConfig[type]
                    vo[entry.property] = entry.item
                    setUpConfigFile($scope.cmConfig)
                    $scope.dirty = true

                })
            }
            
            $scope.importCMConfig = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/importCMConfig.html',
                    backdrop: 'static',
                    //size: 'xlg',
                    controller: function ($scope) {
                        $scope.uploadJson = function() {
                            let id = "#fileUploadFileRef"    //in importCMConfig
                            let file = $(id)
                            let fileList = file[0].files
                            if (fileList.length == 0) {
                                alert("Please select a file first")
                                return;
                            }

                            let fileObject = fileList[0]  //is a complex object

                            let r = new FileReader();

                            //called when the upload completes
                            r.onloadend = function (e) {
                                let data = e.target.result;
                                try {
                                    let obj = angular.fromJson(data)
                                    //quick validation

                                    if (! obj || !obj.tnmLUT || !obj.diagnosticProperties) {
                                        alert("This does not appear to be a valid config file")
                                        return
                                    }

                                    $scope.$close(obj)

                                } catch (ex) {
                                    alert("This is not a valid Json file")
                                    return
                                }
                            }

                            //perform the read...
                            r.readAsText(fileObject);
                        }
                    },

                }).result.then(function (configJson) {
                    //This should be a config file - though minimal validation
                    $scope.dirty = true
                    $scope.cmConfig = configJson
                    setUpConfigFile($scope.cmConfig)



                })
            }



            $scope.updateConfigOnServer = function () {
                if (confirm("Are you sure you wish to update the ConceptMap configuration file")) {
                    //update the server
                    $http.put('/cmConfig',$scope.cmConfig).then(
                        function (data) {
                            alert("CM config updated on server")
                            delete $scope.dirty
                        }, function (err) {
                            alert(err.data.msg)
                        }
                    )
                }
            }


            $scope.getAnalyticsConceptMaps = function () {
                //get all the analytic conceptmaps. These are the ones uploaded using the 'analytics' tab
                $http.get('/nzhts/ConceptMap/allAnalytic').then(
                    function (data) {
                        $scope.allAnalyticCMBundle = data.data
                    }, function (err) {
                        alert('Error getting analytic ConceptMaps' + angular.toJson(err))
                    }
                )
            }
            $scope.getAnalyticsConceptMaps()






            //displays the CM viewer for the currently selected map. This allows a better view of the map and some testing
            $scope.viewConceptMap = function (cm) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/cmViewer.html',
                    backdrop: 'static',
                    size: 'xlg',
                    controller: 'cmViewerCtrl',

                    resolve: {
                        conceptMap: function () {
                            return cm
                        },hashExpandedVs : function () {
                            return null
                        }, selectedProperty : function () {
                            return ""
                        }, data : function() {
                            return null
                        }

                    }

                })
            }

            $scope.viewAnalyticsConceptMap = function (cm) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewAnalyticsCM.html',
                    backdrop: 'static',
                    size: 'xlg',
                    controller: function($scope,CM){
                        $scope.CM = CM

                        $scope.clear = function () {
                            delete $scope.selectedElement
                        }

                        $scope.lookup = function (code) {
                            delete $scope.selectedElement

                            for (const el of CM.group[0].element) {
                                if (el.code == code) {

                                    $scope.selectedElement = el
                                    break
                                }
                            }

                        }
                    },

                    resolve: {
                        CM: function () {
                            return cm
                        }

                    }

                })
            }

/*
            $scope.updateTest = function () {
                if (confirm("This will copy all DG & Compositions from the Production Library to the Test Library. Are you sure?")) {
                    $scope.showWaiting = true
                    $http.post('/library/backupProdToTest', {}).then(
                        function (data) {
                            $scope.showWaiting = false
                            alert("Backup complete. All DataGroups & Compositions have been copied from the Production Library to the Test Library.")
                        }, function (err) {
                            $scope.showWaiting = false
                            alert(angular.toJson(err))
                        }
                    )
                }

            }
           */

/*
            $scope.executeBespoke = function (qry) {
                let encodedQry = encodeURIComponent(qry)
                let fullQry = `/nzhts?qry=${encodedQry}`
                $http.get(fullQry).then(
                    function (data) {
                        console.log(data)
                    }, function () {

                    }
                )
            }
*/
            $scope.showLinkDEP = function (name) {


                let host = `http://poc.canshare.co.nz/query.html?${name}`

                $scope.localCopyToClipboard(host)
                alert(`Link: ${host} \ncopied to clipBoard`);

            }





            $scope.checkDynamicUIConcepts = function() {
                $scope.hashInvalidCode = {}         //a hash of concept not found in the terminology server

                function checkConcepts(obj){
                    for (const key of Object.keys(obj)) {
                        let item = obj[key]
                        //start by assuming that we have an object (all except tnmLUT)
                        let concept = item.concept
                        let system = concept.system || snomed

                        //the value of tnmLUT is just the code
                        if (item !== null && typeof item !== "object") {
                            concept = item
                        }


                        if (concept.code) {


                            let qry = `CodeSystem/$lookup?system=${system}&code=${concept.code}`
                            let encodedQry = encodeURIComponent(qry)
                            //$scope.showWaiting = true
                            $http.get(`nzhts?qry=${encodedQry}`).then(
                                function (data) {
                                    //if the code exisit then all good. todo could check display?

                                }, function (err) {
                                    $scope.hashInvalidCode[concept.code] = true     //flag that the code cannot be found
                                }
                            )
                        }
                    }

                }

                checkConcepts($scope.cmConfig.stagingProperties)
                checkConcepts($scope.cmConfig.gradingProperties)
                checkConcepts($scope.cmConfig.diagnosticProperties)
                checkConcepts($scope.cmConfig.tnmLUT)
            }





            //============================== update ConceptMap functions


            //$scope.previousCMSS = $localStorage.previousCMSS

            //just during development...
            $scope.reloadCMSSDEP = function () {
                //reload the last 'file' copied in...
                let vo1 = terminologyUpdateSvc.auditCMFile($scope.previousCMSS, $scope.allVSItem)
                $scope.arLog = vo1.log
                $scope.lstVSUsed = vo1.lstVSUsed
                //console.log(arLog)

                let vo = terminologyUpdateSvc.makeCM($scope.previousCMSS)
                //console.log(vo.cm)
                $scope.conceptMap = vo.cm
            }

            $scope.selectCmElementDEP = function (element) {
                $scope.input.cmElement = element
            }

            $scope.loadCurrentDEP = function () {
                //download the current CM
                $scope.canUpdate = false        //stop it being uploaded again

                let qry = `ConceptMap/canshare-select-valueset-map`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.conceptMap = data.data
                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }


            //parse a CM 'file' for dynamic UIcopied from the spreadsheet. in cmUploader.html
            $scope.parseCMFile = function (file) {


                let arLines = file.split('\n')
                //console.log(arLines.length)

                //the second line has line numbers. in the second cell is the domain
                let lne = arLines[1]
                let ar = lne.split('\t')

                let description = ar[0]

                //if there's an entry in ar[1] this is the domain.
                if (ar[1]) {


                    //the new domain
                    let dom = ar[1].toUpperCase()

                    if (dom !== $scope.input.selectedDomain) {
                        //load all the CM's for this domain. This will set the version numbers and RC status
                        //then the file can be parse
                        $scope.getConceptMapVersions(dom,function(){
                            parse()
                        })
                    } else {
                        //the domain in the file is the currently selected one. Can parse immediately
                        parse()
                    }

                    $scope.input.cmTabActive = 1        //seelct the table

                } else {
                    alert("There must be a domain in the Spreadsheet to be able to parse it")
                    return
                }


                function parse() {
                    arLines.splice(0, 2)     //the first 2 lines are header lines
                    //https://docs.google.com/spreadsheets/d/1S-08cA1m-CAy8humztO0S5Djr_wtXibmNn6w4_uFCIE/edit?gid=484629798#gid=484629798


                    //let allVSItem = []
                    querySvc.getValueSets("authoring").then(
                        function (ar) {
                            //allVSItem = ar
                            completeParse(ar)
                            //console.log($scope.allVSItem)
                            },
                        function (err) {
                            alert("I couldn't access the terminology server. There will be a lot of errors in the audit ")
                            completeParse([])
                        }
                    )

                    function completeParse(allVSItem) {
                        //$scope.allVSItem = []
                        let vo1 = terminologyUpdateSvc.auditCMFile(arLines, allVSItem)
                        $scope.arLog = vo1.log

                        let vo = terminologyUpdateSvc.makeCM(arLines,$scope.input.selectedDomain,description)
                        $scope.conceptMap = vo.cm

                        $scope.canUpload = true
                    }


                }




            }

            $scope.viewVS = function (url) {
                //display the contents of a single VS
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId: function () {
                            return ""
                        }
                    }

                })
            }

            $scope.canShowRow = function (row) {
                //to show / hide specific rows in the audit
                if ($scope.input.hideVSIssues && row.msg.indexOf('does not exist on the terminology server') !== -1) {
                    return false
                }
                return true
            }

            $scope.handlePaste = function () {
                setTimeout(function () {
                    var textarea = document.getElementById('pastetextbox');
                    textarea.scrollTop = 0;  // Scroll to the top
                }, 0);  // Wait for the paste to complete before updating the model


            }


            //save the concept map. This will either be the dev version, or the most recent release candidate
            //versioning doc: http://docs.google.com/document/d/1kVkdTc4wrHrU-04z30WCbMGr9XHBFeSNaBLycVvZZ_U/edit?tab=t.0
            $scope.uploadConceptMap = function (rc) {
                //if rc is true, then updating the release candidate

                //the nameRoot is the id of the current concept map. This contains the domain
                let nameRoot = $scope.conceptMap.id

                if (nameRoot.indexOf('-dev-dev')> -1) {
                    alert("'dev' duplicated in id. Please reload and try again")
                    return
                }

                let version = "development"
                let displayId = `${nameRoot}-dev`
                if (rc) {
                    version = `Release Candidate ${$scope.previousVersion}`
                    displayId = `${nameRoot}-v${$scope.previousVersion}`
                }


                let msg = `This will update the ${version} version of the ConceptMap with the id ${displayId}. Are you sure you wish to do this. It will take several seconds.`
                if (confirm(msg)) {
                    //if the 'release version' is not checked then add '-dev' as a suffix to the id

                    if (rc) {
                        //Updating a specific Release Candidate
                        $scope.conceptMap.id = `${nameRoot}-v${$scope.previousVersion}`
                        $scope.conceptMap.url = `http://canshare.co.nz/fhir/ConceptMap/${nameRoot}-v${$scope.previousVersion}`
                        $scope.conceptMap.identifier.value = $scope.conceptMap.id
                        $scope.conceptMap.title = `Canshare select valueset map, ${$scope.input.selectedDomain} domain, Release Candidate ${$scope.previousVersion}`
                        $scope.conceptMap.status = 'draft'
                        $scope.conceptMap.version = $scope.previousVersion

                    } else {
                        //updating the development version
                        $scope.conceptMap.id = `${nameRoot}-dev`
                        $scope.conceptMap.url = `http://canshare.co.nz/fhir/ConceptMap/${nameRoot}-dev`
                        $scope.conceptMap.identifier.value = $scope.conceptMap.id
                        $scope.conceptMap.title = `Canshare select valueset map, ${$scope.input.selectedDomain} domain, development version`
                        $scope.conceptMap.status = 'active'
                        $scope.conceptMap.version = $scope.nextVersion

                    }



                    console.log($scope.conceptMap)

                    // return  //temp

                    let url = `/nzhts/ConceptMap/${$scope.conceptMap.id}`
                    $http.put(url, $scope.conceptMap).then(
                        function (data) {
                            alert("Map updated")
                            $scope.canUpload = false    //will need to re-parse if want to upload again. Otherwose, the id gets anothe r'-dev' appended
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )


                }

            }


            $scope.publishRC = function (version) {
                let msg = `This will publish the release candidate for version ${version} and make it the current version. Are you sure you wish to do this?`
                if (confirm(msg)) {
                    $scope.showWaiting = true
                    let qry = `/nzhts/ConceptMap/publishRC/${$scope.input.selectedDomain}/${version}`
                    $http.post(qry, {version: version}).then(
                        function (data) {
                            // alert(data.data)
                            alert("The Release Candidate has been published.")
                            $scope.getConceptMapVersions($scope.input.selectedDomain)
                        }, function (err) {
                            $scope.showWaiting = false
                            alert(angular.toJson(err.data))
                        }
                    ).finally(function () {
                       // $scope.showWaiting = false
                    })
                }
            }

            //make a release candidate from the current dev CS
            $scope.makeRC = function (version) {
                let msg = `This will create a new release candidate for version ${version} from the dev version. Are you sure you wish to do this?`
                if (confirm(msg)) {
                    $scope.showWaiting = true
                    let qry = `/nzhts/ConceptMap/makeRC/${$scope.input.selectedDomain}`
                    $http.post(qry, $scope.conceptMap).then(
                        function (data) {
                            alert("The new Release Candidate has been created.")
                            $scope.getConceptMapVersions($scope.input.selectedDomain)
                        }, function (err) {
                            $scope.showWaiting = false
                            alert(angular.toJson(err.data))
                        }
                    ).finally(function () {
                        //$scope.showWaiting = false
                    })
                }
            }

            //get all the versions of the Conceptmap on the server. Then filter them based on domain
            $scope.allDomains = []

            //load all the CM from the server, update allDomains and allConcepMaps

            $scope.getConceptMapVersions = function (domain,cb) {
                let qry = `/nzhts/ConceptMap/allVersions`
                domain = domain || "SACT"           //default to sact

                $scope.allConceptMaps = []      //all CMs in the selected domain
                $scope.everyConceptMap = []     //all CMs regardless of domain
                let filter = `-${domain.toLowerCase()}-`
                $scope.showWaiting = true
                $scope.nextVersion = 1
                $http.get(qry).then(
                    function (data) {   //return a bundle of all canshare ConceptMaps

                        //actually, we only want all the ConceptMaps for this domain.
                        data.data.entry.forEach(function (entry) {
                            let cm = entry.resource         //these are the full CM - may not be needed, but careful if changing...

                            // add to the complete list - all domains
                            $scope.everyConceptMap.push(cm)

                            //need to get a list of all domains
                            let ar = cm.id.split('-')
                            if (ar.length > 2) {
                                let dom = ar[2].toUpperCase()     //domain is always the third entry
                                if ($scope.allDomains.indexOf(dom) == -1) {
                                    $scope.allDomains.push(dom)
                                }
                            }




                            if (cm.id.indexOf(filter) > -1) {
                                //this CM is in the desired domain
                                $scope.allConceptMaps.push(cm)
                                if (cm.id.indexOf('-dev') > -1) {
                                    //this is the development verson. We can get the next version from it
                                    $scope.nextVersion = cm.version
                                }

                            }
                        })

                        //sort the everyConceptMap list
                        $scope.everyConceptMap.sort(function (a,b) {
                            let inxa = a.id + a.version
                            let inxb = b.id + b.version
                            if (inxa > inxb) {
                                return 1
                            } else {
                                return -1
                            }

                        })



                        //so now we know what the next version is going to be. Is there a current RC waiting for release?
                        //ie, is there a CM with status=draft and version = previous version. If there is:
                        //      It can be formally published
                        //      The dev version cannot be made a release candidate
                        $scope.previousVersion = $scope.nextVersion -1
                        delete $scope.activeRCVersion
                        $scope.activeRC = false     //If there's an active RC, then it can be published, but a new one can't be created

                        for (const cm of $scope.allConceptMaps) {
                            if (cm.id == `canshare-select-${domain.toLowerCase()}-valueset-map-v${$scope.previousVersion}`) {
                                //this is the previous version. If it is draft then it is still being reviewed
                                if (cm.status == 'draft') {
                                    $scope.activeRCVersion = cm.id
                                    $scope.activeRC = true
                                }
                                break
                            }
                        }

                        //if there are no previous CMs, then setup for a new domain
                        if ($scope.allConceptMaps.length == 0) {
                            //add to the list of domains if not already there
                            let alreadyThere = false
                            for (let d of $scope.allDomains) {
                                if (d == domain) {
                                    alreadyThere = true
                                    $scope.input.selectedDomain = d
                                }
                            }

                            if (! alreadyThere) {
                                $scope.allDomains.push(domain.toUpperCase())
                                $scope.input.selectedDomain = $scope.allDomains[$scope.allDomains.length -1]
                            }

                            $scope.activeRC = false     //the is no RC
                            $scope.nextVersion = 1
                            $scope.previousVersion = 0
                        } else {
                            //set the selected domain. This needs to be a 'reference' to allDomains for the dropdown to work

                            for (let d of $scope.allDomains) {
                                if (d == domain) {
                                    $scope.input.selectedDomain = d
                                }
                            }
                        }

                        if (cb) {cb()}    //when called from the parse routine

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }
            //always start with SACT - routine will build the list of all domains
            $scope.getConceptMapVersions('SACT')


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




            $scope.getConceptMapVersionsSAVE = function (domain) {
                let qry = `/nzhts/ConceptMap/allVersions`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function (data) {
                        $scope.allConceptMaps = data.data

                        //get the next version number
                        //$scope.nextVersion = 2         //as we're developing versioning after the first publication

                        //get the current dev version. It will have the next version to release
                        for (const entry of $scope.allConceptMaps.entry) {

                            if (entry.resource.id == 'canshare-select-valueset-map-dev') {
                                $scope.nextVersion = entry.resource.version
                                break
                            }
                        }

                        //so now we know what the next version is going to be. Is there a current RC waiting for release?
                        //ie, is there a CM with status=draft and version = previous version. If there is:
                        //      It can be formally published
                        //      The dev version cannot be made a release candidate
                        $scope.previousVersion = $scope.nextVersion -1
                        delete $scope.activeRCVersion


                        $scope.activeRC = false     //If there's an active RC, then it can be published, but a new one can't be created

                        for (const entry of $scope.allConceptMaps.entry) {
                            if (entry.resource.id == `canshare-select-valueset-map-v${$scope.previousVersion}`) {
                                //this is the previous version. If it is draft then it is still being reviewed
                                if (entry.resource.status == 'draft') {
                                    $scope.activeRCVersion = entry.resource.id
                                    $scope.activeRC = true
                                }

                                break
                            }
                        }



                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }

            //called by versions - view a specific CM
            $scope.selectCMDEP = function (cmId) {
                $scope.canUpload = false    //to prevent it being uploaded again...
                //alert("will retrieve the CM and display it in the table view")
                let qry = `/nzhts/ConceptMap/${cmId}`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function (data) {
                        $scope.conceptMap = data.data
                        $scope.input.cmTabActive = 1        //seelct the table

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })

                //conceptMap

            }

            $scope.showCMDEP = function (cm,mapOnly) {
                if (! mapOnly) {
                    return true
                } else {
                    if (cm.id.indexOf("canshare-select-valueset-map") > -1) {
                        return true
                    }
                }

            }


            // ============ VS Batch upload functions ===========

            //just during development...
            $scope.reloadVSBatchDEP = function () {
                //reload the last 'file' copied in...

                $scope.arVSBatchLog = terminologyUpdateSvc.auditVSBatchFile($localStorage.previousVSBatch)
                $scope.vsBatch = terminologyUpdateSvc.makeVSBatch($localStorage.previousVSBatch)
                $scope.vsBatchReport = terminologyUpdateSvc.VSBatchReport($scope.vsBatch,$scope.allVSItem)

            }

            $scope.parseVSBatchFileDEP = function (file) {

                let arLines = file.split('\n')
                //console.log(arLines.length)

                arLines.splice(0,1)     //the first line is a header line

                $scope.arVSBatchLog = terminologyUpdateSvc.auditVSBatchFile(arLines)

                $scope.vsBatch = terminologyUpdateSvc.makeVSBatch(arLines)
                $scope.vsBatchReport = terminologyUpdateSvc.VSBatchReport($scope.vsBatch,$scope.allVSItem)

            }

            $scope.handleVSBatchPasteDEP = function(event) {
                setTimeout(function () {
                    var textarea = document.getElementById('pasteVSBatchTextbox');
                    textarea.scrollTop = 0;  // Scroll to the top
                }, 0);  // Wait for the paste to complete before updating the model
            }

            $scope.listConceptsDEP = function (ecl) {
                //display the concepts based on the ecl
               // let ecl = vs.compose.include[0].filter[0].value     //we constructed this VS so we know this path is valid
                let vo = {ecl:ecl}
                $http.post(`nzhts/ecl`,vo).then(
                    function (data) {
                        let vs = data.data
                       // $scope.testEclVS = vs

                        let total = vs.expansion.total
                        if (total == 0) {
                            alert("There were no concepts in the expansion")
                        } else {
                            $uibModal.open({
                                templateUrl: 'modalTemplates/conceptList.html',
                                //backdrop: 'static',
                                //size : 'lg',
                                controller : function ($scope,concepts) {
                                    $scope.concepts = concepts
                                },
                                resolve: {
                                    concepts: function () {
                                        return vs.expansion.contains
                                    }
                                }
                            })
                        }




                    }, function (err) {
                        alert(angular.toJson(err.data))
                    })

            }

            $scope.displayJsonDEP = function (json) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/displayJson.html',
                    //backdrop: 'static',
                    //size : 'lg',
                    controller : function ($scope,json) {
                        $scope.json = json
                    },
                    resolve: {
                        json: function () {
                            return json
                        }
                    }
                })
            }

            $scope.clearTextDEP = function () {
                delete $scope.input.vsBatchData
            }

            $scope.uploadVSBatchDEP = function () {
                let msg = `This will upload the ValueSet batch. It can take up to 5 minutes to complete (depending on the size). Are you sure you wish to do this.`
                if (confirm(msg)) {

                    $scope.showWaiting = true
                    $scope.showUploadingVS = true
                    let jobId  //the job assigned to the long running job on the server
                    let intervalPromiseVS //the polling interval

                    // Cancel the interval on scope destroy to avoid memory leaks
                    $scope.$on('$destroy', function() {
                        if ($scope.running) {
                            $interval.cancel(intervalPromiseVS);
                        }
                    });

                    let url = `/nzhts/bundle`
                    $http.post(url,$scope.vsBatch).then(
                        function (data) {
                            jobId = data.data.jobId
                            //let errs = []
                            intervalPromiseVS = $interval(function() {
                                let qry = `/job/status/${jobId}`
                                $http.get(qry).then(
                                    function (data) {
                                        let jobStatus = data.data
                                        $scope.vsUploadProgress = jobStatus.progress
                                        switch (data.data.status) {
                                            case 'errorDEP' :
                                                stopUIDisplay(intervalPromiseVS)
                                                $scope.vsUploadProgress = `Error: ${jobStatus.error}`

                                                //todo - there may be multiple errors...
                                                alert(`There was an error: ${jobStatus.error}`)

                                                break
                                            case 'complete' :
                                                stopUIDisplay(intervalPromiseVS)
                                                delete $scope.vsUploadProgress
                                                if (jobStatus.errors && jobStatus.errors.length > 0) {
                                                    $scope.batchVsErrors = jobStatus.errors
                                                    alert("There were errors - see the error tab.")
                                                }



                                                alert("The update is complete.")

                                                break
                                        }

                                    }, function (err) {
                                        alert(angular.toJson(err.data))
                                    }
                                )


                            }, 1000);

                            console.log(data.data)
                        },function (err) {
                            alert(angular.toJson(err.data))
                        })



                }
            }

            $scope.expandAllVSDEP = function () {

                //$scope.action= "Expanding ECL"
                makeMultipleRequests().then((results) => {
                    $scope.expandProgress = "Expansion complete."
                    $scope.$digest()

                })

                async function makeMultipleRequests(ecls) {
                    let results = [];
                    $scope.expandError = []

                    let cnt = $scope.vsBatchReport.length
                    let ctr = 0
                    for (let row of $scope.vsBatchReport) {
                        if (row.ecl) {
                            $scope.expandProgress = `${ctr}/${cnt} ${row.name}`
                            console.log(row.name)
                            let result = await makeRequest(row.ecl);
                            if (result == 'error') {
                                $scope.expandError.push({name:row.name,ecl:row.ecl,url:row.vs.url})
                            }
                            results.push({name:row.name,result:result});
                        }
                       ctr ++
                        if (ctr > 200) {
                          //  break
                        }

                    }

                    return results
                }

                async function makeRequest(ecl) {
                    try {
                        let response = await $http.post(`nzhts/ecl`,{ecl:ecl})
                        return 'ok' //response.data;
                    } catch (error) {

                        return 'error'
                    }
                }

            }

            //=============================

            $scope.getMemberCountDateDEP = function () {
                if ($localStorage.memberCount) {
                    return $localStorage.memberCount.date
                }

            }

            $scope.getMCOneVSDEP = function (url) {
                let count = ""
                if ($localStorage.memberCount) {
                    count = $localStorage.memberCount.members[url]
                }
                return count
            }

            $scope.updateAllMemberCountDEP = function () {
                let msg = `This will determine the count of all ValueSet concepts. It can take up to 5 minutes to complete (depending on the size). Are you sure you wish to do this.`
                if (confirm(msg)) {

                    $scope.showWaiting = true
                    $scope.showGettingMC = true
                    let jobId  //the job assigned to the long running job on the server
                    let intervalPromiseVS //the polling interval

                    // Cancel the interval on scope destroy to avoid memory leaks
                    $scope.$on('$destroy', function() {
                        if ($scope.running) {
                            $interval.cancel(intervalPromiseVS);
                        }
                    });

                    let url = `/memberCount`
                    $http.get(url).then(
                        function (data) {
                            jobId = data.data.jobId

                            intervalPromiseVS = $interval(function() {
                                let qry = `/job/status/${jobId}`
                                $http.get(qry).then(
                                    function (data) {
                                        let jobStatus = data.data
                                        $scope.mcProgress = jobStatus.progress

                                            console.log(data.data)

                                            if (data.data.status == 'complete' ) {
                                                stopUIDisplay(intervalPromiseVS)
                                                delete $scope.mcProgress
                                                if (jobStatus.errors && jobStatus.errors.length > 0) {
                                                    $scope.batchVsErrors = jobStatus.errors
                                                    alert("There were errors - see the error tab.")
                                                }

                                                let hashCount = {}
                                                for (const item of jobStatus.result) {
                                                    hashCount[item.url] = item.count
                                                }


                                                $localStorage.memberCount = {date: new Date(),members:hashCount}
                                                $scope.makeVSDownload()
                                                alert("The update is complete.")
                                            }
                                    }, function (err) {
                                        alert(angular.toJson(err.data))
                                    }
                                )


                            }, 1000);

                            console.log(data.data)
                        },function (err) {
                            alert(angular.toJson(err.data))
                        })



                }

                function stopUIDisplay(intervalPromise) {
                    $interval.cancel(intervalPromise);
                    $scope.showWaiting = false

                    $scope.showGettingMC = false
                }
            }



            //-------------------

            $scope.setSyndicationStatusDEP = function () {
                if (confirm("Are you sure you wish to set the syndication status for all resources. This will take over a minute.")) {
                    $scope.showWaiting = true
                    $scope.showWaitingTimeout = true

                    let jobId  //the job assigned to the long running job on the server
                    let intervalPromise

                    // Cancel the interval on scope destroy to avoid memory leaks
                    $scope.$on('$destroy', function() {
                        if ($scope.running) {
                            $interval.cancel(intervalPromise);
                        }
                    });

                    //return

                    $http.post('/nzhts/setSyndication').then(function (data) {
                        jobId = data.data.jobId
                        //alert(`The Syndication process has been initiated. You can see progress in the `)
                        //Now start the polling to get the job status...
                        intervalPromise = $interval(function() {
                            let qry = `/job/status/${jobId}`
                            $http.get(qry).then(
                                function (data) {
                                    let jobStatus = data.data
                                    $scope.syndProgress = jobStatus.progress
                                    switch (data.data.status) {
                                        case 'error' :
                                            stopUIDisplay(intervalPromise)
                                            $scope.syndProgress = `Error: ${jobStatus.error}`
                                            alert(`There was an error: ${jobStatus.error}`)

                                            break
                                        case 'complete' :
                                            stopUIDisplay(intervalPromise)
                                            delete $scope.syndProgress
                                            alert("The syndication is complete.")

                                            break
                                    }

                                }, function (err) {
                                    alert(angular.toJson(err.data))
                                }
                            )


                        }, 1000);

                    }, function (err) {

                    })
                }

            }

            //used by the long running functions - setSyndicationStatus & batch vs upload
            function stopUIDisplayDEP(intervalPromise) {
                $interval.cancel(intervalPromise);
                $scope.showWaiting = false
                $scope.showWaitingTimeout = false
                $scope.showUploadingVS = false
            }

            //============ unpublished codes

            //$scope.input.showTableCell = []

            $scope.analyseUnpublishedDEP = function () {
                $scope.analysingUnpublished = true
                let url = "/analyseUnpublished"
                $http.get(url).then(
                    function (data) {
                        $scope.unpublishedReport = data.data
                        //log - log for display
                        //batch - all VS with unpublished codes at the start of the analysis (ie current state)
                        //hashOriginal - hash or original VS by id when there was a change
                        //arChanges - list of codes that are now published
                        //updateBatch - bundle of ValueSets where one or more unpublished codes are now published
                        //cs - codesystem

                        $scope.unpublishedSummary = terminologyUpdateSvc.summaryUnpublishedCodes(data.data)
                    },function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.analysingUnpublished = false
                })



                //terminologyUpdateSvc.checkUnpublishedCodes($scope.allVSItem)
            }

            $scope.updateUnpublishedDEP = function () {
                if (confirm("This will update the ValueSets that need changing, and the new CodeSystem")) {
                    let updateBatch = $scope.unpublishedReport.updateBatch

                    //add the Code System
                    updateBatch.entry.push({resource:$scope.unpublishedReport.cs})

                    console.log(updateBatch)


                    //return


                    let url = `/nzhts/bundlewait`

                    $http.post(url,updateBatch).then(
                        function (data) {

                            let jobStatus = data.data
                            if (jobStatus.errors && jobStatus.errors.length > 0) {
                                $scope.unpublishedUploadErrors = jobStatus.errors
                                alert("There were errors - see the error tab.")
                            } else  {
                                alert("Update complete.")
                            }

                        }, function (err) {
                            alert(angular.toJson(err.data))
                        })



                }
            }

            $scope.selectFromUnpublishedDEP = function (vs) {
                $scope.selectVSItem({vs:vs})
                $scope.input.topTabActive = 0
            }

            //===========================

            //retrieve all ValueSets
            getValueSetsDEP = function (identifier) {
                //return a list of subsetted canshare valuesets
                identifier = identifier || "http://canshare.co.nz/fhir/NamingSystem/valuesets%7c"

                //a combined list of snoned & non-snomed for the member count
                $scope.listForMemberCount = []

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

                                //we don't want non-snomed in this list - changed on 24Apr 2025
                                //"http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets
                                let vs = entry.resource
                                let canInclude = true
/*
                                for (const identifier of entry.resource.identifier) {
                                    if (identifier.system == "http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets") {
                                        canInclude = false
                                    }
                                }
*/
                                if (canInclude) {
                                    let item = {vs:entry.resource}
                                    item.display = entry.resource.title || entry.resource.name
                                    //item.lastUpdated = new Date(entry.resource.meta.lastUpdated)
                                    ar.push(item)
                                }

                                //update the list for the membercount
                                let item1 = {vs:entry.resource}
                                //item1.display = entry.resource.title || entry.resource.name
                                $scope.listForMemberCount.push(item1)

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
            

            $scope.makeVSDownloadDEP = function() {
                //create download




                //let download = updateVSSvc.makeDownload($scope.allVSItem,$localStorage.memberCount)
                let download = updateVSSvc.makeDownload($scope.listForMemberCount,$localStorage.memberCount)

                $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([download ],{type:"text/tsv"}))
                $scope.downloadLinkCsvName = `allValueSets.tsv`

            }

            /*
            getValueSets().then(
                function (ar) {
                    $scope.allVSItem = ar

                    $scope.makeVSDownload()

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
*/
            
            //---- functions for 'other CodeSystem
            $scope.addOtherCsConceptDEP = function () {
                let concept = {}
                concept.code = $scope.input.newOtherCsCode
                concept.display = $scope.input.newOtherCsDisplay
                concept.system = $scope.input.newOtherCsSystem

                let qry = `CodeSystem/$lookup?system=${concept.system}&code=${concept.code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.input.otherCsConcepts = $scope.input.otherCsConcepts || []
                        $scope.input.otherCsConcepts.push(concept)

                        delete $scope.input.newOtherCsCode
                        delete $scope.input.newOtherCsDisplay
                        delete $scope.input.newOtherCsSystem

                        $scope.makeVS()

                    }, function () {
                        alert("Concept not found on server")
                    }
                )



            }

            //allow other concepts to be entered from a spreadsheet
            $scope.selectOtherConceptsDEP = function (arConcepts,system) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/enterConcepts.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'enterConceptsCtrl',
                    resolve: {
                        vo: function () {
                            let vo = {}
                            vo.existing = arConcepts     //for duplicate checking
                            vo.system = system
                            //vo.existing = $scope.input.otherCsConcepts     //for duplicate checking
                            return vo
                        }
                    }
                }).result.then(function (concepts) {
                    //return an array of concepts
                    if (concepts.length > 0) {
                        //add to the specific list - unpublished, other, display
                        //create new ar with concepts from modal ovewriting existing ones (so display can change)

                        arConcepts = arConcepts || []
                        let newList = arConcepts


                        arConcepts.push(...concepts)

                        if (system == systemPrePub) {
                            //for unpublished codes, we need to add it to the CodeSystem if not prsent
                            for (const concept of concepts) {
                                if (updateVSSvc.addConceptToCodeSystem( $scope.prePubCS,concept)) {
                                    $scope.csDirty = true
                                }
                            }

                        }


                        //$scope.input.otherCsConcepts = $scope.input.otherCsConcepts || []
                        //$scope.input.otherCsConcepts.push(...concepts)
                        $scope.makeVS()



                    }

                })

                /*

                let qry = `CodeSystem?url=${url}&_summary=false`
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data)
                        let bundle = data.data
                        if (bundle.entry) {

                            if (bundle.entry.length > 0) {


                                if (bundle.entry.length > 1) {
                                    alert(`There were ${bundle.entry.length} CodeSystems found! Using the first one`)
                                }


                                let concepts = bundle.entry[0].resource.concept
                                if (confirm(`There are ${concepts.length} entries in this CodeSystem. Add them all to the ValueSet?`)) {
                                    $scope.input.otherCsConcepts = $scope.input.otherCsConcepts || []

                                    let hash = {}
                                    for (const concept of $scope.input.otherCsConcepts) {
                                        let key =  `${concept.code}-${concept.system}`
                                        hash[key] = true
                                    }

                                    for (const concept of concepts) {
                                        //ensure no dups
                                        if (! hash[`${concept.code}-${url}`]) {
                                            concept.system = url
                                            $scope.input.otherCsConcepts.push(concept)
                                        }


                                    }
                                    delete $scope.input.newOtherCsSystem
                                    $scope.makeVS()
                                }

                            } else {
                                alert(`There were ${bundle.entry.length} CodeSystems found! This is an error...`)
                               // alert(`CodeSystem with the URL: ${url} not found`)
                            }
                        } else {
                            alert(`There was no CodeSystem with the url: ${url}`)
                        }


                    }, function () {
                        alert(`CodeSystem with the URL: ${url} not found`)
                    })

                */
            }
            
            $scope.removeOtherCsConceptDEP = function (inx) {

                $scope.input.otherCsConcepts.splice(inx,1)
                $scope.makeVS()
            }


            //add a concept to the list directly included in the VS. In an include section with the snomed system
            $scope.addDisplayConceptDEP = function () {

                $scope.input.displayConcepts = $scope.input.displayConcepts || []
                let concept = {code:$scope.input.newDisplayCode,display:$scope.input.newDisplayDisplay}
               // updateVSSvc.setConceptType(concept,'display') //adds the concepttype extension

                $scope.input.displayConcepts.push(concept)
                delete $scope.input.newDisplayCode
                delete $scope.input.newDisplayDisplay
                $scope.makeVS()
            }

            $scope.removeDisplayConceptDEP = function (inx) {
                $scope.input.displayConcepts.splice(inx,1)
                $scope.makeVS()

            }


            //add a concept to the list of pre-published items
            $scope.addPPConceptDEP = function () {

                $scope.input.prePubConcepts = $scope.input.prePubConcepts || []
                let concept = {code:$scope.input.newPPCode, display:$scope.input.newPPDisplay}

                $scope.input.prePubConcepts.push(concept)

                if (updateVSSvc.addConceptToCodeSystem( $scope.prePubCS,concept)) {
                    $scope.csDirty = true
                }

                delete $scope.input.newPPCode
                delete $scope.input.newPPDisplay
                $scope.makeVS()
            }

            $scope.removePPConceptDEP = function (inx) {
                $scope.input.prePubConcepts.splice(inx,1)
                $scope.makeVS()

            }

            $scope.checkNewVSDEP = function (id) {
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
                    $scope.makeVS()
                }
            }

            function performUpdateDEP(vs) {

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
            $scope.updateVSDEP = function (vs) {
                let msg = "Are you sure you wish to update this valueSet"
                if ($scope.csDirty) {
                    msg += " and CodeSystem"
                }
                if (confirm(msg)) {

                   // console.log(angular.toJson($scope.selectedVS,null,2))
                    performUpdate($scope.selectedVS)

                }
            }

            $scope.newVSDEP = function () {
                if (confirm("Are you sure you wish to create this valueSet")) {
                    performUpdate($scope.selectedVS)
                }

            }

            $scope.createNewDEP = function () {
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
                delete $scope.input.otherCsConcepts
                delete $scope.input.displayConcepts




                $scope.input.status = 'active'

                $scope.makeVS()

                $scope.input.mainTabActive = 0      //select the detail tab

            }

            $scope.testECLDEP = function (ecl) {
                
                let vo = {ecl:ecl}

                $http.post(`nzhts/ecl`,vo).then(
                    function (data) {
                        $scope.testECLData = data.data

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    })

            }

            $scope.canSaveDEP = function () {
                return $scope.input.id && $scope.input.title && $scope.input.description &&
                    $scope.isDirty
            }

            //whether to show a particular VS
            $scope.showVSDEP = function (item) {

                if (! $scope.input.includeRetired) {
                    if (item.vs.status == 'retired' || item.vs.status == 'draft') {
                        return false
                    }
                }

                let filter = $scope.input.filterlist
                if (! filter) {
                    return true
                }

                filter = filter.toLowerCase()

                if ((item.display.toLowerCase().indexOf(filter) > -1) ||
                    (item.vs.id.toLowerCase().indexOf(filter) > -1)) {

                    return true
                } else {
                    return false
                }

            }


            //parse the contents of the VS into the scope values
            function parseVSDEP(vs) {
                delete $scope.parseError
                $scope.input.status = vs.status
                $scope.input.id = vs.id
                $scope.input.title = vs.title
                $scope.input.description = vs.description

                delete $scope.input.displayConcepts
                delete $scope.input.prePubConcepts
                delete $scope.input.otherCsConcepts
                delete $scope.input.ecl
                $scope.csInVs = []      //any codeSystems referenced by thie VS - ie when defining a CS
                delete $scope.isMaximalVS   //if true, this is a maximal VS created when creating a CodeSystem
                for (const identifier of vs.identifier || []) {
                    if (identifier.system == "http://canshare.co.nz/fhir/NamingSystem/nonsnomed-valuesets") {
                        $scope.isMaximalVS = true
                    }
                }


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
                                } else if (inc.system == "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished") {
                                    $scope.input.prePubConcepts = $scope.input.prePubConcepts || []
                                    $scope.input.prePubConcepts.push(concept)
                                } else {
                                    //these are 'other' - ie non snomed - codes
                                    concept.system = inc.system
                                    $scope.input.otherCsConcepts = $scope.input.otherCsConcepts || []
                                    $scope.input.otherCsConcepts.push(concept)

                                }

                            })
                        } else {
                            //this can happen with ValueSets created by the CodeSystem editing domain
                            $scope.csInVs.push(inc.system)

                           // alert(`Unknown include element: ${angular.toJson(inc)}`)
                        }

                    })
                }

            }

            //When a ValueSet is selected from the list
            $scope.selectVSItemDEP = function (item) {
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
                delete $scope.input.otherCsConcepts

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
/* not doing this now - but leave the code in for th emoment
                                //if there's no member count, then get it
                                if (! updateVSSvc.getMemberCount($scope.selectedVS)) {
                                    $scope.updateMemberCount($scope.selectedVS) //will expand the VS, update the member count & set dirty

                                }
*/


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
            //not currently used...
            $scope.updateMemberCountDEP = function (vs) {

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


            $scope.getMemberCountDEP = function (vs) {
                return updateVSSvc.getMemberCount(vs)
            }

            $scope.getVersionsDEP = function (vs) {

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

            $scope.selectVersionDEP = function (vs) {
                $scope.selectedVersion = vs
            }

            //when a history item is selected
            $scope.revertDEP = function (vs) {
                $scope.selectedVS = vs
                parseVS($scope.selectedVS)
                $scope.isDirty = true
                $scope.input.mainTabActive = 0      //select the detail tab

            }

            $scope.makeVSDEP = function () {
                let vo = {id:$scope.input.id,
                    title:$scope.input.title,
                    status : $scope.input.status,
                    description:$scope.input.description,
                    displayConcepts: $scope.input.displayConcepts,
                    prePubConcepts: $scope.input.prePubConcepts,
                    otherCsConcepts: $scope.input.otherCsConcepts,
                    ecl:$scope.input.ecl}
                $scope.selectedVS = makeVSFromVo(vo)
                $scope.isDirty = true
            }

            $scope.expandVSInTSDEP = function (vs) {
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
            $scope.getDisplayDEP = function (code,control) {

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

            function makeVSFromVoDEP(vo) {

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
                vs.compose = {include:[]}
                if (vo.ecl) {
                    let filter = {property:"constraint",op:"=",value:`${vo.ecl}`}
                    let include = {system:snomed,version:versionEcl,filter:[filter]}
                    vs.compose.include.push(include)
                }





                if (vo.displayConcepts && vo.displayConcepts.length > 0) {
                    //These are concepts added to the VS that are in the publishing env. but not the main env.

                    let displayInclude = {system:snomed,concept:[]}
                    vo.displayConcepts.forEach(function (concept) {
                        displayInclude.concept.push({code:concept.code,display:concept.display})
                    })
                    vs.compose.include.push(displayInclude)

                }

                if (vo.prePubConcepts && vo.prePubConcepts.length > 0) {
                    //These are concepts directly added to the VS that are in the publishing env. but not the main env.
                    let ppInclude = {system:systemPrePub,concept:[]}
                    vo.prePubConcepts.forEach(function (concept) {
                        ppInclude.concept.push({code:concept.code,display:concept.display})
                    })
                    vs.compose.include.push(ppInclude)
                }

                if (vo.otherCsConcepts) {
                    //Concepts from codesystems other than snomed. Each system will be in its own compose.include
                    let hashSystem = {}
                    for (const concept of vo.otherCsConcepts) {
                        hashSystem[concept.system] = hashSystem[concept.system] || []
                        hashSystem[concept.system].push({code:concept.code,display:concept.display})
                    }

                    for (const system of Object.keys(hashSystem)) {

                        let osInclude = {system:system,concept:[]}
                        for (const concept of hashSystem[system]) {

                            //delete concept.system
                            osInclude.concept.push({code:concept.code,display:concept.display})
                        }
                        vs.compose.include.push(osInclude)
                    }


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

            $scope.localCopyToClipboard = function(text) {
                let textArea = document.createElement("textarea");
                textArea.value = text;

                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    let successful = document.execCommand('copy');
                    let msg = successful ? 'successful' : 'unsuccessful';
                    console.log('Fallback: Copying text command was ' + msg);
                } catch (err) {
                    alert('Fallback: Oops, unable to copy', err);
                }

                document.body.removeChild(textArea);
            }


        }
    )