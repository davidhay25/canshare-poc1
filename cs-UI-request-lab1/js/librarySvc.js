angular.module("pocApp")

    .service('librarySvc', function($q,$http) {

        return {
            checkOut : function (model,user) {
                //check out a model. todo ? check server first
                model.checkedOut = user.email
                let url = `/model/DG/${model.name}`  //todo check type of model -
                $http.put(url,model).then(
                    function (data) {
                        alert("Resource has been checked out")
                    },
                    function (err) {
                        alert(angular.toJson(err))
                    }
                )
            },
            checkIn : function (model) {
                //check out a model. todo ? check server first
                delete model.checkedOut
                let url = `/model/DG/${model.name}`  //todo check type of model -
                $http.put(url,model).then(
                    function (data) {
                        alert("Resource has been checked in")
                    },
                    function (err) {
                        alert(angular.toJson(err))
                    }
                )
            }
        }
    })