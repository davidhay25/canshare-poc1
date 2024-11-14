
///Not currently used...

angular.module("pocApp")

    .service('qHelperSvc', function() {

        //this specifies a specific value or an expression to set the value
        extExtractionValue = "http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue"

        return {

            addFixedValue : function(item,definition,type,value,expression) {
            //add a fixed value extension. Can either be a value or an expression
            //definition is the path in the resource (added to the 'item.definition' value

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extExtractionValue,extension:[]}
            ext.extension.push({url:"definition",valueCanonical:definition})

            if (value) {
                let child = {url:'fixed-value'}
                child[`value${type}`] = value
                ext.extension.push(child)
            } else if (expression){
                let child = {url:'expression'}
                child[`value${type}`] = expression
                ext.extension.push(child)
            } else {
                return  //todo shoul add error...
            }


            item.extension = item.extension || []
            item.extension.push(ext)

        }


        }

    })