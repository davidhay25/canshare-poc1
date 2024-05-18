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


            $scope.executeQuery = function (query) {
                let qry = `${$scope.server}/${query}`
                $http.get(qry).then(
                    function (data) {
                        let bundle = data.data


                        $scope.input.bundle = angular.toJson(bundle,true)


                       // $scope.validate()


                        console.log(bundle)



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
                    //todo update dr

                    //load the template then update it
                    $scope.loadTemplate(function (dr,template) {
                        template.items = template.items || []
                        template.items.push(item)
                        let att = dr.content[0].attachment
                        let json = angular.toJson(template)
                        att.data = btoa(json)
                        let qry = `${$scope.server}/DocumentReference/fpTemplate`

                        $http.put(qry,dr).then(
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
                $http.get(qry).then(
                    function (data) {

                        let dr = data.data
                        console.log(dr)
                        let att = dr.content[0].attachment
                        let json = atob(att.data)
                        let template = angular.fromJson(json)

                        $scope.input.template = template     //     {items:[{fp}]}
                        if (cb) {
                            cb(dr,template)
                        }

                    }, function (err) {
                        //alert(angular.toJson(err))
                        console.log(err)
                        if (err.status == 404 || err.status == 410) {
                            //the default template wasn't found - create it
                            $scope.input.template = {items:[]}
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

                    let url = `${$scope.server}`


                    $http.post(url,$scope.inputtedBundle).then(
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
                let url = `${$scope.server}/DocumentReference?type=bundle&_sort=-date&_summary=true&_count=20`
                $http.get(url).then(
                    function (data) {
                        $scope.libraryResultBundle = data.data

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
                $http.get(qry).then(
                    function (data) {
                        let dr = data.data
                        console.log(dr)
                        let att = dr.content[0].attachment
                        let bundle = atob(att.data)
                        $scope.input.bundle = bundle


                        $scope.validate()


                        console.log(bundle)



                    }, function (err) {
                        alert(`Error: ${angular.toJson(err.data)}`)
                    }
                )
            }

            $scope.saveBundle = function () {
                let description = window.prompt("Enter a description of this bundle")
                if (description) {
                    let dr = {resourceType:"DocumentReference",status:"current"}
                    dr.description = description
                    dr.type = {coding:[{system:"http://canshare.co.nz/fhir/NamingSystem/bv",code:"bundle"}]}
                    dr.date = new Date().toISOString()

                    let att = {data:btoa($scope.input.bundle)}
                    dr.content=[{attachment:att}]

                    let url = `${$scope.server}/DocumentReference`
                    $http.post(url,dr).then(
                        function (data) {
console.log(data)
                            let location = data.headers('Content-Location')
                            alert(`Bundle saved as ${location}`)


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
                try {
                    return fhirpath.evaluate($scope.inputtedBundle, fhirPath)
                } catch (ex) {
                    return ex
                }
            }


            $scope.executeFhirPath = function (fhirPath) {
                try {
                    $scope.fhirPathResult = fhirpath.evaluate($scope.inputtedBundle, fhirPath)
                } catch (ex) {
                    alert(ex)

                }

                console.log()
            }

            //
            $scope.validate = function() {
                let url = `${$scope.server}/Bundle/$validate`

                let bundle
                try {
                    bundle= angular.fromJson($scope.input.bundle)
                } catch (e) {
                    alert("Not valid Json. Try again.")
                    return
                }


                //the bundle parsed as an object
                $scope.inputtedBundle = bundle

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
                    //parse the validation response into a lis
                    $scope.arIssues = []

                    $scope.oo.issue.forEach(function (iss) {
                        let item = {issue : iss}
                        $scope.arIssues.push(item)

                        if (iss.location) {
                            let loc = iss.location[0]
                            let ar = loc.split('[')
                            if (ar.length > 1) {
                                let l = ar[1]   // 2].resource
                                let g = l.indexOf(']')
                                let pos = l.slice(0,g)

                                item.entry = bundle.entry[pos]

                            } else {
                                //unknownIssues.push(iss)
                            }


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
                bundle.entry.forEach(function (entry) {
                    let resource = entry.resource
                    let item = {entry:entry}
                    let request = entry.request
                    let isError = false

                    //todo need to check resource has identifier

                    if (request) {
                        let msg = ""
                        if (request.method !== 'PUT') {
                            isError = true
                            msg = "entry.request.method should be 'PUT' "
                        }
                        let url = request.url
                        if (url) {
                            let str = `${resource.resourceType}?identifier=`
                            if (! url.startsWith(str)) {
                                isError = true
                                msg += ` entry.request.url should start with ${str}`
                            }
                            if (url.indexOf('|') == -1) {
                                isError = true
                                msg += "The identifier should also have the system"
                            }
                            item.msg = msg
                            $scope.conditionalValidation.push(item)
                        } else {
                            isError = true
                            msg += "Missing entry.request.url"
                            item.msg = msg
                            $scope.conditionalValidation.push(item)
                        }

                        if (! isError) {
                            item.msg = "No issues"
                            $scope.conditionalValidation.push(item)
                        }

                    } else {
                        item.msg = "Missing request parameter in entry"
                        $scope.conditionalValidation.push(item)
                    }



                })

            }

        }
    )