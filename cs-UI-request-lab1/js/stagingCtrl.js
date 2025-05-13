//The Staging UI. Will eventually include the CM Diagnostic UI
angular.module("pocApp")
    .controller('stagingCtrl',
        function ($scope,$timeout,cmSvc) {


           // $scope.input = {}
            $scope.staging = {}
            $scope.staging.stagingPrefix = ""

            $scope.staging.cmPropertyValue = {}     //values for staging properties keyed on propKey

            $scope.stagingTNM = []  //the tnm display
            //tnm {display: value: prefixedDisplay: prefixedValue:}
            //display is fixed, others change as prefix selected


            //display is the fixed display for this row in TNM
            //baseProperty is used to calculate the prefixed property - eg {prefix}{baseProperty}-category
            //prefixedProperty is the name of the calculated property based on prefix & base property
            //  there's a lookup table for the code associated with the property
            //  it's camelcase for the display, toLowercase() for the LUT todo - check this is correct when the CM is updated

            //options will be the current set of options (forward engine from the other properties)
            //value will be the selected value for the base property
            //prefixedValue will be the calculated value from the CM
            $scope.TNMhash = {}
            $scope.TNMhash.ct = {display:'cT',baseProperty:'cT',prefixedProperty:'cT'}
            $scope.TNMhash.cn = {display:'cN',baseProperty:'cN',prefixedProperty:'cN'}
            $scope.TNMhash.cm = {display:'cM',baseProperty:'cM',prefixedProperty:'cM'}
            $scope.TNMhash.pt = {display:'pT',baseProperty:'pT',prefixedProperty:'pT'}
            $scope.TNMhash.pn = {display:'pN',baseProperty:'pN',prefixedProperty:'pN'}
            $scope.TNMhash.pm = {display:'pM',baseProperty:'pM',prefixedProperty:'pM'}

            $scope.selectPrefix = function (prefix) {
                //when the prefix ix selected we need to adjust the values in the TNMhasha
                for (const [key, value] of Object.entries($scope.TNMhash)) {
                    value.prefixedProperty = `${prefix}${value.baseProperty}-category`
                    let t = value.prefixedProperty.replace('-category',"")
                    value.prefixedPropertyCode = $scope.tnmLUT[t.toLowerCase()]
                }


                console.log($scope.TNMhash)

            }
            $timeout(function(){
                $scope.selectPrefix("")     //set up initial
            },1000)




            //When the 'diagnostic' side has finished processing, this calls the staging
            $scope.$on('dxChanged', function(event, data) {
                console.log(data);
                //data.values is hash of current values from diagnostic staging keyed on propertyKey
                //$scope.cmConfig is the complete config file. set during initialization

                //set the defaults for the 'staging1' properties - the ones that are always present

                //$scope.local.cmPropertyValue was set in cmCtrl
                //$scope.hashExpandedVs also set in cmCtrl

                console.log( $scope.local.cmPropertyValue)

                for (const key of Object.keys($scope.stagingProperties)) {
                    let property = $scope.stagingProperties[key]
                    property.options = property.options || []

                    if (property.staging1) {
                        //this is a property that sits at the top of the staging. system, type & table at present
                        let code = property.concept.code    //the snomed code for this element
                        let cmElement = cmSvc.getElementByCode($scope.fullSelectedCM,code)    //get the element
                        if (cmElement && cmElement.code) {
                            let vo = cmSvc.rulesEngine($scope.local.cmPropertyValue,cmElement,$scope.hashExpandedVs)
                            let concepts = cmSvc.getConceptsFromTarget(vo.lstMatchingTargets,$scope.hashExpandedVs)
                            property.options = concepts

                            $scope.staging.cmPropertyValue[key] = property.options[0]

                            console.log(vo,concepts)
                        } else {
                            console.error(`Code ${code} has no associated element`)
                        }

                    }
                }












            });


           // $scope.local.cmPropertyValue = {} //cmPropertyValue[property] = current value

           // let snomed = "http://snomed.info/sct"
           // let vsPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/"

            /*

            $http.get('/cmConfig').then(
                function (data) {
                    $scope.cmProperties = data.data
                    //cmProperties[property] = {concept: options: }

                    console.log(data.data)
                }
            )


            //retrieve the currenlty selected CM and expanded VS from the localforage store
            //the 'localForage' variable is defined directly by the included script in the html file
            localforage.getItem('cmData').then(function(value) {
                console.log(value)
                if (value) {
                    $scope.fullSelectedCM = value.cm
                    $scope.hashExpandedVs = value.vs
                } else {
                    //retrieve the CM & expand all the VS getAllVS(cmId)
                }


            }).catch(function(err) {
                // This code runs if there were any errors
                console.log(err);
                alert(err.message)
            });


            //given a property name, get the maximal set of options and set $scope.local.cmPropertyValue.options
            $scope.setMaximalOptions = function (propName) {
                let currentValue = $scope.local.cmPropertyValue[propName]

                let vsUrl = `${vsPrefix}${$scope.cmProperties[propName].fullVS}`

                console.log(vsUrl,$scope.hashExpandedVs[vsUrl])

                $scope.cmProperties[propName].options = angular.copy($scope.hashExpandedVs[vsUrl])

                if (currentValue) {
                    for (const concept of $scope.cmProperties[propName].options) {
                        if (concept.code == currentValue.code) {
                            $scope.local.cmPropertyValue[propName] = concept
                            break
                        }
                    }
                }
            }



            //get all the ValueSets referenced in the ConceptMap
            function getAllVS(cmId) {
                querySvc.getOneConceptMap(cmId).then(
                    function (CM) {
                        //now retrieve all the ValueSets (effectively refresh the cache)
                        $scope.fullSelectedCM = CM

                        let lstVsUrl = []   //list of all ValueSets that are used by 'in-vs' rules
                        cmSvc.getAllVSinCM($scope.fullSelectedCM, lstVsUrl)
                        if (lstVsUrl.length > 0) {
                            $scope.showWaiting = true
                            cmSvc.getVSContentsHash(lstVsUrl).then(
                                function (data) {
                                    let hashExpanded = data.hashExpanded
                                    $scope.expandErrors = data.errors
                                    console.log('vs size',utilsSvc.getSizeOfObject(hashExpanded)/1024 )
                                    alert('loaded')
                                },
                                function (err) {
                                    alert(err)
                                }
                            ).finally(function () {
                                $scope.showWaiting = false
                            })
                        }
                    }
                )
            }
           //get the expansion of all ValueSets into a hash. should be able to re-use code from CM
            let cmId = "canshare-select-valueset-map"
            //temp getAllVS(cmId)



*/




        }
    )