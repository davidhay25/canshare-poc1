//The Staging UI. Will eventually include the CM Diagnostic UI
angular.module("pocApp")
    .controller('gradingCtrl',
        function ($scope,$timeout,cmSvc) {



            function updateGrading(stageGroup) {
                for (const key of Object.keys($scope.cmConfig.gradingProperties)) {
                    let property = $scope.cmConfig.gradingProperties[key]
                    property.options = property.options || []


                  //  if (property[stageGroup]) {
                        //this is a property that sits at the top of the staging. system, type & table at present
                        let code = property.concept.code    //the snomed code for this element
                        let cmElement = cmSvc.getElementByCode($scope.fullSelectedCM,code)    //get the element
                        if (cmElement && cmElement.code) {
                            let vo = cmSvc.rulesEngine($scope.local.cmPropertyValue,cmElement,$scope.hashExpandedVs)

                            let concepts = cmSvc.getConceptsFromTarget(vo.lstMatchingTargets,$scope.hashExpandedVs)

                            property.options = concepts

                            $scope.local.cmPropertyValue[key] = property.options[0]

                            // console.log(vo,concepts)
                        } else {

                            console.warn(`Code ${code} has no associated element in the CM. key:${key} group:${stageGroup}`)
                        }
                   // }
                }

            }

            $scope.$on('dxChanged', function(event, data) {
                console.log(data);
                //set the defaults for the 'staging1' properties - the ones that are always present
                //data.values is hash of current values from diagnostic staging keyed on propertyKey
                //$scope.cmConfig is the complete config file. set during initialization
                //$scope.local.cmPropertyValue was set in cmCtrl
                //$scope.hashExpandedVs also set in cmCtrl

               // console.log( $scope.local.cmPropertyValue)

                //note that the staging1 propertien only change when the 'diagnostic' properties change
                //this seems to be called before the other properties (in staging) have been set.
                //staging works as all the properties are called in order - dependsOn has been set...
                $timeout(function () {
                    updateGrading()
                },500)


            });


        }
    )