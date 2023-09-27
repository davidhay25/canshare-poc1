

angular.module("pocApp")

    .service('modelsStagingSvc', function() {

        return {

            getModels: function (hashDataGroups) {


                //DG staging
                let dgStaging = {
                    kind: "dg", name: 'Staging', title: "Staging", diff: [],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=524749899",
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
                        path: 'comments', title: 'Comments', type: ['string'], mult: '0..1',
                        "description": "Free text comments about the cancer stage."
                    }
                )
                hashDataGroups[dgStaging.name] = dgStaging

                //=============================== AJCC staging

                let dgStagingAJCC = {
                    kind: "dg", name: 'StagingAJCC', parent: "Staging", title: "AJCC staging", diff: [],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=524749899",
                    description: ""
                }

                dgStagingAJCC.diff.push({
                    path: 'system', title: 'System', type: ['CodeableConcept'], mult: '0..1',
                    description: "The cancer staging system used to stage the cancer",
                    fixedCoding : {code:'897275008',display:'AJCC 8th edition tumour staging system',fsn:'American Joint Commission on Cancer, Cancer Staging Manual, 8th edition neoplasm staging system (tumor staging)'},
                    valueSet: "canshare-staging-system"
                })


                //we need to slice the factor. So the 'parent' element becomes a group, and the slices are nested below it
                dgStagingAJCC.diff.push({path:'factor',title:'Factor',
                    type:['Group'],mult:'0..*',
                    originalType : ["Observation"],     //this is so that the element can be further sliced in the UI
                    description:"This is a sliced element to specify the possible factor observations"})

                //now the slice for T category (align with mcode)
                dgStagingAJCC.diff.push({path:'factor.slice:Tcategory',title:'The primary tumour node stage.',
                    type:['Observation'],mult:'1..1'})

                dgStagingAJCC.diff.push({path:'factor.slice:Tcategory.code',title:'Code',
                    fixedCoding : {display:'Tcategorycode'},
                    type:['CodeableConcept'],mult:'0..1'})




                //now the slice for n category
                dgStagingAJCC.diff.push({path:'factor.slice:Ncategory',title:'The regional lymph node stage.',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCC.diff.push({path:'factor.slice:Ncategory.code',title:'Code',
                    fixedCoding : {display:'Ncategorycode'},
                    type:['CodeableConcept'],mult:'1..1'})

                //now the slice for M category
                dgStagingAJCC.diff.push({path:'factor.slice:Mcategory',title:'The distant metastasis stage.',
                    type:['Observation'],mult:'1..1'})

                dgStagingAJCC.diff.push({path:'factor.slice:Mcategory.code',title:'Code',
                    fixedCoding : {display:'Mcategorycode'},
                    type:['CodeableConcept'],mult:'1..1'})


                hashDataGroups[dgStagingAJCC.name] = dgStagingAJCC


                //============ AJCC clinical staging

                let dgStagingAJCCClinical = {
                    kind: "dg", name: 'StagingAJCCClinical', parent: "StagingAJCC", title: "Clinical AJCC staging", diff: [],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=524749899",
                    description: ""
                }

                dgStagingAJCCClinical.diff.push({
                    path: 'code', title: 'Code', type: ['CodeableConcept'], mult: '0..1',
                    description: "The cancer staging system used to stage the cancer",
                    fixedCoding : {code:'385349001',display:'Clinical stage',fsn:"Clinical stage (observable entity)"},
                    valueSet: "canshare-staging-system"
                })

                dgStagingAJCCClinical.diff.push({path:'factor.slice:Tcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-ct",
                    type:['CodeableConcept'],mult:'1..1'})


                dgStagingAJCCClinical.diff.push({path:'factor.slice:Ncategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-cn",
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCClinical.diff.push({path:'factor.slice:Mcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-cm",
                    type:['CodeableConcept'],mult:'1..1'})


                hashDataGroups[dgStagingAJCCClinical.name] = dgStagingAJCCClinical

                //============ AJCC pathological staging

                let dgStagingAJCCPathological = {
                    kind: "dg", name: 'StagingAJCCPathological', parent: "StagingAJCC", title: "Pathological AJCC staging", diff: [],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=524749899",
                    description: ""
                }

                //this is strictly unnecessary as it's defined on the parent...
                dgStagingAJCCPathological.diff.push({path:'system',title:'System',
                    fixedCoding : {code:"897275008",display:"AJCC 8th edition tumour staging system",fsn:"American Joint Commission on Cancer, Cancer Staging Manual, 8th edition neoplasm staging system (tumor staging)"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCPathological.diff.push({path:'factor.slice:Tcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-pt",
                    type:['CodeableConcept'],mult:'1..1'})


                dgStagingAJCCPathological.diff.push({path:'factor.slice:Ncategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-pn",
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCPathological.diff.push({path:'factor.slice:Mcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-pm",
                    type:['CodeableConcept'],mult:'1..1'})


                hashDataGroups[dgStagingAJCCPathological.name] = dgStagingAJCCPathological

                //============ breast clinical staging

                let dgStagingAJCCClinicalBreast = {
                    kind: "dg", name: 'StagingAJCCClinicalBreast', parent: "StagingAJCCClinical", title: "Clinical AJCC staging - Breast", diff: [],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=524749899",
                    description: ""
                }

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:Tcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-breast-ct",
                    type:['CodeableConcept'],mult:'1..1'})


                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:Ncategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-breast-cn",
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:Mcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-breast-cm",
                    type:['CodeableConcept'],mult:'1..1'})

                // add a number of other slices to factor

                //------ ER
                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:ERtumourStatus',title:'ER Tumour status',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:ERtumourStatus.code',title:'Code',
                    fixedCoding : {display:"Code for ER tumour status"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:ERtumourStatus.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-er-expression",
                    type:['CodeableConcept'],mult:'1..1'})


                //--- pR
                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:PRtumourStatus',title:'PR Tumour status',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:PRtumourStatus.code',title:'Code',
                    fixedCoding : {display:"Code for PR tumour status"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:PRtumourStatus.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-pr-expression",
                    type:['CodeableConcept'],mult:'1..1'})


                //----- HER2

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:HER2tumourStatus',title:'HER2 Tumour status',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:HER2tumourStatus.code',title:'Code',
                    fixedCoding : {display:"Code for HER2 tumour status"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCClinicalBreast.diff.push({path:'factor.slice:HER2tumourStatus.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-her2-expression",
                    type:['CodeableConcept'],mult:'1..1'})


                 hashDataGroups[dgStagingAJCCClinicalBreast.name] = dgStagingAJCCClinicalBreast


                //============ breast Pathological staging

                let dgStagingAJCCPathologicalBreast = {
                    kind: "dg", name: 'StagingAJCCPathologicalBreast', parent: "StagingAJCCPathological", title: "Pathological AJCC staging - Breast", diff: [],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=524749899",
                    description: ""
                }


                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:Tcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-breast-pt",
                    type:['CodeableConcept'],mult:'1..1'})


                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:Ncategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-breast-pn",
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:Mcategory.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-tnm-breast-pm",
                    type:['CodeableConcept'],mult:'1..1'})

                // add a number of other slices to factor

                //------ ER
                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:ERtumourStatus',title:'ER Tumour status',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:ERtumourStatus.code',title:'Code',
                    fixedCoding : {display:"Code for ER tumour status"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:ERtumourStatus.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-er-expression",
                    type:['CodeableConcept'],mult:'1..1'})


                //--- pR
                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:PRtumourStatus',title:'PR Tumour status',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:PRtumourStatus.code',title:'Code',
                    fixedCoding : {display:"Code for PR tumour status"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:PRtumourStatus.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-pr-expression",
                    type:['CodeableConcept'],mult:'1..1'})


                //----- HER2

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:HER2tumourStatus',title:'HER2 Tumour status',
                    type:['Observation'],mult:'0..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:HER2tumourStatus.code',title:'Code',
                    fixedCoding : {display:"Code for HER2 tumour status"},
                    type:['CodeableConcept'],mult:'1..1'})

                dgStagingAJCCPathologicalBreast.diff.push({path:'factor.slice:HER2tumourStatus.valueCodeableConcept',title:'Coded value',
                    valueSet:"canshare-her2-expression",
                    type:['CodeableConcept'],mult:'1..1'})





                hashDataGroups[dgStagingAJCCPathologicalBreast.name] = dgStagingAJCCPathologicalBreast


            }
        }
    })