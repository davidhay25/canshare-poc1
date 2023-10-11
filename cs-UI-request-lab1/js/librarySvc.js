angular.module("pocApp")

    .service('librarySvc', function($q,$http) {

        return {
            getAllCheckedOut : function(hashAllDG,user){
                //get all the checked out models - regardless of user
                
                Object.keys(hashAllDG).forEach(function (dg) {
                    
                })
                
            },
            revert : function (model,user) {
                let deferred = $q.defer()
                //abandon local changes and release the checkout
                let url = `/model/DG/${model.name}/revert`

                let config = {headers:{'x-user-email': user.email}}
                $http.put(url,model,config).then(      //the model isn't used by the revert function
                    function (data) {
                        deferred.resolve(data.data)

                    },
                    function (err) {
                       deferred.reject(err)
                    }
                )

                return deferred.promise

            },
            checkOut : function (model,user) {
                //check out a model. check server first
                let url = `/model/DG/${model.name}`  //todo check type of model -


                $http.get(url,model).then(
                    function (data) {
                        let libraryDG = data.data
                        if (! libraryDG.checkedOut) {
                            model.checkedOut = user.email
                            performCheckout(model)

                        } else {
                            alert(`Sorry, this resource is checked out to ${libraryDG.checkedOut}`)
                        }
                    },
                    function (err) {
                        if (err.status == '404') {
                            //This is a new resource
                            model.checkedOut = user.email
                            performCheckout(model)
                        } else {
                            alert(angular.toJson(err))
                        }

                    }
                )

                function performCheckout(model) {
                    let config = {headers:{'x-user-email': user.email}}
                    $http.put(url,model,config).then(
                        function (data) {
                          //  alert("Resource has been checked out")
                        },
                        function (err) {
                            alert(angular.toJson(err))
                        }
                    )
                }



            },
            checkIn : function (model,user,vo) {
                //check out a model. todo ? check server first
                delete model.checkedOut
                let url = `/model/DG/${model.name}`  //todo check type of model -
                let config = {headers:{'x-user-email': user.email}}
                $http.put(url,model,config).then(
                    function (data) {
                      //  alert("Resource has been checked in")
                        if (vo) {
                            vo()
                        }
                    },
                    function (err) {
                        alert(angular.toJson(err))
                    }
                )
            }
        }
    })