angular.module("pocApp")
    .controller('profilingDGCtrl',
        function ($scope,$http,$timeout,igSvc) {

        $scope.isDirty = false

        function loadFshFromLibrary(name,cb) {
            let url = `fsh/DG/${name}`
            $http.get(url).then(
                function (data) {
                    cb(true,data.data)
                },
                function (err) {
                    cb(false,err.data)
                }
            )
        }


        //When a DG is selected, if there's an fsh in the library then load that, else generate fsh
        $scope.$on('dgSelected',function (ev,vo) {
           // $timeout(function () {


                setupCM(function () {
                    //clear the editor
                    $scope.fshEditor.setValue("")
                    $scope.fshEditor.refresh()

                    delete $scope.fshSource

                    delete $scope.logEd
                    delete $scope.errors
                    delete $scope.sushi

                    //retrieve from the libarary
                    let name = $scope.selectedModel.name
                    loadFshFromLibrary(name,function (found,item) {
                        if (found) {
                            //there was an fsh entry for this DG in the library
                            $scope.fshSource = "FSH from Library"
                            $scope.fshEditor.setValue(item.fsh)
                            $timeout(function () {
                                $scope.fshEditor.refresh()
                            },500)

                            $scope.isDirty = false
                        } else {
                            //no entry - generate it from the currently selected model if there's a base resource type
                            //if there's no fhirResourceType then a message will be shown anyway
                            if ($scope.fhirResourceType) {
                                $scope.generateFsh()
                                $scope.fshSource = "FSH generated from model"
                            }

                        }
                        //console.log(item)
                    })

                })       //may not have been setup yet



                //$scope.refresh()
                //$scope.$digest()
         //   },1)
        })

        $scope.refreshEditor = function () {
            $timeout(function () {
                setupCM()
            },200)

            //$scope.fshEditor.refresh()
        }

        $scope.runSushi = function () {
            let qry = '/fsh/transform'
            let vo1 = {fsh:$scope.fshEditor.getValue()}
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

        $scope.generateFsh = function () {
            //create the FSH from the model.
            //Temp. location
            delete $scope.logEd
            delete $scope.errors
            delete $scope.sushi
            let vo = igSvc.makeProfileFshDg($scope.selectedModel,$scope.fhirResourceType,$scope.fullElementList)

            $scope.logEd = vo.logEd
            $scope.errors = vo.errors
            $scope.manifest = vo.manifest
            $scope.extensions = vo.extensions

            $scope.fshEditor.setValue(vo.fsh)
            $scope.fshEditor.refresh()
            $scope.isDirty = true
            $scope.fshSource = "FSH generated from model"

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


        let setupCM = function(cb){
            //set up CM editor for a single view . Has to be when the textarea is visible...
            if (! $scope.fshEditor) {
                // set up the codemirror editor used for display of resource
             //   $timeout(function(){    //to make sure the page is fully loade
                    var elFSH = document.getElementById("dgFshFile");
                    let cmOptions = {lineNumbers:true};

                    $scope.fshEditor = CodeMirror.fromTextArea(elFSH,cmOptions);
                    $scope.fshEditor.refresh()
                    let doc = $scope.fshEditor.getDoc();

                    doc.on('change',function(){
                        $scope.isDirty = true
                        let v = $scope.fshEditor.getValue();
                        try {
                            $scope.$digest() //to update the display
                        } catch (ex) {}

                        //console.log(v)

                    });

                    if (cb) {cb()}


            //    },1000)
            } else {
              //  $timeout(function(){
                    $scope.fshEditor.refresh()
                    if (cb) {cb()}
              //  },500)

            }
        };

       // setupCM()

        //write to library
        $scope.updateFsh = function (name) {
            let fsh = $scope.fshEditor.getValue()  //get the fsh directly from the editor
            let vo = {name:name,fsh:fsh,manifest:$scope.manifest,extensions:$scope.extensions}
            vo.date = new Date()
            let url = `fsh/DG/${name}`
            let config = {headers:{'x-user-email': $scope.user.email}}
            $http.put(url,vo,config).then(
                function () {
                    alert("Fsh updated")
                    $scope.isDirty = false
                },function (err) {
                    alert(angular.toJson(err.data))
                }

            )


        }

        })
