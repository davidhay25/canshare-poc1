//Observation children

angular.module("pocApp")

    .service('modelsObservationSvc', function() {

        return {

            getModels: function (hashDataGroups) {

                //Observation datagroup
                let dgObservation = {kind:"dg",name:'Observation',title:"Observation",diff:[],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=1502765034",
                    tags:[{system:'bespoke', code: 'working'}],
                    description:"Measurements and simple assertions made about a patient, device or other subject. Intended as abstract, so no value type specified. This must be specified by child DGs."}

                dgObservation.diff.push({path:'status',title:'Status',type:['code'],mult:"1..1",
                    description:"The status of the result value - i.e. registered, preliminary, final, amended"})

                dgObservation.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    description:"The type of observation what was observed"})

                dgObservation.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    description:"The method by which the observation was made"})

                dgObservation.diff.push({path:'performer',title:'Performer',type:['HcProvider'],mult:"0..*",
                    description:"The healthcare practitioner who is responsible for the observation"})

                dgObservation.diff.push({path:'date',title:'Date',type:['dateTime'],mult:"0..1",
                    description:"The date and/or time that the observation was deemed to be taken"})

                dgObservation.diff.push({path:'specimen',title:'Specimen',type:['CodeableConcept'],mult:"0..1",
                    description:"The specimen on which this observation was made."})

                dgObservation.diff.push({path:'dar',title:'Data absent reason',type:['CodeableConcept'],mult:"0..1",

                    description:"The reason why an observation is not available"})

                dgObservation.diff.push({path:'interpretation',title:'Interpretation',type:['CodeableConcept'],mult:"0..1",
                    description:"An interpretation of the observation's value."})

                dgObservation.diff.push({path:'comments',title:'Comments',type:['string'],mult:"0..1",
                    description:"Additional comments about the observation"})

              //  dgObservation.diff.push({path:'category',title:'Category',type:['CodeableConcept'],mult:"0..1",
                //    description:"A classification of the type of observation being made"})




                /* rather than defineing the valusDT here, have child DG's add the one they want
                dgObservation.diff.push({path:'valueString',title:'Text',type:['string'],mult:"0..1",
                    description:"The plain text information determined as a result of making the observation"})
                dgObservation.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})
                dgObservation.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:"0..1",
                    description:"The measured or measurable amount determined as a result of making the observation"})
                dgObservation.diff.push({path:'valueRatio',title:'Ratio value',type:['Ratio'],mult:"0..1",
                    description:"The ratio"})

                */
                hashDataGroups[dgObservation.name] = dgObservation


                //DG for mitotic observation
                let dgObservationMC = {kind:"dg",parent:"Observation",name:'ObservationMitoticCount',
                    title:"Mitotic count observation",diff:[],
                    description:"Mitotic count observation"}

                dgObservationMC.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'371472000',display:"Mitotic count"},
                    description:"The code for mitotic count"})

                dgObservationMC.diff.push({path:'dar',title:'Data absent reason',type:['CodeableConcept'],mult:"0..1",
                    fixedCoding:{code:"1156316003",display:"Cannot be assessed"},
                    description:"The mitotic count cannot be assessed"})

                dgObservationMC.diff.push({path:'valueRatio',title:'Ratio value',type:['Ratio'],mult:"0..1",
                    description:"The ratio"})

                dgObservationMC.diff.push({path:'valueRatio.denominator',title:'denominator',type:['Quantity'],mult:"1..1",
                    description:"The denominator of the ratio"})

                dgObservationMC.diff.push({path:'valueRatio.denominator.unit',title:'Denominator units',type:['string'],mult:"1..1",
                    fixedString:"mm^2",
                    description:"Fix the units for the denominator to mm squared"})


                hashDataGroups[dgObservationMC.name] = dgObservationMC


                //ECOG status
                let dgObservationECOG = {kind:"dg",parent:"Observation",name:'ObservationEcogStatus',
                    title:"ECOG status",diff:[],
                    description:"Mitotic count observation"}

                dgObservationECOG.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'423740007',display:"ECOG performance status",FQN:"Eastern Cooperative Oncology Group performance status (observable entity)"},
                    description:"ECOG performance status"})

                dgObservationECOG.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    fixedCoding:{code:'273437007',display:"ECOG scale for physical assessment",FQN:"Eastern Cooperative Oncology Group scale for physical assessment (assessment scale)"},
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-ecog-status",
                    description:"ECOG scale for physical assessment"})

                dgObservationECOG.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


                hashDataGroups[dgObservationECOG.name] = dgObservationECOG

                //CM category
                let dgObservationCMCategory = {kind:"dg",parent:"Observation",name:'ObservationCMCategory',
                    title:"CM Category",diff:[],
                    description:"CM Category"}

                dgObservationCMCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'399387003',display:"cM category",FQN:"cM category (observable entity)"},
                    description:"cM category"})


                dgObservationCMCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-cm",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


             //   hashDataGroups[dgObservationCMCategory.name] = dgObservationCMCategory

                //CN category
                let dgObservationCNCategory = {kind:"dg",parent:"Observation",name:'ObservationCNCategory',
                    title:"CN Category",diff:[],
                    description:"CN Category"}

                dgObservationCNCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'399534004',display:"cN category",FQN:"cN category (observable entity)"},
                    description:"cN category"})


                dgObservationCNCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-cn",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


            //    hashDataGroups[dgObservationCNCategory.name] = dgObservationCNCategory

                //CT category
                let dgObservationCTCategory = {kind:"dg",parent:"Observation",name:'ObservationCTCategory',
                    title:"CT Category",diff:[],
                    description:"CT Category"}

                dgObservationCTCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'399504009',display:"cT category",FQN:"cT category (observable entity)"},
                    description:"cT category"})


                dgObservationCTCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-ct",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


          //      hashDataGroups[dgObservationCTCategory.name] = dgObservationCTCategory


                //Ki67ProliferationIndex
                let dgObservationKi67Prol = {kind:"dg",parent:"Observation",name:'Ki67ProliferationIndex',
                    title:"Ki67 Proliferation Index",diff:[],
                    description:"Ki67 Proliferation Index"}

                dgObservationKi67Prol.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'1255078008',display:"Ki-67 proliferation index",FQN:"Percent of cell nuclei positive for proliferation marker protein Ki-67 in primary malignant neoplasm by immunohistochemistry (observable entity)"},
                    description:"Ki67 Proliferation Index"})

                dgObservationKi67Prol.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:"0..1",
                    description:"The measured or measurable amount determined as a result of making the observation"})


                hashDataGroups[dgObservationKi67Prol.name] = dgObservationKi67Prol

                //Necrosis
                let dgObservationNecrosis = {kind:"dg",parent:"Observation",name:'Necrosis',
                    title:"Necrosis",diff:[],
                    description:"Necrosis"}

                dgObservationNecrosis.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'405921002',display:"Necrosis",FQN:"Percentage of neoplasm involved by necrosis (observable entity)"},
                    description:"Necrosis"})

                //take out method
                dgObservationNecrosis.diff.push({path:'method',title:'method',type:['CodeableConcept'],mult:"0..0",
                    description:"Necrosis"})

                //take out specimen
                dgObservationNecrosis.diff.push({path:'specimen',title:'specimen',type:['CodeableConcept'],mult:"0..0",
                    description:"Necrosis"})

                dgObservationNecrosis.diff.push({path:'valueCodeableConcept',title:'CodeableConcept value',type:['CodeableConcept'],mult:"0..1",
                    description:"The measured or measurable amount determined as a result of making the observation"})

                dgObservationNecrosis.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:"0..1",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})

                dgObservationNecrosis.diff.push({path:'valueQuantity.unit',title:'Quantity unit',type:['string'],mult:"0..1",
                    fixedString : "%",
                    description:"The quantity unit is always %"})


                hashDataGroups[dgObservationNecrosis.name] = dgObservationNecrosis


                //PM category
                let dgObservationPMCategory = {kind:"dg",parent:"Observation",name:'ObservationPMCategory',
                    title:"PM Category",diff:[],
                    description:"PM Category"}

                dgObservationPMCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'371497001',display:"pM category",FQN:"pM category (observable entity)"},
                    description:"pM category"})

                dgObservationPMCategory.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-ajcc-staging-manual-edition",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})



                dgObservationPMCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-pm",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


             //   hashDataGroups[dgObservationPMCategory.name] = dgObservationPMCategory


                //CN category
                let dgObservationPNCategory = {kind:"dg",parent:"Observation",name:'ObservationPNCategory',
                    title:"PN Category",diff:[],
                    description:"PN Category"}

                dgObservationPNCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'371494008',display:"pN category",FQN:"pN category (observable entity)"},
                    description:"pN category"})

                dgObservationPNCategory.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-ajcc-staging-manual-edition",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


                dgObservationPNCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-pn",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


             //   hashDataGroups[dgObservationPNCategory.name] = dgObservationPNCategory

                //PT category
                let dgObservationPTCategory = {kind:"dg",parent:"Observation",name:'ObservationPTCategory',
                    title:"PT Category",diff:[],
                    description:"PT Category"}

                dgObservationPTCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'384625004',display:"pT category",FQN:"pT category (observable entity)"},
                    description:"cT category"})

                dgObservationPTCategory.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-ajcc-staging-manual-edition",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})



                dgObservationPTCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-pt",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


            //    hashDataGroups[dgObservationPTCategory.name] = dgObservationPTCategory


                //Tumour differentiation
                let dgObservationTumourDiff = {kind:"dg",parent:"Observation",name:'ObservationTumourDiff',
                    title:"Tumour differentiation",diff:[],
                    description:"Tumour differentiation"}

                dgObservationTumourDiff.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'0000',display:"Tumour differentiation",FQN:"Tumour differentiation (observable entity)"},
                    description:"Code of Tumour differentiation"})

                dgObservationTumourDiff.diff.push({path:'dar',title:'Data absent reason',type:['CodeableConcept'],mult:"0..1",
                    fixedCoding:{code:'1156316003',display:"Cannot be assessed",FQN:"Cannot be determined (qualifier value)"},
                    description:"The reason why an observation is not available"})

                dgObservationTumourDiff.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:"0..1",
                    description:"The measured or measurable amount determined as a result of making the observation"})


                hashDataGroups[dgObservationTumourDiff.name] = dgObservationTumourDiff


                //ancillary studies
                let dgAncillary = {kind:"dg",parent: "Observation",name:'AncillaryStudy',title:"Ancillary Study",diff:[],mcodegroup:'disease',
                    tags:[{system:'bespoke', code: 'working'}],
                    description:"Diagnostic or therapeutic procedure which is supplementary to the main test or treatment."}

                dgAncillary.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'10828004',pt:"Positive"},
                        {code:'260385009',pt:"Negative"},
                        {code:'419984006',pt:"Inconclusive"}
                    ],
                    description:"The result"})



                dgAncillary.diff.push({path:'failureReason',title:'Failure reason',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'NC',pt:"Insufficient material"},
                        {code:'112631006',pt:"Specimen unsatisfactory"},
                        {code:'74964007',pt:"Other"},
                    ],
                    description:"The reason why the ancillary study failed. "})

                dgAncillary.diff.push({path:'notPerformedReason',title:'Reason not performed',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'NC',pt:"Not publically funded"},
                        {code:'NC',pt:"Insufficient material"},
                        {code:'112631006',pt:"Specimen unsatisfactory"},
                        {code:'74964007',pt:"Other"},
                    ],
                    description:"The reason why the ancillary study was not performed. "})

                dgAncillary.diff.push({path:'inconclusiveReason',title:'Reason inconclusive',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'NC',pt:"Insufficient material"},
                        {code:'112631006',pt:"Specimen unsatisfactory"},
                        {code:'74964007',pt:"Other"},
                    ],
                    description:"The reason why the ancillary study was not conclusive. "})



                hashDataGroups[dgAncillary.name] = dgAncillary



                //ER observation
                let dgObservationER = {kind:"dg",parent: "AncillaryStudy",name:'ERTumourStatus',title:"ERTumourStatus",diff:[],
                    description:"ERTumourStatus"}

                dgObservationER.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'445028008',display:"ER tumour status",FQN:"Presence of estrogen receptor in neoplasm (observable entity)"},
                    description:"cT category"})

                dgObservationER.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'117617002',pt:"IHC"},
                        {code:'426329006',pt:"FISH"}
                    ],

                    description:"Fixed method"})

                hashDataGroups[dgObservationER.name] = dgObservationER


                //PR observation
                let dgObservationPR = {kind:"dg",parent: "AncillaryStudy",name:'PRTumourStatus',title:"PRTumourStatus",diff:[],
                    description:"PRTumourStatus"}

                dgObservationPR.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'445029000',display:"PR tumour status",FQN:"Presence of progesterone receptor in neoplasm (observable entity)"},
                    description:"PR status"})

                dgObservationPR.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'117617002',pt:"IHC"},
                        {code:'426329006',pt:"FISH"}
                    ],

                    description:"Fixed method"})

                hashDataGroups[dgObservationPR.name] = dgObservationPR

                //HER2 observation
                let dgObservationHER2 = {kind:"dg",parent: "AncillaryStudy",name:'HER2tumourStatus',title:"HER2 tumour status",diff:[],
                    description:"HER2 tumour status"}

                dgObservationHER2.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'261811000210109',display:"HER2 protein tumour status",FQN:"Presence of receptor tyrosine kinase erbB-2 in primary malignant neoplasm (observable entity)"},
                    description:"HER2 status"})

                dgObservationHER2.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'117617002',pt:"IHC"},
                        {code:'426329006',pt:"FISH"}
                    ],

                    description:"Fixed method"})

                hashDataGroups[dgObservationHER2.name] = dgObservationHER2



                //immuno histo chemistry
                let dgImmunoHistoChem = {kind:"dg",parent: "AncillaryStudy",name:'Immunohistochemistry',title:"Immunohistochemistry",diff:[],
                    description:"Immunohistochemistry"}

                dgImmunoHistoChem.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'< 1234806008',display:"Observation using immunohistochemistry",FQN:"Observation using immunohistochemistry (observable entity)"},
                    description:"Code of Observation using immunohistochemistry. Any descendant allowed"})

                dgImmunoHistoChem.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'117617002',display:"Immunohistochemistry procedure",FQN:"Immunohistochemistry procedure (procedure)"},
                    description:"Fixed method code"})
/*
                dgImmunoHistoChem.diff.push({path:'failureReason',title:'Failure reason',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'NC',pt:"Insufficient material"},
                        {code:'112631006',pt:"Specimen unsatisfactory"},
                        {code:'74964007',pt:"Other"},
                    ],
                    description:"The reason why the ancillary study failed. "})

                dgImmunoHistoChem.diff.push({path:'notPerformedReason',title:'Reason not performed',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'NC',pt:"Not publically funded"},
                        {code:'NC',pt:"Insufficient material"},
                        {code:'112631006',pt:"Specimen unsatisfactory"},
                        {code:'74964007',pt:"Other"},
                    ],
                    description:"The reason why the ancillary study was not performed. "})

                dgImmunoHistoChem.diff.push({path:'inconclusiveReason',title:'Reason inconclusive',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'NC',pt:"Insufficient material"},
                        {code:'112631006',pt:"Specimen unsatisfactory"},
                        {code:'74964007',pt:"Other"},
                    ],
                    description:"The reason why the ancillary study was not conclusive. "})
*/
                dgImmunoHistoChem.diff.push({path:'guidelines',title:'Guidelines',type:['string'],mult:"1..1",
                    description:"Guidelines"})

                hashDataGroups[dgImmunoHistoChem.name] = dgImmunoHistoChem


                //cytpgenic procedure
                let dgCytogenic = {kind:"dg",parent: "AncillaryStudy",name:'CytogenicProcedure',title:"Cytogenic procedure",diff:[],
                    description:"Cytogenic procedure"}
/*
                dgCytogenic.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'< 1234806008',display:"Observation using immunohistochemistry",FQN:"Observation using immunohistochemistry (observable entity)"},
                    description:"Code of Observation using immunohistochemistry. Any descendant allowed"})
*/
                dgCytogenic.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {code:'73735000',pt:"Cytogenetic procedure"},
                        {code:'426329006',pt:"FISH"}
                    ],

                    description:"Fixed method"})

                hashDataGroups[dgCytogenic.name] = dgCytogenic


                //molecular genetic
                let dgMolecularGenetic = {kind:"dg",parent: "AncillaryStudy",name:'MolecularGenetic',title:"Molecular genetic procedure",diff:[],
                    description:"MolecularGenetic procedure"}

                dgMolecularGenetic.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'20889005',display:"Genetic marker",FQN:"Genetic marker, function (observable entity)"},
                    description:"Code of genetic marker"})

                dgMolecularGenetic.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'405825005',display:"Molecular genetic test",FQN:"Molecular genetic test (procedure)"},

                    description:"Fixed method"})

                hashDataGroups[dgMolecularGenetic.name] = dgMolecularGenetic



                //=============  grading

                //DG grading
                let dgGrading = {kind:"dg",parent:"Observation",name:'Grading',title:"Grading",diff:[],
                    tags:[{system:'bespoke', code: 'main'},
                        {system:'bespoke', code: 'working'},
                        {system:'dgcategory', code: 'grading'}],
                    ss:'https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=2058860673',
                    description:"The degree of differentiation of a tumour, e.g. the extent to which a tumour resembles the normal tissue at that site (also known as histological grade)"}
                dgGrading.diff.push({path:'system',title:'System',type:['CodeableConcept'],mult:'1..1',
                    valueSet: "https://nzhts.digital.health.nz/fhir/ValueSet/canshare-grading-system",
                    description:"The system (including version) used to grade the cancer."})

                dgGrading.diff.push({path:'parameter',title:'Parameter',type:['Observation'],mult:'0..*',
                    description:"A grading parameter (ie criteria) that is used together to calculate the combined grade."})

                dgGrading.diff.push({path:'parameter.valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:'0..1',
                    description:""})
                dgGrading.diff.push({path:'parameter.valueRatio',title:'Ratio',type:['Ratio'],mult:'0..1',
                    description:""})
                dgGrading.diff.push({path:'parameter.valueInteger',title:'Ratio',type:['Ratio'],mult:'0..1',
                    description:""})
                dgGrading.diff.push({path:'parameter.valueString',title:'Ratio',type:['Ratio'],mult:'0..1',
                    description:""})


                /*
                                dgGrading.diff.push({path:'date',title:'Date',type:['date'],mult:'0..1'})
                                dgGrading.diff.push({path:'criteria',title:'Criteria',type:['Group'],mult:'0..1'})
                                dgGrading.diff.push({path:'criteria.general',title:'General criteria',type:['Observation'],
                                    mult:'0..*'})

                                */

                dgGrading.diff.push({path:'grade',title:'Grade',type:['CodeableConcept'],mult:'0..1',
                    description:"The grade of the cancer based on the given grading system."})

                dgGrading.diff.push({path:'gradeOther',title:'Grade (other)',type:['string'],mult:'0..1',
                    description:"The free text grade associated with the other coding system."})

                dgGrading.diff.push({path:'notGradableReason',title:'Reason not gradable',type:['string'],mult:'0..1',
                    description: "The free text reason that the tumour is not gradable."})
                hashDataGroups[dgGrading.name] = dgGrading


              //  dgGrading.diff.push({path:'gradeQualifier',title:'Grade qualifier',type:['CodeableConcept'],mult:'0..1',
              //      description:"An indication of whether the grade represents the minimum (at least) grade based on a limited sample (e.g. biopsy)."})

                dgGrading.diff.push({path:'comments',title:'Comments',type:['string'],mult:'0..1',
                    "description":"Free text comments about the grading."})
                hashDataGroups[dgGrading.name] = dgGrading


                //sarcoma grading
                let dgGradingFNCLCC = {kind:"dg",parent:'Grading', name:'GradingFNCLCC',title:"FNCLCC grading",diff:[],
                    tags:[{system:'bespoke', code: 'main'},{system:'dgcategory', code: 'grading'}],
                    profile: "StructureDefinition-SarcomaGrading.html",
                    description:"The grading of a sarcoma using the French Federation of Cancer Centers sarcoma grading system (FNCLCC = Fédération Nationale des Centres de Lutte contre le Cancer). Reference: FNCLCC grading"}

                dgGradingFNCLCC.diff.push({path:'system',title:'System',type:['CodeableConcept'],mult:'1..1',
                    fixedCoding: {code:"426757001",display:"FNCLCC sarcoma grading system",FQN:"French Federation of Cancer Centers Sarcoma Group grading system (staging scale)"},
                    description:"The system (including version) used to grade the cancer."})


                dgGradingFNCLCC.diff.push({path:'grade',title:'Grade',type:['CodeableConcept'],mult:'0..1',
                    options:[
                        {pt:"FNCLCC grade 1"},
                        {pt:"FNCLCC grade 2"},
                        {pt:"FNCLCC grade 3"}
                    ],
                    description:"The grade of the cancer based on the given grading system."})


                //we need to slice the parameter. So the 'parent' element becomes a group, and the slices are nested below it
                dgGradingFNCLCC.diff.push({path:'parameter',title:'Parameter',
                    type:['Group'],mult:'0..*',
                    originalType : ["Observation"],     //this is so that the element can be further sliced in the UI
                    description:"This is a sliced element to specify the possible parameter observations"})


                //now the slice for tumour differentiation

                dgGradingFNCLCC.diff.push({path:'parameter.slice:tumourDiff',title:'Tumour differentiation',
                    type:['Observation'],mult:'1..1'})

                dgGradingFNCLCC.diff.push({path:'parameter.slice:tumourDiff.code',title:'Code',
                    fixedCoding : {display:'tumour differentiation code'},
                    type:['CodeableConcept'],mult:'0..1'})

                dgGradingFNCLCC.diff.push({path:'parameter.slice:tumourDiff.interpretation',title:'Interpretation',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {pt:"FNCLCC tumour differentiation score 1"},
                        {pt:"FNCLCC tumour differentiation score 2"},
                        {pt:"FNCLCC tumour differentiation score 3"}
                    ],
                    description:"The interpretation"})



                //now the slice for mitotic count
                dgGradingFNCLCC.diff.push({path:'parameter.slice:mitoticCount',title:'Mitotic count',
                    type:['Observation'],mult:'1..1'})

                dgGradingFNCLCC.diff.push({path:'parameter.slice:mitoticCount.code',title:'Code',
                    fixedCoding : {display:'mitotic count code'},
                    type:['CodeableConcept'],mult:'0..1'})

                dgGradingFNCLCC.diff.push({path:'parameter.slice:mitoticCount.interpretation',title:'Interpretation',type:['CodeableConcept'],mult:"1..1",
                    options:[
                        {pt:"FNCLCC sarcoma mitotic count score 1"},
                        {pt:"FNCLCC sarcoma mitotic count score 2"},
                        {pt:"FNCLCC sarcoma mitotic count score 3"}
                    ],
                    description:"The interpretation"})


                //now the slice for necrosis percentage
                dgGradingFNCLCC.diff.push({path:'parameter.slice:necrosisPercentage',title:'Necrosis percentage',
                    type:['Observation'],mult:'1..1'})
                dgGradingFNCLCC.diff.push({path:'parameter.slice:necrosisPercentage.code',title:'Code',
                    fixedCoding : {display:'necrosis percentage code'},
                    type:['CodeableConcept'],mult:'1..1'})




                hashDataGroups[dgGradingFNCLCC.name] = dgGradingFNCLCC

/*
 this stuff was in ancillary study
                dgAncillary.diff.push({path:'type',title:'Type of study',type:['CodeableConcept'],
                    valueSet : "http://canshare.co.nz/ValueSet/ancillary-type",
                    description:"The type of ancillary test"})

                let ancMethod = {path:'method',title:'Method used',type:['CodeableConcept'],
                    description:"The method of how the ancillary study was performed"}

                ancMethod.dependVS = []
                ancMethod.dependVS.push({source:'type',value:{code:'HER2'},
                    url:"https://canshare.co.nz/fhir/ValueSet/ancillary-method-HER2"})
                ancMethod.dependVS.push({source:'type',value:{code:'PT'},
                    url:"https://canshare.co.nz/fhir/ValueSet/ancillary-method-PT"})

                dgAncillary.diff.push(ancMethod)

                dgAncillary.diff.push({path:'result',title:'Result',type:['CodeableConcept'],
                    description:"The coded result of the ancillary study performed"})

                //dependencies
*/



            }

        }})