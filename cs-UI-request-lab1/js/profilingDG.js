angular.module("pocApp")
    .controller('profilingDGCtrl',
        function ($scope,$http,$timeout,igSvc) {

        $scope.isDirty = false


        //When a DG is selected
        $scope.$on('dgSelected',function (ev,vo) {
            $timeout(function () {
                $scope.refresh()
                $scope.$digest()
            },1)
        })


        $scope.generateFsh = function () {
            //create the FSH from the model.
            //Temp. location
            let vo = igSvc.makeProfileFshDg($scope.selectedModel,$scope.fhirResourceType,$scope.fullElementList)

            $scope.logEd = vo.logEd
            $scope.fshEditor.setValue(vo.fsh)
            $scope.fshEditor.refresh()
            $scope.isDirty = true
        }


        $scope.refresh = function () {
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
                        var elFSH = document.getElementById("dgFshFile");
                        let cmOptions = {lineNumbers:true};

                        $scope.fshEditor = CodeMirror.fromTextArea(elFSH,cmOptions);
                        $scope.fshEditor.refresh()
                        let doc = $scope.fshEditor.getDoc();


                        doc.on('change',function(){
                            $scope.isDirty = true
                            let v = $scope.fshEditor.getValue();
                            // todo - is this needed? $scope.$digest()
                            console.log(v)

                        });


                    },1000)
                } else {
                    $timeout(function(){
                        $scope.fshEditor.refresh()
                    },500)

                }
            };

            setupCM()

            $scope.updateFsh = function (name) {
                let fsh = $scope.fshEditor.getValue()  //get the fsh directly from the editor
                let vo = {name:name,fsh:fsh}
                let url = `fsh/DG/${name}`
                let config = {headers:{'x-user-email': $scope.user.email}}
                $http.put(url,vo,config).then(
                    function () {
                        alert("Fsh updated")
                    },function (err) {
                        alert(angular.toJson(err.data))
                    }

                )


            }

        })
