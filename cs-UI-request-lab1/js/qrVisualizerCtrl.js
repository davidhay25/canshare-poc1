/*
 The front page for the CanShare suite
 Note that the collections are called palygrounds for historical reasons
*/
angular.module("pocApp")
    .controller('qrVisualizerCtrl',
        function ($scope,$http,$localStorage,$sce,$uibModal) {
            $scope.input = {}


            $scope.input.qrCsv =  $localStorage.qrCsv //dev
            let snomed = "http://snomed.info/sct"
            $scope.serverbase = "https://fhir.forms-lab.com/"

            //parse the input CSV file containing multiple QRs...
            $scope.parseQRFile = function (file) {
                $scope.items = []
                Papa.parse(file, {
                    header: true, // true = return objects with column headers as keys
                    dynamicTyping: true, // converts numbers/dates
                    complete: function(results) {
                        console.log("Parsed data:", results.data);
                        console.log("Errors:", results.errors);

                        results.data.forEach(function (lne,inx) {
                            if (lne["Run ID"]) {
                                let item={}
                                item.runId = lne["Run ID"]
                                item.runDate = lne["Run Date"]
                                item.modelUsed = lne["Model Used"]
                                item.success = lne["Success"]
                                item.inputName = lne["Input Name"]


                                let content = lne["Content"]
                                // Remove markdown fences if present
                                content = content.replace(/```json|```/g, "").trim();

                                // Fix double quotes from CSV escaping
                                content = content.replace(/""/g, '"');


                                // Remove leading/trailing quotes, unescape double quotes
                                //const jsonStr = content.replace(/^"|"$/g, '').replace(/""/g, '"');

                               // const jsonStr = lne["Content"].replace(/""/g, '"');
                                if (inx == 0) {
                                    console.log(content)
                                }

                                try {
                                    const obj = JSON.parse(content);

                                    item.qr = obj
                                    console.log('Parse OK')

                                } catch (ex) {
                                    console.log('Parse fail',ex.message)
                                    item.error = "Failed parsing"
                                }

                                $scope.items.push(item)
                                //console.log(item.qr)

                            }
                           // console.log(lne["Run ID"])
                        })
                    }
                });


                $localStorage.qrCsv = file
            }

            //parse the file if it was read from the browser cache
            if ($scope.input.qrCsv) {
                $scope.parseQRFile($scope.input.qrCsv)
            }

            $scope.checkAllCodes = function (things) {
                //$scope.codedItems
                for (let thing of things) {
                    console.log(thing)


                    if (thing.item.answerValueSet && thing.answerCoding) {
                        let qry = `ValueSet/$validate-code?url=${thing.item.answerValueSet}`
                        qry += `&code=${thing.answerCoding.code}`
                        qry += `&system=${thing.answerCoding.system}`
                        console.log(qry)
                        //  break

                        $scope.expandQry = qry
                        let lookupQry = encodeURIComponent(qry)


                        $http.get(`nzhts?qry=${lookupQry}`).then(
                            function (data) {
                                console.log(data)
                                let parameters = data.data //returns a parameters resource
                                for (const param of parameters.parameter) {

                                    thing.validatedConcept = {}
                                    switch (param.name) {
                                        case "result" :
                                            thing.inVS = param.valueBoolean
                                            break
                                        case "code" :
                                            thing.validatedConcept.code = param.valueCode
                                            break
                                        case "system" :
                                            thing.validatedConcept.system = param.valueUri
                                            break
                                        case "display" :
                                            thing.validatedConcept.display = param.valueString
                                            break
                                        case "version" :
                                            thing.validatedConcept.version = param.valueString
                                            break
                                    }

                                }

                            }, function (err) {
                                console.log(err)
                            }
                        ).finally(
                            function () {
                                $scope.showWaiting = false
                            }
                        )

                    }



                }
            }


            $scope.itemDetails = function (item) {
                alert("Details of this item - including if codes are in VS.")
                console.log(item)
            }

            $scope.validate = function (QR) {
                delete $scope.oo
                $scope.errorCount = 0
                $scope.warningCount = 0
                $scope.validating = true
                let url = `${$scope.serverbase}QuestionnaireResponse/$validate`
                $http.post(url,QR).then(
                    function (data) {
                        $scope.validating = false
                        $scope.oo = data.data

                        $scope.oo.issue.forEach(function (iss) {
                            if (iss.severity == 'error') {
                                $scope.errorCount ++
                            } else {
                                $scope.warningCount ++
                            }
                        })

                    },function (err) {
                        $scope.validating = false
                        $scope.oo = err.data

                        if (! $scope.oo) {
                            $scope.oo = {issue:[{severity:'error',diagnostics:"There was an error in the Validator"}]}
                        }

                    }
                )
            }

            $scope.selectItem = function (item) {
                $scope.selectedItem = item
                parseQR($scope.selectedItem)

            }

            //parse a QR item
           let parseQR = function (item) {

                delete $scope.textReport
                $scope.codedItems = []

                let QR = item.qr

                $scope.hashLinkId = {}
                $scope.lstQRItem = []


                let qUrl = QR.questionnaire

                let qry = `${$scope.serverbase}Questionnaire?url=${qUrl}`
                let config = {headers:{'content-type':'application/fhir+json'}}

                $http.get(qry,config).then(
                    function (data) {
                        //console.log(data.data)
                        if (data.data.entry && data.data.entry.length > 0) {

                            //get the definition of the items from the Q
                            let Q = data.data.entry[0].resource
                            //build a hash of Q items by linkId
                            for (const item of Q.item) {
                                processQItem(item)
                            }


                            //get the answers from the QR
                            for (const item of QR.item) {
                                processQRItem(item,0)
                            }

                        } else {
                            alert(`The Q with the url ${qUrl} was not found`)
                        }

                    },function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

                function processQItem(item) {
                    $scope.hashLinkId[item.linkId] = item


                    if (item.item) {
                        for (const child of item.item) {
                            processQItem(child)
                        }
                    }
                }


                function processQRItem(item,level) {
                    //console.log(item.linkId)

                    if (item.linkId == "id-2") {         //todo add a code to the Q.item and use that
                        if (item.answer) {
                            let report = item.answer[0].valueString
                            report = report.replace(/\n/g, '<br>')
                            $scope.textReport = report
                        }
                    }

                    let def = angular.copy($scope.hashLinkId[item.linkId])
                    delete def.item
                    if (item.answer) {
                        // let def = angular.copy($scope.hashLinkId[item.linkId])
                        //  delete def.item
                        //answer[] is the answer from the QR (an array), answerDisplay[] is a display format
                        let thing = {item:def,answer:item.answer,answerDisplay:[]}
                        thing.level = level
                        //a simplified answer for display
                        for (let ans of item.answer) {
                            //ans will have a single property - valueCoding, valueString etc
                            let keys = Object.keys(ans)
                            for (const key of keys ) {
                                let value = ans[key]
                                thing.dt = key.replace("value","")

                                //should only be 1
                                switch (key) {
                                    case "valueCoding":
                                        thing.answerDisplay.push(`${value.code} | ${value.display} | ${value.system}`)

                                        thing.answerCoding = value
                                        $scope.codedItems.push(thing)

                                        break
                                    case "valueQuantity":
                                        thing.answerDisplay.push(`${value.value} ${value.code}`)
                                        break
                                    /*     case "valueString" :
                                             thing.dt = 'String'
                                             thing.answerDisplay.push(value)
                                             break
                                         */
                                    default :
                                        //todo - replace wirh code
                                        if (thing.item.linkId !== 'id-2') {
                                            thing.answerDisplay.push(value)
                                        } else {
                                            thing.answerDisplay.push("Text removed to improve display")
                                        }

                                }

                            }
                            $scope.lstQRItem.push(thing)



                        }



                    } else {
                        //there is no answer, but add as a 'section'


                        let thing = {item:def,answer:item.answer,answerDisplay:[]}

                        if (item.item) {
                            thing.dt = "Group"
                        }

                        thing.level = level
                        $scope.lstQRItem.push(thing)
                    }


                    if (item.item) {
                        level++
                        for (const child of item.item) {
                            processQRItem(child,level)
                        }
                    }
                }



            }

            //lookup a single concept
            $scope.lookup = function (code,system) {
                system = system || snomed
                let qry = `CodeSystem/$lookup?system=${system}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {

                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            //backdrop: 'static',
                            //size : 'lg',
                            controller : "showParametersCtrl",
                            resolve: {
                                parameters: function () {
                                    return data.data
                                },
                                title : function () {
                                    return `Concept lookup (${code})`
                                },
                                code: function () {
                                    return code
                                },
                                system : function () {
                                    return system
                                }
                            }
                        })


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })
            }

            $scope.viewVS = function (url) {
                //display the contents of a single VS
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId: function () {
                            return ""
                        }
                    }

                })
            }

            $scope.to_trusted = function(html_code) {
                return $sce.trustAsHtml(html_code);
            }


            $scope.handlePaste = function () {
                    setTimeout(function () {
                            var textarea = document.getElementById('pastetextbox');
                            textarea.scrollTop = 0;  // Scroll to the top
                    }, 0);  // Wait for the paste to complete before updating the model


            }


        })
