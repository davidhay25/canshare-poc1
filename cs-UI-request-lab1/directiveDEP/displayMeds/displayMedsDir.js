angular.module('pocApp')
    .directive('displaymeds', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                meds: '='  //a bundle containing all the meds
            },

            templateUrl: 'directive/displayMeds/displayMedsDir.html',
            controller: function ($scope) {

                $scope.input = {};

                //triggered when the Q associated with this directive is altered
                $scope.$watch(
                    function () {
                        return $scope.meds
                    },
                    function () {
                        if ($scope.meds) {
                            processBundle($scope.meds)
                            createTimeLine()
                        }
                    }
                )

                //generate the summary objects used by the timeline
                //$scope.uniqueMedAdminDate and $scope.uniqueRxDate
                function processBundle(bundle) {
                    //let hashAdm$scope.in = {}
                    $scope.hashMedObs = {}


                    $scope.uniqueMedAdminDate = {}      //a hash of all dates that an administration was given
                    $scope.uniqueRxDate = {}      //a hash of all dates that a prescription was given (MR)
                    bundle.entry.forEach(function (entry) {
                        let resource = entry.resource
                        switch (resource.resourceType) {
                            case "MedicationAdministration" :

                                //the date that the administration was given. Ignore if no date (shouldn't happen)
                                if (resource.effectivePeriod) {
                                    let da = resource.effectivePeriod.start
                                    if (da) {
                                        //only want to day accuracy
                                        let ar = da.split("T")
                                        let day = ar[0]
                                        $scope.uniqueMedAdminDate[day] = $scope.uniqueMedAdminDate[day] || []
                                        $scope.uniqueMedAdminDate[day].push(resource)
                                    }

                                }


                                break

                            case "MedicationRequest" :
                                if (resource.authoredOn) {
                                    //only want to day accuracy
                                    //ignore no authoredOn - shouldn't happen
                                    if (resource.authoredOn) {
                                        let ar = resource.authoredOn.split("T")
                                        let day = ar[0]
                                        $scope.uniqueRxDate[day] = $scope.uniqueRxDate[day] || []
                                        $scope.uniqueRxDate[day].push(resource)
                                    }

                                }

                                break

                        }

                    })

                }


                //generate the timeline -  // https://visjs.github.io/vis-timeline/docs/timeline/
                //uses $scope.uniqueMedAdminDate and $scope.uniqueRxDate
                function createTimeLine() {
                    //hashMedObs are all observations for a geven ma

                    $('#medTimeline').empty();     //otherwise the new timeline is added below the first...

                    let arData = []
                    let uniqueMeds = {}     //unique medications. used for the grouping
                    ctr = 0

                    //console.log(uniqueMedAdminDate)

                    Object.keys($scope.uniqueMedAdminDate).forEach(function (date) {
                        let arMeds = $scope.uniqueMedAdminDate[date]        //all meds administered on that date
                        //now create an item for each med in the hash using the drug name as a grouper
                        //unclear what happens if the drug name is repeated...
                        arMeds.forEach(function (MA) {
                            let drugName = "Unknown"        //this will be the group
                            if (MA.medicationCodeableConcept) {
                                drugName = MA.medicationCodeableConcept.text

                                let route = ""
                                if (MA.dosage && MA.dosage.route) {
                                    drugName += " " + MA.dosage.route.text
                                }

                            }


                            //just the details of the med

                            //set the max length of the drug display
                            let adjustedDrugName = drugName
                            if (drugName.length > 30) {
                                adjustedDrugName = drugName.substring(0,27) + "..."
                            }

                            //uniqueMeds[drugName] = {id:drugName,content:drugName}
                            uniqueMeds[drugName] = {id:drugName,content:adjustedDrugName}
                            let item = {}
                            item.id = ctr++
                            item.start = date
                            item.group = drugName
                            item.MA = MA
                            item.resource = MA
                            /*
                            item.observations = hashMedObs[`MedicationAdministration/${MA.id}`]
                            if (item.observations && item.observations.length > 0) {
                                item.className = 'red'
                                item.title = "Has observations"
                            }
*/
                            if (MA.dosage) {
                                item.content = MA.dosage.text
                                //item.content = "*"
                            }

                            arData.push(item)

                        })
                    })


                    //add the Rx data to the mix
                    Object.keys($scope.uniqueRxDate).forEach(function (date) {
                        let arRx = $scope.uniqueRxDate[date]        //all meds prescribed on that date
                        arRx.forEach(function (rx) {
                            if (rx.authoredOn) {

                                //not actually getting routes on these meds
                                let route = ""
                                if (rx.dosageInstruction && rx.dosageInstruction.route) {
                                    route = rx.dosageInstruction.route.text
                                }

                                let drugName = rx.medicationCodeableConcept.text + " (rx) " + route

                                //just the details of the med
                                uniqueMeds[drugName] = {id:drugName,content:drugName}

                                let item = {}
                                item.id = ctr++
                                item.start = date
                                item.group = drugName
                                item.rx = rx            //just for the display todo - make rx separate
                                item.resource = rx


                                arData.push(item)

                            }
                        })
                    })


/*
                    let uniqueObs = {}      //has of unique observation types
                    Object.keys($scope.hashAllObsById).forEach(function (key) {
                        let obs = $scope.hashAllObsById[key]
                        if (obs.effectiveDateTime) {        //todo - temp - just a shart term hack...
                            let item = {}
                            item.id = ctr++
                            item.start = obs.effectiveDateTime
                            let text = ""
                            if (obs.code && obs.coding) {
                                text = obs.coding[0].code
                            }
                            if (obs.code.text) {
                                text = obs.code.text
                            }


                            uniqueObs[text] = {id:text,content:text}
                            item.content = ""
                            if (obs.valueQuantity) {
                                item.content =  obs.valueQuantity.value.toString()
                            }

                            item.group = text
                            item.obs  = obs
                            item.resource = obs
                            arData.push(item)
                        }



                    })
*/
                    //create the group array (individual drugs)
                    let arGroups = []
                    Object.keys(uniqueMeds).forEach(function (key) {
                        let group = uniqueMeds[key]
                        arGroups.push({id:group.id, content:group.content})
                    })

                    /*
                    //add the observation group
                    Object.keys(uniqueObs).forEach(function (key) {
                        let group = uniqueObs[key]
                        arGroups.push({id:group.id, content:group.content, style :"background-color:pink"})
                    })
*/

                    var container = document.getElementById('medTimeline');


                    let items = new vis.DataSet(arData)

                    // Configuration for the Timeline
                    var options = {};

                    // Create a Timeline
                    var timeline = new vis.Timeline(container, items, options);

                    timeline.setGroups(arGroups)

                    container.onclick = function(event) {
                        var props = timeline.getEventProperties(event)
                        let id = props.item
                        delete $scope.timelineValidationResults
                        $scope.selectedTimeLineItem = arData[id]
                        if ($scope.selectedTimeLineItem && $scope.selectedTimeLineItem.resource) {
                            $scope.getProfileLink($scope.selectedTimeLineItem.resource)
                        }

                        console.log(arData[id])
                        $scope.$digest()


                    }


                }


            }
        }
    })