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

            $scope.staging.prefixedTNM = {} //the prefixed category


            //display is the fixed display for this row in TNM
            //baseProperty is used to calculate the prefixed property - eg {prefix}{baseProperty}-category
            //prefixedProperty is the name of the calculated property based on prefix & base property
            //  there's a lookup table for the code associated with the property
            //  it's camelcase for the display, toLowercase() for the LUT todo - check this is correct when the CM is updated

            //options will be the current set of options (forward engine from the other properties)
            //value will be the selected value for the base property
            //propName is the propertyname for the non-prefixed version of this property
            //prefixedValue will be the calculated value from the CM
            //todo - replace with data from config... - add the base proprty to the config
            $scope.TNMhash = {}
            $scope.TNMhash.ct = {display:'cT',baseProperty:'cT',propName:"ct-category-prefix-free"} //,prefixedProperty:'cT'}
            $scope.TNMhash.cn = {display:'cN',baseProperty:'cN',propName:"cn-category-prefix-free"} //,prefixedProperty:'cN'}
            $scope.TNMhash.cm = {display:'cM',baseProperty:'cM',propName:"cm-category-prefix-free"} //,prefixedProperty:'cM'}
            $scope.TNMhash.pt = {display:'pT',baseProperty:'pT',propName:"pt-category-prefix-free"} //,prefixedProperty:'pT'}
            $scope.TNMhash.pn = {display:'pN',baseProperty:'pN',propName:"pn-category-prefix-free"} //,prefixedProperty:'pN'}
            $scope.TNMhash.pm = {display:'pM',baseProperty:'pM',propName:"pm-category-prefix-free"} //,prefixedProperty:'pM'}


            //get the  code from the config file. We have the tnm stuff in a searate object
            //as it's a bit more complicated with the prefixes..
            $timeout(function(){
                for (const key of Object.keys($scope.TNMhash)) {
                    let tnmItem = $scope.TNMhash[key]
                    let item = $scope.stagingProperties[tnmItem.propName]
                    if (item) {
                        $scope.TNMhash[key].concept = item.concept
                    }
                }
                $scope.selectPrefix("")     //set up initial prefix

                console.log($scope.TNMhash)
            },1000)

            $scope.selectPrefix = function (prefix) {
                //when the prefix is selected we need to adjust the values in the TNMhasha
                for (const [key, value] of Object.entries($scope.TNMhash)) {
                    value.prefixedProperty = `${prefix}${value.baseProperty}-category`
                    let t = value.prefixedProperty.replace('-category',"")
                    value.prefixedPropertyCode = $scope.tnmLUT[t.toLowerCase()]

                    //set the actual value - todo is there a better place for this config? in the cmConfig.json
                    let prefixPropName = "cancer-staging-prefix"
                    switch (prefix) {
                        case "y":
                            $scope.local.cmPropertyValue[prefixPropName] = {code:"576031000210100"}
                            break
                        case "r":
                            $scope.local.cmPropertyValue[prefixPropName] = {code:"361271000210107"}
                            break
                        default:
                            delete $scope.local.cmPropertyValue[prefixPropName]
                    }

                    //when setting the prefix, we need to re-calculate all the tnm cateories that have been selected
                    $scope.processTNMSelect(key,value)

                }
                
            }



            //When the 'diagnostic' side has finished processing, this calls the staging
            $scope.$on('dxChanged', function(event, data) {
                console.log(data);
                //set the defaults for the 'staging1' properties - the ones that are always present
                //data.values is hash of current values from diagnostic staging keyed on propertyKey
                //$scope.cmConfig is the complete config file. set during initialization
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

                            $scope.local.cmPropertyValue[key] = property.options[0]

                           // console.log(vo,concepts)
                        } else {
                            console.error(`Code ${code} has no associated element`)
                        }

                    }
                }
                $scope.updateStaging()
            });

            //called when the prefix free version of tnm is called. Separate (for now) as
            //we need to process the prefixed version
            $scope.processTNMSelect = function (k,v) {
                console.log(k,v)

                //the value for the tnm dropdown is bound to the propKey for the item - eg ct, cn etc.
                //it needs to be bound to "ct-category-prefix-free" ? maybe the
                //$scope.local.cmPropertyValue["ct-category-prefix-free"] = $scope.local.cmPropertyValue[k]
                $scope.local.cmPropertyValue[`${k}-category-prefix-free`] = $scope.local.cmPropertyValue[k]

                //set the staging type to clinical ? todo add to TNMHash (possibly in cmConfig originally
                $scope.local.cmPropertyValue["cancer-staging-type"] = {code:"80631005"}

                //the code for prefixed property - eg rct. We use it to get the element in the CT that defines this property
                let prefixedPropertyCode = v.prefixedPropertyCode

                //the element from the CM
                let cmElement = cmSvc.getElementByCode($scope.fullSelectedCM,prefixedPropertyCode)    //get the element
                if (cmElement && cmElement.code) {
                    let vo = cmSvc.rulesEngine($scope.local.cmPropertyValue, cmElement, $scope.hashExpandedVs)
                    console.log(vo)
                    //we look at the list of matching targets (rather than matching VS) as that will give us the display. lstVs has only the code when it's a concept not a VS
                    if (vo.lstMatchingTargets.length > 0) {
                        //assume only 1 for now
                        let target = vo.lstMatchingTargets[0]
                        let concept = {code:target.code,display:target.display}
                        $scope.staging.prefixedTNM[k] = concept         //this is the display
                    }
                }
            }

            //called when any of the staging properties change - actually not the TNM ones
            $scope.updateStaging = function()  {
                //set the values for all the prefix free TNM controls
                for (const key of Object.keys($scope.TNMhash)) {
                    let value = $scope.TNMhash[key]
                    let code = value.concept.code    //the snomed code for this element
                    let cmElement = cmSvc.getElementByCode($scope.fullSelectedCM,code)    //get the element
                    if (cmElement && cmElement.code) {
                        let vo = cmSvc.rulesEngine($scope.local.cmPropertyValue,cmElement,$scope.hashExpandedVs)
                        let concepts = cmSvc.getConceptsFromTarget(vo.lstMatchingTargets,$scope.hashExpandedVs)

                        value.options = concepts
                        $scope.local.cmPropertyValue[key] = value.options[0]

                         //console.log(vo,concepts)
                    } else {
                        console.error(`Code ${code} has no associated element`)
                    }

                }


            }



        }
    )