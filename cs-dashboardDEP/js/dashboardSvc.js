angular.module("pocApp")


    .service('dashboardSvc', function($q,$http) {

        let designerServer = "http://localhost:9099/baseR4"


        return {

            getQfromDesigner: function () {
                //get the Q from the designer app. This should go into the server app

                

            }
        }
    })