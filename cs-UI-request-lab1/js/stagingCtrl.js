//The Staging UI. Will eventually include the CM Diagnostic UI
angular.module("pocApp")
    .controller('stagingCtrl',
        function ($scope,$timeout,cmSvc) {



            let SNOMED = "http://snomed.info/sct"
           // $scope.input = {}
            $scope.staging = {}
            $scope.staging.stagingPrefix = ""
            $scope.staging.hide = {} //for properties that are hidden is there are no values

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
            $scope.TNMhash.ct = {display:'cT',baseProperty:'cT',propName:"ct-category-prefix-free"}
            $scope.TNMhash.cn = {display:'cN',baseProperty:'cN',propName:"cn-category-prefix-free"}
            $scope.TNMhash.cm = {display:'cM',baseProperty:'cM',propName:"cm-category-prefix-free"}
            $scope.TNMhash.pt = {display:'pT',baseProperty:'pT',propName:"pt-category-prefix-free"}
            $scope.TNMhash.pn = {display:'pN',baseProperty:'pN',propName:"pn-category-prefix-free"}
            $scope.TNMhash.pm = {display:'pM',baseProperty:'pM',propName:"pm-category-prefix-free"}


            //get the  code from the config file after it has loaded. We have the tnm stuff in a searate object
            //as it's a bit more complicated with the prefixes..
            $scope.$on('cmConfigLoaded',function () {
                for (const key of Object.keys($scope.TNMhash)) {
                    let tnmItem = $scope.TNMhash[key]
                    let item = $scope.stagingProperties[tnmItem.propName] //<<< from the config file
                    if (item) {
                        //todo - would it be better to add the display & system to the config file?
                        $scope.TNMhash[key].concept = item.concept
                        $scope.TNMhash[key].concept.display = key
                        $scope.TNMhash[key].concept.system = "http://snomed.info/ct"
                    }
                }
                $scope.selectPrefix("")     //set up initial prefix
                hideIfEmpty()   //hide elements that aren't shown if no options

                console.log($scope.TNMhash)
            })

            $scope.selectPrefix = function (prefix) {
                //when the prefix is selected we need to adjust the values in the TNMhasha
                for (const [key, value] of Object.entries($scope.TNMhash)) {
                    value.prefixedProperty = `${prefix}${value.baseProperty}-category`
                    let t = value.prefixedProperty.replace('-category',"")
                    value.prefixedPropertyCode = $scope.tnmLUT[t.toLowerCase()]  //Get code from the lookup table

                    //set the actual value - todo is there a better place for this config? in the cmConfig.json
                    //todo magic numbers
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


            //update the non-tnm stuff
            function updateSpecificStaging(stageGroup) {
                for (const key of Object.keys($scope.stagingProperties)) {
                    let property = $scope.stagingProperties[key]
                    property.options = property.options || []


                    if (property[stageGroup]) {
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
                    }
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

                //note that the staging1 propertien only change when the 'diagnostic' properties change

                updateSpecificStaging('staging1')
                $scope.updateStaging()
            });

            //called when the prefix free version of tnm is changed (ie the dropdown). Separate functionity (for now) as
            //we need to process the prefixed version. processes a single TNM
            //also called when any of the other properties change
            $scope.processTNMSelect = function (k) {
               // console.log(k,v)

                let v = $scope.TNMhash[k]

                //the value for the tnm dropdown is bound to the propKey for the item - eg ct, cn etc.
                //it needs to be bound to "ct-category-prefix-free" ? maybe the
                $scope.local.cmPropertyValue[`${k}-category-prefix-free`] = $scope.local.cmPropertyValue[k]

                //set the staging type to clinical ? todo add to TNMHash (possibly in cmConfig originally
                //could look at the first letter - 'c' = clinicap, 'p' - pathological
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
                        let concept = {code:target.code,display:target.display, system:SNOMED}

                        //Rhis is the actual TNM value
                        $scope.staging.prefixedTNM[k] = concept         //this is the display

                        //$scope.TNMhash[k].currentValue = concept    //todo is this correct?

                        //tnm.prefixedPropertyCode is the code for the specific (incl. prefix)
                        //tnm.currentValue is the currently selected value


                    }
                } else {
                    //todo this is only necessary (I think) when the tnm is not in the CM
                    if ($scope.TNMhash[k].options) {
                       // $scope.TNMhash[k].currentValue = $scope.TNMhash[k].options[0]

                        $scope.staging.prefixedTNM[k] = $scope.TNMhash[k].options[0]
                    }

                }
                $scope.makeDocument()
            }

            $scope.makeDocument = function() {
                //return


                let vo = cmSvc.makeDocument($scope.local.cmPropertyValue,$scope.TNMhash,$scope.staging.prefixedTNM)

                $scope.$parent.fhirDoc = vo.bundle
                $scope.$parent.fhirComposition = vo.comp
                $scope.$parent.fhirLocalDisplay = vo.localDisplay
                $scope.$parent.fhirprefixedTNM = $scope.TNMhash

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
console.log(key,concepts)
                        value.options = concepts
                        $scope.local.cmPropertyValue[key] = value.options[0]
                        $scope.processTNMSelect(key,value)      //update the prefixed displays
                    } else {
                        console.error(`Code ${code} has no associated element`)
                    }

                }


                //now update the 'staging3 controls
                updateSpecificStaging('staging3')

                //hide properties that have no options and are configured to hide
                hideIfEmpty()

                $scope.makeDocument()
            }

            function hideIfEmpty() {
                // if a propert has 'hideIfNoOptions' set, then hide if there are no options
                for (const [key, value] of Object.entries($scope.stagingProperties)) {
                    if (value.hideIfNoOptions) {
                        $scope.staging.hide[key] = true


                        if ($scope.stagingProperties[key] && $scope.stagingProperties[key].options &&
                            $scope.stagingProperties[key].options.length > 0)
                        {
                            $scope.staging.hide[key] = false

                        }
                    }

                }
                console.log($scope.staging.hide)


            }



        }
    )