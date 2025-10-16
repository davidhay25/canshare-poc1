
//this iss a copy (edited) of the service from the first act-now and inefficient (it has the full patient record)
//todo - refactor to make use of multiple, targetted queries
angular.module("formsApp")

    .service('anSvc', function($filter,$http,$q) {

        gleasonCode = "http://snomed.info/sct|372278000"
        tnmClinicalCode = "http://loinc.org|c-tnm"
        tnmPathologicalCode = "http://loinc.org|21908-9"

        extDiscontinued = "http://canshare.co.nz/fhir/StructureDefinition/an-regimen-discontinued"
        extCycleNumber = "http://canshare.co.nz/fhir/StructureDefinition/an-cycle-number"
        extCyclePlannedLength = "http://canshare.co.nz/fhir/StructureDefinition/an-cycle-planned-length"

        return {

            getCarePlanCategory(cp) {
                let cpType
                if (cp.category && cp.category[0].coding) {
                    cpType = cp.category[0].coding[0].code
                }
                return cpType
            },

            createSummary : function (patient) {
                let that = this
                let deferred = $q.defer()
                //todo - this is *really* inefficient!
                let url = `Patient/${patient.id}/$everything`
                let encodedQry = encodeURIComponent(url)
                $http.get(`proxy?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data.data)
                        let summary = process(data.data.entry)
                        deferred.resolve({summary:summary,bundle:data.data})

                    }, function (err) {

                    })

                return deferred.promise


                function process(allEntries) {

                //allEntries
                //create a summary object for the clinical summary view. Suppert multiple regimens...
                //let that = this
                //create the list of regimen plans
                    let summary = {regimens:[]}
                    let hashAllResources = {}       //hash by reference
                    allEntries.forEach(function (entry) {
                        let resource = entry.resource
                        hashAllResources[resource.resourceType + "/" + resource.id] = resource

                        if (resource.resourceType == 'CarePlan' && that.getCarePlanCategory(resource) == 'regimenCP') {
                            //this is a regimen CarePlan
                            summary.regimens.push({regimenCP:resource,addresses:[],before:[],after:[],cycles : []})
                        }
                    })

                    summary.regimens.forEach(function (regimen) {

                        //if status revoked, then extract the reason
                        if (regimen.regimenCP.status == 'revoked') {


                          //  let ext = that.getSingleComplexExtension(regimen.regimenCP,extDiscontinued)
                            regimen.revoked = that.getSingleComplexExtension(regimen.regimenCP,extDiscontinued)
                          //  console.log(ext)

                        }

                        //the Conditions that this plan addresses
                        if (regimen.regimenCP.addresses) {
                            regimen.regimenCP.addresses.forEach(function (ref) {
                                let key = ref.reference
                                regimen.addresses.push(hashAllResources[key])       //this should be a Condition
                            })
                        }

                        //resources like staging that are made before regimen starts
                        if (regimen.regimenCP.supportingInfo) {
                            regimen.regimenCP.supportingInfo.forEach(function (ref) {
                                let key = ref.reference

                                //now check for specifics - gleason, staging
                                let resource = hashAllResources[key]    //todo assume these are observations for now..

                                if (resource && resource.code && resource.code.coding) {
                                    let code = resource.code.coding[0].system + "|" + resource.code.coding[0].code

                                    switch (code) {
                                        case gleasonCode :
                                            regimen.gleason = {}
                                            resource.component.forEach(function (comp) {
                                                if (comp.code && comp.code.coding) {
                                                    let subCode = comp.code.coding[0].code
                                                    switch (subCode) {
                                                        case "384994009":
                                                            regimen.gleason.primary = comp.valueInteger
                                                            break
                                                        case "384995005":
                                                            regimen.gleason.secondary = comp.valueInteger
                                                            break
                                                        case "385002007":
                                                            regimen.gleason.tertiary = comp.valueInteger
                                                            break
                                                    }
                                                }
                                            })
                                            break
                                        case tnmPathologicalCode :
                                            regimen.pTNM = {}
                                            regimen.pTNM.group = resource.valueCodeableConcept
                                            if (resource.hasMember) {
                                                resource.hasMember.forEach(function (member) {
                                                    let key = member.reference
                                                    let obs = hashAllResources[key]
                                                    if (obs) {
                                                        let obsCode = obs.code.coding[0].system + "|" + obs.code.coding[0].code
                                                        switch (obsCode) {
                                                            case "http://loinc.org|21905-5" :
                                                                regimen.pTNM.T = obs.valueCodeableConcept
                                                                break
                                                            case "http://loinc.org|21906-3" :
                                                                regimen.pTNM.N = obs.valueCodeableConcept
                                                                break
                                                            case "http://loinc.org|21907-3" :
                                                                regimen.pTNM.M = obs.valueCodeableConcept
                                                                break
                                                        }
                                                    }

                                                })
                                            }

                                            break

                                        case tnmClinicalCode :
                                            regimen.cTNM = {}
                                            regimen.cTNM.group = resource.valueCodeableConcept
                                            if (resource.hasMember) {
                                                resource.hasMember.forEach(function (member) {
                                                    let key = member.reference
                                                    let obs = hashAllResources[key]
                                                    if (obs) {
                                                        let obsCode = obs.code.coding[0].system + "|" + obs.code.coding[0].code
                                                        switch (obsCode) {
                                                            case "http://loinc.org|c-t" :
                                                                regimen.cTNM.T = obs.valueCodeableConcept
                                                                break
                                                            case "http://loinc.org|c-n" :
                                                                regimen.cTNM.N = obs.valueCodeableConcept
                                                                break
                                                            case "http://loinc.org|c-m" :
                                                                regimen.cTNM.M = obs.valueCodeableConcept
                                                                break
                                                        }
                                                    }

                                                })
                                            }

                                            break

                                    }

                                } else {
                                    regimen.before.push(hashAllResources[key])
                                }

                            })
                        }

                        //now look for cycles associated with this regimen

                        let refToRegimenCP = "CarePlan/" + regimen.regimenCP.id
                        allEntries.forEach(function (entry) {
                            let resource = entry.resource

                            if (resource.resourceType == 'CarePlan' && that.getCarePlanCategory(resource) == 'cycleCP') {
                                //this is a cycle CarePlan
                                if (resource.partOf) {
                                    resource.partOf.forEach(function (po) {
                                        if (po.reference == refToRegimenCP ) {
                                            let item = {resource:resource,referenced:[],meta : {}}

                                            //the extensions - cyclenumber & length
                                            item.meta.cycleNumber = that.getSingleExtension(resource,extCycleNumber,"Integer")
                                            item.meta.plannedCycleLength = that.getSingleExtension(resource,extCyclePlannedLength,"Integer")


                                            let startDate = moment(resource.period.start)
                                            let endDate = moment(resource.period.end)
                                            item.meta.cycleLength = endDate.diff(startDate,'days')



                                            let key = "CarePlan/"+resource.id
                                            //now locate all resources that have a 'supporting information' reference to the cycle
                                            allEntries.forEach(function (entry1) {
                                                let resource1 = entry1.resource
                                                if (resource1.supportingInformation) {
                                                    resource1.supportingInformation.forEach(function (si) {
                                                        if (si.reference == key) {
                                                            let thing = {resource:resource1}
                                                            thing.summary = getSummary(resource1)
                                                            item.referenced.push(thing)
                                                        }
                                                    })
                                                }

                                            })
                                            //now sort the resources by date - a bit tricky as different resources have different date elements...

                                            item.referenced.sort(function(a,b){
                                                let da1 = a.summary.date
                                                let da2 = b.summary.date
                                                if (da1 > da2) {
                                                    return 1
                                                } else {
                                                    return -1
                                                }
                                            })

                                            regimen.cycles.push(item)

                                        }
                                    })

                                }
                            }

                            //now sort the cycles by date
                            try {
                                regimen.cycles.sort(function(a,b){
                                    if (a.resource.period.start > b.resource.period.start) {
                                        return 1
                                    } else {
                                        return -1
                                    }
                                })
                            } catch (ex) {
                                //if there's a missing period will screw up the sort...
                            }

                        })

                    })



                    return summary
                }

                function getSummary(resource) {
                    let summary = {}
                    summary.date = new Date().toISOString()
                    summary.display = $filter('cleanTextDiv')(resource.text.div);

                    switch (resource.resourceType) {
                        case "Observation" :
                            summary.date = resource.effectiveDateTime

                            break
                        case "MedicationAdministration" :
                            summary.date = resource.effectivePeriod.start

                            break
                        case "MedicationRequest" :
                            summary.date = resource.authoredOn

                            break
                    }
                    return summary

                }

            },

            getSingleExtension : function(resource,url,type) {
                let result
                if (resource && resource.extension && url) {
                    resource.extension.forEach(function(ext){
                        if (ext.url == url) {
                            result = ext['value'+type]
                        }
                    })
                }
                return result
            },

            getSingleComplexExtension : function(resource,url) {
                let result = {}
                if (resource && resource.extension && url) {
                    resource.extension.forEach(function(ext){
                        if (ext.url == url) {
                            //this is the extension - construct an object with the child elements
                            if (ext.extension) {
                                ext.extension.forEach(function (child) {
                                    result[child.url] = child
                                })
                            }
                           // result = ext['value'+type]
                        }
                    })
                }
                return result
            },


        }
    })