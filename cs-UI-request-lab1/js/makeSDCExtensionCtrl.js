angular.module("pocApp")
    .controller('makeSDCExtensionCtrl',
        function ($scope,elements,currentPath,snapshotSvc,utilsSvc) {
            $scope.input = {}
            $scope.elements = elements      //all the elements in this DG
            //currentPath is the path to the current element in the DG (includes the top)
            $scope.currentPath = currentPath
console.log(elements,currentPath)
            $scope.input.vType = "fhirpath"
            $scope.input.calcType = "fhirpath"


            $scope.fhirDataTypes = utilsSvc.fhirDataTypes()


            function findVariablesInContext (lstAllElements,path) {
                //find all the variables in scope for a given item.
                //Assumes that passed in a DG and the path is the dotted segment format

                $scope.variables = []

                let hashEd = {}
                for (const item of elements) {
                    hashEd[item.ed.path] = item.ed
                }

                //get any variables defined on the root
                let dgname = lstAllElements[0].ed.path
                let dg = snapshotSvc.getDG(dgname)
                if (dg.adHocExt) {
                    hashEd[dgname] = {adHocExt : dg.adHocExt,path:dgname}
                }

                let ar = path.split('.')
                let pth = ""
                ar.forEach(function (segment,inx) {

                    if (inx > 0) {
                        pth += '.' + segment
                    } else {
                        //this is the root. Need to get the
                        pth = segment

                    }

                    let ed = hashEd[pth]
                    if (ed && ed.adHocExt) {
                        try {
                            let arJson = angular.fromJson(ed.adHocExt)

                            arJson.forEach(function (ext) {
                                switch (ext.url) {
                                    case "http://hl7.org/fhir/StructureDefinition/variable" :
                                        let thing = {kind:"variable",name:ext.valueExpression.name,path:ed.path,expression:ext.valueExpression.expression}
                                        $scope.variables.push(thing)
                                        break
                                    case "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId" :
                                        let thing1 = {kind:"allocateId",name:ext.valueString,path:ed.path}
                                        $scope.variables.push(thing1)
                                        break
                                }

                            })
                        } catch (ex) {
                            alert(angular.toJson(ex))
                        }

                    }

                    console.log(segment,ed)

                })


            }
            findVariablesInContext($scope.elements,currentPath)

            function makeExtension(type) {
                let ext = {}
                switch (type) {
                    case "variable" :
                        ext.url= "http://hl7.org/fhir/StructureDefinition/variable"
                        ext.valueExpression = {name: $scope.input.vName.replace(/\s+/g, "")}
                        ext.valueExpression.expression = $scope.input.vExpression
                        ext.valueExpression.language = "text/fhirpath"
                        if ($scope.input.vType == 'query') {
                            ext.valueExpression.language = "application/x-fhir-query"
                        }
                        break
                    case "allocateId":
                        ext.url= "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId"
                        ext.valueString = $scope.input.alName.replace(/\s+/g, "")
                        break
                    case "defextract":
                        ext.url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract"
                        ext.extension = []
                        ext.extension.push({url:'definition',valueCanonical:$scope.input.deCanonical.replace(/\s+/g, "")})
                        break
                    case "calc" :
                        ext.url= "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression"
                        ext.valueExpression =  {} //{name: $scope.input.calcName.replace(/\s+/g, "")}
                        ext.valueExpression.expression = $scope.input.calcExpression
                        ext.valueExpression.language = "text/fhirpath"
                        if ($scope.input.calcType == 'query') {
                            ext.valueExpression.language = "application/x-fhir-query"
                        }
                        break
                    case "initialexp" :
                        ext.url= "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
                        ext.extension = []
                        ext.extension.push({url:'definition',valueUri:$scope.input.devCanonical})

                        let child = {url:'valueExpression'}

                        let exp = {}

                        exp.expression = $scope.input.ieExpression
                        exp.language = "text/fhirpath"
                        child.valueExpression = exp
                        
                        ext.extension.push(child)
                        break
                    case "defextractvalue" :
                        if ($scope.input.devFixed && $scope.input.devExpression) {
                            alert("You can have a fixed value OR an expression - not both!")
                        }
                        ext.url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue"
                        ext.extension = []
                        ext.extension.push({url:'definition',valueUri:$scope.input.devCanonical})
                        if ($scope.input.devFixed) {
                            let dt = $scope.input.devFhirDT
                            let v = `value${dt.charAt(0).toUpperCase() + dt.slice(1)}`
                            let child = {url:'fixed-value'}
                            child[v] = $scope.input.devFixed
                            ext.extension.push(child)



                        }
                        break

                      //  ng-if="input.devCanonical && input.devfhirDT && (input.devFixed || input.devExpression)"
                    }

                return ext

            }

            $scope.save = function (type) {
                let ext = makeExtension(type)
                $scope.$close(ext)

            }

            $scope.copyPath = function (path) {
                localCopyToClipboard(`{{${path}}}`)
                alert(`{{${path}}} copied`)
            }


            localCopyToClipboard = function(text) {
                let textArea = document.createElement("textarea");
                textArea.value = text;

                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    let successful = document.execCommand('copy');
                    let msg = successful ? 'successful' : 'unsuccessful';
                    console.log('Fallback: Copying text command was ' + msg);
                } catch (err) {
                    alert('Fallback: Oops, unable to copy', err);
                }

                document.body.removeChild(textArea);
            }
        }
    )