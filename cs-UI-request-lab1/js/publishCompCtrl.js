angular.module("pocApp")
    .controller('publishCompCtrl',
        function ($scope,comp,arAllElements,utilsSvc,$http,user,Q) {

            let pubComp = angular.copy(comp)
            console.log(`Size of diff: ${arAllElements.length}`)
            let size1 = utilsSvc.getSizeOfObject(arAllElements)
            console.log(`Size of allElements: ${size1/1024} K`)



            //the version of the comp is set during design (working on v3).
            pubComp.version = pubComp.version || 1
            pubComp.status = 'published'

            pubComp.snapshot = []
            arAllElements.forEach(function (item) {
                if (item.ed && item.ed.mult !== '0..0') {
                    pubComp.snapshot.push(item.ed)
                }

            })
            console.log(`Size of snapshot: ${pubComp.snapshot.length}`)
            let size = utilsSvc.getSizeOfObject(pubComp)
            console.log(`Size of pubComp: ${size/1024} K`)

            console.log(pubComp)


            //create a package - comp and Questionnaire

            //publish the Comp
            $scope.publish = function () {


                let package = {comp:pubComp,Q:Q}

                let config = {headers:{'x-user-email': user.email}}
                let qry = `publish/comp`
                $http.post(qry,package,config).then(
                    function (data) {
                        alert(`Composition published as version ${pubComp.version}`)
                        $scope.$close(pubComp)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )



            }


        }
    )