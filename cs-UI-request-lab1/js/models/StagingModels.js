

angular.module("pocApp")

    .service('modelsStagingSvc', function() {

        return {

            getModels: function (hashDataGroups) {


                //DG staging
                let dgStaging = {
                    kind: "dg", name: 'Staging', title: "Staging", diff: [],
                    description: "Staging information used to describe the prognosis of the specific disease at a given time in the patient's cancer journey."
                }
                dgStaging.diff.push({
                    path: 'system', title: 'System', type: ['CodeableConcept'], mult: '0..1',
                    description: "The cancer staging system used to stage the cancer",
                    valueSet: "canshare-staging-system"
                })
                dgStaging.diff.push({path: 'date', title: 'Date', type: ['date'], mult: '0..1'})
                dgStaging.diff.push({path: 'type', title: 'Type', type: ['CodeableConcept'], mult: '1..1'})

                dgStaging.diff.push({
                    path: 'factor', title: 'Factor', type: ['Observation'], mult: '1..1',
                    "description": "A component, factor or criteria that is used to calculate the stage."
                })

                dgStaging.diff.push({path: 'factor.valueInteger',title: 'Integer value',type: ['integer'],mult: '0..1'
                })
                dgStaging.diff.push({path: 'factor.valueQuantity',title: 'Quantity value',type: ['Quantity'],mult: '0..1'
                })
                dgStaging.diff.push({path: 'factor.valueCoded',title: 'Coded value',type: ['CodeableConcept'],mult: '0..1'
                })
                dgStaging.diff.push({path: 'factor.valueString', title: 'String value', type: ['string'], mult: '0..1'})


                //dgStaging.diff.push({path:'timing',title:'Timing',type:['CodeableConcept'],mult:'0..1'})
                //dgStaging.diff.push({path:'component',title:'Component',type:['Component'],mult:'0..*'})
                dgStaging.diff.push({path: 'stage', title: 'Stage', type: ['CodeableConcept'], mult: '1..1'})
                dgStaging.diff.push({
                        path: 'comments', title: 'Commenys', type: ['string'], mult: '0..1',
                        "description": "Free text comments about the cancer stage."
                    }
                )
                hashDataGroups[dgStaging.name] = dgStaging
            }
        }
    })