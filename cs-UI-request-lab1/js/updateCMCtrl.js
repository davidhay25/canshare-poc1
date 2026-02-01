
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

            $http.get('cmConfig').then(
                function (data) {
                    setUpConfigFile(data.data)
                }
            )


            $scope.canShowArrow = function (type,index,dirn) {
                let length = Object.keys($scope.cmConfig[type]).length
                if (dirn === 'up') {
                    if (index === 0) {
                        return false
                    } else {
                        return true
                    }
                }
                //this is down
                if (index >= length-1) {
                    return false
                } else {
                    return true
                }




            }

            $scope.move = function (type,index,dirn) {
                let vo = $scope.cmConfig[type]
                let vo1 = angular.copy(vo)

                let keys = Object.keys(vo)




                const [item] = keys.splice(index, 1)
                if (dirn == 'up') {
                    keys.splice(index - 1, 0, item)
                } else {
                    //down
                    keys.splice(index + 1, 0, item)
                }


                let vo2 = {}
                for (const key of keys) {
                    vo2[key] = vo1[key]
                }

                $scope.cmConfig[type] = vo2

                setUpConfigFile($scope.cmConfig)
                $scope.dirty = true
            }

            $scope.deleteConfigLine = function (type,propName) {
                if (confirm('Are you sure you wish to remove this line')) {
                    let vo = $scope.cmConfig[type]
                    delete vo[propName]
                    setUpConfigFile($scope.cmConfig)
                    $scope.dirty = true

                }

            }

            $scope.editConfigLine = function (type,propName,entry) {
                console.log(type,propName,entry)

                $uibModal.open({
                    templateUrl: 'modalTemplates/addCMConfigEntry.html',
                    backdrop: 'static',

                    controller: function ($scope,entry,type,lookup) {
                        $scope.mode="edit"
                        $scope.type = type
                        $scope.input = {}
                        $scope.input.property = propName
                        $scope.input.code = entry.concept?.code
                        $scope.input.display = entry.UI
                        $scope.input.staging1 = entry.staging1
                        $scope.input.staging3 = entry.staging3
                        $scope.input.hideIfNoOptions = entry.hideIfNoOptions

                        $scope.lookup = function (code) {
                            lookup(code)
                        }

                        $scope.save = function () {
                            let entry1 = {}
                            //item.type = $scope.input.type
                            entry1.property = $scope.input.property
                            entry1.item = {concept:{code:$scope.input.code}}
                            entry1.item.UI = $scope.input.display

                            //set staging1 true so will appear in the bottom left

                            entry1.item.staging1 = $scope.input.staging1
                            entry1.item.staging3 = $scope.input.staging3
                            entry1.item.hideIfNoOptions = $scope.input.hideIfNoOptions
                            $scope.$close(entry1)
                        }

                    },
                    resolve: {
                        entry: function () {
                            return entry
                        },
                        type: function () {
                            return type
                        },
                        lookup : function () {
                            return $scope.lookup
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

            $scope.addConfigLine = function (type) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addCMConfigEntry.html',
                    backdrop: 'static',
                    //size: 'xlg',
                    controller: function ($scope,entry,type,lookup) {
                        $scope.type = type
                        $scope.input = {}

                        $scope.lookup = function (code) {
                            lookup(code)
                        }

                        $scope.save = function () {
                            let entry = {}
                            //entry.type = $scope.input.type
                            entry.property = $scope.input.property
                            entry.item = {concept:{code:$scope.input.code}}
                            entry.item.UI = $scope.input.display

                            entry.item.staging1 = $scope.input.staging1
                            entry.item.staging3 = $scope.input.staging3

                           // entry.code = $scope.input.code
                            //entry.display = $scope.input.display
                            $scope.$close(entry)
                        }

                    },
                    resolve: {
                        entry: function () {
                            return null
                        },
                        type: function () {
                            return type
                        },
                        lookup : function () {
                            return $scope.lookup
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
                    $http.put('cmConfig',$scope.cmConfig).then(
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
                $http.get('nzhts/ConceptMap/allAnalytic').then(
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

                if (cm.group) {
                    viewMap(cm)
                } else {
                    let qry = `nzhts/ConceptMap/${cm.id}`
                    $http.get(qry).then(
                        function (data) {
                            viewMap(data.data)
                        }, function (err) {
                            alert(angular.toJson(err))
                        }
                    )
                }


                function viewMap(cm) {

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
                            }, config : function () {
                                return $scope.cmConfig
                            }

                        }

                    })
                }

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
                            alert(angular.toJson(err.data))
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


                    let url = `nzhts/ConceptMap/${$scope.conceptMap.id}`


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
                    let qry = `nzhts/ConceptMap/publishRC/${$scope.input.selectedDomain}/${version}`
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
                    let qry = `nzhts/ConceptMap/makeRC/${$scope.input.selectedDomain}`
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
                let qry = `nzhts/ConceptMap/allVersions`
                domain = domain || "SACT"           //default to sact

                $scope.allConceptMaps = []      //all CMs in the selected domain
                $scope.everyConceptMap = []     //all CMs regardless of domain
                let filter = `-${domain.toLowerCase()}-`
                $scope.showWaiting = true
                $scope.nextVersion = 1
                $http.get(qry).then(
                    function (data) {   //return a bundle of all canshare ConceptMaps



                        console.log(utilsSvc.getSizeOfObject(data.data)/1024)

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