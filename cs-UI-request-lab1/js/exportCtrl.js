angular.module("pocApp")
    .controller('exportCtrl',
        function ($scope,hashAllDG,hashAllCompositions,meta) {

            //create the json & TSV download

            let obj = {dg:hashAllDG,comp:hashAllCompositions}
            obj.meta = meta

            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))

            $scope.downloadLinkJsonName = `allDataGroups.json`
            if (meta.name) {
                $scope.downloadLinkJsonName = `${meta.name}.json`
            }

            $scope.import = function () {

                $scope.$close($scope.uploadedWorld)
            }

            $scope.uploadJson = function() {
                let id = "#fileUploadFileRef"    //in qMetadata
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }

                let fileObject = fileList[0]  //is a complex object

                let r = new FileReader();

                //called when the upload completes
                r.onloadend = function (e) {
                    let data = e.target.result;

                    let obj = angular.fromJson(data)
                    $scope.uploadedWorld = obj

                    $scope.uploadedDG = obj //this was the first version

                    if (obj.dg) {
                        $scope.uploadedDG = obj.dg
                    }

                    if (obj.comp) {
                        $scope.uploadedComp = obj.comp
                    }

                    $scope.uploadComplete = true

                    $scope.$digest()


                }

                //perform the read...
                r.readAsText(fileObject);
            }



        }
    )