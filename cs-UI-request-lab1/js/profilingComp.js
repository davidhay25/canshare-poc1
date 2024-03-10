angular.module("pocApp")
    .controller('profilingCompCtrl',
        function ($scope,$http,$timeout,igSvc) {

        $scope.input = {}
        $scope.isDirty = false


        //When a DG is selected
        $scope.$on('compSelected',function (ev,vo) {
            $timeout(function () {
                let vo = igSvc.makeProfileFshComp($scope.selectedComposition,$scope.hashAllDG)
                if ($scope.fshEditor) {
                    $scope.fshEditor.setValue(vo.fsh)
                }


                //$scope.input.fsh = vo.fsh
               // $scope.refresh()
               // $scope.$digest()
            },1)
        })






        $scope.runSushi = function () {
            let qry = '/fsh/transform'
            let vo1 = {fsh:$scope.input.fsh}
            delete $scope.sushi
            $scope.executingSushi = true
            $http.post(qry,vo1).then(
                function (data) {
                    $scope.sushi = data.data
                    console.log(data.data)
                },
                function (err) {
                    console.log(err.data)
                    $scope.sushi = err.data
                }
            ).finally(function () {
                $scope.executingSushi = false
            })
        }

            //======== all this is from DG ========
        $scope.generateFsh = function () {
            //create the FSH from the model.
            //Temp. location
            delete $scope.logEd
            delete $scope.errors
            delete $scope.sushi
            let vo = igSvc.makeProfileFshDg($scope.selectedModel,$scope.fhirResourceType,$scope.fullElementList)

            $scope.logEd = vo.logEd
            $scope.errors = vo.errors
            $scope.fshEditor.setValue(vo.fsh)
            $scope.fshEditor.refresh()
            $scope.isDirty = true




        }


        $scope.refreshDEP = function () {
            let fsh = ""
            if ($scope.input.dgFsh && $scope.input.dgFsh.fsh) {
                fsh = $scope.input.dgFsh.fsh
            }
            $scope.fshEditor.setValue(fsh)
            $scope.fshEditor.refresh()
            $scope.isDirty = false

            //$scope.type = igSvc.findResourceType()


        }


            let setupCM = function(node){
                //set up CM editor for a single view . Has to be when the textarea is visible...
                if (! $scope.fshEditor) {
                    // set up the codemirror editor used for display of resource
                    $timeout(function(){
                        var elFSH = document.getElementById("compFshFile");
                        let cmOptions = {lineNumbers:true};

                        $scope.fshEditor = CodeMirror.fromTextArea(elFSH,cmOptions);
                        $scope.fshEditor.refresh()
                        let doc = $scope.fshEditor.getDoc();


                        doc.on('change',function(){
                            $scope.isDirty = true
                            let v = $scope.fshEditor.getValue();
                            // todo - is this needed? $scope.$digest()
                            //console.log(v)

                        });


                    },1000)
                } else {
                    $timeout(function(){
                        $scope.fshEditor.refresh()
                    },500)

                }
            };


            $timeout(function(){
                setupCM()
            },1000)


            $scope.updateFsh = function (name) {
                if (confirm("Are you sure you wish to update the library")) {
                    let fsh = $scope.fshEditor.getValue()  //get the fsh directly from the editor
                    let vo = {name:name,fsh:fsh}
                    let url = `fsh/comp/profile/${name}`
                    let config = {headers:{'x-user-email': $scope.user.email}}
                    $http.put(url,vo,config).then(
                        function () {
                            alert("Fsh updated")
                        },function (err) {
                            alert(angular.toJson(err.data))
                        }

                    )

                }


            }

        })
