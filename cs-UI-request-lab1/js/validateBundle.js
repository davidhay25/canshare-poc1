angular.module("pocApp")
    .controller('validateBundleCtrl',
        function ($scope,$http,$uibModal) {

            //indexes for the main tabs to allow tabs to be selected from code
            $scope.ui = {}
            $scope.ui.tabBundle = 0;
            $scope.ui.tabList = 1;
            $scope.ui.tabOO = 1;

            $scope.server = "http://test.canshare.co.nz:8080/fhir/"
            $scope.input = {}

            //$scope.input.mainTabActive = 1 // $scope.ui.tabTrack;

            let hints
            $http.get('validatorHints').then(
                function (data) {
                    hints=data.data
                }
            )

            $scope.library = function () {
                alert("Under development")
            }

            //retrieve all the patients for the selection table
            $scope.getAllPatients = function() {
                $scope.allPatients = []
                let qry = `${$scope.server}/Patient?_count=200`
                let encodedQry = encodeURIComponent(qry)
                $http.get(`/proxy?qry=${encodedQry}`).then(
                    function (data) {
                        for (entry of data.data.entry) {
                            let resource = entry.resource
                            $scope.allPatients.push(resource)

                        }
                        $scope.allPatients.sort(function (a,b) {
                            try {
                                if (a.identifier[0].value > b.identifier[0].value) {
                                    return 1
                                } else {
                                    return -1
                                }
                            } catch (ex) {
                                return 0
                            }


                        })


                    },function (err) {

                    })

            }
            $scope.getAllPatients()

            //retrieve a single patients data and display
            $scope.selectPatient = function (patient) {
                let qry = `Patient/${patient.id}/$everything`
                $scope.executeQuery(qry,function () {
                    $scope.validate(true)
                })

            }

            //execute a query that returns a bundle and set $scope.input.bundle
            $scope.executeQuery = function (query,cb) {
                delete $scope.input.bundle
                let qry = `${$scope.server}/${query}`
                let encodedQry = encodeURIComponent(qry)
                $http.get(`/proxy?qry=${encodedQry}`).then(

                    function (data) {
                        let bundle = data.data
                        $scope.input.bundle = angular.toJson(bundle,true)
                        console.log(bundle)
                        if (cb) {
                            cb(bundle)
                        }

                    }, function (err) {
                        alert(`Error: ${angular.toJson(err.data)}`)
                    }
                )
            }

            $scope.saveFhirPath = function (fhirPath) {
                //load DocRef, update data and save
                //start with fixed DocRef id - add other templates later

                //todo add a dialog to get description etc


                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'lg',
                    templateUrl: 'modalTemplates/saveFp.html',

                    controller: function ($scope,fp) {
                        $scope.input = {}

                        $scope.save = function () {
                            let vo = {title:$scope.input.title}
                            $scope.$close(vo)
                        }

                    },
                    resolve: {
                        fp: function () {
                            return fhirPath
                        }
                    }

                }).result.then(function (vo) {

                    let item = {fp:fhirPath}
                    item.title = vo.title
                    $scope.input.template.items.push(item)      //for the UI
                    $scope.makeTemplateDownload($scope.input.template)
                    //todo update dr

                    //load the template then update it
                    $scope.loadTemplate(function (dr,template) {
                        template.items = template.items || []
                        template.items.push(item)
                        let att = dr.content[0].attachment
                        let json = angular.toJson(template)
                        att.data = btoa(json)
                        let qry = `${$scope.server}/DocumentReference/fpTemplate`

                        let vo = {}
                        vo.content = dr
                        vo.qry = $scope.server //only the server root is needed. The server will construct the PUT url from that

                        $http.put('/validator/proxy',vo).then(
                        //$http.put(qry,dr).then(
                            function (data) {
                                alert('updated')
                            }, function (err) {
                                alert(angular.toJson(err.data))
                            }
                        )

                    })

                })

            }
            $scope.loadTemplate = function (cb) {
                //load a template from the Decref
                //start with fixedid

                let qry = `${$scope.server}/DocumentReference/fpTemplate`

                let encodedQry = encodeURIComponent(qry)
                $http.get(`/proxy?qry=${encodedQry}`).then(
                //$http.get(qry).then(
                    function (data) {

                        let dr = data.data
                        console.log(dr)
                        let att = dr.content[0].attachment
                        let json = atob(att.data)
                        let template = angular.fromJson(json)
                        console.log(template)
                        $scope.input.template = template     //     {items:[{fp}]}
                        $scope.makeTemplateDownload(template)
                        if (cb) {
                            cb(dr,template)
                        }

                    }, function (err) {
                        //alert(angular.toJson(err))
                        console.log(err)
                        if (err.status == 404 || err.status == 410) {
                            //the default template wasn't found - create it
                            $scope.input.template = {items:[]}
                            $scope.makeTemplateDownload($scope.input.template)
                            if (cb) {
                                let dr = {resourceType:"DocumentReference",status:"current"}
                                dr.id = "fpTemplate"
                                dr.type = {coding:[{system:"http://canshare.co.nz/fhir/NamingSystem/bv",code:"fhirpath"}]}
                                dr.description = "fhirPath queries for default template"
                                dr.date = new Date().toISOString()

                                let json = angular.toJson($scope.input.template)

                                let att = {data:btoa(json)}



                                dr.content=[{attachment:att}]
                                cb(dr,$scope.input.template)
                            }
                        } else {
                            alert(angular.toJson(err.data))
                        }





                    }
                )

            }

            $scope.loadTemplate()   //load the default template

            $scope.selectFhirPath = function () {

                alert("select a saved fp from the library. ? connection to templates")
            }



            $scope.selectIssue = function(issue) {
                $scope.input.selectedIssue = issue
            }

            $scope.applyBundle = function () {
                if (confirm("Are you sure you wish to apply this bundle as a transaction bundle to the FHIR server")) {

                    let vo = {}
                    vo.qry = `${$scope.server}`
                    vo.content = $scope.inputtedBundle

                    $http.post('/validator/proxy',vo).then(
                        function (data) {
                            alert("Processed OK")

                        },
                        function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }

            $scope.loadLibrary = function () {

                let url = `${$scope.server}/DocumentReference?type=bundle&_sort=-date&_summary=true&_count=200`

                //let url = `Patient/${patient.id}/$everything`
                let encodedQry = encodeURIComponent(url)
                $http.get(`/proxy?qry=${encodedQry}`).then(

                    function (data) {
                        $scope.libraryResultBundle = data.data
                       // console.log($scope.libraryResultBundle)

                    },
                    function (err) {

                    }
                )

                //http://test.canshare.co.nz:8080/fhir/DocumentReference?_sort=-date&_summary=true
            }
            $scope.loadLibrary()





            //update the default template



            //load a single DR from the library
            $scope.loadFromLibrary = function (entry) {
                console.log(entry)
                let resource = entry.resource
                let qry = `${$scope.server}/DocumentReference/${resource.id}`
                let encodedQry = encodeURIComponent(qry)
                $http.get(`/proxy?qry=${encodedQry}`).then(

                //$http.get(qry).then(
                    function (data) {
                        let dr = data.data
                        console.log(dr)
                        let att = dr.content[0].attachment
                        let bundle = atob(att.data)
                        $scope.input.bundle = bundle


                        //validate, but don't save again!
                        $scope.validate(true)


                        console.log(bundle)



                    }, function (err) {
                        alert(`Error: ${angular.toJson(err.data)}`)
                    }
                )
            }

            //update a bundle based on the identifier in the bundle
            //
            $scope.updateBundle = function (bundle) {
                if (! bundle.identifier) {
                    console.log('no identifier')
                    return
                }

                //the identifier.value will be the id of the DocumentReference containing the bundle
                let bundleId = bundle.identifier.value

                if (! bundleId) {
                    console.log("no identifier value")
                    return
                }
                bundleId = bundleId.replace(/ /g, "")   //remove any spaces
                bundleId = bundleId.replace(/_/g, "-")   //underscore to minus
                //now we can create the DR


                let dr = {resourceType:"DocumentReference",status:"current"}
                dr.id = bundleId
                dr.description = `Transaction bundle: ${bundleId}`
                dr.type = {coding:[{system:"http://canshare.co.nz/fhir/NamingSystem/bv",code:"bundle"}]}
                dr.date = new Date().toISOString()

                let att = {data:btoa($scope.input.bundle)}
                dr.content=[{attachment:att}]

                let vo = {}
                vo.content = dr
                vo.qry = $scope.server //only the server root is needed. The server will construct the PUT url from that

                $http.put('/validator/proxy',vo).then(
                    function (data) {
                        alert(`bundle updated in library: DocumentReference/${bundleId}`)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }

            //add the bundle as a new entry in the library. May wind up replacing this
            //with the update
            $scope.saveBundle = function () {


                let description = window.prompt("Enter a description of this bundle")
                if (description) {
                    let dr = {resourceType:"DocumentReference",status:"current"}
                    dr.description = description
                    dr.type = {coding:[{system:"http://canshare.co.nz/fhir/NamingSystem/bv",code:"bundle"}]}
                    dr.date = new Date().toISOString()

                    let att = {data:btoa($scope.input.bundle)}
                    dr.content=[{attachment:att}]

                    let vo = {}
                    vo.qry = `${$scope.server}/DocumentReference`
                    vo.content = dr

                    $http.post('/validator/proxy',vo).then(

                        function (data) {
                            //returns the updated resource
                            let savedDR = data.data
                            let location =`${savedDR.resourceType}.${savedDR.id}`
                            console.log(data)

                            //let location = data.headers('Content-Location')
                            alert(`Bundle saved as ${location}`)

                            $scope.loadLibrary()


                        }, function (err) {
                            alert(`Error: ${angular.toJson(err.data)}`)
                        }
                    )

                } else {
                    alert("No message entered. Bundle not saved.")
                }
            }



            //exceute a fhirPath against the bundle and return the result
            $scope.executeFhirPathForTemplate = function (fhirPath) {
                if ($scope.inputtedBundle) {
                    try {
                        let result = fhirpath.evaluate($scope.inputtedBundle, fhirPath, null, fhirpath_r4_model)
                        //console.log(fhirPath,result)
                        return result

                    } catch (ex) {
                        console.log(ex)
                        return ex
                    }
                }

            }

            $scope.makeTemplateDownload = function (template) {

                let ar = []
                ar.push(`Title\tFHIRPath\n`)

                template.items.forEach(function (item) {
                    let lne = tidyText(item.title)
                    lne += `\t${item.fp}`
                    ar.push(lne)
                })

                let download = ar.join('\n')
                $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([download],{type:"text/tsv"}))
                $scope.downloadLinkCsvName = `allFHIRPath.tsv`



                function tidyText(s) {
                    if (s) {
                        s = s.replace(/\t/g, " ");
                        s = s.replace(/\n/g, " ");
                        s = s.replace(/\r/g, " ");
                        return s
                    } else {
                        return ""
                    }
                }

            }



            $scope.executeFhirPath = function (fhirPath) {
                try {
                    $scope.fhirPathResult = fhirpath.evaluate($scope.inputtedBundle, fhirPath, null, fhirpath_r4_model)
                } catch (ex) {
                    alert(ex)

                }

                console.log()
            }

            //
            $scope.validate = function(nosave) {

                delete $scope.input.selectedIssue
                //let url = `${$scope.server}/Bundle/$validate`
                let url =  "validator/validateBundle"

                let bundle
                try {
                    bundle= angular.fromJson($scope.input.bundle)
                } catch (e) {
                    alert("Not valid Json. Try again.")
                    return
                }

                if (bundle.resourceType !== 'Bundle') {
                    alert("Validate is only for Bundles")
                    return
                }


                //the bundle parsed as an object
                $scope.inputtedBundle = bundle


                if (! nosave) {
                    //if there's an identifier then the bundle will be saved using the identifier.value as the resource id
                    $scope.updateBundle(bundle)
                }


                //validate that all entries have a conditional on identifier
                validateConditional(bundle)

                $scope.showWaiting = true


                $http.post(url,bundle).then(
                    function (data) {

                        $scope.oo = data.data
                        parseOO()

                        //select the list view
                        $scope.input.mainTabActive = $scope.ui.tabList


                    }, function (err) {
                        $scope.oo = err.data
                        parseOO()

                        //select the list view
                        $scope.input.mainTabActive = $scope.ui.tabList
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )


                function parseOO(oo) {

                    let hash = {}
                    bundle.entry.forEach(function (entry) {
                        let resource = entry.resource
                        hash[`${resource.id}*`] = entry
                    })


                    //parse the validation response into a lis
                    $scope.arIssues = []

                    $scope.oo.issue.forEach(function (iss) {
                        let item = {issue : iss}
                        $scope.arIssues.push(item)

                        if (iss.location) {
                            let loc = iss.location[0]

                            //for some reason the bundle entry number is not the
                            //position of the resource in the bundle !!!
                            //so getting from the resource id
                            //does assume that the id is unique across all resources in the bundle


                            //get the issue based on the id
                            let ar1 = loc.split('/')
                            let id = ar1[2]
                            console.log(id,hash[id])
                            item.entry = hash[id]

                            /*
                            //get the resource based on the number in the issue
                            let ar = loc.split('[')

                            if (ar.length > 1) {
                                let l = ar[1]   // 2].resource
                                let g = l.indexOf(']')
                                let pos = l.slice(0,g)

                                item.entry = bundle.entry[pos]

                            } else {
                                //unknownIssues.push(iss)
                            }

*/


                        } else {
                            //this is an OO with no location. I didn't think this should happen & we don't know which resource caused it...
                            //unknownIssues.push(iss)
                        }

                        //see if there are any hints that apply
                        let ar = hints.filter(m =>   iss.diagnostics.indexOf(m.match) > -1)
                        if (ar.length > 0) {
                            item.hint = ar[0]
                        } else {
                            //there is no specific hint
                            switch (iss.severity) {
                                case 'error' :
                                    item.hint = {comment:"In general, this error should be corrected"}
                                    break
                                case 'warning' :
                                    item.hint = {comment:"A warning. It should be fixed, but the resource can still be processed"}
                                    break
                                case 'information' :
                                    item.hint = {comment:"Informational. Generally means a particular validation cannot be performed for some reason"}
                                    break
                                default :
                                    item.hint = {comment:iss.severity}
                                    break

                            }
                        }
//console.log(ar,iss.diagnostics)
                    })

                }
            }

            function validateConditional(bundle) {
                $scope.conditionalValidation = []

                $scope.countConditionalErrors = 0

                bundle.entry.forEach(function (entry) {
                    let resource = entry.resource
                    let item = {entry:entry}
                    let request = entry.request
                    let isError = false



                    let identifier = resource.identifier
                    let identifierString = ""
                    if (identifier && identifier.length > 0) {
                        identifierString = `${resource.resourceType}?identifier=${identifier[0].system}|${identifier[0].value}`
                       /*
                        let ar = url.split('=')
                        let identifierInUrl = ar[1]
                        if (identifierString !== identifierInUrl) {
                            isError = true
                            msg += "The identifier in the conditional update does not match the identifier in the resource"
                        }
                        */
                    } else {
                        isError = true
                        msg += "There is no identifier in the resource"
                    }


                    if (request) {
                        let msg = ""
                        if (request.method !== 'PUT') {
                            isError = true
                            msg = "entry.request.method should be 'PUT' "
                        }
                        let url = request.url
                        if (url) {

                            if (url !== identifierString) {
                                msg += `  conditional url should be ${identifierString}`
                                isError = true
                            }

                            /*
                            let str = `${resource.resourceType}?identifier=`
                            if (! url.startsWith(str)) {
                                isError = true
                                msg += ` entry.request.url should start with ${str}`
                            }
                            if (url.indexOf('|') == -1) {
                                isError = true
                                msg += "The identifier should also have the system"
                            }
                            */

                            //item.msg = msg
                          //  $scope.conditionalValidation.push(item)



                            if (isError) {
                                item.msg = msg
                                $scope.conditionalValidation.push(item)
                            }

                        } else {
                            isError = true
                            msg += "Missing entry.request.url"
                            item.msg = msg
                            $scope.conditionalValidation.push(item)
                        }

                        if (! isError) {
                            item.msg = "No issues"
                            //Not sure if there is value in 'no issue' messages
                            //$scope.conditionalValidation.push(item)
                        } else {
                            $scope.countConditionalErrors ++
                        }

                    } else {
                        item.msg = "Missing request parameter in entry"
                        $scope.countConditionalErrors ++
                        $scope.conditionalValidation.push(item)
                    }



                })

            }

        }
    )