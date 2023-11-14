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

                let kind = 'DG'
                if (model.kind == 'comp') {
                    kind = 'comp'
                }

                let url = `/model/${kind}/${model.name}/revert`

                let config = {headers:{'x-user-email': user.email}}
                $http.put(url,model,config).then(      //the model isn't used by the revert function
                    function (data) {
                        deferred.resolve(data.data)

                    },
                    function (err) {
                        if (err.status == 404) {

                        }
                       deferred.reject(err)
                    }
                )

                return deferred.promise

            },
            checkOut : function (model,user,vo) {
                //check out a model. check server first
                let kind = 'DG'
                if (model.kind == 'comp') {
                    kind = 'comp'
                }


                let url = `/model/${kind}/${model.name}`  //todo check type of model -


                $http.get(url,model).then(
                    function (data) {
                        let libraryModel = data.data

                        //it's possible that the library has the DG or Comp checked out but
                        //the local copy doesn't reflect that (eg imported DG directly)
                        if (! libraryModel.checkedOut || libraryModel.checkedOut == user.email) {
                            libraryModel.checkedOut = user.email
                            performCheckout(libraryModel)

                        } else {
                            alert(`Sorry, this resource is checked out to ${libraryModel.checkedOut}`)
                        }
                    },
                    function (err) {
                        if (err.status == '404') {
                            //This is a new resource and not yet on the library
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
                            if (vo) {
                                vo(model)
                            }
                        },
                        function (err) {
                            alert(angular.toJson(err))

                        }
                    )
                }



            },
            checkIn : function (model,user,vo) {
                //check in a model.
                let kind = 'DG'
                if (model.kind == 'comp') {
                    kind = 'comp'
                }

                delete model.checkedOut

                let url = `/model/${kind}/${model.name}`  //todo check type of model -
                let config = {headers:{'x-user-email': user.email}}
                $http.put(url,model,config).then(
                    function (data) {

                        //console.log(angular.toJson(data.data))
                        //console.log(angular.toJson(model))

                        //todo - the 'active' property may or moy not be present.
                        /*
                        if (angular.toJson(data.data) !== angular.toJson(model)) {
                            console.log(data.data)
                            console.log(model)
                            alert(`${model.name} The resource saved does not match the resource returned. Please contact support`)

                        }
*/
                      //  alert("Resource has been checked in")
                        if (vo) {
                            vo()
                        }
                    },
                    function (err) {
                        model.checkedOut = user.email   //if there was an error checking in, then make sure it's still checked out to the current user
                        alert(angular.toJson(err))
                    }
                )
            }
        }
    })