angular.module("pocApp")
    .controller('makeSDCExtensionCtrl',
        function ($scope,elements) {
            $scope.input = {}
            $scope.elements = elements
console.log(elements)
            $scope.input.vType = "fhirpath"

            function makeExtension(type) {
                let ext = {}
                switch (type) {
                    case "variable" :
                        ext.url= "http://hl7.org/fhir/StructureDefinition/variable"
                        ext.valueExpression = {name: $scope.input.vName}
                        ext.valueExpression.expression = $scope.input.vExpression
                        ext.valueExpression.language = "text/fhirpath"
                        if ($scope.input.vType == 'query') {
                            ext.valueExpression.language = "application/x-fhir-query"
                        }
                        break
                    case "allocateId":
                        ext.url= "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId"
                        ext.valueString = $scope.input.alName
                        break
                    case "definitionExtract":
                        ext.url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract"
                        ext.extension = []
                        ext.extension.push({url:'definition',valueCanonical:$scope.input.deCanonical})
                        break

                    }

                return ext

            }

            $scope.save = function (type) {
                let ext = makeExtension(type)
                $scope.$close(ext)

            }

            $scope.copyPath = function (path) {
                localCopyToClipboard(`{{${path}}}`)
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