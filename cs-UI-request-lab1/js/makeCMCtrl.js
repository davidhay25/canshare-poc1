//controller for the 'make CM' include
// https://docs.google.com/spreadsheets/d/1S-08cA1m-CAy8humztO0S5Djr_wtXibmNn6w4_uFCIE/edit?pli=1#gid=285304653
angular.module("pocApp")
    .controller('makeCMCtrl',
        function ($scope,$http,$q,$timeout) {



            async function process1Line(lne,cm){
                let ar = lne.split('\t')
                let targetCode = ar[1]      //the code that is being looked for (eg treatment indent
                let targetDisplay = ar[2]   //the displa

                let targetType = ar[3]      //set to 'Value set' if the target is a ValueSet and so needs
                let targetVSName = ar[4]      // canshare name of the valueset

                let dep1Code = ar[5]    //the code for the first dependency
                let dep1Name = ar[6]        //set to 'cancer service'
                let dep1Op = ar[7]          //the operator - set to '=
                let dep1Value = ar[8]       //the actual code value of the dependency
                let dep1ValueName = ar[9]   //the name of the dependency


                let dep2Code = ar[10]    //the code for the second dependency
                let dep2Name = ar[11]        //set to 'cancer service'
                let dep2Op = ar[12]          //the operator - set to '=
                let dep2Value = ar[13]       //the actual code value of the dependency
                let dep2ValueName = ar[14]   //the name of the dependency

                if (targetVSName) {
                    let url = `https://nzhts.digital.health.nz/fhir/ValueSet/${targetVSName}`

                    let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`


                    let encodedQry = encodeURIComponent(qry)
                    $scope.showWaiting = true
                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let expandedVS = data.data  //the contents of this will all be added as targets in the CM



                            //have a single group, with a single element and all targets under that (atm)

                            //first, create the 'dependsOn' entries. these will be the same for all entries.
                            //there may be no dependsOn - in which case all values are always returned
                            let arDO = []
                            if (dep1Value) {
                                let dep = {property:'cancer-service'}   //todo - should this be in the SS - or a SNOMED code
                                dep.system = "http://snomed.info/sct"
                                dep.value = dep1Value
                                dep.display = dep1ValueName
                                arDO.push(dep)
                            }

                            if (dep2Value) {
                                let dep = {property:'cancer-stream'}   //todo - should this be in the SS - or a SNOMED code
                                dep.system = "http://snomed.info/sct"
                                dep.value = dep2Value
                                dep.display = dep2ValueName
                                arDO.push(dep)
                            }

                            //now we can create the targets...
                            let arTargets = []
                            expandedVS.expansion.contains.forEach(function (concept) {
                                let target = {code:concept.code,display:concept.display}
                                target.equivalence = "relatedto"
                                if (arDO.length > 0) {
                                    target.dependsOn = arDO
                                }
                                arTargets.push(target)

                            })

                            //now, finally, we can add the source and targets to the group
                            let group = {}
                            group.source =  "http://snomed.info/sct"
                            group.target =  "http://snomed.info/sct"
                            group.element = []

                            let element = {}
                            element.code = targetCode
                            element.display = targetDisplay
                            element.target = arTargets
                            group.element.push(element)

                            cm.group.push(group)
                            // deferred.resolve(cm)



                        }, function (err) {
                            console.log(err)
                            // deferred.reject()

                        }
                    )


                    //return deferred.promise
                } else {
                    //this is not a valueset. what to do?
                }
            }


            $scope.makeCM = async function (txt) {
                //let deferred = $q.defer()
                console.log(txt)
                let ar = txt.split('\t')
                console.log(ar)

                let cmName = "canshare-testCM"


                let cm = {resourceType:"ConceptMap",status:"draft"}
                cm.id = `${cmName}`  //todo - is this going to be unique?
                cm.title = cmName
                cm.url = `http://canshare.co.nz/fhir/ConceptMap/canshare-${cmName}`
                cm.identifier = {system:"http://canshare.co.nz/fhir/NamingSystem/conceptmaps",value:`${cmName}`}
                cm.sourceCanonical = "http://snomed.info/sct?fhir_vs"
                cm.targetCanonical = "http://snomed.info/sct?fhir_vs"
                cm.group = []

                await process1Line(txt,cm)

                $scope.CM = cm

            }

            $scope.makeCMCopy = function (txt) {
                //let deferred = $q.defer()
                console.log(txt)
                let ar = txt.split('\t')
                console.log(ar)

                let targetCode = ar[1]      //the code that is being looked for (eg treatment indent
                let targetDisplay = ar[2]   //the displa

                let targetType = ar[3]      //set to 'Value set' if the target is a ValueSet and so needs
                let targetVSName = ar[4]      // canshare name of the valueset

                let dep1Code = ar[5]    //the code for the first dependency
                let dep1Name = ar[6]        //set to 'cancer service'
                let dep1Op = ar[7]          //the operator - set to '=
                let dep1Value = ar[8]       //the actual code value of the dependency
                let dep1ValueName = ar[9]   //the name of the dependency


                let dep2Code = ar[10]    //the code for the second dependency
                let dep2Name = ar[11]        //set to 'cancer service'
                let dep2Op = ar[12]          //the operator - set to '=
                let dep2Value = ar[13]       //the actual code value of the dependency
                let dep2ValueName = ar[14]   //the name of the dependency

                if (targetVSName) {
                    let url = `https://nzhts.digital.health.nz/fhir/ValueSet/${targetVSName}`

                    let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`


                    let encodedQry = encodeURIComponent(qry)
                    $scope.showWaiting = true
                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let expandedVS = data.data  //the contents of this will all be added as targets in the CM

                            let cm = {resourceType:"ConceptMap",status:"draft"}
                            cm.id = `${targetVSName}`  //todo - is this going to be unique?
                            cm.title = targetVSName
                            cm.url = `http://canshare.co.nz/fhir/ConceptMap/canshare-${targetVSName}`
                            cm.identifier = {system:"http://canshare.co.nz/fhir/NamingSystem/conceptmaps",value:`canshare-${targetVSName}`}
                            cm.sourceCanonical = "http://snomed.info/sct?fhir_vs"
                            cm.targetCanonical = "http://snomed.info/sct?fhir_vs"

                            //have a single group, with a single element and all targets under that (atm)

                            //first, create the 'dependsOn' entries. these will be the same for all entries.
                            //there may be no dependsOn - in which case all values are always returned
                            let arDO = []
                            if (dep1Value) {
                                let dep = {property:'cancer-service'}   //todo - should this be in the SS - or a SNOMED code
                                dep.system = "http://snomed.info/sct"
                                dep.value = dep1Value
                                dep.display = dep1ValueName
                                arDO.push(dep)
                            }

                            if (dep2Value) {
                                let dep = {property:'cancer-stream'}   //todo - should this be in the SS - or a SNOMED code
                                dep.system = "http://snomed.info/sct"
                                dep.value = dep2Value
                                dep.display = dep2ValueName
                                arDO.push(dep)
                            }

                            //now we can create the targets...
                            let arTargets = []
                            expandedVS.expansion.contains.forEach(function (concept) {
                                let target = {code:concept.code,display:concept.display}
                                target.equivalence = "relatedto"
                                if (arDO.length > 0) {
                                    target.dependsOn = arDO
                                }
                                arTargets.push(target)

                            })

                            //now, finally, we can add the source and targets to the group
                            let group = {}
                            group.source =  "http://snomed.info/sct"
                            group.target =  "http://snomed.info/sct"
                            group.element = []

                            let element = {}
                            element.code = targetCode
                            element.display = targetDisplay
                            element.target = arTargets
                            group.element.push(element)

                            cm.group = [group]
                            // deferred.resolve(cm)
                            $scope.CM = cm





                        }, function (err) {
                            console.log(err)
                            // deferred.reject()

                        }
                    )


                    //return deferred.promise
                } else {
                    //this is not a valueset. what to do?
                }






            }


        }
    )