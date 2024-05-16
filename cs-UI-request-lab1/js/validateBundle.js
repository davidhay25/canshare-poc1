angular.module("pocApp")
    .controller('validateBundleCtrl',
        function ($scope,$http,$sce) {


            //indexes for the main tabs to allow tabs to be selected from code
            $scope.ui = {}
            $scope.ui.tabBundle = 0;
            $scope.ui.tabList = 1;
            $scope.ui.tabOO = 1;


            $scope.input = {}

            $scope.loadSample = function () {
                $http.get('/sampleAN').then(
                    function (data) {
                        $scope.input.bundle = angular.toJson(data.data)
                    }

                )
            }

            let hints
            $http.get('validatorHints').then(
                function (data) {
                    hints=data.data
                }
            )
/*
            var trusted = {};
            $scope.getSeverityMessage = function (severity) {
                let msg
                switch (severity) {
                    case "error" :
                        msg = "This is a fatal error. The Bundle will be rejected"
                        break
                    case "warning" :
                        msg = "The bundle will be accepted, but this should really be fixed"
                        break
                    case "information" :
                        msg = "This generally means something that can be ignored"
                        break

                }
                console.log(msg)
                msg = `<div>${msg}</div>`
                return trusted[msg] || (trusted[msg] = $sce.trustAsHtml(msg));
              //  return msg
                //return $sce.trustAsHtml(msg)

            }

            */
/*
            let hint1 = {match:"does not match any known slice", comment:"This simply means that there additional elements in a sliced element (eg catagory)"}

            let hints = []
            hints.push(hint1)
*/
            $scope.selectIssue = function(issue) {
                $scope.input.selectedIssue = issue
            }


            //$scope.input.mainTabActive = 1 // $scope.ui.tabTrack;

            $scope.validate = function(domain) {
                //let url = `validateBundle?type=${domain}`

                //let url = "http://localhost:8087/fhir/Bundle/$validate"
                let url = "http://localhost:8080/fhir/Bundle/$validate"

                //let url = "http://actnow.canshare.co.nz:9092/baseR4/Bundle/$validate"

                let bundle= angular.fromJson($scope.input.bundle)

                $scope.inputtedBundle = bundle
                //parse the bundle into an array so it can


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
                                    item.hint = {comment:"This error must be corrected"}
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

        }
    )