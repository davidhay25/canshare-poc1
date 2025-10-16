angular.module("portalApp")
    .controller('csPortalCtrl',
        function ($scope,$uibModal,$timeout) {


            $scope.canShow = function (item) {
                if (item.loggedIn) {
                    if ($scope.user && $scope.user.email) {
                        return true
                    } else {
                        return false
                    }
                } else {
                    return true
                }

            }


            $scope.options = []

            let vs = {display:"FHIR ValueSets",options:[]}
            vs.options.push({display:"ValueSet Viewer",
                url:'canshare/vsLookup.html',
                text:"A module to explore CanShare FHIR ValueSets including viewing ValueSet members."})
            vs.options.push({display:"ValueSet Editor",
                url:'canshare/updateVS.html',
                loggedIn:true,text:"A module to create and update ValueSets and code systems, manage unpublished concepts, test ECL and download a ValueSet list."})
            $scope.options.push(vs)

            let cm = {display:"FHIR ConceptMaps",options:[]}
            $scope.options.push(cm)
            cm.options.push({display:"ConceptMap Viewer",
                url:'canshare/cmTester.html',
                text:"A module to test CanShare FHIR ConceptMaps (model user interface)."})
            cm.options.push({display:"ConceptMap Editor",loggedIn:true,
                url:'canshare/updateCM.html',
                text:"A module to create and update ConceptMaps."})

            let q = {display:"FHIR Questionnaires (Forms)",options:[]}
            $scope.options.push(q)
            q.options.push({display:"Questionnaire Editor",loggedIn:true,
                url:'forms/models.html',
                text:"A module to create, update and import Collections/FHIR Questionnaires/forms using the Logical Information Model (LIM)/Collections tooling modes. "})

            q.options.push({display:"Questionnaire Viewer",
                url:'forms/modelReview.html',
                text:"A module to view and download FHIR Questionnaires in different formats."})

            q.options.push({display:"QuestionnaireResponse Viewer",
                url:'forms/qrVisualizerAdHoc.html',
                text:"A module to view FHIR Questionnaire Responses in a structured/table format, from Json format."})

            q.options.push({display:"QuestionnaireResponse viewer for AI",loggedIn:true,
                url:'canshare/qrVisualizer.html',
                text:"A module to view FHIR Questionnaires in a structured/table format, from AI model output format."})

            let arc = {display:"Archives",options:[]}

            arc.options.push({display:"Data Standards Manager",
                text:"A historical site where pathology requests, reports, and other cancer-related data  requirements are documented."})
            arc.options.push({display:"Logical Information Model",loggedIn:true,
                url:'canshare/models.html',
                text:"The original Logical Information Model"})
            $scope.options.push(arc)

            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    $scope.user = {email:user.email,displayName : user.displayName}

                   // to allow the rest of the page to load on first rendering
                    $timeout(function () {
                        $scope.$digest()
                    },1)

                } else {
                    delete $scope.user
                    $scope.$digest()
                }



            });

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: './login.html',
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