angular.module("formsApp")
    .service('renderFormsSvc', function($q,$http,moment) {

        return {
            getANObject : function (patient) {
                //return the custom object used by the display routine
                //todo: right now this is very inefficient

            },
            getRegimens : function(patient) {
                //get regimens for a patient
            }
        }

    }
    )

//http://localhost:9199/baseR4/CarePlan?subject=182&category=regimenCP
//http://localhost:9199/baseR4/CarePlan?subject=182&category=regimenCP&_include=CarePlan:supporting-Info

//need to add